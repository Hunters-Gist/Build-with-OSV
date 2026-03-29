import express from 'express';
import Stripe from 'stripe';
import db from '../db/index.js';
import { validateBody } from '../middleware/validateRequest.js';
import {
    checkoutConfirmPaymentBodySchema,
    checkoutCreateSessionBodySchema
} from '../validation/requestSchemas.js';
import {
    extractPortalToken,
    verifyPortalAccessForQuote,
    consumePortalActionNonce
} from '../services/quotePortalSecurity.js';
import { logPortalAudit } from '../services/portalAudit.js';

const router = express.Router();

router.post('/create-session', validateBody(checkoutCreateSessionBodySchema), async (req, res) => {
    try {
        const { quoteNum, depositAmount, clientName, actionNonce } = req.body;

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe Secret Key missing in backend/.env' });
        }

        // Initialize stripe directly dynamically to ensure the env var is read correctly 
        // if the server started before the key was populated.
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const quote = db.prepare('SELECT * FROM quotes WHERE quote_num = ? OR id = ?').get(quoteNum, quoteNum);
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        const portalToken = extractPortalToken(req);
        const access = verifyPortalAccessForQuote({ quote, token: portalToken });
        if (!access.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_create_session',
                outcome: 'denied',
                nonce: actionNonce,
                metadata: { reason: access.error }
            });
            return res.status(access.status || 403).json({ error: access.error });
        }
        const nonceResult = consumePortalActionNonce(db, { quoteId: quote.id, action: 'create_session', nonce: actionNonce });
        if (!nonceResult.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_create_session',
                outcome: 'duplicate',
                nonce: actionNonce,
                metadata: { reason: nonceResult.error }
            });
            return res.status(nonceResult.status || 409).json({ error: nonceResult.error });
        }
        if (quote.status !== 'accepted') {
            return res.status(400).json({ error: 'Quote must be accepted before payment can be taken' });
        }

        const derivedDepositAmount = typeof depositAmount === 'number' && depositAmount > 0
            ? depositAmount
            : Number((quote.final_client_quote || 0) * 0.30);
        if (!derivedDepositAmount || derivedDepositAmount <= 0) {
            return res.status(400).json({ error: 'Invalid deposit amount for quote' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://osv-saa-s.vercel.app';
        const encodedToken = portalToken ? encodeURIComponent(portalToken) : null;
        const successTokenSuffix = encodedToken ? `&token=${encodedToken}` : '';
        const cancelTokenSuffix = encodedToken ? `?token=${encodedToken}&canceled=true` : '?canceled=true';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: `Build With OSVion Deposit: ${quoteNum}`,
                            description: `Securing phase 1 services for ${clientName || quote.client_name || 'Client'}`,
                        },
                        unit_amount: Math.round(derivedDepositAmount * 100), // Stripe requires cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}/client/quote/${quoteNum}?success=true&session_id={CHECKOUT_SESSION_ID}${successTokenSuffix}`,
            cancel_url: `${frontendUrl}/client/quote/${quoteNum}${cancelTokenSuffix}`,
            metadata: {
                quoteNum: quoteNum,
                quoteId: quote.id
            }
        });

        db.prepare(`
            UPDATE quotes
            SET deposit_amount = COALESCE(?, deposit_amount),
                stripe_session_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(derivedDepositAmount, session.id, Date.now(), quote.id);
        logPortalAudit(db, req, {
            quoteId: quote.id,
            action: 'checkout_create_session',
            sessionId: session.id,
            nonce: actionNonce
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/confirm-payment', validateBody(checkoutConfirmPaymentBodySchema), async (req, res) => {
    try {
        const { quoteNum, sessionId, actionNonce } = req.body;
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe Secret Key missing in backend/.env' });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Stripe session not found' });
        }
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment is not marked as paid' });
        }
        if (session.metadata?.quoteNum !== quoteNum) {
            return res.status(400).json({ error: 'Session metadata does not match quote' });
        }

        const quote = db.prepare('SELECT * FROM quotes WHERE quote_num = ? OR id = ?').get(quoteNum, quoteNum);
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        const portalToken = extractPortalToken(req);
        const access = verifyPortalAccessForQuote({ quote, token: portalToken });
        if (!access.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_confirm_payment',
                outcome: 'denied',
                nonce: actionNonce,
                sessionId,
                metadata: { reason: access.error }
            });
            return res.status(access.status || 403).json({ error: access.error });
        }
        const nonceResult = consumePortalActionNonce(db, { quoteId: quote.id, action: 'confirm_payment', nonce: actionNonce });
        if (!nonceResult.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_confirm_payment',
                outcome: 'duplicate',
                nonce: actionNonce,
                sessionId,
                metadata: { reason: nonceResult.error }
            });
            return res.status(nonceResult.status || 409).json({ error: nonceResult.error });
        }

        if (quote.stripe_session_id && quote.stripe_session_id !== session.id) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_confirm_payment',
                outcome: 'denied',
                nonce: actionNonce,
                sessionId,
                metadata: { reason: 'session_mismatch' }
            });
            return res.status(409).json({ error: 'Payment session does not match the quote session on record.' });
        }
        if ((quote.status === 'deposit_paid' || quote.status === 'won') && quote.stripe_session_id === session.id) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_confirm_payment',
                outcome: 'idempotent',
                nonce: actionNonce,
                sessionId
            });
            return res.json({ success: true, status: quote.status, idempotent: true });
        }

        const expectedDeposit = Number(quote.deposit_amount || Number((quote.final_client_quote || 0) * 0.30));
        const expectedCents = Math.round(expectedDeposit * 100);
        if (Number.isFinite(expectedCents) && expectedCents > 0 && Number(session.amount_total || 0) !== expectedCents) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'checkout_confirm_payment',
                outcome: 'denied',
                nonce: actionNonce,
                sessionId,
                metadata: { reason: 'amount_mismatch', expectedCents, receivedCents: Number(session.amount_total || 0) }
            });
            return res.status(400).json({ error: 'Stripe amount mismatch for expected deposit value.' });
        }

        const now = Date.now();
        db.prepare(`
            UPDATE quotes
            SET status = 'deposit_paid',
                deposit_paid_at = ?,
                stripe_session_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, session.id, now, quote.id);
        logPortalAudit(db, req, {
            quoteId: quote.id,
            action: 'checkout_confirm_payment',
            nonce: actionNonce,
            sessionId
        });

        res.json({ success: true, status: 'deposit_paid' });
    } catch (error) {
        console.error('Stripe confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
