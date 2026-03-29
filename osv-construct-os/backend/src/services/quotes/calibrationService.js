import { randomUUID } from 'crypto';

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 6) {
    const factor = 10 ** digits;
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function computeConfidence(sampleCount) {
    if (!Number.isFinite(sampleCount) || sampleCount <= 0) return 0;
    return round(clamp(sampleCount / 12, 0, 1), 4);
}

function normalizeTrade(trade) {
    return String(trade || 'General').trim();
}

function normalizeSignature(item) {
    const category = String(item?.category || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const name = String(item?.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const unit = String(item?.unit || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return `${category}|${name}|${unit}`;
}

export function getActivePromptProfile(db, trade) {
    const normalizedTrade = normalizeTrade(trade);
    const profile = db.prepare(`
        SELECT *
        FROM quote_prompt_profiles
        WHERE is_active = 1 AND (trade IS NULL OR trade = ?)
        ORDER BY version DESC
        LIMIT 1
    `).get(normalizedTrade);

    if (!profile) return null;

    let profileJson = null;
    try {
        profileJson = JSON.parse(profile.profile_json || '{}');
    } catch (_) {
        profileJson = null;
    }

    return {
        ...profile,
        profile_json: profileJson
    };
}

export function getCurrentProfileVersions(db) {
    const calibration = db.prepare(`
        SELECT MAX(profile_version) AS version
        FROM quote_calibration_profiles
    `).get();
    const prompt = db.prepare(`
        SELECT MAX(version) AS version
        FROM quote_prompt_profiles
        WHERE is_active = 1
    `).get();
    return {
        calibrationProfileVersion: Number(calibration?.version || 0),
        promptProfileVersion: Number(prompt?.version || 0)
    };
}

export function getCalibrationPromptHints(db, trade, options = {}) {
    const minSamples = Number(options.minSamples || 3);
    const maxRows = Number(options.maxRows || 5);
    const normalizedTrade = normalizeTrade(trade);
    const rows = db.prepare(`
        SELECT trade, category, item_name, sample_count, avg_unit_price_delta_pct, confidence, profile_version
        FROM quote_calibration_profiles
        WHERE trade = ?
          AND sample_count >= ?
          AND confidence >= 0.45
        ORDER BY sample_count DESC, ABS(avg_unit_price_delta_pct) DESC
        LIMIT ?
    `).all(normalizedTrade, minSamples, maxRows);

    if (!rows.length) {
        return { systemText: '', rows: [], profileVersion: 0 };
    }

    const profileVersion = Math.max(...rows.map((r) => Number(r.profile_version || 0)));
    const guidance = rows.map((row) => {
        const pct = round(toNumber(row.avg_unit_price_delta_pct) * 100, 1);
        const direction = pct > 0 ? 'higher' : 'lower';
        const magnitude = Math.abs(pct);
        return `- ${row.category} :: ${row.item_name || row.category}: historically adjusted ${magnitude}% ${direction} over ${row.sample_count} revisions.`;
    }).join('\n');

    const systemText = [
        'Recent manual quote edits show recurring pricing drift for this trade.',
        'Use this as a bounded bias only when evidence supports it (do not overfit):',
        guidance
    ].join('\n');

    return { systemText, rows, profileVersion };
}

export function applyCalibrationToLineItems(db, trade, lineItems, options = {}) {
    const normalizedTrade = normalizeTrade(trade);
    const minSamples = Number(options.minSamples || 3);
    const maxPct = Number(options.maxPct || 0.12);
    const rows = db.prepare(`
        SELECT *
        FROM quote_calibration_profiles
        WHERE trade = ?
          AND sample_count >= ?
          AND confidence >= 0.55
    `).all(normalizedTrade, minSamples);

    if (!rows.length || !Array.isArray(lineItems) || !lineItems.length) {
        return { lineItems, appliedAdjustments: [], profileVersion: 0 };
    }

    const profileMap = new Map();
    rows.forEach((row) => {
        profileMap.set(String(row.item_signature || ''), row);
    });

    const allowMaterials = options.allowMaterials !== false;
    const appliedAdjustments = [];
    const nextItems = lineItems.map((item, idx) => {
        const category = String(item?.category || 'Unknown');
        if (!allowMaterials && category === 'Materials') return item;

        const signature = normalizeSignature(item);
        const profile = profileMap.get(signature);
        if (!profile) return item;

        const pct = clamp(toNumber(profile.avg_unit_price_delta_pct), -maxPct, maxPct);
        if (Math.abs(pct) < 0.005) return item;

        const qty = toNumber(item.qty, 0);
        const unitPrice = toNumber(item.unit_price, 0);
        const adjustedUnitPrice = round(unitPrice * (1 + pct), 4);
        const adjustedTotal = qty > 0 ? round(qty * adjustedUnitPrice, 2) : toNumber(item.total, 0);

        appliedAdjustments.push({
            line_item_index: idx,
            category,
            item_name: item.name || profile.item_name || 'Item',
            applied_pct: pct,
            sample_count: profile.sample_count,
            confidence: profile.confidence
        });

        return {
            ...item,
            unit_price: adjustedUnitPrice,
            total: adjustedTotal
        };
    });

    const profileVersion = Math.max(...rows.map((row) => Number(row.profile_version || 0)), 0);
    return { lineItems: nextItems, appliedAdjustments, profileVersion };
}

export function updateCalibrationFromDeltas(db, { revisionId, quote, deltas }) {
    if (!Array.isArray(deltas) || deltas.length === 0) {
        return { updatedProfiles: 0, profileVersion: getCurrentProfileVersions(db).calibrationProfileVersion };
    }

    const normalizedTrade = normalizeTrade(quote?.trade);
    const now = Date.now();
    const profileVersion = getCurrentProfileVersions(db).calibrationProfileVersion + 1;
    const selectStmt = db.prepare(`
        SELECT *
        FROM quote_calibration_profiles
        WHERE trade = ? AND category = ? AND item_signature = ?
    `);
    const upsertStmt = db.prepare(`
        INSERT INTO quote_calibration_profiles (
            id, trade, category, item_signature, item_name,
            sample_count, avg_unit_price_delta_pct, avg_total_delta_pct,
            confidence, profile_version, last_revision_id, last_updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trade, category, item_signature)
        DO UPDATE SET
            item_name = excluded.item_name,
            sample_count = excluded.sample_count,
            avg_unit_price_delta_pct = excluded.avg_unit_price_delta_pct,
            avg_total_delta_pct = excluded.avg_total_delta_pct,
            confidence = excluded.confidence,
            profile_version = excluded.profile_version,
            last_revision_id = excluded.last_revision_id,
            last_updated_at = excluded.last_updated_at
    `);

    let updatedProfiles = 0;
    const tx = db.transaction(() => {
        for (const delta of deltas) {
            if (!['updated', 'added'].includes(delta.change_type)) continue;
            const unitPct = Number(delta.unit_price_delta_pct);
            const totalPct = Number(delta.total_delta_pct);
            if (!Number.isFinite(unitPct) && !Number.isFinite(totalPct)) continue;

            const category = String(delta.category || 'Unknown');
            const signature = String(delta.item_signature || '');
            if (!signature) continue;

            const existing = selectStmt.get(normalizedTrade, category, signature);
            const priorCount = Number(existing?.sample_count || 0);
            const nextCount = priorCount + 1;
            const priorUnitAvg = toNumber(existing?.avg_unit_price_delta_pct, 0);
            const priorTotalAvg = toNumber(existing?.avg_total_delta_pct, 0);
            const nextUnitAvg = Number.isFinite(unitPct)
                ? round(((priorUnitAvg * priorCount) + unitPct) / nextCount, 6)
                : priorUnitAvg;
            const nextTotalAvg = Number.isFinite(totalPct)
                ? round(((priorTotalAvg * priorCount) + totalPct) / nextCount, 6)
                : priorTotalAvg;
            const confidence = computeConfidence(nextCount);

            upsertStmt.run(
                existing?.id || randomUUID(),
                normalizedTrade,
                category,
                signature,
                delta.item_name || existing?.item_name || null,
                nextCount,
                nextUnitAvg,
                nextTotalAvg,
                confidence,
                profileVersion,
                revisionId,
                now
            );
            updatedProfiles += 1;
        }
    });
    tx();

    return { updatedProfiles, profileVersion };
}
