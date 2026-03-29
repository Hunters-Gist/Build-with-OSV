import { getSupabaseAdminClient } from '../services/supabaseAdmin.js';

function parseBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const [scheme, token] = authHeader.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
    return token.trim();
}

function normalizeRoles(user) {
    const appMetadataRoles = user?.app_metadata?.roles;
    const appMetadataRole = user?.app_metadata?.role;
    const userMetadataRoles = user?.user_metadata?.roles;

    const combined = [
        ...(Array.isArray(appMetadataRoles) ? appMetadataRoles : []),
        ...(Array.isArray(userMetadataRoles) ? userMetadataRoles : []),
        ...(typeof appMetadataRole === 'string' ? [appMetadataRole] : [])
    ];

    return [...new Set(combined.filter(Boolean).map((role) => String(role).trim().toLowerCase()))];
}

export async function requireAuth(req, res, next) {
    try {
        const token = parseBearerToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ error: 'Missing or invalid authorization token.' });
        }

        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired authentication token.' });
        }

        req.auth = {
            userId: data.user.id,
            email: data.user.email || null,
            roles: normalizeRoles(data.user),
            rawUser: data.user
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication service is unavailable.' });
    }
}

export function requireRole(...allowedRoles) {
    const normalizedAllowedRoles = new Set(allowedRoles.map((role) => String(role).trim().toLowerCase()));
    return (req, res, next) => {
        const userRoles = Array.isArray(req?.auth?.roles) ? req.auth.roles : [];
        const hasRole = userRoles.some((role) => normalizedAllowedRoles.has(String(role).toLowerCase()));
        if (!hasRole) {
            return res.status(403).json({
                error: 'Insufficient permissions for this resource.',
                required_roles: [...normalizedAllowedRoles]
            });
        }
        next();
    };
}

export const requireAdminRoles = requireRole('owner_admin', 'ops_staff', 'estimator');
