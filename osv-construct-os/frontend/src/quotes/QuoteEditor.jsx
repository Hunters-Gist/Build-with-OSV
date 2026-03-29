import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import {
  buildReauthPath,
  getApiBaseUrl,
  isAuthError,
  readAccessToken
} from '../auth/session';

const API_BASE = getApiBaseUrl();

const EDIT_REASONS = [
  { value: '', label: 'Select edit reason...' },
  { value: 'client_request', label: 'Client requested change' },
  { value: 'scope_change', label: 'Scope changed' },
  { value: 'supplier_update', label: 'Supplier pricing update' },
  { value: 'risk_adjustment', label: 'Risk adjustment' },
  { value: 'compliance_adjustment', label: 'Compliance adjustment' },
  { value: 'rounding_correction', label: 'Rounding correction' },
  { value: 'internal_quality_control', label: 'Internal quality control' },
  { value: 'other', label: 'Other' }
];

function parseGeneratedJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function recalcFinancials(lineItems, baseMarginPct = 0.25) {
  const totalCost = lineItems.reduce((acc, item) => acc + toNumber(item.total), 0);
  let marginPct = toNumber(baseMarginPct, 0.25);
  let clientQuote = totalCost * (1 + marginPct);
  let profit = clientQuote - totalCost;
  let marginAdjustmentNote = null;

  if (profit < 500) {
    profit = 500;
    clientQuote = totalCost + profit;
    marginPct = totalCost > 0 ? (profit / totalCost) : marginPct;
    marginAdjustmentNote = 'Margin adjusted to meet minimum absolute profit threshold of $500.';
  }

  const gst = clientQuote * 0.10;
  const grandTotal = clientQuote + gst;
  return { totalCost, marginPct, clientQuote, profit, gst, grandTotal, marginAdjustmentNote };
}

