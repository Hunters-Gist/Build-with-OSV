import express from 'express';
import db from '../db/index.js';
import { randomUUID } from 'crypto';
import { sendQuoteEmail } from '../services/communications.js';
import { buildQuoteAdjustmentDeltas } from '../services/quotes/deltaEngine.js';
import { updateCalibrationFromDeltas, getCurrentProfileVersions } from '../services/quotes/calibrationService.js';
import { incrementLearningMetric } from '../services/quotes/metricsService.js';
import { requireAuth, requireAdminRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateRequest.js';
import {
    createQuoteBodySchema,
    patchQuoteStatusBodySchema,
    quoteRevisionBodySchema
} from '../validation/requestSchemas.js';
import { issuePortalTokenForQuote } from '../services/quotePortalSecurity.js';

const router = express.Router();
const shouldEnforceAdminAuth = String(process.env.ENFORCE_ADMIN_AUTH || 'false').toLowerCase() === 'true';
const adminRouteMiddleware = shouldEnforceAdminAuth ? [requireAuth, requireAdminRoles] : [];

const VALID_STATUSES = ['draft', 'issued', 'accepted', 'deposit_paid', 'won', 'lost', 'sent', 'approved'];
const VALID_EDIT_REASONS = new Set([
    'client_request',
    'scope_change',
    'supplier_update',
    'risk_adjustment',
    'compliance_adjustment',
    'rounding_correction',
    'internal_quality_control',
    'other'
]);

function safeParseJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (_) {
        return {};
    }
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCsv(rows, columns) {
    const header = columns.map((col) => csvEscape(col.header)).join(',');
    const lines = rows.map((row) => columns.map((col) => csvEscape(row[col.key])).join(','));
    return [header, ...lines].join('\n');
}

function parseTimeInput(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}

const ALLOWED_TRANSITIONS = {
    draft: new Set(['issued', 'lost']),
    issued: new Set(['accepted', 'lost']),
    accepted: new Set(['deposit_paid', 'lost']),
    deposit_paid: new Set(['won', 'lost']),
    won: new Set([]),
    lost: new Set([]),
    // Backward compatibility with legacy statuses
    sent: new Set(['approved', 'won', 'lost']),
    approved: new Set(['won', 'lost'])
};

// GET all quotes (admin)
router.get('/', ...adminRouteMiddleware, (req, res) => {
    try {
        const quotes = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
        res.json({ success: true, data: quotes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

// GET all revision deltas as CSV (admin)
router.get('/revisions/deltas.csv', ...adminRouteMiddleware, (req, res) => {
    try {
        const now = Date.now();
        const defaultFrom = now - (30 * 24 * 60 * 60 * 1000);
        const fromTs = parseTimeInput(req.query.from, defaultFrom);
        const toTs = parseTimeInput(req.query.to, now);
        const quoteRef = String(req.query.quote || '').trim();
        const maxRows = Math.min(Math.max(Number(req.query.limit || 5000), 1), 20000);

        let quoteId = null;
        if (quoteRef) {
            const quote = db.prepare('SELECT id FROM quotes WHERE id = ? OR quote_num = ?').get(quoteRef, quoteRef);
            if (!quote) return res.status(404).json({ error: 'Quote filter did not match any quote.' });
            quoteId = quote.id;
        }

        const rows = quoteId
            ? db.prepare(`
                SELECT
                    d.id,
                    d.quote_num,
                    d.trade,
                    d.category,
                    d.item_name,
                    d.change_type,
                    d.qty_before,
                    d.qty_after,
                    d.unit_price_before,
                    d.unit_price_after,
                    d.unit_price_delta,
                    d.unit_price_delta_pct,
                    d.total_before,
                    d.total_after,
                    d.total_delta,
                    d.total_delta_pct,
                    d.reason_code,
                    d.revision_id,
                    r.edit_reason,
                    r.edit_notes,
                    r.edited_by,
                    r.created_at AS revision_created_at
                FROM quote_adjustment_deltas d
                JOIN quote_revisions r ON r.id = d.revision_id
                WHERE d.quote_id = ?
                  AND r.created_at BETWEEN ? AND ?
                ORDER BY r.created_at DESC, d.created_at DESC
                LIMIT ?
            `).all(quoteId, fromTs, toTs, maxRows)
            : db.prepare(`
                SELECT
                    d.id,
                    d.quote_num,
                    d.trade,
                    d.category,
                    d.item_name,
                    d.change_type,
                    d.qty_before,
                    d.qty_after,
                    d.unit_price_before,
                    d.unit_price_after,
                    d.unit_price_delta,
                    d.unit_price_delta_pct,
                    d.total_before,
                    d.total_after,
                    d.total_delta,
                    d.total_delta_pct,
                    d.reason_code,
                    d.revision_id,
                    r.edit_reason,
                    r.edit_notes,
                    r.edited_by,
                    r.created_at AS revision_created_at
                FROM quote_adjustment_deltas d
                JOIN quote_revisions r ON r.id = d.revision_id
                WHERE r.created_at BETWEEN ? AND ?
                ORDER BY r.created_at DESC, d.created_at DESC
                LIMIT ?
            `).all(fromTs, toTs, maxRows);

        const csv = toCsv(rows, [
            { key: 'id', header: 'delta_id' },
            { key: 'quote_num', header: 'quote_num' },
            { key: 'trade', header: 'trade' },
            { key: 'category', header: 'category' },
            { key: 'item_name', header: 'item_name' },
            { key: 'change_type', header: 'change_type' },
            { key: 'qty_before', header: 'qty_before' },
            { key: 'qty_after', header: 'qty_after' },
            { key: 'unit_price_before', header: 'unit_price_before' },
            { key: 'unit_price_after', header: 'unit_price_after' },
            { key: 'unit_price_delta', header: 'unit_price_delta' },
            { key: 'unit_price_delta_pct', header: 'unit_price_delta_pct' },
            { key: 'total_before', header: 'total_before' },
            { key: 'total_after', header: 'total_after' },
            { key: 'total_delta', header: 'total_delta' },
            { key: 'total_delta_pct', header: 'total_delta_pct' },
            { key: 'reason_code', header: 'reason_code' },
            { key: 'revision_id', header: 'revision_id' },
            { key: 'edit_reason', header: 'edit_reason' },
            { key: 'edit_notes', header: 'edit_notes' },
            { key: 'edited_by', header: 'edited_by' },
            { key: 'revision_created_at', header: 'revision_created_at' }
        ]);

        const filename = quoteRef
            ? `quote_${quoteRef}_revision_deltas.csv`
            : `revision_deltas_${fromTs}_${toTs}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export revision deltas CSV' });
    }
});

// Get single quote (admin)
router.get('/:ref', ...adminRouteMiddleware, (req, res) => {
    try {
        const ref = req.params.ref;
        const quote = db.prepare('SELECT * FROM quotes WHERE quote_num = ? OR id = ?').get(ref, ref);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        res.json({ success: true, data: quote });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

// PATCH update quote status (admin/backoffice)
router.patch('/:id', ...adminRouteMiddleware, validateBody(patchQuoteStatusBodySchema), (req, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id;

        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        const existing = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_num = ?').get(id, id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });

        const nextStatus = status || existing.status;
        if (status && status !== existing.status) {
            const allowed = ALLOWED_TRANSITIONS[existing.status] || new Set();
            if (!allowed.has(status)) {
                return res.status(400).json({
                    error: `Invalid status transition from ${existing.status} to ${status}`
                });
            }
        }

        const now = Date.now();
        const issuedAt = (nextStatus === 'issued' && existing.status !== 'issued') ? now : existing.issued_at;
        const acceptedAt = (nextStatus === 'accepted' && existing.status !== 'accepted') ? now : existing.accepted_at;
        const depositPaidAt = (nextStatus === 'deposit_paid' && existing.status !== 'deposit_paid') ? now : existing.deposit_paid_at;
        const sentAt = (nextStatus === 'sent' && existing.status !== 'sent') ? now : existing.sent_at;

        db.prepare(`
            UPDATE quotes
            SET status = COALESCE(?, status),
                sent_at = ?,
                issued_at = ?,
                accepted_at = ?,
                deposit_paid_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(status, sentAt, issuedAt, acceptedAt, depositPaidAt, now, existing.id);
        let portalPayload = null;
        if (nextStatus === 'issued') {
            try {
                portalPayload = issuePortalTokenForQuote(db, existing.id);
            } catch (tokenError) {
                console.error('Failed to issue portal token for quote:', tokenError.message);
            }
        }

        res.json({ success: true, portal: portalPayload ? { token: portalPayload.token, expiresAt: portalPayload.expiresAt } : null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

router.post('/', ...adminRouteMiddleware, validateBody(createQuoteBodySchema), async (req, res) => {
    try {
        const {
            client_name,
            client_email,
            client_addr,
            client_suburb,
            client_postcode,
            trade,
            summary,
            total_cost,
            margin,
            profit,
            final_client_quote,
            generated_json,
            status
        } = req.body;
        const id = randomUUID();
        const parsedGenerated = safeParseJson(generated_json);
        const learningContext = parsedGenerated?.learning_context || {};
        const currentVersions = getCurrentProfileVersions(db);
        const calibrationVersion = Number(learningContext.calibrationProfileVersion || currentVersions.calibrationProfileVersion || 0);
        const promptVersion = Number(learningContext.promptProfileVersion || currentVersions.promptProfileVersion || 0);
        
        const stmt = db.prepare(`
            INSERT INTO quotes (
                id, quote_num, client_name, client_email, client_addr, client_suburb, client_postcode, trade, summary,
                total_cost, margin, profit, final_client_quote, generated_json,
                status, issued_at, calibration_profile_version, prompt_profile_version, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const quoteNum = `Q-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = Date.now();
        const nextStatus = VALID_STATUSES.includes(status) ? status : 'draft';
        const issuedAt = nextStatus === 'issued' ? now : null;
        
        stmt.run(
            id,
            quoteNum,
            client_name || 'Client',
            client_email || null,
            client_addr || null,
            client_suburb || null,
            client_postcode || null,
            trade || 'General',
            summary || '',
            total_cost || 0, margin || 0, profit || 0, final_client_quote || 0,
            JSON.stringify(parsedGenerated || {}), nextStatus, issuedAt, calibrationVersion, promptVersion, now, now
        );
        let portalPayload = null;
        if (nextStatus === 'issued') {
            try {
                portalPayload = issuePortalTokenForQuote(db, id);
            } catch (tokenError) {
                console.error('Failed to create portal token while saving quote:', tokenError.message);
            }
        }
        
        // --- RESEND EMAIL NOTIFICATION PIPELINE ---
        // Will asynchronously fire off the beautifully branded portal link to the client
        if (client_email) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://osv-saa-s.vercel.app';
            const portalUrl = portalPayload?.token
                ? `${frontendUrl}/client/quote/${quoteNum}?token=${encodeURIComponent(portalPayload.token)}`
                : `${frontendUrl}/client/quote/${quoteNum}`;
            await sendQuoteEmail({
                clientEmail: client_email,
                clientName: client_name || 'Valued Client',
                quoteNum: quoteNum,
                totalValue: final_client_quote || total_cost,
                portalUrl
            }).catch(e => console.error("Non-fatal email error skipped:", e));
        }
        
        res.status(201).json({
            success: true,
            quoteId: id,
            quoteNum,
            portal: portalPayload ? { token: portalPayload.token, expiresAt: portalPayload.expiresAt } : null
        });
    } catch (error) {
        console.error("OSV Quote Route Architect Error:", error);
        res.status(500).json({ error: 'Failed to save quote and trigger OSV comms pipeline.' });
    }
});

router.post('/:id/revisions', ...adminRouteMiddleware, validateBody(quoteRevisionBodySchema), (req, res) => {
    try {
        const id = req.params.id;
        const existing = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_num = ?').get(id, id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });

        const {
            generated_json,
            summary,
            total_cost,
            margin,
            profit,
            final_client_quote,
            edit_reason,
            edit_notes,
            edited_by,
            edit_source
        } = req.body || {};

        if (!edit_reason || !VALID_EDIT_REASONS.has(edit_reason)) {
            return res.status(400).json({
                error: `Invalid edit reason. Must be one of: ${Array.from(VALID_EDIT_REASONS).join(', ')}`
            });
        }
        if (!generated_json || typeof generated_json !== 'object') {
            return res.status(400).json({ error: 'generated_json is required for revision updates.' });
        }

        const beforeJson = safeParseJson(existing.generated_json);
        const afterJson = generated_json;
        const revisionId = randomUUID();
        const now = Date.now();
        const safeSummary = summary || existing.summary || beforeJson.scope_summary || '';
        const safeTotalCost = Number.isFinite(Number(total_cost)) ? Number(total_cost) : Number(existing.total_cost || 0);
        const safeMargin = Number.isFinite(Number(margin)) ? Number(margin) : Number(existing.margin || 0);
        const safeProfit = Number.isFinite(Number(profit)) ? Number(profit) : Number(existing.profit || 0);
        const safeFinalClientQuote = Number.isFinite(Number(final_client_quote)) ? Number(final_client_quote) : Number(existing.final_client_quote || 0);

        const deltas = buildQuoteAdjustmentDeltas({
            beforeQuoteJson: beforeJson,
            afterQuoteJson: afterJson,
            quote: existing,
            reasonCode: edit_reason,
            revisionId
        });

        const insertRevisionStmt = db.prepare(`
            INSERT INTO quote_revisions (
                id, quote_id, quote_num, edit_reason, edit_notes, edited_by, edit_source,
                before_json, after_json, before_total, after_total, delta_total, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertDeltaStmt = db.prepare(`
            INSERT INTO quote_adjustment_deltas (
                id, revision_id, quote_id, quote_num, trade, category, item_name, item_signature,
                change_type, line_index_before, line_index_after, qty_before, qty_after,
                unit_price_before, unit_price_after, unit_price_delta, unit_price_delta_pct,
                total_before, total_after, total_delta, total_delta_pct, suburb, postcode, reason_code, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateQuoteStmt = db.prepare(`
            UPDATE quotes
            SET summary = ?,
                total_cost = ?,
                margin = ?,
                profit = ?,
                final_client_quote = ?,
                generated_json = ?,
                updated_at = ?
            WHERE id = ?
        `);

        const transaction = db.transaction(() => {
            updateQuoteStmt.run(
                safeSummary,
                safeTotalCost,
                safeMargin,
                safeProfit,
                safeFinalClientQuote,
                JSON.stringify(afterJson),
                now,
                existing.id
            );

            insertRevisionStmt.run(
                revisionId,
                existing.id,
                existing.quote_num,
                edit_reason,
                edit_notes || null,
                edited_by || 'backoffice',
                edit_source || 'backoffice',
                JSON.stringify(beforeJson),
                JSON.stringify(afterJson),
                Number(existing.final_client_quote || 0),
                safeFinalClientQuote,
                Number((safeFinalClientQuote - Number(existing.final_client_quote || 0)).toFixed(2)),
                now
            );

            deltas.forEach((delta) => {
                insertDeltaStmt.run(
                    delta.id,
                    delta.revision_id,
                    delta.quote_id,
                    delta.quote_num,
                    delta.trade,
                    delta.category,
                    delta.item_name,
                    delta.item_signature,
                    delta.change_type,
                    delta.line_index_before,
                    delta.line_index_after,
                    delta.qty_before,
                    delta.qty_after,
                    delta.unit_price_before,
                    delta.unit_price_after,
                    delta.unit_price_delta,
                    delta.unit_price_delta_pct,
                    delta.total_before,
                    delta.total_after,
                    delta.total_delta,
                    delta.total_delta_pct,
                    delta.suburb,
                    delta.postcode,
                    delta.reason_code,
                    delta.created_at
                );
            });

            return updateCalibrationFromDeltas(db, {
                revisionId,
                quote: existing,
                deltas
            });
        });

        const calibrationUpdate = transaction();
        const nextVersions = getCurrentProfileVersions(db);
        incrementLearningMetric(db, 'revisions_captured_total', 1);
        incrementLearningMetric(db, 'deltas_captured_total', deltas.length);
        incrementLearningMetric(db, 'calibration_profiles_updated_total', calibrationUpdate.updatedProfiles || 0);
        incrementLearningMetric(db, `calibration_profile_version_${calibrationUpdate.profileVersion || nextVersions.calibrationProfileVersion}_uses`, 1);

        res.status(201).json({
            success: true,
            data: {
                revision_id: revisionId,
                quote_id: existing.id,
                quote_num: existing.quote_num,
                deltas_captured: deltas.length,
                calibration_profiles_updated: calibrationUpdate.updatedProfiles || 0,
                calibration_profile_version: calibrationUpdate.profileVersion || nextVersions.calibrationProfileVersion,
                prompt_profile_version: nextVersions.promptProfileVersion
            }
        });
    } catch (error) {
        console.error(error);
        incrementLearningMetric(db, 'quote_revision_errors_total', 1);
        res.status(500).json({ error: 'Failed to save quote revision' });
    }
});

router.get('/:id/revisions', ...adminRouteMiddleware, (req, res) => {
    try {
        const id = req.params.id;
        const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
        const existing = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_num = ?').get(id, id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });

        const revisions = db.prepare(`
            SELECT r.*,
                   (
                    SELECT COUNT(*)
                    FROM quote_adjustment_deltas d
                    WHERE d.revision_id = r.id
                   ) AS deltas_count
            FROM quote_revisions r
            WHERE r.quote_id = ?
            ORDER BY r.created_at DESC
            LIMIT ?
        `).all(existing.id, limit);

        res.json({
            success: true,
            data: {
                quote_id: existing.id,
                quote_num: existing.quote_num,
                revisions
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quote revisions' });
    }
});

router.get('/:id/revisions/deltas.csv', ...adminRouteMiddleware, (req, res) => {
    try {
        const id = req.params.id;
        const existing = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_num = ?').get(id, id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });

        const rows = db.prepare(`
            SELECT
                d.id,
                d.revision_id,
                d.quote_num,
                d.trade,
                d.category,
                d.item_name,
                d.item_signature,
                d.change_type,
                d.qty_before,
                d.qty_after,
                d.unit_price_before,
                d.unit_price_after,
                d.unit_price_delta,
                d.unit_price_delta_pct,
                d.total_before,
                d.total_after,
                d.total_delta,
                d.total_delta_pct,
                d.reason_code,
                r.edit_reason,
                r.edit_notes,
                r.edited_by,
                r.created_at AS revision_created_at
            FROM quote_adjustment_deltas d
            JOIN quote_revisions r ON r.id = d.revision_id
            WHERE d.quote_id = ?
            ORDER BY r.created_at DESC, d.created_at DESC
        `).all(existing.id);

        const csv = toCsv(rows, [
            { key: 'id', header: 'delta_id' },
            { key: 'revision_id', header: 'revision_id' },
            { key: 'quote_num', header: 'quote_num' },
            { key: 'trade', header: 'trade' },
            { key: 'category', header: 'category' },
            { key: 'item_name', header: 'item_name' },
            { key: 'item_signature', header: 'item_signature' },
            { key: 'change_type', header: 'change_type' },
            { key: 'qty_before', header: 'qty_before' },
            { key: 'qty_after', header: 'qty_after' },
            { key: 'unit_price_before', header: 'unit_price_before' },
            { key: 'unit_price_after', header: 'unit_price_after' },
            { key: 'unit_price_delta', header: 'unit_price_delta' },
            { key: 'unit_price_delta_pct', header: 'unit_price_delta_pct' },
            { key: 'total_before', header: 'total_before' },
            { key: 'total_after', header: 'total_after' },
            { key: 'total_delta', header: 'total_delta' },
            { key: 'total_delta_pct', header: 'total_delta_pct' },
            { key: 'reason_code', header: 'reason_code' },
            { key: 'edit_reason', header: 'edit_reason' },
            { key: 'edit_notes', header: 'edit_notes' },
            { key: 'edited_by', header: 'edited_by' },
            { key: 'revision_created_at', header: 'revision_created_at' }
        ]);

        const safeQuoteNum = String(existing.quote_num || existing.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="quote_${safeQuoteNum}_revision_deltas.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export quote revision deltas CSV' });
    }
});

router.get('/:id/revisions/:revisionId/deltas', ...adminRouteMiddleware, (req, res) => {
    try {
        const id = req.params.id;
        const revisionId = req.params.revisionId;
        const existing = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_num = ?').get(id, id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });

        const revision = db.prepare(`
            SELECT id, quote_id, quote_num, edit_reason, edit_notes, created_at
            FROM quote_revisions
            WHERE id = ? AND quote_id = ?
        `).get(revisionId, existing.id);
        if (!revision) return res.status(404).json({ error: 'Revision not found for quote' });

        const deltas = db.prepare(`
            SELECT
                id,
                category,
                item_name,
                item_signature,
                change_type,
                line_index_before,
                line_index_after,
                qty_before,
                qty_after,
                unit_price_before,
                unit_price_after,
                unit_price_delta,
                unit_price_delta_pct,
                total_before,
                total_after,
                total_delta,
                total_delta_pct,
                reason_code,
                created_at
            FROM quote_adjustment_deltas
            WHERE revision_id = ?
            ORDER BY
                CASE change_type
                    WHEN 'updated' THEN 0
                    WHEN 'added' THEN 1
                    WHEN 'removed' THEN 2
                    ELSE 3
                END,
                category ASC,
                item_name ASC
        `).all(revisionId);

        res.json({
            success: true,
            data: {
                quote_id: existing.id,
                quote_num: existing.quote_num,
                revision,
                deltas
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch revision deltas' });
    }
});

export default router;
