import express from 'express';
import Stripe from 'stripe';
import db from '../db/index.js';

const router = express.Router();

router.post('/create-session', async (req, res) => {
    try {
        const { quoteNum, depositAmount, clientName } = req.body;

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
            success_url: `${frontendUrl}/client/quote/${quoteNum}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/client/quote/${quoteNum}?canceled=true`,
            metadata: {
                quoteNum: quoteNum
            }
        });

        db.prepare(`
            UPDATE quotes
            SET deposit_amount = COALESCE(?, deposit_amount),
                stripe_session_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(derivedDepositAmount, session.id, Date.now(), quote.id);

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/confirm-payment', async (req, res) => {
    try {
        const { quoteNum, sessionId } = req.body;
        if (!quoteNum || !sessionId) {
            return res.status(400).json({ error: 'quoteNum and sessionId are required' });
        }
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

        const now = Date.now();
        db.prepare(`
            UPDATE quotes
            SET status = 'deposit_paid',
                deposit_paid_at = ?,
                stripe_session_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, session.id, now, quote.id);

        res.json({ success: true, status: 'deposit_paid' });
    } catch (error) {
        console.error('Stripe confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
