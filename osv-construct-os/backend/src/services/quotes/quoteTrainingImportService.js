import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { randomUUID } from 'crypto';
import { incrementLearningMetric } from './metricsService.js';
import { normalizeTradeLabel, upsertExternalPricingDataset } from './externalPricingTrainingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..', '..', '..');
const trainingRoot = path.join(backendRoot, 'training-data');
const inboxDir = path.join(trainingRoot, 'inbox');
const processedDir = path.join(trainingRoot, 'processed');
const failedDir = path.join(trainingRoot, 'failed');
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function slug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'dataset';
}

function stem(fileName) {
    return fileName.replace(/\.[^.]+$/, '');
}

function deriveTrade(value) {
    return normalizeTradeLabel(value);
}

function mapMetricRow(row) {
    return {
        category: row.category ?? row.Category ?? row.CATEGORY ?? null,
        description: row.description ?? row.Description ?? row.item_name ?? row.item ?? row.name ?? row.Name ?? null,
        unit: row.unit ?? row.Unit ?? null,
        base_rate_ex_gst: row.base_rate_ex_gst ?? row.base_rate ?? row.base ?? row.cost ?? row.cost_rate ?? null,
        sell_rate_ex_gst: row.sell_rate_ex_gst ?? row.sell_rate ?? row.rate ?? row.sell ?? row.price ?? null,
        notes: row.notes ?? row.Notes ?? null
    };
}

function parseJsonFile(absPath, fileName) {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    const datasets = [];
    const fileStem = stem(fileName);
    const defaultTrade = deriveTrade(fileStem);

    if (Array.isArray(parsed)) {
        datasets.push({
            datasetKey: slug(fileStem),
            trade: defaultTrade,
            metrics: parsed.map(mapMetricRow),
            bundles: []
        });
        return datasets;
    }

    if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed)) {
            if (!Array.isArray(value)) continue;
            if (key.toLowerCase().includes('bundle')) continue;
            datasets.push({
                datasetKey: slug(key),
                trade: deriveTrade(key),
                metrics: value.map(mapMetricRow),
                bundles: Array.isArray(parsed.bundles) ? parsed.bundles : []
            });
        }
    }

    if (!datasets.length && parsed?.metrics && Array.isArray(parsed.metrics)) {
        datasets.push({
            datasetKey: slug(parsed.dataset_key || fileStem),
            trade: deriveTrade(parsed.trade || fileStem),
            metrics: parsed.metrics.map(mapMetricRow),
            bundles: Array.isArray(parsed.bundles) ? parsed.bundles : []
        });
    }

    return datasets;
}

function parseWorkbook(absPath, fileName) {
    const workbook = xlsx.readFile(absPath);
    const fileStem = stem(fileName);
    const datasets = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: true });
        if (!rows.length) continue;

        const lowerSheet = sheetName.toLowerCase();
        const looksLikeBundle = lowerSheet.includes('bundle') || rows.some((row) => row.formula || row.Formula);
        if (looksLikeBundle) continue;

        const maybeBundlesSheet = workbook.SheetNames.find((name) => name.toLowerCase().includes('bundle'));
        let bundles = [];
        if (maybeBundlesSheet) {
            const bundleSheet = workbook.Sheets[maybeBundlesSheet];
            const bundleRows = xlsx.utils.sheet_to_json(bundleSheet, { defval: null, raw: true });
            bundles = bundleRows.map((row) => ({
                name: row.name ?? row.bundle_name ?? row.Name ?? null,
                formula: row.formula ?? row.Formula ?? null,
                typical_rate_per_m2_ex_gst: row.typical_rate_per_m2_ex_gst ?? row.typical_rate ?? row.rate ?? null
            }));
        }

        const tradeRow = rows.find((row) => row.trade || row.Trade);
        const firstTrade = tradeRow?.trade ?? tradeRow?.Trade ?? null;
        datasets.push({
            datasetKey: slug(`${fileStem}_${sheetName}`),
            trade: deriveTrade(firstTrade || fileStem),
            metrics: rows.map(mapMetricRow),
            bundles
        });
    }

    return datasets;
}

function moveFile(fileName, destinationDir) {
    const from = path.join(inboxDir, fileName);
    const stamped = `${Date.now()}_${fileName}`;
    const to = path.join(destinationDir, stamped);
    fs.renameSync(from, to);
    return to;
}

function importFile(db, fileName) {
    const absPath = path.join(inboxDir, fileName);
    const ext = path.extname(fileName).toLowerCase();
    let datasets = [];

    if (ext === '.json') {
        datasets = parseJsonFile(absPath, fileName);
    } else if (ext === '.xlsx') {
        datasets = parseWorkbook(absPath, fileName);
    } else {
        throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!datasets.length) {
        throw new Error('No importable datasets were found in this file.');
    }

    const result = {
        fileName,
        importedDatasets: 0,
        importedMetrics: 0,
        importedBundles: 0
    };

    for (const dataset of datasets) {
        const imported = upsertExternalPricingDataset(db, {
            datasetKey: dataset.datasetKey,
            trade: dataset.trade,
            metrics: dataset.metrics,
            bundles: dataset.bundles,
            sourceFile: fileName,
            replaceExisting: true
        });
        result.importedDatasets += 1;
        result.importedMetrics += imported.insertedMetrics;
        result.importedBundles += imported.insertedBundles;
    }

    incrementLearningMetric(db, 'external_pricing_import_runs_total', 1);
    incrementLearningMetric(db, 'external_pricing_rows_imported_total', result.importedMetrics);
    return result;
}

