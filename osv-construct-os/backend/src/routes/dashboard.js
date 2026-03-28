import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();
        const weekAgoMs = now - 7 * 86400000;

        // --- KPI STRIP ---
        const openLeads = db.prepare(
            `SELECT COUNT(*) as count FROM leads WHERE stage NOT IN ('Won', 'Lost')`
        ).get().count;

        const draftQuotes = db.prepare(
            `SELECT COUNT(*) as count FROM quotes WHERE status = 'draft'`
        ).get().count;

        const activeJobs = db.prepare(
            `SELECT COUNT(*) as count FROM jobs WHERE status IN ('Posted', 'Assigned', 'In Progress')`
        ).get().count;

        const pendingApprovals = db.prepare(
            `SELECT COUNT(*) as count FROM quotes WHERE status = 'sent'`
        ).get().count;

        const jobsAtRisk = db.prepare(
            `SELECT COUNT(*) as count FROM jobs WHERE risk_flag IS NOT NULL AND status IN ('Assigned', 'In Progress')`
        ).get().count;

        // --- KPI TRENDS ---
        const leadsThisWeek = db.prepare(
            `SELECT COUNT(*) as count FROM leads WHERE created_at >= ?`
        ).get(weekAgoMs).count;

        const urgentQuotes = db.prepare(
            `SELECT COUNT(*) as count FROM quotes WHERE status = 'draft' AND created_at < ?`
        ).get(now - 3 * 86400000).count; // drafts older than 3 days

        const jobsDueThisWeek = db.prepare(
            `SELECT COUNT(*) as count FROM jobs WHERE due_date IS NOT NULL AND due_date <= date('now', '+7 days') AND status IN ('Assigned', 'In Progress')`
        ).get().count;

        const overdueApprovals = db.prepare(
            `SELECT COUNT(*) as count FROM quotes WHERE status = 'sent' AND sent_at IS NOT NULL AND sent_at < ?`
        ).get(now - 5 * 86400000).count; // sent more than 5 days ago

        // --- QUOTE ACTIVITY SIDEBAR ---
        const sentToday = db.prepare(
            `SELECT COUNT(*) as count FROM quotes WHERE sent_at >= ?`
        ).get(todayMs).count;

        // Average turnaround: time between created_at and sent_at for quotes that have been sent
        const turnaroundRow = db.prepare(
            `SELECT AVG(sent_at - created_at) as avg_ms FROM quotes WHERE sent_at IS NOT NULL AND created_at IS NOT NULL`
        ).get();
        const avgTurnaroundHrs = turnaroundRow.avg_ms
            ? (turnaroundRow.avg_ms / 3600000).toFixed(1)
            : null;

        // --- RECENT QUOTES (last 5) ---
        const recentQuotes = db.prepare(
            `SELECT quote_num, client_name, trade, summary, status, final_client_quote, created_at, updated_at
             FROM quotes ORDER BY created_at DESC LIMIT 5`
        ).all();

        // --- ACTIVE JOBS (last 5 non-completed) ---
        const activeJobsList = db.prepare(
            `SELECT job_num, title, client_name, trade, status, assigned_sub_name, due_date, risk_flag, updated_at
             FROM jobs WHERE status IN ('Posted', 'Assigned', 'In Progress')
             ORDER BY updated_at DESC LIMIT 5`
        ).all();

        // --- PENDING APPROVAL DETAILS ---
        const pendingApprovalsList = db.prepare(
            `SELECT quote_num, client_name, summary, sent_at, final_client_quote
             FROM quotes WHERE status = 'sent' ORDER BY sent_at ASC LIMIT 5`
        ).all();

        // --- ALERTS & ISSUES ---
        const alerts = [];

        // Stale quotes: sent > 5 days ago with no response
        const staleQuotes = db.prepare(
            `SELECT quote_num, client_name FROM quotes WHERE status = 'sent' AND sent_at < ? ORDER BY sent_at ASC LIMIT 3`
        ).all(now - 5 * 86400000);
        for (const q of staleQuotes) {
            alerts.push({ type: 'danger', message: `Overdue quote response: ${q.client_name} (${q.quote_num})` });
        }

        // Jobs at risk
        const riskyJobs = db.prepare(
            `SELECT job_num, title, risk_flag FROM jobs WHERE risk_flag IS NOT NULL AND status IN ('Assigned', 'In Progress') LIMIT 3`
        ).all();
        for (const j of riskyJobs) {
            alerts.push({ type: 'warning', message: `${j.title} (${j.job_num}): ${j.risk_flag}` });
        }

        // Unassigned jobs older than 2 days
        const unassignedJobs = db.prepare(
            `SELECT job_num, title FROM jobs WHERE status = 'Posted' AND created_at < ? LIMIT 3`
        ).all(now - 2 * 86400000);
        for (const j of unassignedJobs) {
            alerts.push({ type: 'warning', message: `Unassigned job needs attention: ${j.title} (${j.job_num})` });
        }

        // --- WORKFLOW MODULE COUNTS ---
        const pipelineLeads = openLeads;
        const leadsNeedFollowUp = db.prepare(
            `SELECT COUNT(*) as count FROM leads WHERE stage = 'Contacted' AND updated_at < ?`
        ).get(now - 2 * 86400000).count;

        const quotesAwaitingApproval = pendingApprovals;

        const delayedJobs = db.prepare(
            `SELECT COUNT(*) as count FROM jobs WHERE (risk_flag IS NOT NULL OR (due_date IS NOT NULL AND due_date < date('now'))) AND status IN ('Assigned', 'In Progress')`
        ).get().count;

        const activeSubbies = db.prepare(
            `SELECT COUNT(*) as count FROM subcontractors`
        ).get().count;

        const unassignedJobCount = db.prepare(
            `SELECT COUNT(*) as count FROM jobs WHERE status = 'Posted'`
        ).get().count;

        // --- PIPELINE VALUE ---
        const pipelineValue = db.prepare(
            `SELECT COALESCE(SUM(estimated_value), 0) as total FROM leads WHERE stage NOT IN ('Won', 'Lost')`
        ).get().total;

        const quotedValue = db.prepare(
            `SELECT COALESCE(SUM(final_client_quote), 0) as total FROM quotes WHERE status IN ('draft', 'sent')`
        ).get().total;

        res.json({
            success: true,
            data: {
                kpis: {
                    openLeads,
                    draftQuotes,
                    activeJobs,
                    pendingApprovals,
                    jobsAtRisk,
                },
                kpiTrends: {
                    leadsThisWeek,
                    urgentQuotes,
                    jobsDueThisWeek,
                    overdueApprovals,
                    riskySummary: riskyJobs.length > 0 ? riskyJobs[0].risk_flag : null,
                },
                quoteActivity: {
                    draftQuotes,
                    awaitingApproval: pendingApprovals,
                    sentToday,
                    avgTurnaroundHrs,
                },
                recentQuotes,
                activeJobsList,
                pendingApprovalsList,
                alerts,
                modules: {
                    pipelineLeads,
                    leadsNeedFollowUp,
                    draftQuotes,
                    quotesAwaitingApproval,
                    activeJobs,
                    delayedJobs,
                    activeSubbies,
                    unassignedJobCount,
                },
                pipelineValue,
                quotedValue,
            }
        });
    } catch (error) {
        console.error('Dashboard query error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

export default router;
