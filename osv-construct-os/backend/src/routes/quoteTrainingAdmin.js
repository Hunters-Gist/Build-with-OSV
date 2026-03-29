import express from 'express';
import db from '../db/index.js';
import { getTrainingImportStatus, runTrainingImport, saveTrainingUploads } from '../services/quotes/quoteTrainingImportService.js';

const router = express.Router();

router.get('/status', (req, res) => {
    try {
        const status = getTrainingImportStatus(db);
        return res.json({ success: true, data: status });
    } catch (error) {
        console.error('Failed to load quote training import status:', error);
        return res.status(500).json({ error: 'Failed to load quote training status.' });
    }
});

router.post('/import', (req, res) => {
    try {
        const report = runTrainingImport(db);
        return res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Failed to run quote training import:', error);
        return res.status(500).json({ error: 'Failed to run quote training import.' });
    }
});

router.post('/upload', (req, res) => {
    try {
        const files = Array.isArray(req.body?.files) ? req.body.files : [];
        const uploadResult = saveTrainingUploads(files);
        const status = getTrainingImportStatus(db);
        return res.json({
            success: true,
            data: {
                ...uploadResult,
                status
            }
        });
    } catch (error) {
        console.error('Failed to upload quote training files:', error);
        return res.status(400).json({ error: error.message || 'Failed to upload training files.' });
    }
});

export default router;
