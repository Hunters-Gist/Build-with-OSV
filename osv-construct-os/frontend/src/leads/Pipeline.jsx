import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STAGES = ['New', 'Contacted', 'Site Visit', 'Quoted', 'Won'];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    axios.get('https://osv-construct-backend.onrender.com/api/leads')
      .then(res => {
        // Fallback for mocked UX if empty DB
        if (res.data.data.length === 0) {
           setLeads([
            { id: 1, client_name: 'Smith - Perimeter Fencing', suburb: 'Frankston', stage: 'New', budget_range: '$8k', created_at: Date.now() - 86400000 },
            { id: 2, client_name: 'Jones - Deck Extension', suburb: 'Mornington', stage: 'Contacted', budget_range: '$12k', created_at: Date.now() - 259200000 },
            { id: 3, client_name: 'Patel - Retaining Wall', suburb: 'Clyde', stage: 'Quoted', budget_range: '$25k', created_at: Date.now() - 518400000 },
           ]);
        } else {
           setLeads(res.data.data);
        }
      })
      .catch(err => {
        console.error(err);
        // Fallback if network err
        setLeads([
          { id: 1, client_name: 'Smith - Perimeter Fencing', suburb: 'Frankston', stage: 'New', budget_range: '$8k', created_at: Date.now() - 86400000 },
        ]);
      });
  }, []);

  return (
    <div className="p-6 md:p-10 h-full min-h-screen bg-osv-bg relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-osv-accent/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-medium tracking-tight text-osv-white">Pipeline</h1>
            <p className="font-mono text-osv-muted text-sm mt-2 tracking-wide">TOTAL VALUE: $45,000</p>
          </div>
          <button className="inline-flex items-center justify-center bg-osv-accent text-[#0A0A0F] font-medium h-11 px-6 rounded-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg shrink-0">
            + Manual Lead
          </button>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 h-[calc(100vh-200px)] min-h-[500px] snap-x">
          {STAGES.map(stage => (
            <div key={stage} className="flex-1 min-w-[320px] max-w-[400px] bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col snap-start overflow-hidden">
              <div className="p-5 border-b border-white/5 bg-osv-alt/50 flex justify-between items-center">
                <h2 className="text-lg font-heading font-medium text-osv-white tracking-wide">{stage}</h2>
                <span className="bg-osv-bg/80 text-osv-muted font-mono text-xs px-2 py-1 rounded-full border border-white/5">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {leads.filter(l => l.stage === stage).map(lead => {
                  const days = Math.floor((Date.now() - lead.created_at) / 86400000);
                  const isStale = (lead.stage === 'Quoted' && days >= 5);
                  return (
                    <div key={lead.id} className={`p-5 rounded-xl border bg-osv-alt/80 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isStale ? 'border-osv-red/50 hover:border-osv-red hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/10 hover:border-osv-accent/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h3 className="text-base font-medium text-osv-white leading-tight">{lead.client_name || lead.title}</h3>
                        {isStale && <span className="bg-osv-red/10 text-osv-red border border-osv-red/20 text-[10px] font-mono px-2 py-0.5 rounded uppercase shrink-0">Stale</span>}
                      </div>
                      <div className="flex justify-between text-sm text-osv-muted mb-4 font-sans">
                        <span>{lead.suburb}</span>
                        <span className="text-osv-white/90">{lead.budget_range || lead.value}</span>
                      </div>
                      <div className="flex items-center text-[11px] font-mono text-osv-muted border-t border-white/5 pt-3">
                        <span className="w-2 h-2 rounded-full mr-2 bg-osv-accent/50"></span>
                        {days} DAY{days !== 1 ? 'S' : ''} IN STAGE
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
