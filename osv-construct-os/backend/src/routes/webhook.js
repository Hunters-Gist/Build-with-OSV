import express from 'express';
import db from '../db/index.js';
import { randomUUID, timingSafeEqual } from 'crypto';
import { validateBodyInPlace } from '../middleware/validateRequest.js';
import { webhookLeadBodySchema } from '../validation/requestSchemas.js';
import { logSecurityAuditEvent } from '../services/securityAudit.js';

const router = express.Router();
const shouldEnforceWebhookSecret = String(process.env.ENFORCE_WEBHOOK_SECRET || 'false').toLowerCase() === 'true';

function createIpRateLimiter({ windowMs, max }) {
    const buckets = new Map();
    return (req, res, next) => {
        const key = `${req.ip || 'unknown'}:${req.path}`;
        const now = Date.now();
        const current = buckets.get(key);

        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= max) {
            return res.status(429).json({ error: 'Too Many Requests' });
        }

        current.count += 1;
        return next();
    };
}

router.use(createIpRateLimiter({ windowMs: 60_000, max: 60 }));

function secretsMatch(expected, provided) {
    const expectedBuffer = Buffer.from(String(expected), 'utf8');
    const providedBuffer = Buffer.from(String(provided), 'utf8');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
}

function verifySharedSecret(req) {
    if (!shouldEnforceWebhookSecret) return { ok: true };
    const configuredSecret = process.env.WEBHOOK_SHARED_SECRET;
    if (!configuredSecret) return { ok: false, status: 403, publicError: 'Forbidden', reason: 'missing_webhook_secret' };
    const providedSecret = req.headers['x-osv-webhook-secret'];
    if (!providedSecret || !secretsMatch(configuredSecret, providedSecret)) {
        return { ok: false, status: 403, publicError: 'Forbidden', reason: 'invalid_webhook_secret' };
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
                reason: secretCheck.reason || 'webhook_secret_validation_failed'
            });
            return res.status(secretCheck.status || 403).json({ error: secretCheck.publicError || 'Forbidden' });
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
