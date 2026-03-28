import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPLIER_DB_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..', 'OSV_SUPPLIER_DATABASE.md');

const TRADE_CATEGORY_MAP = {
    'fencing & screening': 'CATEGORY 5: FENCING & SCREENING',
    'decking': 'CATEGORY 2: DECKING',
    'pergolas & outdoor living': 'CATEGORY 9: PERGOLAS & OUTDOOR LIVING',
    'landscaping & garden construction': 'CATEGORY 6: LANDSCAPING & GARDEN CONSTRUCTION',
    'excavation, site clearing & levelling': 'CATEGORY 8: SAND, SOIL, CRUSHED ROCK & AGGREGATES',
    'cladding & feature walls': 'CATEGORY 3: CLADDING & FEATURE WALLS',
    'carpentry & bespoke timber work': 'CATEGORY 4: CARPENTRY & BESPOKE TIMBER',
    'painting, staining & surface finishes': 'CATEGORY 10: PAINTING, STAINING & SURFACE FINISHES',
    'structural & framing work': 'CATEGORY 11: STRUCTURAL & FRAMING',
    'renovations & fit-outs': 'CATEGORY 13: COMMERCIAL FIT-OUTS & RENOVATIONS',
    'commercial fit-outs': 'CATEGORY 13: COMMERCIAL FIT-OUTS & RENOVATIONS',
    'property maintenance & handyman services': 'CATEGORY 1: GENERAL HARDWARE & BUILDING SUPPLIES',
    '3d rendering & visual design': 'CATEGORY 1: GENERAL HARDWARE & BUILDING SUPPLIES',
    'project management & quoting': 'CATEGORY 1: GENERAL HARDWARE & BUILDING SUPPLIES'
};

const BUNNINGS_VIC_BRANCHES = [
    'Bunnings Warehouse Hawthorn East VIC',
    'Bunnings Warehouse Collingwood VIC',
    'Bunnings Warehouse Port Melbourne VIC',
    'Bunnings Warehouse Brunswick VIC',
    'Bunnings Warehouse Coburg VIC',
    'Bunnings Warehouse Northland VIC',
    'Bunnings Warehouse Preston VIC',
    'Bunnings Warehouse Heidelberg VIC',
    'Bunnings Warehouse Doncaster VIC',
    'Bunnings Warehouse Nunawading VIC',
    'Bunnings Warehouse Vermont South VIC',
    'Bunnings Warehouse Scoresby VIC',
    'Bunnings Warehouse Ringwood VIC',
    'Bunnings Warehouse Chirnside Park VIC',
    'Bunnings Warehouse Bayswater VIC',
    'Bunnings Warehouse Dandenong VIC',
    'Bunnings Warehouse Keysborough VIC',
    'Bunnings Warehouse Mentone VIC',
    'Bunnings Warehouse Moorabbin VIC',
    'Bunnings Warehouse Highett VIC',
    'Bunnings Warehouse Frankston VIC',
    'Bunnings Warehouse Mornington VIC',
    'Bunnings Warehouse Cranbourne VIC',
    'Bunnings Warehouse Carrum Downs VIC',
    'Bunnings Warehouse Narre Warren VIC',
    'Bunnings Warehouse Pakenham VIC',
    'Bunnings Warehouse Springvale VIC',
    'Bunnings Warehouse Sunshine VIC',
    'Bunnings Warehouse Maribyrnong VIC',
    'Bunnings Warehouse Braybrook VIC',
    'Bunnings Warehouse Footscray VIC',
    'Bunnings Warehouse Altona North VIC',
    'Bunnings Warehouse Tarneit VIC',
    'Bunnings Warehouse Werribee VIC',
    'Bunnings Warehouse Melton VIC',
    'Bunnings Warehouse Craigieburn VIC',
    'Bunnings Warehouse Roxburgh Park VIC',
    'Bunnings Warehouse Thomastown VIC',
    'Bunnings Warehouse Epping VIC',
    'Bunnings Warehouse Eltham VIC',
    'Bunnings Warehouse Geelong VIC',
    'Bunnings Warehouse Ballarat VIC',
    'Bunnings Warehouse Bendigo VIC',
    'Bunnings Warehouse Shepparton VIC',
    'Bunnings Warehouse Warrnambool VIC',
    'Bunnings Warehouse Traralgon VIC',
    'Bunnings Warehouse Mildura VIC',
    'Bunnings Warehouse Wodonga VIC'
];

let parsedCache = null;

