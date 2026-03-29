import crypto from 'crypto';

function getPortalSecret() {
    return process.env.QUOTE_PORTAL_SECRET || '';
}

export function shouldEnforcePortalTokens() {
    const envSetting = String(process.env.ENFORCE_PORTAL_TOKEN || '').toLowerCase();
    if (envSetting === 'true') return true;
    // In production, portal token checks are always enforced.
    return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

export function shouldEnforcePortalNonces() {
    return String(process.env.ENFORCE_PORTAL_NONCE || 'false').toLowerCase() === 'true';
}

function toBase64Url(input) {
    return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
    return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payloadB64) {
    const secret = getPortalSecret();
    if (!secret) throw new Error('Missing QUOTE_PORTAL_SECRET for portal token signing.');
    return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function safeSignatureMatch(actualSignature, expectedSignature) {
    const actualBuffer = Buffer.from(String(actualSignature || ''), 'utf8');
    const expectedBuffer = Buffer.from(String(expectedSignature || ''), 'utf8');
    if (actualBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function hashPortalToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function extractPortalToken(req) {
    const fromQuery = req.query?.token || req.query?.t;
    const fromHeader = req.headers['x-quote-token'];
    const fromBody = req.body?.portalToken;
    return String(fromQuery || fromHeader || fromBody || '').trim() || null;
}

export function createPortalToken({ quoteId, expiresAt, nonce }) {
    const payload = {
        q: quoteId,
        exp: Number(expiresAt),
        n: nonce || crypto.randomUUID()
    };
    const payloadB64 = toBase64Url(JSON.stringify(payload));
    const signature = signPayload(payloadB64);
    return `${payloadB64}.${signature}`;
}

export function decodeAndVerifyPortalToken(token) {
    if (!token || !String(token).includes('.')) return null;
    const [payloadB64, signature] = String(token).split('.');
    if (!payloadB64 || !signature) return null;
    const expectedSignature = signPayload(payloadB64);
    if (!safeSignatureMatch(signature, expectedSignature)) return null;

    try {
        const payload = JSON.parse(fromBase64Url(payloadB64));
        if (!payload?.q || !payload?.exp) return null;
        return payload;
    } catch (_) {
        return null;
    }
}

export function issuePortalTokenForQuote(db, quoteId, ttlMs = 1000 * 60 * 60 * 72) {
    const now = Date.now();
    const expiresAt = now + Number(ttlMs);
    const token = createPortalToken({ quoteId, expiresAt });
    const tokenHash = hashPortalToken(token);

    db.prepare(`
        UPDATE quotes
        SET portal_token_hash = ?,
            portal_token_expires_at = ?,
            updated_at = ?
        WHERE id = ?
    `).run(tokenHash, expiresAt, now, quoteId);

    return { token, expiresAt };
}

const portalAccessAttempts = new Map();
const PORTAL_ACCESS_WINDOW_MS = Math.max(1000, Number(process.env.PORTAL_ACCESS_WINDOW_MS || (1000 * 60 * 10)));
const PORTAL_ACCESS_LOCKOUT_MS = Math.max(1000, Number(process.env.PORTAL_ACCESS_LOCKOUT_MS || (1000 * 60 * 15)));
const PORTAL_ACCESS_MAX_FAILS = Math.max(1, Number(process.env.PORTAL_ACCESS_MAX_FAILS || 8));
let portalAccessSweepCounter = 0;

function getPortalAttemptBucketKey({ quoteId, token }) {
    const tokenKey = token ? hashPortalToken(token).slice(0, 16) : 'missing';
    return `${quoteId}:${tokenKey}`;
}

function sweepPortalAccessAttempts(now) {
    portalAccessSweepCounter += 1;
    if (portalAccessSweepCounter % 100 !== 0) return;
    for (const [key, value] of portalAccessAttempts.entries()) {
        if ((value.lockedUntil || 0) < now && (value.windowStart || 0) + PORTAL_ACCESS_WINDOW_MS < now) {
            portalAccessAttempts.delete(key);
        }
    }
}

function checkPortalRateLimit({ quoteId, token }) {
    if (!quoteId) return { ok: true };
    const now = Date.now();
    sweepPortalAccessAttempts(now);
    const key = getPortalAttemptBucketKey({ quoteId, token });
    const current = portalAccessAttempts.get(key);
    if (current && Number(current.lockedUntil || 0) > now) {
        return { ok: false, status: 429, error: 'Too many invalid portal access attempts. Please try again shortly.' };
    }
    return { ok: true };
}

function recordFailedPortalAccessAttempt({ quoteId, token }) {
    if (!quoteId) return;
    const now = Date.now();
    const key = getPortalAttemptBucketKey({ quoteId, token });
    const existing = portalAccessAttempts.get(key);
    if (!existing || Number(existing.windowStart || 0) + PORTAL_ACCESS_WINDOW_MS < now) {
        portalAccessAttempts.set(key, {
            windowStart: now,
            failures: 1,
            lockedUntil: 0
        });
        return;
    }

    const failures = Number(existing.failures || 0) + 1;
    const lockedUntil = failures >= PORTAL_ACCESS_MAX_FAILS ? now + PORTAL_ACCESS_LOCKOUT_MS : Number(existing.lockedUntil || 0);
    portalAccessAttempts.set(key, { ...existing, failures, lockedUntil });
}

function clearFailedPortalAccessAttempts({ quoteId, token }) {
    if (!quoteId) return;
    const key = getPortalAttemptBucketKey({ quoteId, token });
    portalAccessAttempts.delete(key);
}

export function verifyPortalAccessForQuote({ quote, token }) {
    const rateLimitState = checkPortalRateLimit({ quoteId: quote?.id, token });
    if (!rateLimitState.ok) return rateLimitState;

    const enforce = shouldEnforcePortalTokens();
    if (!enforce && !token) {
        clearFailedPortalAccessAttempts({ quoteId: quote?.id, token });
        return { ok: true, reason: 'token_not_required' };
    }

    if (!getPortalSecret()) {
        return { ok: false, status: 403, error: 'Forbidden' };
    }

    if (!token) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 401, error: 'Missing portal token.' };
    }
    if (!quote?.portal_token_hash || !quote?.portal_token_expires_at) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 403, error: 'Portal token is not configured for this quote.' };
    }

    let payload = null;
    try {
        payload = decodeAndVerifyPortalToken(token);
    } catch (_) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 401, error: 'Invalid portal token.' };
    }
    if (!payload) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 401, error: 'Invalid portal token.' };
    }
    if (payload.q !== quote.id) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 403, error: 'Portal token does not match this quote.' };
    }

    const now = Date.now();
    if (Number(payload.exp) < now || Number(quote.portal_token_expires_at) < now) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 401, error: 'Portal token has expired.' };
    }

    const tokenHash = hashPortalToken(token);
    if (tokenHash !== quote.portal_token_hash) {
        recordFailedPortalAccessAttempt({ quoteId: quote?.id, token });
        return { ok: false, status: 401, error: 'Portal token is no longer valid.' };
    }

    clearFailedPortalAccessAttempts({ quoteId: quote?.id, token });
    return { ok: true, payload };
}

export function consumePortalActionNonce(db, { quoteId, action, nonce }) {
    const enforceNonce = shouldEnforcePortalNonces();
    if (!enforceNonce && !nonce) return { ok: true, reason: 'nonce_not_required' };
    if (!nonce) return { ok: false, status: 400, error: 'Missing action nonce.' };

    try {
        db.prepare(`
            INSERT INTO quote_portal_nonces (id, quote_id, action, nonce, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), quoteId, action, nonce, Date.now());
        return { ok: true };
    } catch (_) {
        return { ok: false, status: 409, error: 'Duplicate action request detected.' };
    }
}
