import express from 'express';
import db from '../db/index.js';
import { randomUUID } from 'crypto';
import { validateBodyInPlace } from '../middleware/validateRequest.js';
import { webhookLeadBodySchema } from '../validation/requestSchemas.js';
import { logSecurityAuditEvent } from '../services/securityAudit.js';

const router = express.Router();
const shouldEnforceWebhookSecret = String(process.env.ENFORCE_WEBHOOK_SECRET || 'false').toLowerCase() === 'true';

function verifySharedSecret(req) {
    if (!shouldEnforceWebhookSecret) return { ok: true };
    const configuredSecret = process.env.WEBHOOK_SHARED_SECRET;
    if (!configuredSecret) return { ok: false, status: 500, error: 'Webhook secret enforcement enabled but WEBHOOK_SHARED_SECRET is missing.', reason: 'missing_webhook_secret' };
    const providedSecret = req.headers['x-osv-webhook-secret'];
    if (!providedSecret || String(providedSecret) !== configuredSecret) {
        return { ok: false, status: 401, error: 'Invalid webhook secret.', reason: 'invalid_webhook_secret' };
    }
    return { ok: true };
}

// Webhook receiver for Gmail leads configured at leads@buildwithosv.com.au
router.post('/leads', async (req, res) => {
    try {
        const secretCheck = verifySharedSecret(req);
        if (!secretCheck.ok) {
            logSecurityAuditEvent(db, req, {
                source: 'webhook',
                eventType: 'signature_validation',
                outcome: 'denied',
                reason: secretCheck.reason || secretCheck.error
            });
            return res.status(secretCheck.status || 401).json({ error: secretCheck.error });
        }

        const bodyCheck = validateBodyInPlace(req, webhookLeadBodySchema);
        if (!bodyCheck.ok) {
            return res.status(400).json({ error: 'Validation failed', details: bodyCheck.details });
        }

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
