import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function SubcontractorOnboarding() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    business: '',
    trade: 'Carpentry',
    crew_size: 1,
    abn: '',
    license_num: '',
    insurance_expiry: '',
    bio: '',
    rate_per_hr: '',
    phone: '',
    email: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://osv-construct-backend.onrender.com/api/subcontractors', formData);
      alert('Welcome to Build With OSV! Your gamified profile is now actively tracked.');
      navigate(`/subcontractors/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to register subcontractor database entry.');
    }
  };

  return (
    <div className="min-h-screen bg-osv-bg text-osv-text p-4 md:p-8 font-sans flex justify-center items-start md:items-center relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-osv-accent/5 rounded-full blur-[180px] pointer-events-none"></div>
      
      <div className="bg-osv-panel/40 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-3xl w-full relative z-10 group overflow-hidden">
        {/* Top subtle highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <div className="text-center mb-10">
          <h1 className="font-heading font-medium text-3xl md:text-4xl text-osv-white tracking-widest uppercase mb-3">Initialize Profile</h1>
          <p className="text-osv-muted tracking-[0.1em] uppercase text-[10px] md:text-xs">
            Connect your business entity to the OSV gamified pipeline. Elite subbies are algorithmically rewarded with exclusive fee reductions and active "Apex Crown" badge assignments.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Full Name</label>
              <input type="text" required onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Business Entity Name</label>
              <input type="text" required onChange={e => setFormData({...formData, business: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" placeholder="e.g. JD Carpentry Pty Ltd" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Primary Trade Specialization</label>
              <div className="relative">
                <select onChange={e => setFormData({...formData, trade: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all appearance-none cursor-pointer focus:ring-1 focus:ring-osv-accent/30 shadow-inner">
                  <option>Carpentry</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Landscaping</option>
                  <option>Cabinetry</option>
                </select>
                <svg className="w-4 h-4 text-osv-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Total Active Crew Size</label>
              <input type="number" min="1" required onChange={e => setFormData({...formData, crew_size: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" defaultValue="1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Verified ABN / ACN</label>
              <input type="text" required onChange={e => setFormData({...formData, abn: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" />
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Trade License No.</label>
              <input type="text" onChange={e => setFormData({...formData, license_num: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" />
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Liability EXP Date</label>
              <input type="date" required onChange={e => setFormData({...formData, insurance_expiry: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Professional Bio (Displayed to Clients & PMs)</label>
            <textarea required rows="4" onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none resize-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" placeholder="Demonstrate your specific trade expertise, niche specialties, and dedication to high-tier commercial or residential output..."></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-white/5 pt-8 mt-2">
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Mobile</label>
              <input type="tel" required onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" />
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Direct Email</label>
              <input type="email" required onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all focus:ring-1 focus:ring-osv-accent/30 shadow-inner" />
            </div>
            <div>
              <label className="block text-osv-muted uppercase tracking-[0.15em] text-[10px] mb-2 font-semibold">Standard Rate ($/hr)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-osv-muted font-mono">$</span>
                <input type="number" required onChange={e => setFormData({...formData, rate_per_hr: e.target.value})} className="w-full bg-osv-bg/60 border border-white/10 rounded-lg p-3 pl-7 text-osv-white text-sm focus:border-osv-accent focus:bg-osv-bg/80 outline-none transition-all font-mono focus:ring-1 focus:ring-osv-accent/30 shadow-inner" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-osv-accent text-[#0f1115] font-bold py-4 mt-8 rounded-lg uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:bg-osv-accent/90 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all focus:outline-none focus:ring-2 focus:ring-osv-accent/50 relative overflow-hidden group/btn">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
            <span className="relative">Join Platform Architecture</span>
          </button>
        </form>
      </div>
    </div>
  );
}
