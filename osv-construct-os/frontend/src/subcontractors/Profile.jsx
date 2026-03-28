import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function SubcontractorProfile() {
  const { id } = useParams();
  const [subbie, setSubbie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`https://osv-construct-backend.onrender.com/api/subcontractors/${id}`)
      .then(res => {
         setSubbie(res.data.data);
         setLoading(false);
      })
      .catch(err => {
         console.error("Subbie load error:", err);
         setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-16 h-16 border-2 border-white/10 border-t-osv-accent rounded-full animate-spin"></div>
        <div className="absolute inset-0 bg-osv-accent/20 blur-xl rounded-full"></div>
      </div>
      <div className="ml-6 uppercase tracking-[0.2em] font-heading font-medium text-osv-muted text-sm border-l border-white/10 pl-6">Loading Gamified Metrics...</div>
    </div>
  );

  if (!subbie) return (
    <div className="min-h-screen flex justify-center items-center bg-osv-bg text-osv-red font-heading text-xl uppercase tracking-widest">
      <div className="bg-osv-panel/40 border border-osv-red/30 p-8 rounded-xl backdrop-blur-md flex flex-col items-center">
        <svg className="w-12 h-12 text-osv-red mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        Subcontractor Profile Database Miss
      </div>
    </div>
  );

  const isApex = subbie.is_apex === 1;
  const ratingDisplay = subbie.rating || 5.0; // fallback default new


  return (
    <div className="min-h-screen bg-osv-bg text-osv-text p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-osv-accent/5 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Profile Header Block */}
        <div className="bg-osv-panel/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden mb-8 shadow-2xl relative group">
           {/* Cover Photo */}
           <div className="h-48 md:h-64 bg-osv-bg/50 relative overflow-hidden">
             <img src="https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&q=80" alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:opacity-50 transition-opacity duration-700 blur-[2px] group-hover:blur-none" />
             <div className="absolute inset-0 bg-gradient-to-t from-osv-panel via-transparent to-osv-bg/50"></div>
             
             <div className="absolute top-6 right-6 flex flex-col md:flex-row gap-3">
                {isApex && (
                  <div className="bg-osv-accent text-[#0f1115] font-bold px-4 py-2.5 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[10px] md:text-xs">
                    <span className="text-sm">👑</span> Apex {subbie.trade}
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 text-osv-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[10px] md:text-xs shadow-lg">
                  {subbie.tier} Tier Protocol
                </div>
             </div>
           </div>
           
           <div className="p-8 relative">
              {/* Avatar Ring */}
              <div className="absolute -top-16 left-8 w-24 h-24 md:w-32 md:h-32 bg-osv-bg border-4 border-osv-panel rounded-full flex items-center justify-center overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.8)] z-10">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150" alt="Profile" className="object-cover w-full h-full hover:scale-110 transition-transform duration-500" />
              </div>
              
              <div className="ml-28 md:ml-40 flex flex-col md:flex-row justify-between items-start mt-4 md:mt-2">
                 <div>
                    <h1 className="text-3xl md:text-4xl font-heading font-medium text-osv-white tracking-widest uppercase leading-none">{subbie.name}</h1>
                    <p className="text-sm md:text-md text-osv-accent font-mono tracking-[0.15em] uppercase mt-2 bg-osv-accent/10 border border-osv-accent/20 px-3 py-1 rounded inline-block">{subbie.business}</p>
                 </div>
                 <div className="mt-6 md:mt-0 text-left md:text-right border-t border-white/5 pt-4 md:pt-0 md:border-t-0 w-full md:w-auto">
                    <div className="flex items-baseline md:justify-end gap-1 font-heading">
                      <span className="text-4xl md:text-5xl font-medium text-osv-white drop-shadow-md">{ratingDisplay.toFixed(1)}</span>
                      <span className="text-lg text-osv-muted font-normal tracking-wide">/ 5.0</span>
                    </div>
                    <p className="text-[10px] md:text-xs text-osv-accent/80 uppercase tracking-[0.2em] font-medium mt-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-osv-accent/80 mr-2 animate-pulse"></span>
                      {subbie.total_reviews} Verified Data Points
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Sidebar: Verification & Stats */}
           <div className="space-y-8">
              <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-osv-accent/20 group-hover:bg-osv-accent/50 transition-colors"></div>
                 <h2 className="text-lg md:text-xl font-heading text-osv-white tracking-widest uppercase border-b border-white/5 pb-4 mb-5 font-medium flex items-center gap-3">
                   <svg className="w-5 h-5 text-osv-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                   Credentials
                 </h2>
                 <ul className="space-y-5">
                    <li className="flex flex-col gap-1 text-sm border-b border-white/5 pb-3">
                       <span className="text-osv-muted uppercase tracking-[0.15em] text-[10px] font-semibold">ABN Status</span>
                       <span className={`font-mono text-xs flex items-center gap-2 ${subbie.abn ? 'text-emerald-400' : 'text-osv-red'}`}>
                         {subbie.abn ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> {subbie.abn}</> : 'Unverified'}
                       </span>
                    </li>
                    <li className="flex flex-col gap-1 text-sm border-b border-white/5 pb-3">
                       <span className="text-osv-muted uppercase tracking-[0.15em] text-[10px] font-semibold">Insurance Validation</span>
                       <span className={`font-medium flex items-center gap-2 text-xs uppercase tracking-widest ${subbie.insurance_expiry ? 'text-emerald-400' : 'text-osv-red'}`}>
                         {subbie.insurance_expiry ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Valid til {subbie.insurance_expiry}</> : 'Required'}
                       </span>
                    </li>
                    <li className="flex flex-col gap-2 text-sm">
                       <span className="text-osv-muted uppercase tracking-[0.15em] text-[10px] font-semibold">Trade License</span>
                       <span className="bg-osv-bg/80 border border-white/10 px-3 py-2 rounded text-osv-white font-mono text-xs shadow-inner inline-block w-max">{subbie.license_num || 'N/A'}</span>
                    </li>
                 </ul>
              </div>

              <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-2xl">
                 <h2 className="text-lg md:text-xl font-heading text-osv-white tracking-widest uppercase border-b border-white/5 pb-4 mb-5 font-medium flex items-center gap-3">
                   <svg className="w-5 h-5 text-osv-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                   OSV Standing
                 </h2>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-osv-bg/50 border border-white/5 rounded-lg p-5 flex flex-col justify-center shadow-inner hover:border-white/20 transition-colors">
                       <div className="text-3xl font-medium font-heading text-osv-white mb-2">{subbie.jobs_completed}</div>
                       <div className="text-[10px] text-osv-muted uppercase tracking-[0.15em] font-semibold">Quests Built</div>
                    </div>
                    <div className="bg-osv-accent/5 border border-osv-accent/20 rounded-lg p-5 flex flex-col justify-center shadow-[inset_0_2px_15px_rgba(245,158,11,0.05)] hover:border-osv-accent/40 hover:bg-osv-accent/10 transition-colors">
                       <div className="text-3xl font-medium font-heading text-osv-accent mb-2 drop-shadow-md">{subbie.fee_discount_pct * 100}%</div>
                       <div className="text-[10px] text-osv-accent/80 uppercase tracking-[0.15em] font-semibold">Fee Discount</div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Main Column: Bio & Gallery */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 md:p-8 shadow-2xl">
                 <h2 className="text-lg md:text-xl font-heading text-osv-white tracking-widest uppercase border-b border-white/5 pb-4 mb-5 font-medium">Mission Profile</h2>
                 <p className="text-osv-text/90 leading-relaxed whitespace-pre-wrap text-sm md:text-base">{subbie.bio}</p>
                 <div className="mt-8 flex flex-col sm:flex-row gap-4 border-t border-white/5 pt-6">
                    <button className="flex-1 bg-osv-accent/10 border border-osv-accent/50 text-osv-accent font-bold py-4 px-4 rounded-lg transition-all hover:bg-osv-accent hover:text-[#0f1115] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] uppercase tracking-[0.15em] text-xs text-center focus:outline-none focus:ring-1 focus:ring-osv-accent">
                       Direct Comms Line
                    </button>
                    <button className="flex-1 bg-osv-bg/50 border border-white/10 text-osv-white font-bold py-4 px-4 rounded-lg transition-all hover:border-white/40 hover:bg-white/5 uppercase tracking-[0.15em] text-xs text-center shadow-inner focus:outline-none focus:ring-1 focus:ring-white/30">
                       Assign Operation
                    </button>
                 </div>
              </div>

              <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl p-6 md:p-8 shadow-2xl">
                 <h2 className="text-lg md:text-xl font-heading text-osv-white tracking-widest uppercase border-b border-white/5 pb-4 mb-5 font-medium flex justify-between items-center">
                   Verified OSV Logs
                   <span className="text-[10px] text-osv-muted font-mono tracking-widest bg-osv-bg/50 px-2 py-1 rounded border border-white/5 hidden sm:inline-block">/gallery_data</span>
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {subbie.gallery.map(img => (
                       <div key={img} className="bg-osv-bg aspect-video rounded-lg overflow-hidden group relative cursor-pointer shadow-lg border border-white/5 hover:border-osv-accent/50 transition-all duration-300">
                          <img src={`https://images.unsplash.com/photo-${1500000000000 + img}?auto=format&fit=crop&w=600`} alt="Project" className="object-cover w-full h-full opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115]/90 via-[#0f1115]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                             <span className="text-osv-white font-heading tracking-widest text-sm uppercase translate-y-4 group-hover:translate-y-0 transition-transform duration-300 border border-white/10 bg-osv-panel/80 backdrop-blur-md px-4 py-2 rounded-full">Timber Decking • ${8 + img}k</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
           
        </div>
      </div>
    </div>
  );
}
