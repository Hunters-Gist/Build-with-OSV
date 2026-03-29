import { randomUUID } from 'crypto';

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildSignature(item) {
    const category = normalizeText(item?.category);
    const name = normalizeText(item?.name);
    const unit = normalizeText(item?.unit);
    return `${category}|${name}|${unit}`;
}

function safeLineItems(input) {
    if (!Array.isArray(input)) return [];
    return input.map((item = {}, idx) => ({
        line_index: idx,
        category: String(item.category || 'Unknown'),
        name: String(item.name || 'Untitled Item'),
        unit: String(item.unit || 'item'),
        qty: toNumber(item.qty),
        unit_price: toNumber(item.unit_price),
        total: toNumber(item.total),
        signature: buildSignature(item)
    }));
}

function pushBySignature(map, item) {
    if (!map.has(item.signature)) map.set(item.signature, []);
    map.get(item.signature).push(item);
}

function round(value, digits = 4) {
    const factor = 10 ** digits;
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function deltaPct(before, after) {
    if (!Number.isFinite(before) || Math.abs(before) < 0.000001) return null;
    return round((after - before) / before, 6);
}

export function buildQuoteAdjustmentDeltas({ beforeQuoteJson, afterQuoteJson, quote, reasonCode, revisionId }) {
    const beforeItems = safeLineItems(beforeQuoteJson?.line_items);
    const afterItems = safeLineItems(afterQuoteJson?.line_items);
    const beforeMap = new Map();
    const afterMap = new Map();

    beforeItems.forEach((item) => pushBySignature(beforeMap, item));
    afterItems.forEach((item) => pushBySignature(afterMap, item));

    const allSignatures = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const now = Date.now();
    const rows = [];

    for (const signature of allSignatures) {
        const beforeBucket = beforeMap.get(signature) || [];
        const afterBucket = afterMap.get(signature) || [];
        const maxLen = Math.max(beforeBucket.length, afterBucket.length);

        for (let i = 0; i < maxLen; i += 1) {
            const before = beforeBucket[i] || null;
            const after = afterBucket[i] || null;
            const changeType = !before ? 'added' : !after ? 'removed' : 'updated';
            const category = after?.category || before?.category || 'Unknown';
            const itemName = after?.name || before?.name || 'Untitled Item';
            const qtyBefore = before ? before.qty : null;
            const qtyAfter = after ? after.qty : null;
            const unitPriceBefore = before ? before.unit_price : null;
            const unitPriceAfter = after ? after.unit_price : null;
            const totalBefore = before ? before.total : null;
            const totalAfter = after ? after.total : null;
            const unitPriceDelta = before && after ? round(unitPriceAfter - unitPriceBefore, 4) : null;
            const totalDelta = before && after ? round(totalAfter - totalBefore, 4) : null;
            const unitPriceDeltaPct = before && after ? deltaPct(unitPriceBefore, unitPriceAfter) : null;
            const totalDeltaPct = before && after ? deltaPct(totalBefore, totalAfter) : null;

            const changed =
                changeType !== 'updated' ||
                Math.abs(toNumber(unitPriceDelta)) > 0.000001 ||
                Math.abs(toNumber(totalDelta)) > 0.000001 ||
                Math.abs(toNumber(qtyAfter) - toNumber(qtyBefore)) > 0.000001;

            if (!changed) continue;

            rows.push({
                id: randomUUID(),
                revision_id: revisionId,
                quote_id: quote.id,
                quote_num: quote.quote_num,
                trade: quote.trade || 'General',
                category,
                item_name: itemName,
                item_signature: signature,
                change_type: changeType,
                line_index_before: before?.line_index ?? null,
                line_index_after: after?.line_index ?? null,
                qty_before: qtyBefore,
                qty_after: qtyAfter,
                unit_price_before: unitPriceBefore,
                unit_price_after: unitPriceAfter,
                unit_price_delta: unitPriceDelta,
                unit_price_delta_pct: unitPriceDeltaPct,
                total_before: totalBefore,
                total_after: totalAfter,
                total_delta: totalDelta,
                total_delta_pct: totalDeltaPct,
                suburb: quote.client_suburb || null,
                postcode: quote.client_postcode || null,
                reason_code: reasonCode || null,
                created_at: now
            });
        }
    }

    return rows;
}