export function ensureTrainingImportDirs() {
    [trainingRoot, inboxDir, processedDir, failedDir].forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

export function getTrainingImportStatus(db) {
    ensureTrainingImportDirs();
    const inboxFiles = fs.readdirSync(inboxDir)
        .filter((name) => ['.json', '.xlsx'].includes(path.extname(name).toLowerCase()))
        .sort();
    const processedFiles = fs.readdirSync(processedDir).sort().slice(-20).reverse();
    const failedFiles = fs.readdirSync(failedDir).sort().slice(-20).reverse();

    const rows = db.prepare(`
        SELECT trade, COUNT(*) AS metrics_count
        FROM quote_external_pricing_metrics
        GROUP BY trade
        ORDER BY trade ASC
    `).all();
    const bundles = db.prepare(`
        SELECT trade, COUNT(*) AS bundles_count
        FROM quote_external_pricing_bundles
        GROUP BY trade
        ORDER BY trade ASC
    `).all();
    const importRuns = db.prepare(`
        SELECT metric_value, updated_at
        FROM quote_learning_metrics
        WHERE metric_key = 'external_pricing_import_runs_total'
    `).get();
    const importedRows = db.prepare(`
        SELECT metric_value, updated_at
        FROM quote_learning_metrics
        WHERE metric_key = 'external_pricing_rows_imported_total'
    `).get();

    return {
        paths: {
            trainingRoot,
            inboxDir,
            processedDir,
            failedDir
        },
        inboxFiles,
        recentProcessedFiles: processedFiles,
        recentFailedFiles: failedFiles,
        metricsByTrade: rows,
        bundlesByTrade: bundles,
        counters: {
            importRuns: Number(importRuns?.metric_value || 0),
            importedRows: Number(importedRows?.metric_value || 0),
            lastImportAt: importRuns?.updated_at || null
        }
    };
}

export function runTrainingImport(db) {
    ensureTrainingImportDirs();
    const files = fs.readdirSync(inboxDir)
        .filter((name) => ['.json', '.xlsx'].includes(path.extname(name).toLowerCase()))
        .sort();

    const results = [];
    for (const fileName of files) {
        try {
            const result = importFile(db, fileName);
            const movedTo = moveFile(fileName, processedDir);
            results.push({
                fileName,
                success: true,
                movedTo,
                ...result
            });
        } catch (error) {
            const movedTo = moveFile(fileName, failedDir);
            results.push({
                fileName,
                success: false,
                movedTo,
                error: error.message
            });
        }
    }

    const summary = {
        scannedFiles: files.length,
        successCount: results.filter((r) => r.success).length,
        failedCount: results.filter((r) => !r.success).length,
        importedDatasets: results.reduce((acc, r) => acc + Number(r.importedDatasets || 0), 0),
        importedMetrics: results.reduce((acc, r) => acc + Number(r.importedMetrics || 0), 0),
        importedBundles: results.reduce((acc, r) => acc + Number(r.importedBundles || 0), 0)
    };

    return {
        summary,
        results,
        status: getTrainingImportStatus(db)
    };
}

function sanitizeUploadFileName(fileName) {
    const base = path.basename(String(fileName || 'dataset'));
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function assertSupportedExtension(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (!['.json', '.xlsx'].includes(ext)) {
        throw new Error(`Unsupported file type: ${ext || 'unknown'}`);
    }
}

export function saveTrainingUploads(uploadFiles = []) {
    ensureTrainingImportDirs();
    if (!Array.isArray(uploadFiles) || uploadFiles.length === 0) {
        throw new Error('No files provided.');
    }

    const saved = [];
    for (const file of uploadFiles) {
        const originalName = sanitizeUploadFileName(file?.fileName || 'dataset');
        assertSupportedExtension(originalName);
        const contentBase64 = String(file?.contentBase64 || '').trim();
        if (!contentBase64) {
            throw new Error(`Empty file payload for: ${originalName}`);
        }

        const buffer = Buffer.from(contentBase64, 'base64');
        if (!buffer.length) {
            throw new Error(`Decoded file is empty: ${originalName}`);
        }
        if (buffer.length > MAX_UPLOAD_BYTES) {
            throw new Error(`File exceeds 20MB limit: ${originalName}`);
        }

        const storedName = `${Date.now()}_${randomUUID()}_${originalName}`;
        const targetPath = path.join(inboxDir, storedName);
        fs.writeFileSync(targetPath, buffer);
        saved.push({
            originalName,
            storedName,
            bytes: buffer.length
        });
    }

    return {
        savedCount: saved.length,
        files: saved
    };
}
