import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  buildReauthPath,
  performLogout,
  readAccessToken,
  resetSessionCache,
  sanitizeNextPath,
  verifyAdminSession
} from './auth/session';
import { setApiAuthFailureHandler } from './lib/apiClient';
const Pipeline = lazy(() => import('./leads/Pipeline.jsx'));
const QuoteBuilder = lazy(() => import('./quotes/QuoteBuilder.jsx'));
const QuoteEditor = lazy(() => import('./quotes/QuoteEditor.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
const ClientPortal = lazy(() => import('./client/ClientPortal.jsx'));
const Dashboard = lazy(() => import('./dashboard/Dashboard.jsx'));
const SubcontractorProfile = lazy(() => import('./subcontractors/Profile.jsx'));
const SubcontractorOnboarding = lazy(() => import('./subcontractors/Onboarding.jsx'));
const JobDashboard = lazy(() => import('./jobs/JobDashboard.jsx'));
const Login = lazy(() => import('./auth/Login.jsx'));

function UnauthorizedPanel() {
  return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center px-4">
      <div className="bg-osv-panel/40 border border-osv-red/30 p-8 rounded-xl text-center max-w-md">
        <p className="text-osv-red font-heading uppercase tracking-widest mb-2">Access Denied</p>
        <p className="text-osv-muted text-sm mb-4">
          Your account is authenticated but does not have permission to access this back-office surface.
        </p>
        <a
          href="/quotes/new"
          className="inline-flex h-10 items-center px-5 bg-osv-accent text-osv-bg text-xs uppercase tracking-[0.12em] font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          Return to Quote Builder
        </a>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  const nextPath = useMemo(
    () => sanitizeNextPath(`${location.pathname}${location.search || ''}`, '/quotes/new'),
    [location.pathname, location.search]
  );

  useEffect(() => {
    let mounted = true;
    const runCheck = async () => {
      setStatus('checking');
      const result = await verifyAdminSession();
      if (!mounted) return;
      setStatus(result.status);
    };
    runCheck();
    return () => {
      mounted = false;
    };
  }, [nextPath]);

  if (status === 'checking') return <AppLoading />;
  if (status === 'forbidden') return <UnauthorizedPanel />;
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-osv-bg flex items-center justify-center px-4">
        <div className="bg-osv-panel/40 border border-osv-red/30 p-8 rounded-xl text-center max-w-md">
          <p className="text-osv-red font-heading uppercase tracking-widest mb-2">Auth Check Failed</p>
          <p className="text-osv-muted text-sm mb-4">
            We could not validate your session. Please retry sign-in.
          </p>
          <a
            href={buildReauthPath(nextPath)}
            className="inline-flex h-10 items-center px-5 bg-osv-accent text-osv-bg text-xs uppercase tracking-[0.12em] font-semibold rounded-lg hover:brightness-110 transition-all"
          >
            Re-authenticate
          </a>
        </div>
      </div>
    );
  }
  if (status !== 'authorized') {
    return <Navigate to={buildReauthPath(nextPath)} replace />;
  }

  return children;
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/10 border-t-osv-accent rounded-full animate-spin" />
    </div>
  );
}

function AuthDebugChip() {
  const [status, setStatus] = useState('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [reportCopied, setReportCopied] = useState(false);

  const refreshStatus = useCallback(async ({ force = false } = {}) => {
    setTokenPresent(Boolean(readAccessToken()));
    const result = await verifyAdminSession({ force });
    setStatus(result?.status || 'error');
    setLastCheckedAt(Date.now());
  }, []);

  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    let bootstrapId = null;

    const handleWindowFocus = () => {
      refreshStatus({ force: true }).then(() => {
        if (!mounted) return;
      });
    };

    bootstrapId = window.setTimeout(() => {
      refreshStatus({ force: true });
    }, 0);
    intervalId = window.setInterval(() => {
      refreshStatus();
    }, 15_000);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      mounted = false;
      if (bootstrapId) window.clearTimeout(bootstrapId);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refreshStatus]);

  const handleForceRecheck = async () => {
    setBusyAction('recheck');
    await refreshStatus({ force: true });
    setBusyAction(null);
  };

  const handleClearCache = async () => {
    setBusyAction('clear');
    resetSessionCache();
    await refreshStatus({ force: true });
    setBusyAction(null);
  };

  const handleSimulateLogout = async () => {
    setBusyAction('logout');
    performLogout({ nextPath: '/quotes/new' });
    await refreshStatus({ force: true });
    setBusyAction(null);
  };

  const handleCopyReport = async () => {
    const report = {
      status,
      tokenPresent,
      checkedAt: lastCheckedAt ? new Date(lastCheckedAt).toISOString() : null,
      path: window.location.pathname,
      search: window.location.search
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setReportCopied(true);
      window.setTimeout(() => setReportCopied(false), 1200);
    } catch {
      setReportCopied(false);
    }
  };

  const chipStyles = {
    authorized: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    forbidden: 'border-osv-red/30 bg-osv-red/10 text-osv-red',
    unauthenticated: 'border-osv-accent/30 bg-osv-accent/10 text-osv-accent',
    error: 'border-osv-red/30 bg-osv-red/10 text-osv-red',
    checking: 'border-white/15 bg-white/5 text-osv-muted'
  };

  return (
    <div className={`fixed bottom-3 right-3 z-9999 border rounded-lg px-3 py-2 text-[10px] font-mono tracking-wide shadow-xl backdrop-blur ${chipStyles[status] || chipStyles.error}`}>
      <div className="uppercase">Auth: {status}</div>
      <div className="opacity-80">token: {tokenPresent ? 'yes' : 'no'}</div>
      {lastCheckedAt && <div className="opacity-70">checked: {new Date(lastCheckedAt).toLocaleTimeString()}</div>}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={handleForceRecheck}
          disabled={Boolean(busyAction)}
          className="h-6 px-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          Recheck
        </button>
        <button
          type="button"
          onClick={handleClearCache}
          disabled={Boolean(busyAction)}
          className="h-6 px-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          Clear Cache
        </button>
        <button
          type="button"
          onClick={handleSimulateLogout}
          disabled={Boolean(busyAction)}
          className="h-6 px-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          Logout
        </button>
        <button
          type="button"
          onClick={handleCopyReport}
          disabled={Boolean(busyAction)}
          className="h-6 px-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          {reportCopied ? 'Copied' : 'Copy Report'}
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthFailure = () => {
      const nextPath = sanitizeNextPath(
        `${location.pathname}${location.search || ''}`,
        '/quotes/new'
      );
      navigate(buildReauthPath(nextPath), { replace: true });
    };

    setApiAuthFailureHandler(handleAuthFailure);
    return () => setApiAuthFailureHandler(null);
  }, [navigate, location.pathname, location.search]);

  return (
    <>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/pipeline"
            element={(
              <ProtectedRoute>
                <Pipeline />
              </ProtectedRoute>
            )}
          />
          <Route path="/quotes/new" element={<QuoteBuilder />} />
          <Route
            path="/quotes/:quoteRef/edit"
            element={(
              <ProtectedRoute>
                <QuoteEditor />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/jobs"
            element={(
              <ProtectedRoute>
                <JobDashboard />
              </ProtectedRoute>
            )}
          />
          <Route path="/client/quote/:quoteId" element={<ClientPortal />} />
          <Route path="/subcontractors/join" element={<SubcontractorOnboarding />} />
          <Route path="/subcontractors/:id" element={<SubcontractorProfile />} />
        </Routes>
      </Suspense>
      {import.meta.env.DEV && <AuthDebugChip />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
