import express from 'express';
import { requireAuth, requireAdminRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, requireAdminRoles, (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.auth.userId,
            email: req.auth.email,
            roles: req.auth.roles
        }
    });
});

export default router;
