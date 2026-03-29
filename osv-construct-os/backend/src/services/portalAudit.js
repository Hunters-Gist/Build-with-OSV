import { randomUUID } from 'crypto';

export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function logPortalAudit(db, req, {
    quoteId = null,
    action,
    outcome = 'success',
    sessionId = null,
    nonce = null,
    metadata = null
}) {
    try {
        db.prepare(`
            INSERT INTO quote_portal_audit (
                id, quote_id, action, outcome, ip_address, user_agent, session_id, nonce, metadata_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            randomUUID(),
            quoteId,
            action,
            outcome,
            getClientIp(req),
            String(req.headers['user-agent'] || ''),
            sessionId,
            nonce,
            metadata ? JSON.stringify(metadata) : null,
            Date.now()
        );
    } catch (error) {
        console.error('Failed to log portal audit event:', error.message);
    }
}