export default function QuoteEditor() {
  const { quoteRef } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [quote, setQuote] = useState(null);
  const [summary, setSummary] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [expandedRevisionId, setExpandedRevisionId] = useState(null);
  const [revisionDeltaLoading, setRevisionDeltaLoading] = useState(false);
  const [revisionDeltaError, setRevisionDeltaError] = useState(null);
  const [revisionDeltasById, setRevisionDeltasById] = useState({});
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const redirectToReauth = useCallback(() => {
    navigate(buildReauthPath(`/quotes/${quoteRef}/edit`), { replace: true });
  }, [navigate, quoteRef]);

  const formatTimestamp = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(Number(value));
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
  };

  const loadRevisions = useCallback(async (refValue) => {
    if (!refValue) return;
    if (!readAccessToken()) {
      redirectToReauth();
      return;
    }
    setRevisionsLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/quotes/${refValue}/revisions?limit=25`);
      const rows = res.data?.data?.revisions || [];
      setRevisions(rows);
    } catch (err) {
      if (isAuthError(err)) {
        redirectToReauth();
        return;
      }
      setRevisions([]);
      setError((prev) => prev || err.response?.data?.error || 'Failed to load revision history.');
    }
    setRevisionsLoading(false);
  }, [redirectToReauth]);

  const formatDeltaPct = (value) => {
    const n = toNumber(value, NaN);
    if (!Number.isFinite(n)) return 'n/a';
    return `${(n * 100).toFixed(1)}%`;
  };

  const loadRevisionDeltas = async (revisionId) => {
    if (!quote?.id || !revisionId) return;
    if (revisionDeltasById[revisionId]) return;
    if (!readAccessToken()) {
      redirectToReauth();
      return;
    }
    setRevisionDeltaLoading(true);
    setRevisionDeltaError(null);
    try {
      const res = await apiClient.get(`/api/admin/quotes/${quote.id}/revisions/${revisionId}/deltas`);
      const rows = res.data?.data?.deltas || [];
      setRevisionDeltasById((prev) => ({ ...prev, [revisionId]: rows }));
    } catch (err) {
      if (isAuthError(err)) {
        redirectToReauth();
        return;
      }
      setRevisionDeltaError(err.response?.data?.error || 'Failed to load delta details.');
    }
    setRevisionDeltaLoading(false);
  };

  const toggleRevisionDetails = async (revisionId) => {
    if (expandedRevisionId === revisionId) {
      setExpandedRevisionId(null);
      setRevisionDeltaError(null);
      return;
    }
    setExpandedRevisionId(revisionId);
    setRevisionDeltaError(null);
    await loadRevisionDeltas(revisionId);
  };

  useEffect(() => {
    let mounted = true;
    const loadQuote = async () => {
      setLoading(true);
      setError(null);
      if (!readAccessToken()) {
        redirectToReauth();
        return;
      }
      try {
        const res = await apiClient.get(`/api/admin/quotes/${quoteRef}`);
        const loadedQuote = res.data?.data || null;
        if (!mounted) return;
        const generated = parseGeneratedJson(loadedQuote?.generated_json);
        const items = Array.isArray(generated?.line_items) ? generated.line_items : [];
        setQuote(loadedQuote);
        setSummary(loadedQuote?.summary || generated?.scope_summary || '');
        setLineItems(items.map((item) => ({
          ...item,
          qty: toNumber(item.qty, 0),
          unit_price: toNumber(item.unit_price, 0),
          total: toNumber(item.total, 0)
        })));
        await loadRevisions(loadedQuote?.id || quoteRef);
      } catch (err) {
        if (!mounted) return;
        if (isAuthError(err)) {
          redirectToReauth();
          return;
        }
        setError(err.response?.data?.error || 'Failed to load quote.');
      }
      if (mounted) setLoading(false);
    };
    loadQuote();
    return () => { mounted = false; };
  }, [quoteRef, loadRevisions, redirectToReauth]);

  const financials = useMemo(() => {
    return recalcFinancials(lineItems, toNumber(quote?.margin, 0.25));
  }, [lineItems, quote?.margin]);

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item };
      if (field === 'name') next.name = value;
      if (field === 'qty') next.qty = toNumber(value, 0);
      if (field === 'unit_price') next.unit_price = toNumber(value, 0);
      next.total = Number((toNumber(next.qty, 0) * toNumber(next.unit_price, 0)).toFixed(2));
      return next;
    }));
  };

  const handleSaveRevision = async () => {
    if (!quote?.id) return;
    if (!editReason) {
      setError('Edit reason is required before saving a revision.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    if (!readAccessToken()) {
      setSaving(false);
      setError('Your session expired. Redirecting to re-authenticate...');
      redirectToReauth();
      return;
    }
    try {
      const baseGenerated = parseGeneratedJson(quote.generated_json);
      const updatedJson = {
        ...baseGenerated,
        scope_summary: summary,
        line_items: lineItems,
        financials
      };
      const payload = {
        generated_json: updatedJson,
        summary,
        total_cost: financials.totalCost,
        margin: financials.marginPct,
        profit: financials.profit,
        final_client_quote: financials.grandTotal,
        edit_reason: editReason,
        edit_notes: editNotes || null,
        edited_by: 'backoffice',
        edit_source: 'backoffice'
      };
      const res = await apiClient.post(`/api/admin/quotes/${quote.id}/revisions`, payload);
      const data = res.data?.data || {};
      setQuote((prev) => prev ? ({
        ...prev,
        summary,
        total_cost: financials.totalCost,
        margin: financials.marginPct,
        profit: financials.profit,
        final_client_quote: financials.grandTotal,
        generated_json: JSON.stringify(updatedJson),
        updated_at: Date.now()
      }) : prev);
      setSuccess(`Revision saved (${data.revision_id || 'id unavailable'}). Deltas captured: ${data.deltas_captured || 0}.`);
      setEditNotes('');
      setEditReason('');
      await loadRevisions(quote.id);
    } catch (err) {
      if (isAuthError(err)) {
        setError('Your session expired. Redirecting to re-authenticate...');
        redirectToReauth();
        setSaving(false);
        return;
      }
      setError(err.response?.data?.error || 'Failed to save quote revision.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-osv-bg text-osv-muted flex items-center justify-center">
        Loading quote editor...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-osv-bg text-osv-text p-8">
        <div className="max-w-3xl mx-auto bg-osv-panel/50 border border-osv-red/30 rounded-xl p-6">
          <p className="text-osv-red font-medium">Quote not found.</p>
          {error && <p className="text-osv-muted text-sm mt-2">{error}</p>}
          <Link to="/" className="inline-block mt-4 text-osv-accent text-sm">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell text-osv-text">
      <div className="app-container max-w-6xl space-y-4 md:space-y-6">
        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono text-osv-muted tracking-wide">QUOTE REVISION WORKBENCH</p>
            <h1 className="app-title text-2xl text-osv-white mt-2 wrap-break-word">{quote.quote_num} — {quote.client_name || 'Client'}</h1>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/" className="h-10 px-4 border border-white/15 rounded-lg text-osv-white text-sm leading-10 hover:bg-white/5 transition-colors">
              Dashboard
            </Link>
            <Link to={`/client/quote/${quote.quote_num}`} className="h-10 px-4 border border-osv-accent/40 rounded-lg text-osv-accent text-sm leading-10 hover:bg-osv-accent/10 transition-colors">
              Client Portal
            </Link>
          </div>
        </div>

        {(error || success) && (
          <div className={`rounded-xl p-4 border ${error ? 'bg-osv-red/10 border-osv-red/30' : 'bg-osv-green/10 border-osv-green/30'}`}>
            <p className={error ? 'text-osv-red' : 'text-osv-green'}>{error || success}</p>
          </div>
        )}

        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6 space-y-4">
          <label className="text-xs font-mono text-osv-muted tracking-wide">SUMMARY</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full bg-osv-bg/70 border border-white/10 rounded-lg p-3 text-sm text-osv-white outline-none focus:border-osv-accent/50"
          />
        </div>

        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-heading text-osv-white mb-4">Line Items</h2>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="grid grid-cols-1 md:grid-cols-[120px_1fr_90px_120px_130px] gap-3 bg-osv-bg/50 border border-white/5 rounded-lg p-3">
                <div>
                  <p className="text-[10px] font-mono text-osv-muted mb-1">CATEGORY</p>
                  <p className="text-sm text-osv-white">{item.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-osv-muted mb-1">ITEM NAME</p>
                  <input
                    value={item.name || ''}
                    onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                    className="w-full bg-osv-bg/80 border border-white/10 rounded-md p-2 text-sm text-osv-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-osv-muted mb-1">QTY</p>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                    className="w-full bg-osv-bg/80 border border-white/10 rounded-md p-2 text-sm text-osv-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-osv-muted mb-1">UNIT PRICE</p>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                    className="w-full bg-osv-bg/80 border border-white/10 rounded-md p-2 text-sm text-osv-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-osv-muted mb-1">TOTAL</p>
                  <p className="text-osv-accent font-mono text-sm pt-2">${toNumber(item.total, 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-heading text-osv-white mb-4">Recalculated Financials</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-osv-bg/50 border border-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono text-osv-muted">TOTAL COST</p>
              <p className="text-osv-white font-mono mt-1">${financials.totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-osv-bg/50 border border-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono text-osv-muted">PROFIT</p>
              <p className="text-osv-green font-mono mt-1">${financials.profit.toFixed(2)}</p>
            </div>
            <div className="bg-osv-bg/50 border border-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono text-osv-muted">GST</p>
              <p className="text-osv-white font-mono mt-1">${financials.gst.toFixed(2)}</p>
            </div>
            <div className="bg-osv-bg/50 border border-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono text-osv-muted">CLIENT TOTAL</p>
              <p className="text-osv-accent font-mono mt-1">${financials.grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_auto] gap-4 items-end">
          <div>
            <label className="text-[10px] font-mono text-osv-muted tracking-wide">EDIT REASON (REQUIRED)</label>
            <select
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full mt-2 bg-osv-bg/80 border border-white/10 rounded-lg p-3 text-sm text-osv-white"
            >
              {EDIT_REASONS.map((reason) => (
                <option key={reason.value || 'placeholder'} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-osv-muted tracking-wide">EDIT NOTES (OPTIONAL)</label>
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full mt-2 bg-osv-bg/80 border border-white/10 rounded-lg p-3 text-sm text-osv-white"
              placeholder="Add context for this revision..."
            />
          </div>
          <button
            onClick={handleSaveRevision}
            disabled={saving}
            className="h-12 px-6 bg-osv-accent text-osv-bg rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Revision'}
          </button>
        </div>

        <div className="bg-osv-panel/60 border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading text-osv-white">Revision History</h2>
            <div className="flex items-center gap-3">
              {revisionsLoading && <span className="text-xs font-mono text-osv-muted">Loading...</span>}
              {quote?.id && (
                <a
                  href={`${API_BASE}/api/admin/quotes/${quote.id}/revisions/deltas.csv`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono uppercase tracking-wide text-osv-accent hover:underline"
                >
                  Export CSV
                </a>
              )}
            </div>
          </div>
          {!revisions.length && !revisionsLoading && (
            <p className="text-sm text-osv-muted">No revisions recorded for this quote yet.</p>
          )}
          <div className="space-y-3">
            {revisions.map((revision) => (
              <div key={revision.id} className="bg-osv-bg/50 border border-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-osv-white wrap-break-word">
                      {revision.edit_reason || 'unknown_reason'}
                      {revision.edit_notes ? ` — ${revision.edit_notes}` : ''}
                    </p>
                    <p className="text-[10px] font-mono text-osv-muted mt-1">
                      {formatTimestamp(revision.created_at)} • by {revision.edited_by || 'backoffice'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-osv-muted">DELTAS</p>
                    <p className="text-osv-accent font-mono text-sm">{Number(revision.deltas_count || 0)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div>
                    <p className="text-[10px] font-mono text-osv-muted">BEFORE</p>
                    <p className="text-osv-white font-mono">${toNumber(revision.before_total, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-osv-muted">AFTER</p>
                    <p className="text-osv-white font-mono">${toNumber(revision.after_total, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-osv-muted">DELTA</p>
                    <p className={`${toNumber(revision.delta_total, 0) >= 0 ? 'text-osv-green' : 'text-osv-red'} font-mono`}>
                      {toNumber(revision.delta_total, 0) >= 0 ? '+' : ''}${toNumber(revision.delta_total, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => toggleRevisionDetails(revision.id)}
                    className="text-[11px] font-mono uppercase tracking-wide text-osv-accent hover:underline"
                  >
                    {expandedRevisionId === revision.id ? 'Hide Delta Details' : 'View Delta Details'}
                  </button>
                </div>

                {expandedRevisionId === revision.id && (
                  <div className="mt-3 bg-osv-panel/40 border border-white/5 rounded-lg p-3">
                    {revisionDeltaLoading && (
                      <p className="text-xs text-osv-muted font-mono">Loading delta details...</p>
                    )}
                    {revisionDeltaError && (
                      <p className="text-xs text-osv-red">{revisionDeltaError}</p>
                    )}
                    {!revisionDeltaLoading && !revisionDeltaError && (
                      <div className="space-y-2">
                        {(revisionDeltasById[revision.id] || []).length === 0 && (
                          <p className="text-xs text-osv-muted">No detailed delta rows found for this revision.</p>
                        )}
                        {(revisionDeltasById[revision.id] || []).map((delta) => (
                          <div key={delta.id} className="bg-osv-bg/70 border border-white/5 rounded-md p-2">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <p className="text-xs text-osv-white min-w-0 wrap-break-word">
                                {delta.item_name || 'Unnamed item'} <span className="text-osv-muted">({delta.category || 'Unknown'})</span>
                              </p>
                              <span className="text-[10px] font-mono uppercase tracking-wide text-osv-accent whitespace-nowrap">
                                {delta.change_type}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px]">
                              <p className="text-osv-muted">Unit: ${toNumber(delta.unit_price_before, 0).toFixed(2)} → ${toNumber(delta.unit_price_after, 0).toFixed(2)}</p>
                              <p className="text-osv-muted">Qty: {toNumber(delta.qty_before, 0)} → {toNumber(delta.qty_after, 0)}</p>
                              <p className="text-osv-muted">Unit Δ: {Number(toNumber(delta.unit_price_delta, 0)) >= 0 ? '+' : ''}${toNumber(delta.unit_price_delta, 0).toFixed(2)} ({formatDeltaPct(delta.unit_price_delta_pct)})</p>
                              <p className="text-osv-muted">Total Δ: {Number(toNumber(delta.total_delta, 0)) >= 0 ? '+' : ''}${toNumber(delta.total_delta, 0).toFixed(2)} ({formatDeltaPct(delta.total_delta_pct)})</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
