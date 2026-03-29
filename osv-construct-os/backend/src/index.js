import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/index.js';
import { requireAuth, requireAdminRoles } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const shouldEnforceAdminAuth = String(process.env.ENFORCE_ADMIN_AUTH || 'false').toLowerCase() === 'true';
const adminRouteMiddleware = shouldEnforceAdminAuth ? [requireAuth, requireAdminRoles] : [];

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
import leadsRouter from './routes/leads.js';
import quotesRouter from './routes/quotes.js';
import webhookRouter from './routes/webhook.js';
import aiRouter from './routes/ai.js';
import subbiesRouter from './routes/subcontractors.js';
import jobsRouter from './routes/jobs.js'; // Added jobsRouter import
import checkoutRouter from './routes/checkout.js'; // Stripe
import twilioRouter from './routes/twilio.js'; // Twilio & AI Calling
import dashboardRouter from './routes/dashboard.js'; // Aggregated KPI Dashboard
import authRouter from './routes/auth.js';
import portalQuotesRouter from './routes/portalQuotes.js';
import legacyQuotesRouter from './routes/legacyQuotes.js';
import portalAuditAdminRouter from './routes/portalAuditAdmin.js';
import securityAuditAdminRouter from './routes/securityAuditAdmin.js';
import securitySummaryAdminRouter from './routes/securitySummaryAdmin.js';
import quoteTrainingAdminRouter from './routes/quoteTrainingAdmin.js';

app.use('/api/auth', authRouter);
app.use('/api/leads', ...adminRouteMiddleware, leadsRouter);
app.use('/api/admin/quotes', ...adminRouteMiddleware, quotesRouter);
app.use('/api/admin/portal-audit', ...adminRouteMiddleware, portalAuditAdminRouter);
app.use('/api/admin/security-audit', ...adminRouteMiddleware, securityAuditAdminRouter);
app.use('/api/admin/security-summary', ...adminRouteMiddleware, securitySummaryAdminRouter);
app.use('/api/admin/quote-training', ...adminRouteMiddleware, quoteTrainingAdminRouter);
app.use('/api/portal/quotes', portalQuotesRouter);
app.use('/api/quotes', legacyQuotesRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/ai', ...adminRouteMiddleware, aiRouter);
app.use('/api/subcontractors', ...adminRouteMiddleware, subbiesRouter); // Added subcontractors route
app.use('/api/jobs', ...adminRouteMiddleware, jobsRouter); // Added jobs route
app.use('/api/checkout', checkoutRouter); // Secure payment bridging
app.use('/api/twilio', twilioRouter); // Twilio Voice & Recording Webhooks
app.use('/api/dashboard', ...adminRouteMiddleware, dashboardRouter); // Aggregated KPI Dashboard

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: db.open ? 'connected' : 'disconnected' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`OSV OS Backend running on port ${PORT}`);
});
