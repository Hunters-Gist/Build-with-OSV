import crypto from 'crypto';

function getPortalSecret() {
    return process.env.QUOTE_PORTAL_SECRET || '';
}

export function shouldEnforcePortalTokens() {
    return String(process.env.ENFORCE_PORTAL_TOKEN || 'false').toLowerCase() === 'true';
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
    if (signature !== expectedSignature) return null;

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

export function verifyPortalAccessForQuote({ quote, token }) {
    const enforce = shouldEnforcePortalTokens();
    if (!enforce && !token) return { ok: true, reason: 'token_not_required' };

    if (!token) return { ok: false, status: 401, error: 'Missing portal token.' };
    if (!quote?.portal_token_hash || !quote?.portal_token_expires_at) {
        return { ok: false, status: 403, error: 'Portal token is not configured for this quote.' };
    }

    const payload = decodeAndVerifyPortalToken(token);
    if (!payload) return { ok: false, status: 401, error: 'Invalid portal token.' };
    if (payload.q !== quote.id) return { ok: false, status: 403, error: 'Portal token does not match this quote.' };

    const now = Date.now();
    if (Number(payload.exp) < now || Number(quote.portal_token_expires_at) < now) {
        return { ok: false, status: 401, error: 'Portal token has expired.' };
    }

    const tokenHash = hashPortalToken(token);
    if (tokenHash !== quote.portal_token_hash) {
        return { ok: false, status: 401, error: 'Portal token is no longer valid.' };
    }

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
