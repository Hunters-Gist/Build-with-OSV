import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const API = import.meta.env.VITE_API_URL || 'https://osv-construct-backend.onrender.com';

async function fetchDashboardBundle({ auditWindowMs, auditOutcomeFilter }) {
  const now = Date.now();
  const fromTs = now - auditWindowMs;
  const auditFilterParams = {
    limit: 8,
    from: fromTs,
    to: now
  };
  if (auditOutcomeFilter !== 'all') {
    auditFilterParams.outcome = auditOutcomeFilter;
  }

  const [dashboardResult, portalAuditResult, securityAuditResult, securitySummaryResult, trainingStatusResult] = await Promise.allSettled([
    axios.get(`${API}/api/dashboard`),
    axios.get(`${API}/api/admin/portal-audit`, { params: auditFilterParams }),
    axios.get(`${API}/api/admin/security-audit`, { params: auditFilterParams }),
    axios.get(`${API}/api/admin/security-summary`),
    axios.get(`${API}/api/admin/quote-training/status`)
  ]);

  if (dashboardResult.status !== 'fulfilled') {
    throw new Error('Failed to load dashboard');
  }

  return {
    data: dashboardResult.value.data?.data || null,
    portalAuditEvents: portalAuditResult.status === 'fulfilled' ? (portalAuditResult.value.data?.data || []) : [],
    portalAuditError: portalAuditResult.status === 'fulfilled' ? null : 'Portal audit unavailable',
    securityAuditEvents: securityAuditResult.status === 'fulfilled' ? (securityAuditResult.value.data?.data || []) : [],
    securityAuditError: securityAuditResult.status === 'fulfilled' ? null : 'Security audit unavailable',
    securitySummary: securitySummaryResult.status === 'fulfilled' ? (securitySummaryResult.value.data?.data || null) : null,
    securitySummaryError: securitySummaryResult.status === 'fulfilled' ? null : 'Security summary unavailable',
    trainingStatus: trainingStatusResult.status === 'fulfilled' ? (trainingStatusResult.value.data?.data || null) : null,
    trainingStatusError: trainingStatusResult.status === 'fulfilled' ? null : 'Training status unavailable'
  };
}

function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusStyle(status) {
  switch (status) {
    case 'draft': return 'text-osv-muted border-osv-muted/30 bg-osv-muted/5';
    case 'issued': return 'text-osv-accent border-osv-accent/30 bg-osv-accent/5';
    case 'accepted': return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5';
    case 'deposit_paid': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
    case 'sent': return 'text-osv-accent border-osv-accent/30 bg-osv-accent/5';
    case 'approved': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
    case 'won': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
    case 'lost': return 'text-osv-red border-osv-red/30 bg-osv-red/5';
    default: return 'text-osv-muted border-osv-muted/30 bg-osv-muted/5';
  }
}

