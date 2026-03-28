import express from 'express';
import db from '../db/index.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all leads
router.get('/', (req, res) => {
    try {
        const leads = db.prepare(`SELECT * FROM leads ORDER BY created_at DESC`).all();
        res.json({ success: true, data: leads });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// POST new lead
router.post('/', (req, res) => {
    try {
        const { client_name, suburb, job_title, value, description } = req.body;
        const id = randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO leads (id, client_name, suburb, job_title, budget_range, description, stage, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?)
        `);
        
        const now = Date.now();
        stmt.run(id, client_name || 'New Client', suburb || '', job_title || 'General Enquiry', value || '', description || '', now, now);
        
        const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(id);
        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

export default router;