function toNumberOrNull(value) {
    if (value === undefined || value === null) return null;
    const numeric = Number(String(value).trim().replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
}

function safeReadSupplierDoc() {
    if (!fs.existsSync(SUPPLIER_DB_PATH)) return '';
    return fs.readFileSync(SUPPLIER_DB_PATH, 'utf8');
}

function parseSupplierRow(line, categoryLabel) {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    // Expected minimum format: ID | Supplier | Tier | ...
    if (parts.length < 5) return null;
    const id = parts[0];
    const name = parts[1];
    const tierRaw = parts[2];
    const website = parts[4] || null;
    if (!id.startsWith('SUP')) return null;
    const tier = toNumberOrNull((tierRaw || '').replace('T', '')) || 3;

    // Scores are usually columns 5..8 on larger tables.
    const maybePrice = toNumberOrNull(parts[5]);
    const maybeReliability = toNumberOrNull(parts[6]);
    const maybeSpeed = toNumberOrNull(parts[7]);
    const maybeQuality = toNumberOrNull(parts[8]);

    return {
        id,
        name,
        tier,
        tierLabel: tierRaw || `T${tier}`,
        categories: [categoryLabel],
        website,
        scores: {
            price: maybePrice ?? 7,
            reliability: maybeReliability ?? 8,
            speed: maybeSpeed ?? 8,
            quality: maybeQuality ?? 8
        },
        notes: parts[9] || null
    };
}

function parseProductBaseline(line, categoryLabel) {
    const cleaned = line.replace(/^-/, '').trim();
    const split = cleaned.split('→').map(v => v.trim());
    if (split.length < 2) return null;
    const material = split[0];
    const pricePart = split[1];
    const supplierPart = split[2] || '';
    const amount = toNumberOrNull(pricePart.replace('$', ''));
    if (!material || !amount) return null;
    return {
        material,
        amount,
        unit: pricePart.replace(/.*\/([a-zA-Z0-9²]+)/, '$1') || null,
        supplierHint: supplierPart,
        category: categoryLabel
    };
}

function parseSupplierDocument() {
    if (parsedCache) return parsedCache;
    const text = safeReadSupplierDoc();
    const lines = text.split(/\r?\n/);

    const suppliersById = new Map();
    const productBaselines = [];
    let currentCategory = 'CATEGORY 1: GENERAL HARDWARE & BUILDING SUPPLIES';

    for (const line of lines) {
        const categoryMatch = line.match(/^##\s+(CATEGORY\s+\d+:\s+.+)$/i);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            continue;
        }

        if (line.includes('| SUP')) {
            const supplier = parseSupplierRow(line, currentCategory);
            if (!supplier) continue;
            const existing = suppliersById.get(supplier.id);
            if (!existing) {
                suppliersById.set(supplier.id, supplier);
                continue;
            }
            existing.categories = Array.from(new Set([...existing.categories, ...supplier.categories]));
            if (!existing.website && supplier.website) existing.website = supplier.website;
        }

        if (/^\s*-\s+.+→\s*\$/.test(line)) {
            const baseline = parseProductBaseline(line, currentCategory);
            if (baseline) productBaselines.push(baseline);
        }
    }

    parsedCache = {
        suppliers: Array.from(suppliersById.values()),
        productBaselines
    };
    return parsedCache;
}

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getSuppliersForTrade(tradeLabel) {
    const { suppliers } = parseSupplierDocument();
    const mappedCategory = TRADE_CATEGORY_MAP[normalize(tradeLabel)];
    if (!mappedCategory) return suppliers;
    return suppliers.filter(s => s.categories.includes(mappedCategory));
}

export function getBaselinePrice(materialQuery, tradeLabel) {
    const { productBaselines } = parseSupplierDocument();
    const mappedCategory = TRADE_CATEGORY_MAP[normalize(tradeLabel)];
    const normalizedQuery = normalize(materialQuery);

    const inCategory = mappedCategory
        ? productBaselines.filter(p => p.category === mappedCategory)
        : productBaselines;

    let best = null;
    let bestScore = -1;
    for (const item of inCategory) {
        const needle = normalize(item.material);
        if (!needle) continue;
        let score = 0;
        const tokens = needle.split(' ').filter(Boolean);
        for (const token of tokens) {
            if (normalizedQuery.includes(token)) score += 1;
        }
        if (normalizedQuery.includes(needle)) score += 3;
        if (score > bestScore) {
            best = item;
            bestScore = score;
        }
    }
    if (!best || bestScore <= 0) return null;
    return {
        unitPrice: best.amount,
        unit: best.unit,
        source: 'osv_supplier_baseline',
        material: best.material,
        supplierHint: best.supplierHint
    };
}

export function getBunningsVicBranches() {
    return BUNNINGS_VIC_BRANCHES.slice();
}

export function getSupplierCatalogStats() {
    const { suppliers, productBaselines } = parseSupplierDocument();
    return {
        supplierCount: suppliers.length,
        baselineCount: productBaselines.length
    };
}

