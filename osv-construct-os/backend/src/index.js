import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use('/api/leads', leadsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/ai', aiRouter);
app.use('/api/subcontractors', subbiesRouter); // Added subcontractors route
app.use('/api/jobs', jobsRouter); // Added jobs route
app.use('/api/checkout', checkoutRouter); // Secure payment bridging
app.use('/api/twilio', twilioRouter); // Twilio Voice & Recording Webhooks
app.use('/api/dashboard', dashboardRouter); // Aggregated KPI Dashboard

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: db.open ? 'connected' : 'disconnected' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`OSV OS Backend running on port ${PORT}`);
});
