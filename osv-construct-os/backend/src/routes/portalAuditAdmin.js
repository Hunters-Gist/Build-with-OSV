import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 1000);
        const action = String(req.query.action || '').trim();
        const outcome = String(req.query.outcome || '').trim();
        const fromTs = Number(req.query.from || 0);
        const toTs = Number(req.query.to || 0);

        let query = `
            SELECT
                id,
                quote_id,
                action,
                outcome,
                ip_address,
                user_agent,
                session_id,
                nonce,
                metadata_json,
                created_at
            FROM quote_portal_audit
        `;
        const params = [];
        const clauses = [];

        if (action) {
            clauses.push('action = ?');
            params.push(action);
        }
        if (outcome) {
            clauses.push('outcome = ?');
            params.push(outcome);
        }
        if (Number.isFinite(fromTs) && fromTs > 0) {
            clauses.push('created_at >= ?');
            params.push(fromTs);
        }
        if (Number.isFinite(toTs) && toTs > 0) {
            clauses.push('created_at <= ?');
            params.push(toTs);
        }

        if (clauses.length > 0) {
            query += ` WHERE ${clauses.join(' AND ')}`;
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const rows = db.prepare(query).all(...params);
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Failed to fetch portal audit rows:', error);
        return res.status(500).json({ error: 'Failed to fetch portal audit logs.' });
    }
});

export default router;
