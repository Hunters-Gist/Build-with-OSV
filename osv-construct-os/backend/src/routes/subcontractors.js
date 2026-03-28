import express from 'express';
import db from '../db/index.js';
import { randomUUID as uuidv4 } from 'crypto';

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const subbies = db.prepare('SELECT * FROM subcontractors ORDER BY is_apex DESC, rating DESC').all();
        res.json({ success: true, data: subbies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        // id 1 is reserved for our mock UI visualizer if there is no real DB entry yet
        if (req.params.id === '1') {
           const count = db.prepare('SELECT count(*) as count FROM subcontractors').get();
           if (count.count === 0) {
               return res.json({ success: true, data: {
                   id: '1', name: 'Mick Harrison (Demo)', business: 'Harrison & Sons Carpentry', trade: 'Carpentry',
                   tier: 'Gold', is_apex: 1, rating: 4.9, total_reviews: 32, jobs_completed: 41, abn: '41 990 000',
                   insurance_expiry: '2026-11-01', license_num: 'CBL-9921', bio: 'Demo profile rendering the gamification UI metrics successfully.',
                   fee_discount_pct: 0.15, gallery: [1, 2, 3, 4]
               }});
           }
        }

        const subbie = db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(req.params.id);
        if (!subbie) return res.status(404).json({ error: 'Not found' });
        
        // Ensure array mapping safety
        subbie.gallery = [1, 2, 3, 4]; // Unsplash seeds for prototype
        res.json({ success: true, data: subbie });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', (req, res) => {
    try {
        const data = req.body;
        const id = uuidv4();
        
        const stmt = db.prepare(`
            INSERT INTO subcontractors (
                id, name, business, trade, crew_size, abn, license_num, insurance_expiry, bio, 
                rate_per_hr, phone, email, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            id, data.name, data.business, data.trade, parseInt(data.crew_size)||1, data.abn, 
            data.license_num, data.insurance_expiry, data.bio, parseFloat(data.rate_per_hr)||0, 
            data.phone, data.email, Date.now()
        );
        
        res.status(201).json({ success: true, id: id });
    } catch (error) {
        console.error("Subbie creation error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
