import { getBunningsVicBranches } from './supplierCatalog.js';
import db from '../../db/index.js';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ROUTE_CALLS_PER_REQUEST = 45;

const routeCircuit = {
    consecutiveFailures: 0,
    openUntil: 0
};

function getMapsKey() {
    return process.env.GOOGLE_MAPS_API_KEY || '';
}

function safeParseDurationSeconds(duration) {
    if (!duration) return Number.POSITIVE_INFINITY;
    if (typeof duration === 'number') return duration;
    const raw = String(duration).trim();
    if (raw.endsWith('s')) return Number(raw.slice(0, -1));
    return Number(raw) || Number.POSITIVE_INFINITY;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cacheGet(cacheKey) {
    const row = db.prepare(`
        SELECT value_json, updated_at
        FROM location_cache
        WHERE cache_key = ?
        LIMIT 1
    `).get(cacheKey);
    if (!row) return null;
    if ((Date.now() - row.updated_at) > LOCATION_CACHE_TTL_MS) return null;
    try {
        return JSON.parse(row.value_json);
    } catch (_) {
        return null;
    }
}

function cacheSet(cacheKey, kind, value) {
    db.prepare(`
        INSERT INTO location_cache (id, cache_key, kind, value_json, updated_at)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
            kind = excluded.kind,
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
    `).run(cacheKey, kind, JSON.stringify(value), Date.now());
}

async function fetchWithRetry(url, options, timeoutMs, retries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetchWithTimeout(url, options, timeoutMs);
            if (res.ok) return res;
            lastError = new Error(`Request failed (${res.status})`);
        } catch (err) {
            lastError = err;
        }
        if (attempt < retries) {
            await sleep(250 * (attempt + 1));
        }
    }
    throw lastError || new Error('Request failed');
}

export async function geocodeSuburbPostcode(suburb, postcode, options = {}) {
    const key = getMapsKey();
    if (!key) return null;
    const address = `${suburb || ''} ${postcode || ''} VIC Australia`.trim();
    if (!address) return null;
    const forceRefresh = !!options.forceRefresh;
    const cacheKey = `geocode::${address.toLowerCase()}`;
    if (!forceRefresh) {
        const cached = cacheGet(cacheKey);
        if (cached) return cached;
    }

    const params = new URLSearchParams({ address, key, region: 'au' });
    let res;
    try {
        res = await fetchWithRetry(`${GOOGLE_GEOCODE_URL}?${params.toString()}`, {}, 8000, 2);
    } catch (_) {
        return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    const location = first?.geometry?.location;
    if (!location) return null;
    const parsed = {
        formattedAddress: first.formatted_address,
        lat: location.lat,
        lng: location.lng
    };
    cacheSet(cacheKey, 'geocode', parsed);
    return parsed;
}

async function getRouteDurationSeconds(originAddress, destinationAddress, options = {}) {
    const key = getMapsKey();
    if (!key) return Number.POSITIVE_INFINITY;
    const forceRefresh = !!options.forceRefresh;
    const cacheKey = `route::${originAddress.toLowerCase()}::${destinationAddress.toLowerCase()}`;

    if (!forceRefresh) {
        const cached = cacheGet(cacheKey);
        if (cached?.durationSeconds) return cached.durationSeconds;
    }

    if (Date.now() < routeCircuit.openUntil) {
        return Number.POSITIVE_INFINITY;
    }

    const body = {
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
    };

    let res;
    try {
        res = await fetchWithRetry(GOOGLE_ROUTES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify(body)
        }, 9000, 2);
    } catch (_) {
        routeCircuit.consecutiveFailures += 1;
        if (routeCircuit.consecutiveFailures >= 5) {
            routeCircuit.openUntil = Date.now() + 60_000;
        }
        return Number.POSITIVE_INFINITY;
    }

    if (!res.ok) {
        routeCircuit.consecutiveFailures += 1;
        if (routeCircuit.consecutiveFailures >= 5) {
            routeCircuit.openUntil = Date.now() + 60_000;
        }
        return Number.POSITIVE_INFINITY;
    }
    routeCircuit.consecutiveFailures = 0;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return Number.POSITIVE_INFINITY;
    const durationSeconds = safeParseDurationSeconds(route.duration);
    cacheSet(cacheKey, 'route', {
        durationSeconds,
        distanceMeters: route.distanceMeters ?? null
    });
    return durationSeconds;
}

function shortlistBunningsBranches(suburb = '') {
    const branches = getBunningsVicBranches();
    const normalizedSuburb = String(suburb || '').toLowerCase().trim();
    if (!normalizedSuburb) return branches.slice(0, 12);
    const matching = branches.filter(b => b.toLowerCase().includes(normalizedSuburb));
    const remainder = branches.filter(b => !b.toLowerCase().includes(normalizedSuburb));
    return [...matching, ...remainder].slice(0, 12);
}

function buildDestinationCandidates(suppliers, suburb, postcode) {
    const origin = `${suburb || ''} ${postcode || ''} VIC Australia`.trim();
    const candidates = [];
    for (const supplier of suppliers) {
        const lower = String(supplier.name || '').toLowerCase();
        if (lower.includes('bunnings')) {
            const branches = shortlistBunningsBranches(suburb);
            for (const branch of branches) {
                candidates.push({
                    supplierId: supplier.id,
                    supplierName: supplier.name,
                    destinationLabel: branch,
                    destinationAddress: branch
                });
            }
            continue;
        }

        // For non-Bunnings suppliers, infer the nearest branch using name + suburb first.
        candidates.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            destinationLabel: `${supplier.name} ${suburb} VIC`,
            destinationAddress: `${supplier.name} ${suburb} VIC Australia`
        });
        // Add a broad metro fallback destination guess.
        candidates.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            destinationLabel: `${supplier.name} Melbourne VIC`,
            destinationAddress: `${supplier.name} Melbourne VIC Australia`
        });
    }
    return { originAddress: origin, candidates };
}

export async function rankSuppliersByDriveTime({ suppliers, suburb, postcode, maxPerSupplier = 1, forceRefresh = false }) {
    const { originAddress, candidates } = buildDestinationCandidates(suppliers, suburb, postcode);
    if (!originAddress || !candidates.length) return [];

    // Balanced guardrail: sequential + capped route calls to control spend.
    const timed = [];
    const cappedCandidates = candidates.slice(0, MAX_ROUTE_CALLS_PER_REQUEST);
    for (const candidate of cappedCandidates) {
        const durationSeconds = await getRouteDurationSeconds(originAddress, candidate.destinationAddress, { forceRefresh });
        timed.push({ ...candidate, durationSeconds });
    }

    const bestBySupplier = new Map();
    for (const entry of timed) {
        const current = bestBySupplier.get(entry.supplierId);
        if (!current || entry.durationSeconds < current.durationSeconds) {
            bestBySupplier.set(entry.supplierId, entry);
        }
    }

    const ranked = Array.from(bestBySupplier.values())
        .sort((a, b) => a.durationSeconds - b.durationSeconds);

    if (maxPerSupplier <= 0) return ranked;
    return ranked.slice(0, Math.max(1, ranked.length));
}

