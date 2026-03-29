import React, { useState } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="app-shell h-full text-osv-text relative overflow-hidden font-sans">
       {/* Ambient background glows */}
       <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-osv-accent/5 rounded-full blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
       
       <div className="app-container max-w-[1400px] relative z-10">
         <div className="app-header md:flex-row md:justify-between md:items-end">
             <div>
               <h1 className="app-title text-osv-white tracking-[0.12em] uppercase mb-2">Administrator OS</h1>
               <p className="app-subtitle">System Configuration & Data Integrity Management</p>
             </div>
         </div>
         
         <div className="flex gap-3 sm:gap-6 mb-8 border-b border-white/5 pb-px relative overflow-x-auto">
           <button 
              onClick={() => setActiveTab('import')}
              className={`font-heading text-fluid-base uppercase tracking-[0.15em] px-2 py-3 transition-all relative whitespace-nowrap ${activeTab === 'import' ? 'text-osv-accent' : 'text-osv-muted hover:text-osv-white'}`}
           >
              Data Import
              {activeTab === 'import' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-osv-accent shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              )}
           </button>
           <button 
              onClick={() => setActiveTab('users')}
              className={`font-heading text-fluid-base uppercase tracking-[0.15em] px-2 py-3 transition-all relative whitespace-nowrap ${activeTab === 'users' ? 'text-osv-accent' : 'text-osv-muted hover:text-osv-white'}`}
           >
              Subbie Registry
              {activeTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-osv-accent shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              )}
           </button>
         </div>

         {activeTab === 'import' && (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
             <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 p-8 rounded-xl relative overflow-hidden group hover:border-osv-accent/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
               <div className="absolute top-0 left-0 w-1 h-full bg-osv-accent/20 group-hover:bg-osv-accent transition-colors"></div>
               <h2 className="text-xl font-heading text-osv-white mb-3 uppercase tracking-widest font-medium">Migrate Subbies</h2>
               <p className="text-xs text-osv-muted mb-6 leading-relaxed">Import Subcontractors database via standardized CSV format into the OSV ecosystem.</p>
               <input type="file" className="text-xs text-osv-muted w-full mb-6 bg-osv-bg/80 p-3 border border-white/10 rounded cursor-pointer font-mono file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-semibold file:bg-osv-accent/20 file:text-osv-accent hover:file:bg-osv-accent/30" />
               <button className="w-full bg-osv-panel/80 border border-osv-accent/50 text-osv-accent hover:bg-osv-accent hover:text-[#0f1115] text-xs font-bold py-3 rounded uppercase tracking-[0.15em] transition-all focus:outline-none focus:ring-1 focus:ring-osv-accent hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">Execute Import</button>
             </div>
             
             <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 p-8 rounded-xl relative overflow-hidden group hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
               <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-white/20 transition-colors"></div>
               <h2 className="text-xl font-heading text-osv-white mb-3 uppercase tracking-widest font-medium">Migrate Clients</h2>
               <p className="text-xs text-osv-muted mb-6 leading-relaxed">Bulk import existing client profiles and associated contact metadata.</p>
               <input type="file" className="text-xs text-osv-muted w-full mb-6 bg-osv-bg/80 p-3 border border-white/10 rounded cursor-pointer font-mono file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-semibold file:bg-white/10 file:text-osv-white hover:file:bg-white/20" />
               <button className="w-full bg-osv-panel/80 border border-white/20 hover:border-osv-white text-osv-white text-xs font-bold py-3 rounded uppercase tracking-[0.15em] transition-all focus:outline-none focus:ring-1 focus:ring-osv-white">Execute Import</button>
             </div>
             
             <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 p-8 rounded-xl relative overflow-hidden group hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
               <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-white/20 transition-colors"></div>
               <h2 className="text-xl font-heading text-osv-white mb-3 uppercase tracking-widest font-medium">Migrate Jobs</h2>
               <p className="text-xs text-osv-muted mb-6 leading-relaxed">Migrate active job deliveries, status tracking, and historical records.</p>
               <input type="file" className="text-xs text-osv-muted w-full mb-6 bg-osv-bg/80 p-3 border border-white/10 rounded cursor-pointer font-mono file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-semibold file:bg-white/10 file:text-osv-white hover:file:bg-white/20" />
               <button className="w-full bg-osv-panel/80 border border-white/20 hover:border-osv-white text-osv-white text-xs font-bold py-3 rounded uppercase tracking-[0.15em] transition-all focus:outline-none focus:ring-1 focus:ring-osv-white">Execute Import</button>
             </div>
           </div>
         )}
         
         {activeTab === 'users' && (
           <div className="bg-osv-panel/40 backdrop-blur-md border border-white/5 p-8 rounded-xl shadow-2xl relative">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <h2 className="text-2xl font-heading text-osv-white tracking-widest uppercase font-medium">Active Subcontractors</h2>
                <button className="text-[10px] bg-osv-accent/10 border border-osv-accent/50 text-osv-accent px-4 py-2 rounded uppercase tracking-widest hover:bg-osv-accent hover:text-[#0f1115] transition-all font-bold">Refresh Target</button>
              </div>
              <div className="text-osv-muted font-mono text-xs text-center py-16 border border-dashed border-white/10 rounded-lg bg-osv-bg/30">
                <svg className="w-8 h-8 mx-auto mb-3 text-osv-border" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"></path></svg>
                REGISTRY EMPTY. PREPARE DATA IMPORT.
              </div>
           </div>
         )}
       </div>
    </div>
  );
}
