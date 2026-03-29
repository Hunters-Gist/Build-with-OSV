import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 1000);
        const source = String(req.query.source || '').trim();
        const eventType = String(req.query.event_type || '').trim();
        const outcome = String(req.query.outcome || '').trim();
        const fromTs = Number(req.query.from || 0);
        const toTs = Number(req.query.to || 0);

        let query = `
            SELECT
                id,
                source,
                event_type,
                outcome,
                reason,
                path,
                method,
                ip_address,
                user_agent,
                metadata_json,
                created_at
            FROM security_audit_events
        `;
        const params = [];
        const clauses = [];

        if (source) {
            clauses.push('source = ?');
            params.push(source);
        }
        if (eventType) {
            clauses.push('event_type = ?');
            params.push(eventType);
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
        console.error('Failed to fetch security audit rows:', error);
        return res.status(500).json({ error: 'Failed to fetch security audit logs.' });
    }
});

export default router;
