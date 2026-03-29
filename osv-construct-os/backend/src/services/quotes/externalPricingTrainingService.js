import { randomUUID, createHash } from 'crypto';

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function titleCase(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeTradeLabel(input) {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) return 'General';
    if (raw.includes('deck')) return 'Decking';
    if (raw.includes('fenc')) return 'Fencing';
    if (raw.includes('retaining')) return 'Retaining Wall';
    if (raw.includes('pergola')) return 'Pergola';
    if (raw.includes('landscap')) return 'Landscaping';
    if (raw.includes('paint')) return 'Painting';
    if (raw.includes('carpent')) return 'Carpentry';
    return titleCase(raw);
}

function rowSignature(row) {
    const joined = [
        normalizeText(row.category).toLowerCase(),
        normalizeText(row.item_name).toLowerCase(),
        normalizeText(row.unit).toLowerCase()
    ].join('|');
    return createHash('sha1').update(joined).digest('hex');
}

export function upsertExternalPricingDataset(db, payload) {
    const {
        datasetKey,
        trade,
        metrics = [],
        bundles = [],
        sourceFile = '',
        replaceExisting = true
    } = payload || {};

    const normalizedDatasetKey = normalizeText(datasetKey).toLowerCase() || 'default';
    const normalizedTrade = normalizeTradeLabel(trade);
    const importedAt = Date.now();

    const deleteMetricsStmt = db.prepare(`
        DELETE FROM quote_external_pricing_metrics
        WHERE dataset_key = ? AND trade = ?
    `);
    const deleteBundlesStmt = db.prepare(`
        DELETE FROM quote_external_pricing_bundles
        WHERE dataset_key = ? AND trade = ?
    `);
    const upsertMetricStmt = db.prepare(`
        INSERT INTO quote_external_pricing_metrics (
            id, dataset_key, trade, category, item_name, unit,
            base_rate_ex_gst, sell_rate_ex_gst, notes, source_file, row_signature, imported_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dataset_key, trade, row_signature)
        DO UPDATE SET
            category = excluded.category,
            item_name = excluded.item_name,
            unit = excluded.unit,
            base_rate_ex_gst = excluded.base_rate_ex_gst,
            sell_rate_ex_gst = excluded.sell_rate_ex_gst,
            notes = excluded.notes,
            source_file = excluded.source_file,
            imported_at = excluded.imported_at
    `);
    const upsertBundleStmt = db.prepare(`
        INSERT INTO quote_external_pricing_bundles (
            id, dataset_key, trade, bundle_name, formula, typical_rate_per_m2_ex_gst, source_file, imported_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dataset_key, trade, bundle_name)
        DO UPDATE SET
            formula = excluded.formula,
            typical_rate_per_m2_ex_gst = excluded.typical_rate_per_m2_ex_gst,
            source_file = excluded.source_file,
            imported_at = excluded.imported_at
    `);

    const tx = db.transaction(() => {
        if (replaceExisting) {
            deleteMetricsStmt.run(normalizedDatasetKey, normalizedTrade);
            deleteBundlesStmt.run(normalizedDatasetKey, normalizedTrade);
        }

        let insertedMetrics = 0;
        for (const metric of metrics) {
            const itemName = normalizeText(metric.item_name || metric.description || metric.name);
            if (!itemName) continue;
            const row = {
                category: normalizeText(metric.category || null) || null,
                item_name: itemName,
                unit: normalizeText(metric.unit || null) || null,
                base_rate_ex_gst: toNumber(metric.base_rate_ex_gst),
                sell_rate_ex_gst: toNumber(metric.sell_rate_ex_gst),
                notes: normalizeText(metric.notes || null) || null
            };
            upsertMetricStmt.run(
                randomUUID(),
                normalizedDatasetKey,
                normalizedTrade,
                row.category,
                row.item_name,
                row.unit,
                row.base_rate_ex_gst,
                row.sell_rate_ex_gst,
                row.notes,
                sourceFile || null,
                rowSignature(row),
                importedAt
            );
            insertedMetrics += 1;
        }

        let insertedBundles = 0;
        for (const bundle of bundles) {
            const bundleName = normalizeText(bundle.bundle_name || bundle.name);
            if (!bundleName) continue;
            upsertBundleStmt.run(
                randomUUID(),
                normalizedDatasetKey,
                normalizedTrade,
                bundleName,
                normalizeText(bundle.formula || null) || null,
                toNumber(bundle.typical_rate_per_m2_ex_gst),
                sourceFile || null,
                importedAt
            );
            insertedBundles += 1;
        }

        return { insertedMetrics, insertedBundles };
    });

    const result = tx();
    return {
        trade: normalizedTrade,
        datasetKey: normalizedDatasetKey,
        ...result
    };
}

export function getExternalPricingPromptHints(db, trade, options = {}) {
    const normalizedTrade = normalizeTradeLabel(trade);
    const maxMetrics = Math.max(1, Number(options.maxMetrics || 8));
    const maxBundles = Math.max(0, Number(options.maxBundles || 3));

    const metrics = db.prepare(`
        SELECT
            category,
            item_name,
            unit,
            MAX(sell_rate_ex_gst) AS sell_rate_ex_gst,
            MAX(notes) AS notes
        FROM quote_external_pricing_metrics
        WHERE trade = ?
          AND sell_rate_ex_gst IS NOT NULL
        GROUP BY category, item_name, unit
        ORDER BY MAX(sell_rate_ex_gst) DESC, item_name ASC
        LIMIT ?
    `).all(normalizedTrade, maxMetrics);
    const bundles = db.prepare(`
        SELECT bundle_name, formula, typical_rate_per_m2_ex_gst
        FROM quote_external_pricing_bundles
        WHERE trade = ?
        ORDER BY typical_rate_per_m2_ex_gst DESC, bundle_name ASC
        LIMIT ?
    `).all(normalizedTrade, maxBundles);

    if (!metrics.length && !bundles.length) {
        return {
            rows: [],
            bundles: [],
            systemText: ''
        };
    }

    const metricLines = metrics.map((row) => {
        const category = row.category ? `[${row.category}] ` : '';
        const unit = row.unit ? ` / ${row.unit}` : '';
        const notes = row.notes ? ` (${row.notes})` : '';
        return `- ${category}${row.item_name}: typical sell ${Number(row.sell_rate_ex_gst).toFixed(2)} ex GST${unit}${notes}`;
    });
    const bundleLines = bundles.map((row) => {
        const rate = Number.isFinite(Number(row.typical_rate_per_m2_ex_gst))
            ? `${Number(row.typical_rate_per_m2_ex_gst).toFixed(2)} ex GST/m2`
            : 'rate not specified';
        const formula = row.formula ? ` formula: ${row.formula}` : '';
        return `- ${row.bundle_name}: ${rate}.${formula}`;
    });

    const sections = [
        `Imported pricing dataset is available for ${normalizedTrade}. Use these figures as pricing anchors when the scope matches:`,
        ...metricLines
    ];
    if (bundleLines.length) {
        sections.push('Package rates from imported data:');
        sections.push(...bundleLines);
    }

    return {
        rows: metrics,
        bundles,
        systemText: sections.join('\n')
    };
}
