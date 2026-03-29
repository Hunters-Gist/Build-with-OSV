import db from '../../db/index.js';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

function nowMs() {
    return Date.now();
}

function extractFirstPrice(text) {
    const source = String(text || '');
    const matches = Array.from(source.matchAll(/(?:AU?\$|\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/gi));
    if (!matches.length) return null;
    const amount = Number(String(matches[0][1]).replace(/,/g, ''));
    if (!Number.isFinite(amount)) return null;
    return amount;
}

function inferUnit(text) {
    const source = String(text || '').toLowerCase();
    if (source.includes('/lm') || source.includes('linear metre')) return 'lm';
    if (source.includes('/m2') || source.includes('/m²')) return 'm2';
    if (source.includes('/ea') || source.includes('each')) return 'ea';
    if (source.includes('/bag')) return 'bag';
    return null;
}

function normalizeDomain(website) {
    const raw = String(website || '').trim().toLowerCase();
    if (!raw) return null;
    return raw
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchWithRetry(url, options, retries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetchWithTimeout(url, options);
            if (res.ok) return res;
            lastError = new Error(`Tavily request failed (${res.status})`);
        } catch (err) {
            lastError = err;
        }
        if (attempt < retries) await sleep(250 * (attempt + 1));
    }
    throw lastError || new Error('Tavily request failed');
}

function getCacheEntry(cacheKey) {
    const row = db.prepare(`
        SELECT * FROM pricing_cache
        WHERE cache_key = ?
        LIMIT 1
    `).get(cacheKey);
    if (!row) return null;
    if ((nowMs() - row.updated_at) > CACHE_TTL_MS) return null;
    return row;
}

function setCacheEntry({ cacheKey, provider, sourceUrl, searchQuery, unitPrice, unit, rawJson }) {
    db.prepare(`
        INSERT INTO pricing_cache (id, cache_key, provider, source_url, search_query, unit_price, unit, raw_json, updated_at)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          provider = excluded.provider,
          source_url = excluded.source_url,
          search_query = excluded.search_query,
          unit_price = excluded.unit_price,
          unit = excluded.unit,
          raw_json = excluded.raw_json,
          updated_at = excluded.updated_at
    `).run(cacheKey, provider, sourceUrl, searchQuery, unitPrice, unit, JSON.stringify(rawJson || {}), nowMs());
}

export async function getLivePriceFromTavily({ supplierName, website, materialQuery, locationHint, cacheKey, forceRefresh = false }) {
    const cached = forceRefresh ? null : getCacheEntry(cacheKey);
    if (!forceRefresh && cached) {
        return {
            ok: true,
            unitPrice: cached.unit_price,
            unit: cached.unit,
            source: 'tavily_cache',
            sourceUrl: cached.source_url,
            cacheHit: true,
            failureReason: null
        };
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return {
            ok: false,
            failureReason: 'missing_tavily_api_key'
        };
    }

    const supplierDomain = normalizeDomain(website);
    const compactQuery = [supplierName, materialQuery, locationHint ? `near ${locationHint}` : null, 'price australia']
        .filter(Boolean)
        .join(' ');

    const query = supplierDomain ? `${compactQuery} site:${supplierDomain}` : compactQuery;

    let res;
    try {
        res = await fetchWithRetry(TAVILY_SEARCH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                search_depth: 'basic',
                max_results: 5,
                include_answer: true,
                include_raw_content: true
            })
        }, 2);
    } catch (_) {
        return {
            ok: false,
            failureReason: 'tavily_request_failed'
        };
    }

    if (!res.ok) {
        return {
            ok: false,
            failureReason: `tavily_http_${res.status}`
        };
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const answer = data?.answer || '';

    let chosen = null;
    for (const result of results) {
        const composite = `${result?.title || ''} ${result?.content || ''} ${result?.raw_content || ''}`;
        const unitPrice = extractFirstPrice(composite);
        if (!unitPrice) continue;
        chosen = {
            unitPrice,
            unit: inferUnit(composite),
            sourceUrl: result?.url || null
        };
        break;
    }

    if (!chosen) {
        const fallbackPrice = extractFirstPrice(answer);
        if (!fallbackPrice) {
            return {
                ok: false,
                failureReason: 'no_price_in_results'
            };
        }
        chosen = {
            unitPrice: fallbackPrice,
            unit: inferUnit(answer),
            sourceUrl: null
        };
    }

    setCacheEntry({
        cacheKey,
        provider: 'tavily',
        sourceUrl: chosen.sourceUrl,
        searchQuery: query,
        unitPrice: chosen.unitPrice,
        unit: chosen.unit,
        rawJson: data
    });

    return {
        ok: true,
        ...chosen,
        source: 'tavily_live',
        cacheHit: false,
        failureReason: null
    };
}

