import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [subbies, setSubbies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Jobs & Subbies in parallel directly from local SQLite
    Promise.all([
      axios.get('https://osv-construct-backend.onrender.com/api/jobs'),
      axios.get('https://osv-construct-backend.onrender.com/api/subcontractors')
    ]).then(([jobsRes, subbiesRes]) => {
      let activeJobs = jobsRes.data.data;
      if (activeJobs.length === 0) {
        // Prototype UI Fallback if the database is unpopulated
        activeJobs = [
          { id: 'j1', job_num: 'JOB-0001', title: 'Perimeter Timber Fence', client_name: 'Smith Residence', trade: 'Carpentry', status: 'Posted', scope_notes: '45 lineal meters of treated pine attached to boundary.' },
          { id: 'j2', job_num: 'JOB-0002', title: 'Internal Rewiring', client_name: 'Jones Estate', trade: 'Electrical', status: 'In Progress', assigned_sub_name: 'ACME Electrics', scope_notes: 'Full switchboard upgrade and 20 new GPOs.' },
          { id: 'j3', job_num: 'JOB-0003', title: 'Concrete Base Pour', client_name: 'Industrial Park', trade: 'Landscaping', status: 'Completed', assigned_sub_name: 'Harrison & Sons Carpentry', scope_notes: '150sqm base foundation.' }
        ];
      }
      setJobs(activeJobs);
      setSubbies(subbiesRes.data.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleAssign = async (jobId, subbieId) => {
    const subbie = subbies.find(s => s.id === subbieId);
    if (!subbie) return;
    
    try {
      await axios.patch(`https://osv-construct-backend.onrender.com/api/jobs/${jobId}`, {
        assigned_sub_id: subbie.id,
        assigned_sub_name: subbie.business || subbie.name,
        status: 'Assigned'
      });
      // Synchronous Local State UI overriding to instantly feel snappy
      setJobs(jobs.map(j => {
        if (j.id === jobId) {
           return { ...j, assigned_sub_id: subbie.id, assigned_sub_name: subbie.business || subbie.name, status: 'Assigned' };
        }
        return j;
      }));
    } catch(err) {
      console.error(err);
      alert("Database mapping error assigning gamified subbie to job.");
    }
  };

  const updateStatus = async (jobId, newStatus) => {
    try {
      await axios.patch(`https://osv-construct-backend.onrender.com/api/jobs/${jobId}`, { status: newStatus });
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    } catch(err) {
      console.error(err);
      alert("Failed to update site progression status logic.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-16 h-16 border-2 border-osv-border border-t-osv-accent rounded-full animate-spin"></div>
        <div className="absolute inset-0 bg-osv-accent/20 blur-xl rounded-full"></div>
      </div>
      <div className="ml-6 uppercase tracking-[0.2em] font-heading font-medium text-osv-muted text-sm border-l border-osv-border pl-6">Booting Job Command Center...</div>
    </div>
  );

  return (
    <div className="app-shell text-osv-text font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-osv-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="app-container max-w-[1400px] relative z-10">
          <div className="app-header md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="app-title text-osv-white tracking-[0.12em] uppercase mb-2">Active Job Delivery</h1>
              <p className="app-subtitle">Assign OSV Forge Gamified Subbies & Track Site Progression State</p>
            </div>
            <Link to="/" className="mt-4 md:mt-0 px-6 py-3 bg-osv-panel/80 backdrop-blur-md border border-osv-border/60 hover:border-osv-accent/50 text-osv-white transition-all rounded uppercase tracking-[0.15em] text-xs font-semibold hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] focus:outline-none focus:ring-1 focus:ring-osv-accent">Terminal Home</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {['Posted', 'Assigned', 'In Progress', 'Completed'].map(statusPhase => (
              <div key={statusPhase} className="bg-osv-panel/40 backdrop-blur-md border border-white/5 rounded-xl flex flex-col h-[62vh] sm:h-[68vh] lg:h-[72vh] xl:h-[75vh] shadow-2xl overflow-hidden relative group">
                {/* Column header */}
                <div className="p-4 border-b border-white/5 bg-osv-bg/50 backdrop-blur-sm z-10 relative">
                  <h2 className="font-heading text-lg text-osv-white uppercase tracking-[0.15em] flex justify-between items-center font-medium">
                    {statusPhase} 
                    <span className="bg-osv-bg border border-osv-border/60 text-osv-white text-[10px] px-3 py-1 rounded font-mono shadow-inner">{jobs.filter(j=>j.status===statusPhase).length}</span>
                  </h2>
                </div>
                
                {/* Cards container */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar relative z-10">
                  {jobs.filter(j => j.status === statusPhase).map(job => (
                    <div key={job.id} className="group/card bg-osv-panel/80 backdrop-blur-md border border-white/5 p-5 rounded-lg hover:border-osv-accent/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1">
                      
                      <div className="flex justify-between items-start mb-4 gap-2 min-w-0">
                        <span className="text-osv-accent font-mono text-[10px] border border-osv-accent/20 px-2 py-1 rounded bg-osv-accent/5 tracking-wider whitespace-nowrap">{job.job_num}</span>
                        <span className="text-osv-muted uppercase tracking-widest text-[10px] font-semibold leading-none mt-1 text-right wrap-break-word">{job.trade}</span>
                      </div>
                      
                      <h3 className="font-medium font-heading text-osv-white text-fluid-lg uppercase tracking-wider leading-snug mb-2 wrap-break-word">{job.title}</h3>
                      <p className="text-osv-muted text-fluid-xs mb-4 uppercase tracking-widest flex items-center gap-2 font-medium">
                        <svg className="w-3 h-3 text-osv-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        {job.client_name}
                      </p>
                      
                      <p className="text-xs text-osv-text/80 mb-5 line-clamp-3 bg-osv-bg/50 p-3 rounded border border-white/5 leading-relaxed">{job.scope_notes}</p>
                      
                      {/* Dynamic Assignment / Action Block via State Maps */}
                      {statusPhase === 'Posted' && (
                        <div className="border-t border-white/5 pt-4">
                          <label className="text-[9px] text-osv-muted uppercase tracking-[0.15em] block mb-2 font-semibold">Assign to Gamified Forge Member:</label>
                          <div className="relative">
                            <select 
                              onChange={(e) => { if(e.target.value) handleAssign(job.id, e.target.value); }}
                              className="w-full bg-osv-bg/80 border border-osv-border/60 text-osv-white text-xs p-3 rounded outline-none hover:border-osv-accent/50 focus:border-osv-accent focus:ring-1 focus:ring-osv-accent/30 transition-all appearance-none cursor-pointer font-medium tracking-wide"
                              defaultValue=""
                            >
                              <option value="" disabled>Select Elite Subbie...</option>
                              {subbies.filter(s => s.trade === job.trade || !s.trade).map(s => (
                                <option key={s.id} value={s.id}>{s.business || s.name} ({s.tier} Rank)</option>
                              ))}
                            </select>
                            <svg className="w-4 h-4 text-osv-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      )}

                      {statusPhase === 'Assigned' && (
                        <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                           <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 bg-emerald-400/10 border border-emerald-400/20 p-2.5 rounded wrap-break-word">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                             Dispatched to: {job.assigned_sub_name}
                           </span>
                           <button onClick={() => updateStatus(job.id, 'In Progress')} className="w-full bg-osv-accent hover:bg-osv-accent/90 text-[#0f1115] text-xs font-bold px-4 py-3 rounded uppercase tracking-[0.15em] transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">Engage Site Construction</button>
                        </div>
                      )}

                      {statusPhase === 'In Progress' && (
                        <div className="border-t border-white/5 pt-4 space-y-3">
                           <div className="text-osv-accent text-[10px] uppercase tracking-[0.15em] font-semibold text-center border border-osv-accent/20 rounded p-2.5 bg-osv-accent/5 flex items-center justify-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-osv-accent animate-pulse"></div>
                             ACTIVE: {job.assigned_sub_name}
                           </div>
                           <div className="flex gap-2">
                             <button className="flex-1 border border-osv-border/60 hover:border-osv-white text-osv-white text-[10px] font-bold py-3 rounded uppercase transition-colors tracking-widest bg-osv-bg/50">Upload Photo</button>
                             <button onClick={() => updateStatus(job.id, 'Completed')} className="flex-[1.5] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-3 rounded uppercase transition-all tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">Mark Output Done</button>
                           </div>
                        </div>
                      )}
                      
                      {statusPhase === 'Completed' && (
                        <div className="border-t border-white/5 pt-4">
                           <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-widest flex items-center gap-1.5 justify-center bg-emerald-400/5 border border-emerald-400/10 p-2.5 rounded mb-3 wrap-break-word">
                             <span className="text-osv-accent">★★★★★</span> Delivered by {job.assigned_sub_name}
                           </span>
                           <button className="w-full border border-osv-accent/40 text-osv-accent hover:bg-osv-accent hover:text-[#0f1115] text-[10px] font-bold py-3 rounded uppercase tracking-[0.15em] transition-all focus:outline-none focus:ring-1 focus:ring-osv-accent">Queue Client Invoice</button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
                {/* Column subtly glowing bottom edge */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}
