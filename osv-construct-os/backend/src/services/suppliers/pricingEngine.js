import { normalizeMaterialSpec } from './materialNormalizer.js';
import { getBaselinePrice, getSuppliersForTrade } from './supplierCatalog.js';
import { rankSuppliersByDriveTime } from './locationResolver.js';
import { getLivePriceFromTavily } from './tavilyPricing.js';

const BUNNINGS_THRESHOLD = 0.05;
const MATERIAL_MARKUP_MULTIPLIER = 1.10;

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildCacheKey({ normalizedKey, supplierId, suburb, postcode }) {
    return `${normalizedKey}::${supplierId}::${String(suburb || '').toLowerCase()}::${String(postcode || '')}`;
}

function isBunningsName(name) {
    return String(name || '').toLowerCase().includes('bunnings');
}

function pickPreferredQuote(candidates) {
    if (!candidates.length) return null;
    const sorted = candidates.slice().sort((a, b) => a.unitPrice - b.unitPrice);
    const cheapest = sorted[0];
    const bunnings = sorted.find(c => isBunningsName(c.supplierName));
    if (!bunnings) return cheapest;
    const thresholdPrice = cheapest.unitPrice * (1 + BUNNINGS_THRESHOLD);
    if (bunnings.unitPrice <= thresholdPrice) {
        return {
            ...bunnings,
            selectionReason: `bunnings_within_${Math.round(BUNNINGS_THRESHOLD * 100)}pct`
        };
    }
    return cheapest;
}

async function quoteOneMaterialLine({
    lineItemIndex,
    lineItem,
    tradeLabel,
    suburb,
    postcode,
    suppliers,
    supplierDriveTimes,
    forceRefresh
}) {
    const norm = normalizeMaterialSpec(lineItem, tradeLabel);
    if (!norm.isMaterials) {
        return {
            updated: lineItem,
            audit: null
        };
    }

    const rankedSuppliers = suppliers
        .map(s => {
            const drive = supplierDriveTimes.get(s.id);
            return { ...s, driveTimeSeconds: drive?.durationSeconds ?? Number.POSITIVE_INFINITY };
        })
        .sort((a, b) => a.driveTimeSeconds - b.driveTimeSeconds)
        .slice(0, 8);

    const liveQuotes = [];
    const supplierAttempts = [];
    const materialQuery = `${norm.inferredMaterial || ''} ${norm.dimensions || ''}`.trim() || norm.searchText;
    for (const supplier of rankedSuppliers) {
        const live = await getLivePriceFromTavily({
            supplierName: supplier.name,
            website: supplier.website,
            materialQuery,
            locationHint: `${suburb} ${postcode}`,
            cacheKey: buildCacheKey({
                normalizedKey: norm.normalizedKey,
                supplierId: supplier.id,
                suburb,
                postcode
            }),
            forceRefresh
        });
        if (!live?.ok || !live?.unitPrice) {
            supplierAttempts.push({
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                ok: false,
                failure_reason: live?.failureReason || 'unknown_failure',
                drive_time_seconds: supplier.driveTimeSeconds
            });
            continue;
        }
        supplierAttempts.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            ok: true,
            failure_reason: null,
            source: live.source,
            source_url: live.sourceUrl || null,
            drive_time_seconds: supplier.driveTimeSeconds
        });
        liveQuotes.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            unitPrice: live.unitPrice,
            unit: live.unit || lineItem.unit,
            source: live.source,
            sourceUrl: live.sourceUrl || null,
            cacheHit: !!live.cacheHit,
            driveTimeSeconds: supplier.driveTimeSeconds
        });
    }

    let selected = pickPreferredQuote(liveQuotes);
    let usedFallback = false;
    if (!selected) {
        const baseline = getBaselinePrice(norm.searchText, tradeLabel);
        if (baseline?.unitPrice) {
            usedFallback = true;
            selected = {
                supplierId: null,
                supplierName: baseline.supplierHint || 'OSV baseline',
                unitPrice: baseline.unitPrice,
                unit: baseline.unit || lineItem.unit,
                source: baseline.source,
                sourceUrl: null,
                cacheHit: false,
                driveTimeSeconds: null,
                selectionReason: 'baseline_fallback'
            };
        }
    }

    if (!selected) {
        return {
            updated: lineItem,
            audit: {
                line_item_index: lineItemIndex,
                material: norm.inferredMaterial,
                normalizedKey: norm.normalizedKey,
                fallbackUsed: true,
                fallbackReason: 'no_live_or_baseline_price',
                suppliersChecked: rankedSuppliers.map(s => ({ id: s.id, name: s.name })),
                confidence: norm.confidence,
                supplier_attempts: supplierAttempts
            }
        };
    }

    const qty = Number(lineItem.qty || 0);
    const newUnitPrice = roundMoney(selected.unitPrice * MATERIAL_MARKUP_MULTIPLIER);
    const total = qty > 0 ? roundMoney(qty * newUnitPrice) : lineItem.total;
    const updated = {
        ...lineItem,
        unit_price: newUnitPrice,
        total
    };

    const topOverrideOptions = liveQuotes
        .slice()
        .sort((a, b) => a.unitPrice - b.unitPrice)
        .slice(0, 3)
        .map(q => ({
            supplier_id: q.supplierId,
            supplier_name: q.supplierName,
            unit_price: q.unitPrice,
            unit: q.unit,
            source: q.source,
            source_url: q.sourceUrl,
            drive_time_seconds: q.driveTimeSeconds
        }));

    return {
        updated,
        audit: {
            line_item_index: lineItemIndex,
            material: norm.inferredMaterial,
            normalizedKey: norm.normalizedKey,
            confidence: norm.confidence,
            selected_supplier_id: selected.supplierId,
            selected_supplier_name: selected.supplierName,
            selected_unit_price: newUnitPrice,
            supplier_unit_price: roundMoney(selected.unitPrice),
            selected_unit: selected.unit,
            selected_source: selected.source,
            selected_source_url: selected.sourceUrl,
            selected_drive_time_seconds: selected.driveTimeSeconds,
            selection_reason: selected.selectionReason || 'cheapest_nearby',
            fallbackUsed: usedFallback,
            fallbackReason: usedFallback ? 'live_scrape_unavailable_or_unparsed' : null,
            override_options: topOverrideOptions,
            supplier_attempts: supplierAttempts
        }
    };
}

export async function applyLiveSupplierPricing({
    lineItems,
    tradeLabel,
    suburb,
    postcode,
    forceRefresh = false
}) {
    const suppliers = getSuppliersForTrade(tradeLabel);
    const driveRanking = await rankSuppliersByDriveTime({
        suppliers,
        suburb,
        postcode,
        forceRefresh
    });
    const supplierDriveTimes = new Map(driveRanking.map(d => [d.supplierId, d]));

    const updatedLineItems = [];
    const materialAudits = [];
    for (const lineItem of lineItems) {
        const result = await quoteOneMaterialLine({
            lineItemIndex: updatedLineItems.length,
            lineItem,
            tradeLabel,
            suburb,
            postcode,
            suppliers,
            supplierDriveTimes,
            forceRefresh
        });
        updatedLineItems.push(result.updated);
        if (result.audit) materialAudits.push(result.audit);
    }

    return {
        lineItems: updatedLineItems,
        pricingAudit: {
            suburb,
            postcode,
            bunningsThresholdPct: Math.round(BUNNINGS_THRESHOLD * 100),
            materialAudits
        }
    };
}

