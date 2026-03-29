import express from 'express';
import db from '../db/index.js';
import { validateBody } from '../middleware/validateRequest.js';
import { portalQuoteActionBodySchema } from '../validation/requestSchemas.js';
import { extractPortalToken, verifyPortalAccessForQuote, consumePortalActionNonce } from '../services/quotePortalSecurity.js';
import { logPortalAudit } from '../services/portalAudit.js';

const router = express.Router();

function getQuoteByRef(ref) {
    return db.prepare('SELECT * FROM quotes WHERE quote_num = ? OR id = ?').get(ref, ref);
}

router.get('/:ref', (req, res) => {
    try {
        const quote = getQuoteByRef(req.params.ref);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const token = extractPortalToken(req);
        const access = verifyPortalAccessForQuote({ quote, token });
        if (!access.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'portal_quote_read',
                outcome: 'denied',
                metadata: { reason: access.error }
            });
            return res.status(access.status || 403).json({ error: access.error });
        }

        logPortalAudit(db, req, { quoteId: quote.id, action: 'portal_quote_read' });
        return res.json({ success: true, data: quote });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

router.post('/:ref/accept', validateBody(portalQuoteActionBodySchema), (req, res) => {
    try {
        const quote = getQuoteByRef(req.params.ref);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const token = extractPortalToken(req);
        const nonce = req.body?.actionNonce;
        const access = verifyPortalAccessForQuote({ quote, token });
        if (!access.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'portal_accept',
                outcome: 'denied',
                nonce,
                metadata: { reason: access.error }
            });
            return res.status(access.status || 403).json({ error: access.error });
        }

        const nonceResult = consumePortalActionNonce(db, { quoteId: quote.id, action: 'accept_quote', nonce });
        if (!nonceResult.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'portal_accept',
                outcome: 'duplicate',
                nonce,
                metadata: { reason: nonceResult.error }
            });
            return res.status(nonceResult.status || 409).json({ error: nonceResult.error });
        }

        if (!['issued', 'sent'].includes(String(quote.status || '').toLowerCase())) {
            return res.status(400).json({ error: 'Quote must be issued before it can be accepted.' });
        }

        const now = Date.now();
        db.prepare(`
            UPDATE quotes
            SET status = 'accepted',
                accepted_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, now, quote.id);

        logPortalAudit(db, req, { quoteId: quote.id, action: 'portal_accept', nonce });
        return res.json({ success: true, status: 'accepted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to accept quote.' });
    }
});

router.post('/:ref/decline', validateBody(portalQuoteActionBodySchema), (req, res) => {
    try {
        const quote = getQuoteByRef(req.params.ref);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const token = extractPortalToken(req);
        const nonce = req.body?.actionNonce;
        const access = verifyPortalAccessForQuote({ quote, token });
        if (!access.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'portal_decline',
                outcome: 'denied',
                nonce,
                metadata: { reason: access.error }
            });
            return res.status(access.status || 403).json({ error: access.error });
        }

        const nonceResult = consumePortalActionNonce(db, { quoteId: quote.id, action: 'decline_quote', nonce });
        if (!nonceResult.ok) {
            logPortalAudit(db, req, {
                quoteId: quote.id,
                action: 'portal_decline',
                outcome: 'duplicate',
                nonce,
                metadata: { reason: nonceResult.error }
            });
            return res.status(nonceResult.status || 409).json({ error: nonceResult.error });
        }

        if (['deposit_paid', 'won'].includes(String(quote.status || '').toLowerCase())) {
            return res.status(400).json({ error: 'Quote can no longer be declined after payment.' });
        }

        db.prepare(`
            UPDATE quotes
            SET status = 'lost',
                updated_at = ?
            WHERE id = ?
        `).run(Date.now(), quote.id);

        logPortalAudit(db, req, { quoteId: quote.id, action: 'portal_decline', nonce });
        return res.json({ success: true, status: 'lost' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to decline quote.' });
    }
});

export default router;
