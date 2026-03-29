import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import db from './db/index.js';
import { requireAuth, requireAdminRoles } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function toBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
}

function getAllowedOrigins() {
    return String(process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const shouldEnforceAdminAuth = toBoolean(process.env.ENFORCE_ADMIN_AUTH, false);
const shouldEnforcePortalToken = toBoolean(process.env.ENFORCE_PORTAL_TOKEN, false);
const shouldEnforceWebhookSecret = toBoolean(process.env.ENFORCE_WEBHOOK_SECRET, false);
const adminRouteMiddleware = shouldEnforceAdminAuth ? [requireAuth, requireAdminRoles] : [];
const corsAllowlist = getAllowedOrigins();

function validateStartupConfig() {
    const errors = [];
    const requiredAlways = ['JWT_SECRET'];
    for (const envKey of requiredAlways) {
        if (!process.env[envKey]) {
            errors.push(`Missing required env var: ${envKey}`);
        }
    }

    if (isProduction && !shouldEnforceAdminAuth) {
        errors.push('ENFORCE_ADMIN_AUTH must be true in production.');
    }
    if (isProduction && !shouldEnforcePortalToken) {
        errors.push('ENFORCE_PORTAL_TOKEN must be true in production.');
    }
    if (isProduction && !shouldEnforceWebhookSecret) {
        errors.push('ENFORCE_WEBHOOK_SECRET must be true in production.');
    }

    if (shouldEnforcePortalToken && !process.env.QUOTE_PORTAL_SECRET) {
        errors.push('QUOTE_PORTAL_SECRET is required when ENFORCE_PORTAL_TOKEN is true.');
    }
    if (shouldEnforceWebhookSecret && !process.env.WEBHOOK_SHARED_SECRET) {
        errors.push('WEBHOOK_SHARED_SECRET is required when ENFORCE_WEBHOOK_SECRET is true.');
    }

    if (isProduction) {
        if (!corsAllowlist.length) {
            errors.push('CORS_ALLOWED_ORIGINS is required in production.');
        }
        if (corsAllowlist.some((origin) => origin === '*')) {
            errors.push('CORS wildcard (*) is not allowed in production.');
        }
    }

    return errors;
}

const startupErrors = validateStartupConfig();
if (startupErrors.length > 0) {
    console.error('[startup] Configuration validation failed.');
    for (const error of startupErrors) {
        console.error(`[startup] - ${error}`);
    }
    process.exit(1);
}

app.use(helmet());
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
});
app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!corsAllowlist.length && !isProduction) return callback(null, true);
        if (corsAllowlist.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin blocked.'));
    }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 30 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please slow down.' }
});

app.use(globalLimiter);
app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        const log = {
            level: 'info',
            event: 'request.completed',
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            ip: req.ip,
            userAgent: req.headers['user-agent'] || 'unknown'
        };
        console.log(JSON.stringify(log));
    });
    next();
});

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
app.use('/api/ai', aiLimiter, ...adminRouteMiddleware, aiRouter);
app.use('/api/subcontractors', ...adminRouteMiddleware, subbiesRouter); // Added subcontractors route
app.use('/api/jobs', ...adminRouteMiddleware, jobsRouter); // Added jobs route
app.use('/api/checkout', checkoutRouter); // Secure payment bridging
app.use('/api/twilio', twilioRouter); // Twilio Voice & Recording Webhooks
app.use('/api/dashboard', ...adminRouteMiddleware, dashboardRouter); // Aggregated KPI Dashboard

// Health check
app.get('/health', (req, res) => {
    let dbReady = false;
    try {
        db.prepare('SELECT 1 AS ok').get();
        dbReady = true;
    } catch (_) {
        dbReady = false;
    }

    res.status(dbReady ? 200 : 503).json({
        status: dbReady ? 'ok' : 'degraded',
        db: dbReady ? 'ready' : 'not_ready',
        uptimeSeconds: Math.floor(process.uptime())
    });
});

app.use((err, req, res, next) => {
    const statusCode = Number(err?.status || err?.statusCode) || 500;
    const safeError = isProduction
        ? (statusCode >= 500 ? 'Internal server error' : 'Request failed')
        : (err?.message || 'Internal server error');

    console.error(JSON.stringify({
        level: 'error',
        event: 'request.failed',
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        error: err?.message || 'Unknown error'
    }));

    if (res.headersSent) {
        return next(err);
    }
    return res.status(statusCode).json({ error: safeError, requestId: req.id });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`OSV OS Backend running on port ${PORT}`);
});

let shuttingDown = false;
function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] Received ${signal}. Closing server...`);
    server.close(() => {
        console.log('[shutdown] HTTP server closed.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('[shutdown] Force exiting after timeout.');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
