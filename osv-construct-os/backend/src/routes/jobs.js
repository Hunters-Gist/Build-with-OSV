import express from 'express';
import db from '../db/index.js';
import { randomUUID as uuidv4 } from 'crypto';
import { createTrelloCard, moveTrelloCard } from '../services/trello.js';
import { sendSubbieDispatchSMS } from '../services/communications.js';

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const jobsList = db.prepare('SELECT * FROM jobs ORDER BY updated_at DESC').all();
        res.json({ success: true, data: jobsList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, client_name, client_addr, trade, scope_notes, quote_num } = req.body;
        const id = uuidv4();
        const count = db.prepare('SELECT count(*) as count FROM jobs').get().count + 1;
        const job_num = `JOB-${count.toString().padStart(4, '0')}`;
        
        // Dynamically Push new OSV Job up to the external Trello Board in 'Later / Posted'
        const trelloRes = await createTrelloCard(
            `[${job_num}] ${title}`,
            `**Client:** ${client_name}\n**Address:** ${client_addr}\n**Trade:** ${trade}\n\n**Scope:**\n${scope_notes}`,
            process.env.TRELLO_LIST_POSTED
        );
        const trello_card_id = trelloRes.cardId || null;

        const stmt = db.prepare(`
            INSERT INTO jobs (
                id, job_num, title, client_name, client_addr, trade, scope_notes, quote_num, status, trello_card_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const now = Date.now();
        stmt.run(id, job_num, title, client_name, client_addr, trade, scope_notes, quote_num, 'Posted', trello_card_id, now, now);
        
        res.status(201).json({ success: true, id, job_num });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update assignment and operational status mappings
router.patch('/:id', async (req, res) => {
    try {
        const { assigned_sub_id, assigned_sub_name, status } = req.body;
        const id = req.params.id;
        
        const jobData = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        
        // --- 1. TRELLO BI-DIRECTIONAL MIGRATION LOGIC ---
        if (jobData && jobData.trello_card_id && status && status !== jobData.status) {
             let destList = null;
             if (status === 'Assigned') destList = process.env.TRELLO_LIST_ASSIGNED;
             if (status === 'In Progress') destList = process.env.TRELLO_LIST_IN_PROGRESS;
             if (status === 'Completed') destList = process.env.TRELLO_LIST_COMPLETED;
             
             // Move the card physically on the Kanban UI board API
             if (destList) await moveTrelloCard(jobData.trello_card_id, destList);
        }

        // --- 2. TWILIO SMS SUBCONTRACTOR DISPATCH LOGIC ---
        if (status === 'Assigned' && assigned_sub_id && jobData.status !== 'Assigned') {
            const subbie = db.prepare('SELECT phone FROM subcontractors WHERE id = ?').get(assigned_sub_id);
            if (subbie?.phone) {
                await sendSubbieDispatchSMS({
                    subbiePhone: subbie.phone,
                    subbieName: assigned_sub_name,
                    jobNum: jobData.job_num,
                    trade: jobData.trade
                });
            }
        }
        
        const stmt = db.prepare(`
            UPDATE jobs SET 
                assigned_sub_id = COALESCE(?, assigned_sub_id),
                assigned_sub_name = COALESCE(?, assigned_sub_name),
                status = COALESCE(?, status),
                updated_at = ?
            WHERE id = ?
        `);
        
        stmt.run(assigned_sub_id, assigned_sub_name, status, Date.now(), id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
