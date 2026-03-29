import express from 'express';
import db from '../db/index.js';
import { extractPortalToken, verifyPortalAccessForQuote } from '../services/quotePortalSecurity.js';

const router = express.Router();

function getQuoteByRef(ref) {
    return db.prepare('SELECT * FROM quotes WHERE quote_num = ? OR id = ?').get(ref, ref);
}

// Legacy compatibility: read-only quote fetch.
router.get('/:ref', (req, res) => {
    try {
        const quote = getQuoteByRef(req.params.ref);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const token = extractPortalToken(req);
        const enforcePortalToken = String(process.env.ENFORCE_PORTAL_TOKEN || 'false').toLowerCase() === 'true';
        if (token || enforcePortalToken) {
            const access = verifyPortalAccessForQuote({ quote, token });
            if (!access.ok) return res.status(access.status || 403).json({ error: access.error });
        }

        res.setHeader('x-osv-api-deprecated', 'Use /api/portal/quotes/:ref');
        return res.json({ success: true, data: quote });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

router.use((req, res) => {
    if (req.method !== 'GET') {
        return res.status(403).json({
            error: 'Legacy /api/quotes mutations are disabled. Use /api/admin/quotes/* or /api/portal/quotes/*.'
        });
    }
    return res.status(404).json({ error: 'Not found' });
});

export default router;