function jobTrackInfo(job) {
  if (job.risk_flag) return { label: job.risk_flag, color: 'bg-osv-red' };
  if (job.status === 'Posted') return { label: 'Pending Sub', color: 'bg-osv-accent' };
  if (job.due_date && new Date(job.due_date) < new Date()) return { label: 'Overdue', color: 'bg-osv-red' };
  return { label: 'On Track', color: 'bg-emerald-400' };
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [trainingImportMessage, setTrainingImportMessage] = useState('');
  const [selectedTrainingFiles, setSelectedTrainingFiles] = useState([]);
  const [trainingUploadMessage, setTrainingUploadMessage] = useState('');
  const [trainingUploadImportRunning, setTrainingUploadImportRunning] = useState(false);
  const [auditView, setAuditView] = useState('portal');
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState('all');
  const [auditWindowMs, setAuditWindowMs] = useState(24 * 60 * 60 * 1000);
  const [actionError, setActionError] = useState(null);
  const [handoffLoadingId, setHandoffLoadingId] = useState(null);

  const dashboardQueryKey = useMemo(
    () => ['dashboard-bundle', auditOutcomeFilter, auditWindowMs],
    [auditOutcomeFilter, auditWindowMs]
  );
  const { data: dashboardBundle, isLoading, error, isFetching } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => fetchDashboardBundle({ auditWindowMs, auditOutcomeFilter })
  });

  const refreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard-bundle'] });
  }, [queryClient]);

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

  const handleTrainingFileSelection = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedTrainingFiles(files);
    setTrainingUploadMessage('');
  };

  const handleUploadAndImportTrainingFiles = async () => {
    if (!selectedTrainingFiles.length) {
      setTrainingUploadMessage('Select one or more .json/.xlsx files first.');
      return;
    }
    setTrainingUploadImportRunning(true);
    setTrainingUploadMessage('');
    setTrainingImportMessage('');
    try {
      const filesPayload = await Promise.all(
        selectedTrainingFiles.map(async (file) => ({
          fileName: file.name,
          contentBase64: await toBase64(file)
        }))
      );
      const uploadRes = await axios.post(`${API}/api/admin/quote-training/upload`, {
        files: filesPayload
      });
      const savedCount = Number(uploadRes?.data?.data?.savedCount || 0);

      const importRes = await axios.post(`${API}/api/admin/quote-training/import`);
      const summary = importRes?.data?.data?.summary;
      if (summary) {
        setTrainingImportMessage(
          `Upload+Import complete: uploaded ${savedCount}, imported ${summary.importedMetrics} metrics (${summary.successCount} files, ${summary.failedCount} failed).`
        );
      } else {
        setTrainingImportMessage(`Upload+Import complete: uploaded ${savedCount} file(s).`);
      }
      setSelectedTrainingFiles([]);
      await refreshDashboard();
    } catch (err) {
      console.error(err);
      setTrainingImportMessage(err.response?.data?.error || 'Upload+Import failed.');
    } finally {
      setTrainingUploadImportRunning(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-white/10 border-t-osv-accent rounded-full animate-spin"></div>
      <div className="ml-4 text-osv-muted uppercase tracking-[0.15em] text-xs font-heading">Loading Command Center...</div>
    </div>
  );

  if (error || !dashboardBundle?.data) return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center">
      <div className="bg-osv-panel/40 border border-osv-red/30 p-8 rounded-xl text-center">
        <p className="text-osv-red font-heading uppercase tracking-widest mb-2">Connection Error</p>
        <p className="text-osv-muted text-sm">{error?.message || 'No data returned'}</p>
      </div>
    </div>
  );

  const {
    data,
    portalAuditEvents,
    securityAuditEvents,
    securitySummary,
    portalAuditError,
    securityAuditError,
    securitySummaryError,
    trainingStatus,
    trainingStatusError
  } = dashboardBundle;
  const { kpis, kpiTrends, quoteActivity, recentQuotes, activeJobsList, pendingApprovalsList, depositReadyList, alerts, modules, pipelineValue, quotedValue } = data;

  const handleCreateJobFromDeposit = async (quote) => {
    setHandoffLoadingId(quote.id);
    try {
      setActionError(null);
      await axios.post(`${API}/api/jobs`, {
        title: quote.summary || `${quote.trade || 'Trade'} Job`,
        client_name: quote.client_name || 'Client',
        client_addr: '',
        trade: quote.trade || 'General',
        scope_notes: quote.summary || `Converted from ${quote.quote_num}`,
        quote_num: quote.quote_num
      });
      await axios.patch(`${API}/api/admin/quotes/${quote.id}`, { status: 'won' });
      await refreshDashboard();
    } catch (err) {
      console.error(err);
      setActionError(err.response?.data?.error || 'Failed to create job from deposit-paid quote');
    }
    setHandoffLoadingId(null);
  };

  const kpiStrip = [
    { label: 'Open Leads', val: kpis.openLeads, trend: `+${kpiTrends.leadsThisWeek} this week`, trendColor: 'text-emerald-400' },
    { label: 'Draft Quotes', val: kpis.draftQuotes, trend: kpiTrends.urgentQuotes > 0 ? `${kpiTrends.urgentQuotes} urgent` : 'all current', trendColor: kpiTrends.urgentQuotes > 0 ? 'text-osv-accent' : 'text-emerald-400' },
    { label: 'Active Jobs', val: kpis.activeJobs, trend: kpiTrends.jobsDueThisWeek > 0 ? `${kpiTrends.jobsDueThisWeek} due this week` : 'none due', trendColor: 'text-osv-white' },
    { label: 'Pending Approvals', val: kpis.pendingApprovals, trend: kpiTrends.overdueApprovals > 0 ? `${kpiTrends.overdueApprovals} overdue` : 'all current', trendColor: kpiTrends.overdueApprovals > 0 ? 'text-osv-red' : 'text-emerald-400' },
    { label: 'Jobs At Risk', val: kpis.jobsAtRisk, trend: kpiTrends.riskySummary || 'none flagged', trendColor: kpis.jobsAtRisk > 0 ? 'text-osv-red' : 'text-emerald-400' },
  ];

  return (
    <div className="app-shell text-osv-text font-sans">
      <div className="app-container w-full px-1 py-2 sm:px-2 md:px-3 md:py-4 flex flex-col gap-6 md:gap-8 relative z-10">

        {/* HEADER */}
        <header className="app-header md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="app-title tracking-tight text-osv-white leading-none">
              Build With <span className="text-osv-accent">OSV</span>
            </h1>
            <p className="app-subtitle mt-1">
              Operating System for quoting, delivery, and project control
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <button className="text-osv-muted hover:text-osv-white transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {alerts.length > 0 && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-osv-accent rounded-full border border-osv-bg"></div>}
            </button>
            <div className="w-8 h-8 rounded-full bg-osv-panel/80 border border-white/10 overflow-hidden shadow-inner cursor-pointer hover:border-white/30 transition-colors">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <Link to="/admin" className="text-xs uppercase tracking-[0.15em] text-osv-muted hover:text-osv-accent transition-colors font-medium">
              Admin
            </Link>
          </div>
        </header>

        {/* ROW 1: HERO & QUOTE SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
          <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 sm:p-7 md:p-10 relative overflow-hidden flex flex-col justify-center shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
            <div className="absolute inset-0 bg-linear-to-br from-osv-accent/5 to-transparent opacity-50 pointer-events-none"></div>
            <div className="relative z-10 w-full lg:w-4/5">
              <h2 className="app-title text-3xl sm:text-4xl md:text-5xl text-osv-white tracking-[0.12em] uppercase leading-[1.1] mb-4">
                Create Intelligent Quote
              </h2>
              <p className="text-osv-muted text-fluid-base leading-relaxed mb-6 md:mb-8 max-w-xl">
                Generate accurate construction quotes from plans, scope, and project details in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link to="/quotes/new" className="inline-flex items-center justify-center bg-osv-accent text-osv-bg font-bold h-12 px-8 rounded-lg uppercase tracking-widest text-sm hover:brightness-110 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all duration-300 active:scale-[0.98]">
                  New Quote
                </Link>
                <button className="inline-flex items-center justify-center bg-osv-bg/50 border border-white/10 text-osv-white font-medium h-12 px-6 rounded-lg uppercase tracking-widest text-xs hover:bg-white/5 hover:border-white/20 transition-all shadow-inner">
                  Upload Plans
                </button>
                <button className="inline-flex items-center justify-center bg-transparent border border-transparent text-osv-muted font-medium h-12 px-6 rounded-lg uppercase tracking-widest text-xs hover:text-osv-white transition-all">
                  Continue Draft
                </button>
              </div>
            </div>
          </div>

          {/* Quote Summary Status — LIVE */}
          <div className="bg-osv-bg border border-osv-border rounded-2xl p-6 flex flex-col justify-between shadow-inner">
            <div className="mb-2">
               <h3 className="font-heading text-xs uppercase tracking-[0.15em] text-osv-white mb-4 flex items-center gap-2">
                 <svg className="w-4 h-4 text-osv-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 Quote Activity
               </h3>
            </div>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-osv-muted">Draft Quotes</span>
                <span className="text-osv-white font-medium">{quoteActivity.draftQuotes}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-osv-muted">Awaiting Approval</span>
                <span className="text-osv-accent font-medium">{quoteActivity.awaitingApproval}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-osv-muted">Sent Today</span>
                <span className="text-emerald-400 font-medium">{quoteActivity.sentToday}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-osv-muted">Avg Turnaround</span>
                <span className="text-osv-white font-medium drop-shadow-md">{quoteActivity.avgTurnaroundHrs ? `${quoteActivity.avgTurnaroundHrs}h` : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: KPI STRIP — LIVE */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
           {kpiStrip.map((kpi, idx) => (
             <div key={idx} className="bg-osv-panel/30 border border-white/5 rounded-xl p-4 flex flex-col justify-center hover:bg-osv-panel/50 hover:border-white/10 transition-colors cursor-default shadow-sm group">
               <span className="text-[10px] uppercase tracking-widest text-osv-muted font-semibold mb-1 group-hover:text-osv-white transition-colors">{kpi.label}</span>
               <span className="font-heading font-medium text-2xl text-osv-white">{kpi.val}</span>
               <span className={`text-[9px] uppercase tracking-wider mt-1 ${kpi.trendColor}`}>{kpi.trend}</span>
             </div>
           ))}
        </div>

        {/* ROW 3: WORKFLOW MODULES — LIVE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4 mt-2">
          <div className="bg-osv-bg border border-osv-border p-5 rounded-xl flex flex-col transition-all hover:border-white/20 hover:shadow-lg group">
            <h3 className="font-heading text-sm text-osv-white uppercase tracking-widest mb-1 group-hover:text-osv-accent transition-colors">Pipeline</h3>
            <p className="text-[10px] text-osv-muted uppercase tracking-widest leading-relaxed mb-4 h-8">Track incoming leads and job opportunities</p>
            <div className="mb-4">
              <div className="text-xs text-osv-white font-medium">{modules.pipelineLeads} open leads</div>
              <div className="text-[10px] text-osv-accent uppercase tracking-wider mt-0.5">{modules.leadsNeedFollowUp} need follow-up</div>
            </div>
            <Link to="/pipeline" className="mt-auto px-4 py-2 bg-osv-panel border border-white/5 text-xs text-osv-white font-medium text-center uppercase tracking-widest rounded hover:bg-white/10 hover:border-white/20 transition-colors">Open Pipeline</Link>
          </div>

          <div className="bg-osv-bg border border-osv-border p-5 rounded-xl flex flex-col transition-all hover:border-white/20 hover:shadow-lg group">
            <h3 className="font-heading text-sm text-osv-white uppercase tracking-widest mb-1 group-hover:text-osv-accent transition-colors">Quotes</h3>
            <p className="text-[10px] text-osv-muted uppercase tracking-widest leading-relaxed mb-4 h-8">Manage drafts, approvals, and sent pricing</p>
            <div className="mb-4">
              <div className="text-xs text-osv-white font-medium">{modules.draftQuotes} drafts</div>
              <div className="text-[10px] text-osv-accent uppercase tracking-wider mt-0.5">{modules.quotesAwaitingApproval} awaiting approval</div>
            </div>
            <Link to="/quotes/new" className="mt-auto px-4 py-2 bg-osv-panel border border-white/5 text-xs text-osv-white font-medium text-center uppercase tracking-widest rounded hover:bg-white/10 hover:border-white/20 transition-colors">Open Quotes</Link>
          </div>

          <div className="bg-osv-bg border border-osv-border p-5 rounded-xl flex flex-col transition-all hover:border-white/20 hover:shadow-lg group relative overflow-hidden">
            <h3 className="font-heading text-sm text-osv-white uppercase tracking-widest mb-1 group-hover:text-osv-accent transition-colors">Delivery</h3>
            <p className="text-[10px] text-osv-muted uppercase tracking-widest leading-relaxed mb-4 h-8">Control active jobs, scheduling, and execution</p>
            <div className="mb-4">
              <div className="text-xs text-osv-white font-medium">{modules.activeJobs} active jobs</div>
              <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${modules.delayedJobs > 0 ? 'text-osv-red' : 'text-emerald-400'}`}>{modules.delayedJobs > 0 ? `${modules.delayedJobs} delayed` : 'all on track'}</div>
            </div>
            <Link to="/jobs" className="mt-auto px-4 py-2 bg-osv-panel border border-white/5 text-xs text-osv-white font-medium text-center uppercase tracking-widest rounded hover:bg-white/10 hover:border-white/20 transition-colors">Open Delivery</Link>
          </div>

          <div className="bg-osv-bg border border-osv-border p-5 rounded-xl flex flex-col transition-all hover:border-white/20 hover:shadow-lg group">
            <h3 className="font-heading text-sm text-osv-white uppercase tracking-widest mb-1 group-hover:text-osv-accent transition-colors">Portal</h3>
            <p className="text-[10px] text-osv-muted uppercase tracking-widest leading-relaxed mb-4 h-8">Client-facing approvals, updates, and visibility</p>
            <div className="mb-4">
              <div className="text-xs text-osv-white font-medium">{modules.quotesAwaitingApproval} sent quotes</div>
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider mt-0.5">{modules.quotesAwaitingApproval} approvals pending</div>
            </div>
            <Link to="/client/quote/1234" className="mt-auto px-4 py-2 bg-osv-panel border border-white/5 text-xs text-osv-white font-medium text-center uppercase tracking-widest rounded hover:bg-white/10 hover:border-white/20 transition-colors">Open Portal</Link>
          </div>

          <div className="bg-osv-bg border border-osv-border p-5 rounded-xl flex flex-col transition-all hover:border-white/20 hover:shadow-lg group">
            <h3 className="font-heading text-sm text-osv-white uppercase tracking-widest mb-1 group-hover:text-osv-accent transition-colors">The Forge</h3>
            <p className="text-[10px] text-osv-muted uppercase tracking-widest leading-relaxed mb-4 h-8">Manage subcontractors, trades, allocations</p>
            <div className="mb-4">
              <div className="text-xs text-osv-white font-medium">{modules.activeSubbies} active subbies</div>
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider mt-0.5">{modules.unassignedJobCount} unassigned tasks</div>
            </div>
            <Link to="/subcontractors/join" className="mt-auto px-4 py-2 bg-osv-panel border border-white/5 text-xs text-osv-white font-medium text-center uppercase tracking-widest rounded hover:bg-white/10 hover:border-white/20 transition-colors">Open The Forge</Link>
          </div>
        </div>

        {/* ROW 4: LIVE OPERATIONS AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-2 md:mt-4">

          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Recent Quotes — LIVE */}
            <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white border-b border-white/5 pb-3 mb-4">Recent Quotes</h3>
              <div className="space-y-1">
                {recentQuotes.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono py-4 text-center">No quotes yet</p>
                ) : recentQuotes.map(q => (
                  <div key={q.quote_num} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 sm:gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 -mx-2 px-2 rounded transition-colors">
                     <div className="min-w-0 flex flex-col">
                       <span className="text-sm font-medium text-osv-white truncate">{q.summary || q.trade || 'Untitled'}</span>
                       <span className="text-[10px] text-osv-muted font-mono">{q.quote_num}</span>
                     </div>
                     <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${statusStyle(q.status)}`}>{q.status}</span>
                     <span className="text-xs font-mono text-osv-white whitespace-nowrap">${(q.final_client_quote || 0).toLocaleString()}</span>
                     <span className="text-[10px] text-osv-muted w-12 text-right whitespace-nowrap">{timeAgo(q.created_at)}</span>
                     <Link to={`/quotes/${q.id}/edit`} className="text-[10px] text-osv-accent uppercase tracking-wide hover:underline text-right whitespace-nowrap">
                       Edit
                     </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Approvals — LIVE */}
            <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white border-b border-white/5 pb-3 mb-4">Pending Approvals</h3>
              <div className="space-y-3">
                {pendingApprovalsList.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono py-4 text-center">No pending approvals</p>
                ) : pendingApprovalsList.map(q => {
                  const issuedTs = q.issued_at || q.sent_at;
                  const isOverdue = Boolean(q.is_overdue);
                  return (
                    <div key={q.quote_num} className="flex items-start gap-3 min-w-0">
                       <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-osv-red' : 'bg-osv-accent animate-pulse'}`}></div>
                       <div className="min-w-0">
                          <div className="text-sm text-osv-white font-medium wrap-break-word">{q.quote_num} — {q.client_name}</div>
                          <div className={`text-[10px] uppercase tracking-wider mt-1 wrap-break-word ${isOverdue ? 'text-osv-red/80' : 'text-osv-muted'}`}>
                            {isOverdue ? `Overdue • Issued ${timeAgo(issuedTs)}` : `Awaiting • Issued ${timeAgo(issuedTs)}`}
                            {q.final_client_quote ? ` • $${q.final_client_quote.toLocaleString()}` : ''}
                          </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white border-b border-white/5 pb-3 mb-4">Ready For Job Creation</h3>
              <div className="space-y-3">
                {depositReadyList.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono py-4 text-center">No deposit-paid quotes waiting</p>
                ) : depositReadyList.map(q => (
                  <div key={q.id} className="bg-osv-bg/40 border border-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-osv-accent">{q.quote_num}</span>
                      <span className="text-xs text-emerald-400">${(q.final_client_quote || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-osv-white mb-3 wrap-break-word">{q.client_name || 'Client'} — {q.summary || 'Quote ready for handoff'}</div>
                    <button
                      onClick={() => handleCreateJobFromDeposit(q)}
                      disabled={handoffLoadingId === q.id}
                      className="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider rounded border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-60"
                    >
                      {handoffLoadingId === q.id ? 'Creating Job...' : 'Create Job (Manual Checkpoint)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Active Jobs — LIVE */}
            <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-xl h-full flex flex-col">
              <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white border-b border-white/5 pb-3 mb-4">Active Jobs</h3>
              <div className="space-y-1">
                {activeJobsList.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono py-4 text-center">No active jobs</p>
                ) : activeJobsList.map(j => {
                  const track = jobTrackInfo(j);
                  return (
                    <div key={j.job_num} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 hover:bg-white/2 -mx-2 px-2 rounded transition-colors">
                       <div className="min-w-0 flex flex-col pr-4">
                         <span className="text-sm font-medium text-osv-white truncate">{j.title}</span>
                         <span className="text-[10px] text-osv-muted uppercase tracking-wider mt-0.5 truncate">
                           {j.status}{j.assigned_sub_name ? ` • ${j.assigned_sub_name}` : ''}{j.due_date ? ` • Due ${j.due_date}` : ''}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                         <span className="text-[10px] uppercase font-medium text-osv-muted">{track.label}</span>
                         <div className={`w-2 h-2 rounded-full ${track.color} shadow-[0_0_8px_currentColor]`}></div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alerts & Issues — LIVE */}
            <div className="bg-osv-bg border border-osv-border rounded-xl p-6 shadow-inner">
              <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-osv-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Alerts & Issues
              </h3>
              <ul className="space-y-2 text-xs text-osv-white leading-relaxed">
                {alerts.length === 0 ? (
                  <li className="text-osv-muted font-mono text-center py-4">All clear — no active alerts</li>
                ) : alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 wrap-break-word">
                    <span className={`font-bold ${alert.type === 'danger' ? 'text-osv-red' : 'text-osv-accent'}`}>&bull;</span>
                    {alert.message}
                  </li>
                ))}
              </ul>
            </div>

            {/* Security Audit Center — LIVE */}
            <div className="bg-osv-bg border border-osv-border rounded-xl p-6 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white">
                  Security Audit Center
                </h3>
                <button
                  onClick={refreshDashboard}
                  className="text-[10px] uppercase tracking-widest text-osv-muted hover:text-osv-white transition-colors"
                >
                  {isFetching ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setAuditView('portal')}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider border rounded ${
                    auditView === 'portal'
                      ? 'text-osv-accent border-osv-accent/40 bg-osv-accent/10'
                      : 'text-osv-muted border-white/10 hover:text-osv-white'
                  }`}
                >
                  Portal
                </button>
                <button
                  onClick={() => setAuditView('security')}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider border rounded ${
                    auditView === 'security'
                      ? 'text-osv-accent border-osv-accent/40 bg-osv-accent/10'
                      : 'text-osv-muted border-white/10 hover:text-osv-white'
                  }`}
                >
                  Webhook/Twilio
                </button>
                <select
                  value={auditOutcomeFilter}
                  onChange={(e) => setAuditOutcomeFilter(e.target.value)}
                  className="bg-osv-panel border border-white/10 text-osv-white text-[10px] uppercase tracking-wider rounded px-2 py-1"
                >
                  <option value="all">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="idempotent">Idempotent</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="denied">Denied</option>
                </select>
                <select
                  value={auditWindowMs}
                  onChange={(e) => setAuditWindowMs(Number(e.target.value))}
                  className="bg-osv-panel border border-white/10 text-osv-white text-[10px] uppercase tracking-wider rounded px-2 py-1"
                >
                  <option value={6 * 60 * 60 * 1000}>Last 6h</option>
                  <option value={24 * 60 * 60 * 1000}>Last 24h</option>
                  <option value={3 * 24 * 60 * 60 * 1000}>Last 3d</option>
                  <option value={7 * 24 * 60 * 60 * 1000}>Last 7d</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                  <div className="text-[9px] uppercase tracking-wider text-osv-muted">Denied (24h)</div>
                  <div className="text-sm font-mono text-osv-red">
                    {securitySummary?.last_24h?.denied ?? '—'}
                  </div>
                </div>
                <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                  <div className="text-[9px] uppercase tracking-wider text-osv-muted">Total Events (24h)</div>
                  <div className="text-sm font-mono text-osv-white">
                    {securitySummary?.last_24h?.total ?? '—'}
                  </div>
                </div>
                <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                  <div className="text-[9px] uppercase tracking-wider text-osv-muted">Denied (7d)</div>
                  <div className="text-sm font-mono text-osv-red">
                    {securitySummary?.last_7d?.denied ?? '—'}
                  </div>
                </div>
                <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                  <div className="text-[9px] uppercase tracking-wider text-osv-muted">Total Events (7d)</div>
                  <div className="text-sm font-mono text-osv-white">
                    {securitySummary?.last_7d?.total ?? '—'}
                  </div>
                </div>
              </div>
              {securitySummaryError && (
                <p className="text-osv-muted text-[10px] font-mono mb-2">{securitySummaryError}</p>
              )}

              {auditView === 'portal' ? (
                portalAuditError ? (
                  <p className="text-osv-muted text-xs font-mono">{portalAuditError}</p>
                ) : portalAuditEvents.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono">No recent portal events logged</p>
                ) : (
                  <ul className="space-y-2">
                    {portalAuditEvents.map((event) => (
                      <li key={event.id} className="text-xs border-b border-white/5 pb-2 last:border-b-0">
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <span className="text-osv-white font-medium uppercase tracking-wide truncate">{event.action}</span>
                          <span className={`text-[10px] uppercase ${
                            event.outcome === 'success' || event.outcome === 'idempotent'
                              ? 'text-emerald-400'
                              : event.outcome === 'duplicate'
                                ? 'text-osv-accent'
                                : 'text-osv-red'
                          }`}>{event.outcome}</span>
                        </div>
                        <div className="text-[10px] text-osv-muted mt-1 font-mono">
                          {event.quote_id ? `${event.quote_id.slice(0, 8)}...` : 'no-quote'} • {timeAgo(event.created_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                securityAuditError ? (
                  <p className="text-osv-muted text-xs font-mono">{securityAuditError}</p>
                ) : securityAuditEvents.length === 0 ? (
                  <p className="text-osv-muted text-xs font-mono">No recent webhook/twilio audit events logged</p>
                ) : (
                  <ul className="space-y-2">
                    {securityAuditEvents.map((event) => (
                      <li key={event.id} className="text-xs border-b border-white/5 pb-2 last:border-b-0">
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <span className="text-osv-white font-medium uppercase tracking-wide truncate">
                            {event.source}:{event.event_type}
                          </span>
                          <span className={`text-[10px] uppercase ${
                            event.outcome === 'success' ? 'text-emerald-400' : 'text-osv-red'
                          }`}>{event.outcome}</span>
                        </div>
                        <div className="text-[10px] text-osv-muted mt-1 font-mono">
                          {event.reason || 'no-reason'} • {timeAgo(event.created_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

            {/* Quote Training Import */}
            <div className="bg-osv-bg border border-osv-border rounded-xl p-6 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs uppercase tracking-[0.15em] font-heading text-osv-white">
                  Quote Training Data
                </h3>
                <button
                  onClick={refreshDashboard}
                  className="text-[10px] uppercase tracking-widest text-osv-muted hover:text-osv-white transition-colors"
                >
                  {isFetching ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {trainingStatusError ? (
                <p className="text-osv-muted text-xs font-mono">{trainingStatusError}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                      <div className="text-[9px] uppercase tracking-wider text-osv-muted">Inbox Files</div>
                      <div className="text-sm font-mono text-osv-white">
                        {trainingStatus?.inboxFiles?.length || 0}
                      </div>
                    </div>
                    <div className="bg-osv-panel/40 border border-white/5 rounded p-2">
                      <div className="text-[9px] uppercase tracking-wider text-osv-muted">Import Runs</div>
                      <div className="text-sm font-mono text-osv-white">
                        {trainingStatus?.counters?.importRuns || 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="file"
                      multiple
                      accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleTrainingFileSelection}
                      className="block w-full text-[10px] text-osv-muted file:mr-3 file:py-1.5 file:px-3 file:text-[10px] file:uppercase file:tracking-wider file:font-semibold file:border file:border-white/20 file:rounded file:bg-osv-panel file:text-osv-white hover:file:border-white/40"
                    />
                    <button
                      onClick={handleUploadAndImportTrainingFiles}
                      disabled={trainingUploadImportRunning}
                      className="w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider rounded border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-60"
                    >
                      {trainingUploadImportRunning ? 'Uploading + Importing...' : 'Upload + Import (One Click)'}
                    </button>
                  </div>

                  {trainingImportMessage && (
                    <p className="text-[10px] text-osv-muted font-mono mt-3">{trainingImportMessage}</p>
                  )}
                  {trainingUploadMessage && (
                    <p className="text-[10px] text-osv-muted font-mono mt-2">{trainingUploadMessage}</p>
                  )}

                  <div className="mt-3 text-[10px] text-osv-muted font-mono">
                    Drop files into: <span className="text-osv-white">backend/training-data/inbox</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Pipeline Value Footer */}
        {(pipelineValue > 0 || quotedValue > 0) && (
          <div className="flex justify-center gap-8 pt-4 border-t border-white/5">
            <div className="text-center">
              <span className="text-[10px] text-osv-muted uppercase tracking-[0.15em] block mb-1">Pipeline Value</span>
              <span className="font-heading text-lg text-osv-white">${pipelineValue.toLocaleString()}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-osv-muted uppercase tracking-[0.15em] block mb-1">Quoted Value</span>
              <span className="font-heading text-lg text-osv-accent">${quotedValue.toLocaleString()}</span>
            </div>
          </div>
        )}
        {actionError && (
          <div className="bg-osv-red/5 border border-osv-red/30 p-4 rounded-xl text-center">
            <p className="text-osv-red text-xs">{actionError}</p>
          </div>
        )}

      </div>
    </div>
  );
}
