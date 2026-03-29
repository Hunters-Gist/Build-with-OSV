import { randomUUID } from 'crypto';

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function logSecurityAuditEvent(db, req, {
    source,
    eventType,
    outcome = 'denied',
    reason = null,
    metadata = null
}) {
    try {
        db.prepare(`
            INSERT INTO security_audit_events (
                id, source, event_type, outcome, reason, path, method, ip_address, user_agent, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            randomUUID(),
            source,
            eventType,
            outcome,
            reason,
            req.originalUrl || req.url || '',
            req.method || '',
            getClientIp(req),
            String(req.headers['user-agent'] || ''),
            metadata ? JSON.stringify(metadata) : null,
            Date.now()
        );
    } catch (error) {
        console.error('Failed to log security audit event:', error.message);
    }
}
