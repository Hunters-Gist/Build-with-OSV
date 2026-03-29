import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  buildReauthPath,
  clearKnownTokens,
  readAccessToken,
  sanitizeNextPath,
  setAccessToken,
  verifyAdminSession
} from './session';
import { getSupabaseBrowserClient } from './supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState('');

  const reauthRequested = new URLSearchParams(location.search).get('reauth') === '1';
  const nextPath = useMemo(
    () => sanitizeNextPath(new URLSearchParams(location.search).get('next'), '/'),
    [location.search]
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const token = readAccessToken();
      if (!token) {
        if (mounted) setCheckingExisting(false);
        return;
      }

      const existing = await verifyAdminSession({ force: true });
      if (!mounted) return;

      if (existing.status === 'authorized') {
        navigate(nextPath, { replace: true });
        return;
      }

      if (existing.status === 'forbidden') {
        setError('Signed in but missing admin role permissions for back-office access.');
      }

      if (existing.status !== 'authorized') {
        clearKnownTokens();
      }
      setCheckingExisting(false);
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [navigate, nextPath]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        setError(signInError.message || 'Sign in failed. Check your credentials and try again.');
        return;
      }

      const token = data?.session?.access_token;
      if (token) {
        setAccessToken(token);
      }

      const result = await verifyAdminSession({ force: true });
      if (result.status === 'authorized') {
        navigate(nextPath, { replace: true });
        return;
      }

      if (result.status === 'forbidden') {
        setError('Signed in, but this account does not have admin access (owner_admin / ops_staff / estimator).');
      } else {
        setError('Session established, but admin verification failed. Please retry.');
      }
    } catch (submitError) {
      setError(submitError?.message || 'Unexpected authentication error. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-osv-panel/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.16em] text-osv-accent font-mono">Back Office</p>
          <h1 className="mt-2 text-2xl font-heading text-osv-white">Sign in to continue</h1>
          <p className="mt-2 text-sm text-osv-muted">
            Use your admin account to access dashboard, pipeline, and protected quote actions.
          </p>
        </div>

        {reauthRequested && (
          <div className="mb-4 rounded-lg border border-osv-accent/30 bg-osv-accent/10 px-3 py-2 text-xs text-osv-white">
            Your session expired or was missing. Please sign in again.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-osv-red/30 bg-osv-red/10 px-3 py-2 text-xs text-osv-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.12em] text-osv-muted mb-1">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-11 rounded-lg bg-osv-bg/70 border border-white/10 text-osv-white px-3 outline-none focus:border-osv-accent/60"
              placeholder="you@buildwithosv.com.au"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.12em] text-osv-muted mb-1">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-11 rounded-lg bg-osv-bg/70 border border-white/10 text-osv-white px-3 outline-none focus:border-osv-accent/60"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || checkingExisting}
            className="w-full h-11 rounded-lg bg-osv-accent text-osv-bg font-semibold uppercase tracking-[0.12em] text-xs hover:brightness-110 transition-all disabled:opacity-60"
          >
            {checkingExisting ? 'Checking session...' : (submitting ? 'Signing in...' : 'Sign in')}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10">
          <Link
            to={nextPath === '/' ? '/quotes/new' : nextPath}
            className="text-xs text-osv-muted hover:text-osv-white transition-colors"
          >
            Continue without admin access
          </Link>
        </div>
      </div>
    </div>
  );
}
