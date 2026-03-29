import express from 'express';
import db from '../db/index.js';

const router = express.Router();

function countByWindow(windowMs) {
    const fromTs = Date.now() - windowMs;
    const total = db.prepare(`
        SELECT COUNT(*) AS count
        FROM security_audit_events
        WHERE created_at >= ?
    `).get(fromTs)?.count || 0;

    const denied = db.prepare(`
        SELECT COUNT(*) AS count
        FROM security_audit_events
        WHERE created_at >= ? AND outcome = 'denied'
    `).get(fromTs)?.count || 0;

    const bySource = db.prepare(`
        SELECT source, COUNT(*) AS count
        FROM security_audit_events
        WHERE created_at >= ?
        GROUP BY source
        ORDER BY count DESC
    `).all(fromTs);

    const byOutcome = db.prepare(`
        SELECT outcome, COUNT(*) AS count
        FROM security_audit_events
        WHERE created_at >= ?
        GROUP BY outcome
        ORDER BY count DESC
    `).all(fromTs);

    return { total, denied, bySource, byOutcome };
}

router.get('/', (req, res) => {
    try {
        const summary24h = countByWindow(24 * 60 * 60 * 1000);
        const summary7d = countByWindow(7 * 24 * 60 * 60 * 1000);

        return res.json({
            success: true,
            data: {
                last_24h: summary24h,
                last_7d: summary7d
            }
        });
    } catch (error) {
        console.error('Failed to fetch security summary:', error);
        return res.status(500).json({ error: 'Failed to fetch security summary.' });
    }
});

export default router;
