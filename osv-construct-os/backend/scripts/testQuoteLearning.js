import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { buildQuoteAdjustmentDeltas } from '../src/services/quotes/deltaEngine.js';
import { applyCalibrationToLineItems, updateCalibrationFromDeltas } from '../src/services/quotes/calibrationService.js';

function setupDb() {
    const db = new Database(':memory:');
    db.exec(`
        CREATE TABLE quote_calibration_profiles (
            id TEXT PRIMARY KEY,
            trade TEXT NOT NULL,
            category TEXT NOT NULL,
            item_signature TEXT NOT NULL,
            item_name TEXT,
            sample_count INTEGER NOT NULL DEFAULT 0,
            avg_unit_price_delta_pct REAL NOT NULL DEFAULT 0,
            avg_total_delta_pct REAL NOT NULL DEFAULT 0,
            confidence REAL NOT NULL DEFAULT 0,
            profile_version INTEGER NOT NULL DEFAULT 1,
            last_revision_id TEXT,
            last_updated_at INTEGER,
            UNIQUE(trade, category, item_signature)
        );
        CREATE TABLE quote_prompt_profiles (
            id TEXT PRIMARY KEY,
            version INTEGER NOT NULL UNIQUE,
            trade TEXT,
            summary TEXT,
            profile_json TEXT NOT NULL,
            generated_from_json TEXT,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_by TEXT,
            created_at INTEGER,
            approved_at INTEGER
        );
    `);
    return db;
}

function testDeltaExtraction() {
    const quote = {
        id: 'q-1',
        quote_num: 'Q-1001',
        trade: 'Decking',
        client_suburb: 'Richmond',
        client_postcode: '3121'
    };
    const beforeQuoteJson = {
        line_items: [
            { category: 'Materials', name: 'Merbau Board', qty: 10, unit: 'item', unit_price: 20, total: 200 },
            { category: 'Labour', name: 'Install Crew', qty: 8, unit: 'hrs', unit_price: 80, total: 640 }
        ]
    };
    const afterQuoteJson = {
        line_items: [
            { category: 'Materials', name: 'Merbau Board', qty: 10, unit: 'item', unit_price: 23, total: 230 },
            { category: 'Labour', name: 'Install Crew', qty: 8, unit: 'hrs', unit_price: 80, total: 640 }
        ]
    };
    const deltas = buildQuoteAdjustmentDeltas({
        beforeQuoteJson,
        afterQuoteJson,
        quote,
        reasonCode: 'supplier_update',
        revisionId: 'rev-1'
    });
    assert.equal(deltas.length, 1, 'Expected one changed line item delta');
    assert.equal(deltas[0].item_name, 'Merbau Board');
    assert.equal(deltas[0].change_type, 'updated');
    assert.equal(deltas[0].reason_code, 'supplier_update');
    assert.ok(deltas[0].unit_price_delta_pct > 0);
}

function testCalibrationUpdateAndApply() {
    const db = setupDb();
    const quote = { trade: 'Decking' };
    const deltas = Array.from({ length: 8 }).map((_, idx) => ({
        change_type: 'updated',
        category: 'Materials',
        item_signature: 'materials|merbau board|item',
        item_name: 'Merbau Board',
        unit_price_delta_pct: 0.1 + (idx * 0.01),
        total_delta_pct: 0.1 + (idx * 0.01)
    }));

    const result = updateCalibrationFromDeltas(db, { revisionId: 'rev-1', quote, deltas });
    assert.ok(result.updatedProfiles >= 1, 'Expected at least one profile update');

    const applied = applyCalibrationToLineItems(db, 'Decking', [
        { category: 'Materials', name: 'Merbau Board', unit: 'item', qty: 10, unit_price: 20, total: 200 }
    ], { allowMaterials: true, minSamples: 3, maxPct: 0.12 });

    assert.equal(applied.lineItems.length, 1);
    assert.ok(applied.appliedAdjustments.length >= 1, 'Expected calibration adjustment to apply');
    assert.ok(applied.lineItems[0].unit_price > 20, 'Expected adjusted unit price to increase');
}

function run() {
    testDeltaExtraction();
    testCalibrationUpdateAndApply();
    console.log('Quote learning tests passed.');
}

run();
