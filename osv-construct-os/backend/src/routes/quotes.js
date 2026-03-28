import express from 'express';
import db from '../db/index.js';
import { randomUUID } from 'crypto';
import { sendQuoteEmail } from '../services/communications.js';

const router = express.Router();

const VALID_STATUSES = ['draft', 'issued', 'accepted', 'deposit_paid', 'won', 'lost', 'sent', 'approved'];

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

// GET all quotes
router.get('/', (req, res) => {
    try {
        const quotes = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
        res.json({ success: true, data: quotes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

// GET single quote by quote_num or id
router.get('/:ref', (req, res) => {
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

// PATCH update quote status
router.patch('/:id', (req, res) => {
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

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { client_name, client_email, trade, summary, total_cost, margin, profit, final_client_quote, generated_json, status } = req.body;
        const id = randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO quotes (
                id, quote_num, client_name, client_email, trade, summary,
                total_cost, margin, profit, final_client_quote, generated_json,
                status, issued_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const quoteNum = `Q-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = Date.now();
        const nextStatus = VALID_STATUSES.includes(status) ? status : 'draft';
        const issuedAt = nextStatus === 'issued' ? now : null;
        
        stmt.run(
            id, quoteNum, client_name || 'Client', client_email || null, trade || 'General', summary || '',
            total_cost || 0, margin || 0, profit || 0, final_client_quote || 0,
            JSON.stringify(generated_json || {}), nextStatus, issuedAt, now, now
        );
        
        // --- RESEND EMAIL NOTIFICATION PIPELINE ---
        // Will asynchronously fire off the beautifully branded portal link to the client
        if (client_email) {
            await sendQuoteEmail({
                clientEmail: client_email,
                clientName: client_name || 'Valued Client',
                quoteNum: quoteNum,
                totalValue: final_client_quote || total_cost
            }).catch(e => console.error("Non-fatal email error skipped:", e));
        }
        
        res.status(201).json({ success: true, quoteId: id, quoteNum });
    } catch (error) {
        console.error("OSV Quote Route Architect Error:", error);
        res.status(500).json({ error: 'Failed to save quote and trigger OSV comms pipeline.' });
    }
});

export default router;
