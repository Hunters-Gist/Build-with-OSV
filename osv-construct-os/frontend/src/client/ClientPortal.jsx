import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ClientPortal() {
  const { quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const [internalView, setInternalView] = useState(false); // Default to strict Client visibility
  const paymentSuccess = searchParams.get('success') === 'true';
  
  // Scaffolded static data for preview
  const mockQuote = {
    id: quoteId || 'Q-10024',
    title: 'Perimeter Deck Extension',
    total: 6200.00,
    profit: 1240.00,
    marginPct: '20%',
    status: 'Pending Approval',
    date: '24 March 2026',
    address: '124 Mckenzie Street, Frankston',
    items: [
      { name: 'Treated decking boards (supply)', total: 2400 },
      { name: 'Base frame / stump reinforcements', total: 1100 },
      { name: 'Labour & Installation', total: 1460 }
    ],
    aiMilestoneSuggestion: [
       { stage: "Deposit (Material Procurement)", split: "30%", amount: 1860 },
       { stage: "Frame & Base Completion Check", split: "40%", amount: 2480 },
       { stage: "Final Handover", split: "30%", amount: 1860 }
    ]
  };

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
            {internalView ? 'Internal Admin View' : 'Client Access Portal'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-osv-muted uppercase tracking-[0.15em] mb-1 font-semibold">Quote Reference</p>
          <p className="text-lg font-mono text-osv-white bg-osv-bg/50 border border-white/10 px-3 py-1 rounded inline-block shadow-inner">{mockQuote.id}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-white/5">
          <div className="mb-4 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-heading text-osv-white tracking-widest uppercase mb-3 font-medium leading-tight">{mockQuote.title}</h2>
            <p className="text-osv-muted flex items-center gap-2 text-sm uppercase tracking-widest">
              <svg className="w-4 h-4 text-osv-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              {mockQuote.address}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setInternalView(!internalView)}
              className="text-[10px] font-bold uppercase tracking-[0.15em] border border-white/10 text-osv-muted px-4 py-2 bg-osv-panel/50 hover:bg-osv-panel hover:text-osv-white hover:border-white/30 transition-all rounded"
            >
              Toggle {internalView ? 'Client' : 'Internal'}
            </button>
            <div className="bg-osv-accent/10 border border-osv-accent/40 text-osv-accent px-4 py-1.5 rounded text-[10px] uppercase tracking-[0.15em] font-black flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="w-1.5 h-1.5 rounded-full bg-osv-accent animate-pulse"></div>
              {mockQuote.status}
            </div>
          </div>
        </div>

        <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl mb-8 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-osv-bg/40">
            <h3 className="font-heading text-xl text-osv-white tracking-widest uppercase font-medium">Investment Breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            {mockQuote.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm md:text-base border-b border-white/5 pb-3">
                <span className="text-osv-text/90 tracking-wide">{item.name}</span>
                <span className="text-osv-white font-mono bg-osv-bg/50 px-2 py-1 rounded border border-white/5">${item.total.toFixed(2)}</span>
              </div>
            ))}
            
            {internalView && (
              <div className="flex justify-between items-center text-sm border border-emerald-500/20 py-3 mt-4 bg-emerald-500/5 px-4 rounded-lg">
                <span className="text-emerald-400 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  Internal Profit ({mockQuote.marginPct})
                </span>
                <span className="text-emerald-400 font-bold font-mono">+ ${mockQuote.profit.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end pt-6">
              <span className="font-heading tracking-[0.1em] text-osv-muted uppercase text-[10px] font-semibold">Total Investment</span>
              <span className="text-osv-accent font-heading text-4xl leading-none shadow-osv-accent/20 drop-shadow-md tracking-wider">${mockQuote.total.toFixed(2)}</span>
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
            {mockQuote.aiMilestoneSuggestion.map((ms, idx) => (
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

        {/* Action Bar */}
        {paymentSuccess ? (
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
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={async () => {
              try {
                // Dynamically extract the first AI suggested milestone to securely request as deposit
                const depositAmount = mockQuote.aiMilestoneSuggestion[0].amount;
                const res = await axios.post('https://osv-construct-backend.onrender.com/api/checkout/create-session', {
                  quoteNum: mockQuote.id,
                  depositAmount: depositAmount,
                  clientName: "OSV Portal Authorized Client"
                });
                if (res.data.url) {
                  // Push directly to Stripe Hosted session
                  window.location.href = res.data.url;
                }
              } catch (err) {
                console.error(err);
                alert("Secure Payment Gateway failed to initiate. Please ensure STRIPE_SECRET_KEY is active in the backend environment.");
              }
            }} className="flex-[2] relative overflow-hidden group bg-emerald-500 text-[#0f1115] font-bold py-5 rounded uppercase tracking-[0.15em] text-sm md:text-base hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Secure Booking (Pay 30% Deposit)
              </span>
            </button>
            <button className="flex-1 bg-osv-panel/50 backdrop-blur-sm border border-white/10 text-osv-white font-bold py-5 rounded uppercase tracking-[0.15em] text-[10px] md:text-xs hover:bg-osv-panel hover:border-osv-white transition-all">
              Request Scope Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
