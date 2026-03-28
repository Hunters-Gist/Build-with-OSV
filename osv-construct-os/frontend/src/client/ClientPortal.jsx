import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://osv-construct-backend.onrender.com';

function parseGeneratedJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function prettyStatus(status) {
  switch (status) {
    case 'draft': return 'Draft';
    case 'issued': return 'Issued';
    case 'accepted': return 'Accepted';
    case 'deposit_paid': return 'Deposit Paid';
    case 'won': return 'Won';
    case 'lost': return 'Closed';
    default: return status || 'Unknown';
  }
}

export default function ClientPortal() {
  const { quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('success') === 'true';
  const sessionId = searchParams.get('session_id');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const confirmAttemptedRef = useRef(false);

  const quoteJson = useMemo(() => parseGeneratedJson(quote?.generated_json), [quote?.generated_json]);
  const lineItems = Array.isArray(quoteJson.line_items) ? quoteJson.line_items : [];
  const total = Number(quote?.final_client_quote || 0);
  const depositAmount = Number((total * 0.30).toFixed(2));

  const paymentMilestones = useMemo(() => ([
    { stage: 'Deposit (Material Procurement)', split: '30%', amount: depositAmount },
    { stage: 'Progress Claim (On-Site Works)', split: '40%', amount: Number((total * 0.40).toFixed(2)) },
    { stage: 'Final Handover', split: '30%', amount: Number((total * 0.30).toFixed(2)) }
  ]), [depositAmount, total]);

  const loadQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/quotes/${quoteId}`);
      setQuote(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quote.');
      setQuote(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentSuccess || !sessionId || !quote || confirmAttemptedRef.current) return;
      if (quote.status === 'deposit_paid' || quote.status === 'won') return;
      confirmAttemptedRef.current = true;
      try {
        await axios.post(`${API_BASE}/api/checkout/confirm-payment`, {
          quoteNum: quote.quote_num || quote.id,
          sessionId
        });
        await loadQuote();
      } catch (err) {
        setError(err.response?.data?.error || 'Payment succeeded but confirmation failed. Please contact support.');
      }
    };
    confirmPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentSuccess, sessionId, quote?.id, quote?.status]);

  const acceptQuote = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.patch(`${API_BASE}/api/quotes/${quote.id}`, { status: 'accepted' });
      await loadQuote();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept quote.');
    }
    setActionLoading(false);
  };

  const payDeposit = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/checkout/create-session`, {
        quoteNum: quote.quote_num,
        clientName: quote.client_name
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Unable to start payment session.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Secure payment gateway failed to initiate.');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-osv-bg flex items-center justify-center text-osv-muted">
        Loading quote...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-osv-bg text-osv-text p-8">
        <div className="max-w-2xl mx-auto bg-osv-panel/40 border border-osv-red/30 p-6 rounded-xl">
          <h2 className="text-osv-red font-heading text-xl mb-2">Quote Not Available</h2>
          <p className="text-osv-muted text-sm">{error || 'This quote could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-osv-bg text-osv-text font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-osv-accent/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header */}
      <div className="bg-osv-panel/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div>
          <h1 className="font-heading font-medium text-3xl text-osv-white tracking-widest leading-none">
            Build With <span className="text-osv-accent">OSV</span>
          </h1>
          <p className="text-[10px] text-osv-muted uppercase tracking-[0.2em] mt-2 font-medium">
            Client Access Portal
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-osv-muted uppercase tracking-[0.15em] mb-1 font-semibold">Quote Reference</p>
          <p className="text-lg font-mono text-osv-white bg-osv-bg/50 border border-white/10 px-3 py-1 rounded inline-block shadow-inner">{quote.quote_num}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-white/5">
          <div className="mb-4 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-heading text-osv-white tracking-widest uppercase mb-3 font-medium leading-tight">
              {quote.summary || quote.trade || 'Quote'}
            </h2>
            <p className="text-osv-muted flex items-center gap-2 text-sm uppercase tracking-widest">
              <svg className="w-4 h-4 text-osv-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              {quote.client_name || 'Client'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-osv-accent/10 border border-osv-accent/40 text-osv-accent px-4 py-1.5 rounded text-[10px] uppercase tracking-[0.15em] font-black flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="w-1.5 h-1.5 rounded-full bg-osv-accent animate-pulse"></div>
              {prettyStatus(quote.status)}
            </div>
          </div>
        </div>

        <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl mb-8 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-osv-bg/40">
            <h3 className="font-heading text-xl text-osv-white tracking-widest uppercase font-medium">Investment Breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm md:text-base border-b border-white/5 pb-3">
                <span className="text-osv-text/90 tracking-wide">{item.name}</span>
                <span className="text-osv-white font-mono bg-osv-bg/50 px-2 py-1 rounded border border-white/5">${Number(item.total || 0).toFixed(2)}</span>
              </div>
            ))}
            
            <div className="flex justify-between items-end pt-6">
              <span className="font-heading tracking-[0.1em] text-osv-muted uppercase text-[10px] font-semibold">Total Investment</span>
              <span className="text-osv-accent font-heading text-4xl leading-none shadow-osv-accent/20 drop-shadow-md tracking-wider">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Dynamic Payment Milestones */}
        <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl mb-10 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-osv-bg/40 flex justify-between items-center">
            <div>
              <h3 className="font-heading text-xl text-osv-white tracking-widest uppercase font-medium">Payment Structure</h3>
              <p className="text-[10px] font-bold text-osv-accent/80 uppercase tracking-widest mt-2 bg-osv-accent/10 inline-block px-2 py-1 rounded border border-osv-accent/20">Milestone Validated</p>
            </div>
            <svg className="w-8 h-8 text-osv-border" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          </div>
          <div className="p-6 bg-osv-panel/30">
            {paymentMilestones.map((ms, idx) => (
               <div key={idx} className="flex justify-between items-center border-l-2 border-osv-accent/60 hover:border-osv-accent pl-4 mb-5 last:mb-0 transition-colors group">
                 <div>
                   <p className="text-osv-white font-medium text-sm md:text-base group-hover:text-osv-accent transition-colors">{ms.stage}</p>
                   <p className="text-[10px] text-osv-muted uppercase tracking-[0.15em] font-semibold mt-1">Milestone {idx + 1} <span className="mx-2 opacity-30">•</span> {ms.split}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-osv-white font-mono text-lg group-hover:text-osv-accent transition-colors">${ms.amount.toFixed(2)}</p>
                 </div>
               </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-osv-red/10 border border-osv-red/30 text-osv-white px-5 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Action Bar */}
        {(quote.status === 'deposit_paid' || quote.status === 'won') ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-xl text-center shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
            <h3 className="text-emerald-400 font-heading text-2xl uppercase tracking-widest font-medium mb-3 flex justify-center items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-400/20 border border-emerald-400/40">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </span>
              Deposit Secured
            </h3>
            <p className="text-osv-text/80 tracking-widest uppercase text-xs mt-4 max-w-lg mx-auto leading-relaxed">Your initial phase milestones are locked. An OSV Supervisor code has been generated and a team will deploy shortly.</p>
          </div>
        ) : quote.status === 'draft' ? (
          <div className="bg-osv-panel/40 border border-white/10 p-8 rounded-xl text-center">
            <h3 className="text-osv-white font-heading text-xl uppercase tracking-widest mb-2">Quote Not Yet Issued</h3>
            <p className="text-osv-muted text-xs uppercase tracking-widest">Please contact OSV to issue this quote to the client portal.</p>
          </div>
        ) : quote.status === 'issued' || quote.status === 'sent' ? (
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={acceptQuote}
              disabled={actionLoading}
              className="flex-[2] bg-osv-accent text-[#0f1115] font-bold py-5 rounded uppercase tracking-[0.15em] text-sm md:text-base hover:brightness-110 transition-all disabled:opacity-60"
            >
              {actionLoading ? 'Saving...' : 'Accept Quote'}
            </button>
            <button disabled className="flex-1 bg-osv-panel/50 backdrop-blur-sm border border-white/10 text-osv-muted font-bold py-5 rounded uppercase tracking-[0.15em] text-[10px] md:text-xs">
              Accept To Enable Deposit
            </button>
          </div>
        ) : quote.status === 'accepted' ? (
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={payDeposit}
              disabled={actionLoading}
              className="flex-[2] relative overflow-hidden group bg-emerald-500 text-[#0f1115] font-bold py-5 rounded uppercase tracking-[0.15em] text-sm md:text-base hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-60"
            >
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                {actionLoading ? 'Opening Secure Checkout...' : `Secure Booking (Pay 30% Deposit: $${depositAmount.toFixed(2)})`}
              </span>
            </button>
            <button className="flex-1 bg-osv-panel/50 backdrop-blur-sm border border-white/10 text-osv-white font-bold py-5 rounded uppercase tracking-[0.15em] text-[10px] md:text-xs hover:bg-osv-panel hover:border-osv-white transition-all">
              Request Scope Changes
            </button>
          </div>
        ) : (
          <div className="bg-osv-panel/40 border border-white/10 p-8 rounded-xl text-center">
            <h3 className="text-osv-white font-heading text-xl uppercase tracking-widest mb-2">Quote Closed</h3>
            <p className="text-osv-muted text-xs uppercase tracking-widest">This quote is no longer accepting payment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
