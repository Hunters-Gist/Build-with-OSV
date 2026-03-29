import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://osv-construct-backend.onrender.com';
const AUTH_STORAGE_KEYS = ['osv_access_token', 'auth_token', 'access_token'];
const ADMIN_ROLES = new Set(['owner_admin', 'ops_staff', 'estimator']);
const SESSION_TTL_MS = 30_000;

let sessionCache = null;
let sessionCacheAt = 0;

export function getApiBaseUrl() {
  return API_BASE;
}

export function parseTokenCandidate(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.access_token && typeof parsed.access_token === 'string') {
        return parsed.access_token;
      }
    } catch {
      return null;
    }
  }

  return trimmed;
}

export function readAccessToken() {
  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    for (const key of AUTH_STORAGE_KEYS) {
      const token = parseTokenCandidate(storage.getItem(key));
      if (token) return token;
    }
    for (const key of Object.keys(storage)) {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const token = parseTokenCandidate(storage.getItem(key));
      if (token) return token;
    }
  }
  return null;
}

export function clearKnownTokens() {
  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    for (const key of AUTH_STORAGE_KEYS) {
      storage.removeItem(key);
    }
    for (const key of Object.keys(storage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        storage.removeItem(key);
      }
    }
  }
}

export function sanitizeNextPath(rawPath, fallback = '/quotes/new') {
  if (!rawPath || typeof rawPath !== 'string') return fallback;
  let candidate = rawPath.trim();
  if (!candidate) return fallback;

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  // Disallow absolute/protocol-relative URLs and require internal path.
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (candidate.includes('://')) return fallback;

  return candidate;
}

export function buildReauthPath(nextPath = '/quotes/new') {
  const safeNext = sanitizeNextPath(nextPath, '/quotes/new');
  return `/quotes/new?reauth=1&next=${encodeURIComponent(safeNext)}`;
}

export function buildPostLogoutPath(nextPath = '/quotes/new') {
  return sanitizeNextPath(nextPath, '/quotes/new');
}

export function isAuthError(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

function hasAdminRole(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => ADMIN_ROLES.has(String(role || '').trim().toLowerCase()));
}

export async function verifyAdminSession({ force = false } = {}) {
  const token = readAccessToken();
  if (!token) {
    return { status: 'unauthenticated', user: null };
  }

  const now = Date.now();
  if (!force && sessionCache && (now - sessionCacheAt) < SESSION_TTL_MS) {
    return sessionCache;
  }

  try {
    const res = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = res?.data?.data || null;
    const nextState = hasAdminRole(user?.roles)
      ? { status: 'authorized', user }
      : { status: 'forbidden', user };
    sessionCache = nextState;
    sessionCacheAt = now;
    return nextState;
  } catch (error) {
    if (isAuthError(error)) {
      const nextState = { status: 'unauthenticated', user: null };
      sessionCache = nextState;
      sessionCacheAt = now;
      return nextState;
    }
    return { status: 'error', user: null };
  }
}

export function resetSessionCache() {
  sessionCache = null;
  sessionCacheAt = 0;
}

export function performLogout({ nextPath = '/quotes/new' } = {}) {
  clearKnownTokens();
  resetSessionCache();
  return buildPostLogoutPath(nextPath);
}
