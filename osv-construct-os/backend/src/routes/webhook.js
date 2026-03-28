import express from 'express';
import db from '../db/index.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Webhook receiver for Gmail leads configured at leads@buildwithosv.com.au
router.post('/leads', async (req, res) => {
    try {
        const payload = req.body;
        
        console.log(`Received lead from webhook:`, payload.subject);
        
        const leadId = randomUUID();
        const aiJson = JSON.stringify({ raw_parse: true });
        
        const stmt = db.prepare(`
            INSERT INTO leads (id, client_name, source, stage, description, ai_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            leadId,
            payload.from || 'Unknown Client',
            payload.source || 'Email',
            'New',
            payload.body || '',
            aiJson,
            Date.now(),
            Date.now()
        );
        
        res.status(200).json({ success: true, leadId });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: 'Internal webhook error' });
    }
});

export default router;
