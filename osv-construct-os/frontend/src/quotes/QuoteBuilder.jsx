import React, { useState } from 'react';
import axios from 'axios';

export default function QuoteBuilder() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    job_type: 'Fencing',
    description: '',
    dimensions: '',
    site_notes: ''
  });
  
  const [requiredImages, setRequiredImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState({}); // mapping title -> base64
  
  const [qualifyingQuestions, setQualifyingQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({}); // mapping q.id -> string
  
  const [loading, setLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDetermineImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('https://osv-construct-backend.onrender.com/api/ai/determine-images', formData);
      setRequiredImages(res.data.data.required_images || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to determine required images.');
    }
    setLoading(false);
  };

  const handleBlueprintUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;
      try {
        const res = await axios.post('https://osv-construct-backend.onrender.com/api/ai/analyze-blueprint', { image: base64Image });
        const data = res.data.data;
        setFormData({
            job_type: data.job_type || formData.job_type,
            dimensions: data.dimensions || formData.dimensions,
            description: data.description || formData.description,
            site_notes: data.site_notes || formData.site_notes
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to gracefully extract scope from visual blueprint.');
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (title, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImages(prev => ({ ...prev, [title]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const imagesArray = Object.values(uploadedImages);
      const payload = { ...formData, images: imagesArray };
      const res = await axios.post('https://osv-construct-backend.onrender.com/api/ai/qualifying-questions', payload);
      setQualifyingQuestions(res.data.data.questions || []);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate qualifying questions.');
    }
    setLoading(false);
  };

  const handleGenerateQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const imagesArray = Object.values(uploadedImages);
      const qaFormatted = qualifyingQuestions.map(q => ({
          question: q.text,
          answer: questionAnswers[q.id] || "No answer provided"
      }));
      
      const payload = { ...formData, images: imagesArray, qa_responses: qaFormatted };
      const res = await axios.post('https://osv-construct-backend.onrender.com/api/ai/generate-quote', payload);
      setQuoteResult(res.data.data);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze market.');
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-osv-bg/80 backdrop-blur-sm border border-white/10 p-3 h-11 text-osv-white text-sm rounded-lg focus:border-osv-accent/50 focus:ring-2 focus:ring-osv-accent/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-200 outline-none placeholder:text-osv-muted";
  const labelClass = "block text-xs font-mono text-osv-muted tracking-wide mb-2";

  const renderLeftPanel = () => {
    if (step === 1) {
      return (
        <div className="flex flex-col h-full">
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
            <div className="bg-osv-accent/5 border border-osv-accent/20 p-5 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-osv-accent/10 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-osv-accent font-medium tracking-tight text-base mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-osv-accent animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              Vision AI: Blueprint Auto-Fill
            </h3>
            <p className="text-sm text-osv-muted mb-4 font-sans leading-relaxed">Upload a site photo, hand-drawn sketch, or structural blueprint. The AI will extract the scope to pre-fill the fields below.</p>
            <input 
              type="file" 
              accept="image/*"
              disabled={loading}
              onChange={handleBlueprintUpload}
              className="text-sm text-osv-muted w-full bg-osv-bg/50 backdrop-blur-sm p-3 border border-osv-border/50 rounded-lg cursor-pointer disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-osv-accent/10 file:text-osv-accent hover:file:bg-osv-accent/20 transition-all font-sans"
            />
          </div>
          <div>
            <label className={labelClass}>JOB TYPE</label>
            <select 
              value={formData.job_type}
              onChange={e => setFormData({...formData, job_type: e.target.value})}
              className={inputClass}
            >
              <option>Fencing</option>
              <option>Decking</option>
              <option>Retaining Wall</option>
              <option>Pergola</option>
              <option>Landscaping</option>
            </select>
          </div>
          
          <div>
            <label className={labelClass}>DIMENSIONS / SIZE</label>
            <input 
              type="text" 
              placeholder="e.g. 20m long, 1.8m high"
              value={formData.dimensions}
              onChange={e => setFormData({...formData, dimensions: e.target.value})}
              className={inputClass}
            />
          </div>
          
          <div>
            <label className={labelClass}>DESCRIPTION</label>
            <textarea 
              rows={4}
              placeholder="Describe the job requirements..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={`${inputClass} min-h-[100px] h-auto resize-none`}
            />
          </div>
          
          <div>
            <label className={labelClass}>SITE NOTES / HAZARDS</label>
            <input 
              type="text" 
              placeholder="e.g. Sloping block, hard rock"
              value={formData.site_notes}
              onChange={e => setFormData({...formData, site_notes: e.target.value})}
              className={inputClass}
            />
          </div>
          </div>
          
          <div className="mt-auto pt-6 border-t border-white/10 shrink-0">
            <button 
              onClick={handleDetermineImages}
              disabled={loading}
              className="w-full h-12 bg-osv-accent text-[#0A0A0F] font-medium rounded-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Analyzing...' : 'Analyze & Request Photos'}
            </button>
          </div>
        </div>
      );
    } else if (step === 2) {
      return (
        <div className="space-y-6 flex flex-col h-full">
          <p className="text-osv-muted text-sm border-b border-white/10 pb-4 font-sans leading-relaxed">The AI has analyzed the scope and requested the following photos to ensure an accurate quote.</p>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {requiredImages.map((img, idx) => (
              <div key={idx} className="bg-osv-bg/50 backdrop-blur-sm border border-white/5 p-5 rounded-xl transition-all hover:border-white/10">
                <h3 className="text-osv-white font-medium mb-1 text-base flex items-center justify-between">
                  {img.title} 
                  {img.mandatory && <span className="text-osv-red/80 font-mono text-[10px] bg-osv-red/10 px-2 py-0.5 rounded uppercase tracking-wide border border-osv-red/20">*Required</span>}
                </h3>
                <p className="text-osv-muted text-sm mb-4 leading-relaxed">{img.description}</p>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => handleFileChange(img.title, e.target.files[0])}
                  className="text-sm text-osv-muted w-full bg-osv-alt/50 p-3 border border-white/5 rounded-lg focus:border-osv-accent/50 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white/5 file:text-osv-white hover:file:bg-white/10 transition-all font-sans"
                />
                {uploadedImages[img.title] && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-osv-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <p className="text-osv-green text-xs font-mono tracking-wide">IMAGE ATTACHED</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
            <button 
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full h-11 bg-transparent border border-white/10 text-osv-white font-medium rounded-lg hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg"
            >
              Back to Scope
            </button>
            <button 
              onClick={handleSubmitPhotos}
              disabled={loading}
              className="w-full h-11 bg-osv-accent text-[#0A0A0F] font-medium rounded-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Analyzing...' : 'Submit Photos'}
            </button>
          </div>
        </div>
      );
    } else if (step === 3) {
      return (
        <div className="space-y-6 flex flex-col h-full">
          <p className="text-osv-muted text-sm border-b border-white/10 pb-4 font-sans leading-relaxed">Based on the scope and photos, the AI needs a few more details to finalize the quote.</p>
          <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {qualifyingQuestions.map((q, idx) => (
              <div key={idx} className="bg-osv-bg/50 backdrop-blur-sm border border-white/5 p-5 rounded-xl">
                <label className="block text-sm text-osv-white font-medium mb-3 leading-snug">{q.text}</label>
                <input 
                  type="text" 
                  value={questionAnswers[q.id] || ''}
                  onChange={e => setQuestionAnswers({...questionAnswers, [q.id]: e.target.value})}
                  className={inputClass}
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
            <button 
              onClick={() => setStep(2)}
              disabled={loading}
              className="w-full h-11 bg-transparent border border-white/10 text-osv-white font-medium rounded-lg hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
            >
              Back to Photos
            </button>
            <button 
              onClick={handleGenerateQuote}
              disabled={loading}
              className="w-full h-11 bg-osv-accent text-[#0A0A0F] font-medium rounded-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg"
            >
              {loading ? 'Generating...' : 'Finalize Quote'}
            </button>
          </div>
        </div>
      );
    } else if (step === 4) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 pb-12">
           <div className="w-16 h-16 rounded-full bg-osv-green/10 border border-osv-green/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
             <svg className="w-8 h-8 text-osv-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
           </div>
           <p className="text-osv-white text-2xl font-heading tracking-tight font-medium">Quote Generated Successfully</p>
           <button 
            onClick={() => {
              setStep(1);
              setQuoteResult(null);
              setRequiredImages([]);
              setUploadedImages({});
              setQualifyingQuestions([]);
              setQuestionAnswers({});
            }}
            className="h-11 px-8 bg-transparent border border-white/20 text-osv-white font-medium rounded-lg hover:bg-white/5 hover:border-white/30 transition-all active:scale-[0.98]"
          >
            Start New Quote
          </button>
        </div>
      );
    }
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-osv-bg text-osv-text relative overflow-hidden">
       {/* Ambient Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-osv-accent/5 rounded-full blur-[150px] pointer-events-none"></div>

       <div className="relative z-10 max-w-[1600px] mx-auto h-[calc(100vh-80px)] min-h-[700px] flex flex-col">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-osv-panel/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg gap-4">
             <h1 className="text-3xl md:text-4xl font-heading font-medium text-osv-white tracking-tight flex items-center gap-3">
               Quote Engine
               <span className="text-xs font-mono bg-osv-accent/10 text-osv-accent border border-osv-accent/20 px-2 py-1 rounded-full tracking-wide">AI POWERED</span>
             </h1>
             <div className="flex gap-3 text-[10px] sm:text-xs font-mono tracking-widest bg-osv-bg/50 px-4 py-2 rounded-lg border border-white/5">
                 <span className={step >= 1 ? 'text-osv-accent' : 'text-osv-muted'}>1. SCOPE</span>
                 <span className="text-white/10">/</span>
                 <span className={step >= 2 ? 'text-osv-accent' : 'text-osv-muted'}>2. PHOTOS</span>
                 <span className="text-white/10">/</span>
                 <span className={step >= 3 ? 'text-osv-accent' : 'text-osv-muted'}>3. Q&A</span>
                 <span className="text-white/10">/</span>
                 <span className={step === 4 ? 'text-osv-accent' : 'text-osv-muted'}>4. QUOTE</span>
             </div>
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
            {/* Input Panel */}
            <div className="bg-osv-panel/60 backdrop-blur-md border border-white/5 p-8 rounded-2xl flex flex-col overflow-hidden shadow-xl relative">
               <h2 className="text-xl font-heading font-medium text-osv-white tracking-wide border-b border-white/5 pb-4 mb-6 shrink-0 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-osv-accent"></div>
                  {step === 1 && "Job Scope"}
                  {step === 2 && "Required Photos"}
                  {step === 3 && "Qualifying Questions"}
                  {step === 4 && "Status"}
               </h2>
               <div className="flex-1 overflow-hidden">
                 {renderLeftPanel()}
               </div>
            </div>
            
            {/* Result Panel */}
            <div className="bg-osv-panel/60 backdrop-blur-md border border-white/5 p-8 rounded-2xl relative flex flex-col overflow-hidden shadow-xl">
               <h2 className="text-xl font-heading font-medium text-osv-white tracking-wide border-b border-white/5 pb-4 mb-6 shrink-0 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-osv-accent"></div>
                  Analysis & Output
               </h2>
               
               {error && (
                  <div className="bg-osv-red/5 border border-osv-red/30 p-5 rounded-xl mb-4 shrink-0 flex items-start gap-4">
                    <svg className="w-5 h-5 text-osv-red shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-osv-white text-sm leading-relaxed">{error}</p>
                  </div>
               )}
               
               {quoteResult && !error && step === 4 && (
                 <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                   <div className="bg-osv-bg/50 backdrop-blur-sm p-5 border border-white/5 rounded-xl">
                     <h3 className="text-xs font-mono text-osv-muted tracking-wide mb-3 flex items-center gap-2">
                       <svg className="w-4 h-4 text-osv-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                       AI SCOPE SUMMARY
                     </h3>
                     <p className="text-osv-white text-sm leading-relaxed font-sans">{quoteResult.scope_summary}</p>
                   </div>
                   
                   <div>
                     <h3 className="text-xs font-mono text-osv-muted tracking-wide mb-3">LINE ITEMS</h3>
                     <div className="space-y-3">
                       {quoteResult.line_items.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-osv-alt/50 border border-white/5 p-4 rounded-xl hover:border-white/10 transition-colors">
                           <div className="mr-4">
                             <p className="text-osv-white font-medium text-sm mb-1">{item.name}</p>
                             <p className="text-xs font-mono text-osv-muted">{item.qty} {item.unit} @ ${item.unit_price}</p>
                           </div>
                           <p className="text-osv-accent font-medium font-mono">${item.total.toFixed(2)}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   <div className="bg-osv-alt/50 border border-white/5 p-6 rounded-xl space-y-4">
                     <div className="flex justify-between items-center">
                       <span className="text-osv-muted font-mono tracking-wide text-xs">BASE COST</span>
                       <span className="text-osv-white font-mono">${quoteResult.financials.totalCost.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-osv-muted font-mono tracking-wide text-xs">PROFIT MARGIN ({(quoteResult.financials.marginPct * 100).toFixed(0)}%)</span>
                       <span className="text-osv-green font-mono">+ ${quoteResult.financials.profit.toFixed(2)}</span>
                     </div>
                     {quoteResult.financials.marginAdjustmentNote && (
                       <div className="flex items-start gap-2 bg-osv-accent/5 border border-osv-accent/20 p-3 rounded-lg mt-2">
                         <div className="w-1 h-full min-h-[20px] bg-osv-accent/50 rounded-full"></div>
                         <p className="text-xs text-osv-white/80 leading-relaxed font-sans">
                           <span className="text-osv-accent font-medium mr-1">AI Analyst:</span> {quoteResult.financials.marginAdjustmentNote}
                         </p>
                       </div>
                     )}
                     <div className="flex justify-between items-center pt-2">
                       <span className="text-osv-muted font-mono tracking-wide text-xs">GST (10%)</span>
                       <span className="text-osv-white font-mono">${quoteResult.financials.gst.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-end border-t border-white/10 pt-5 mt-4">
                       <span className="text-osv-white font-heading text-lg font-medium tracking-wide">CLIENT TOTAL</span>
                       <span className="text-osv-accent font-heading text-4xl tracking-tight">${quoteResult.financials.grandTotal.toFixed(2)}</span>
                     </div>
                   </div>
                   
                   <button 
                    onClick={async () => {
                      try {
                        const payload = {
                          client_name: "TBD Client",
                          trade: formData.job_type,
                          summary: quoteResult.scope_summary,
                          total_cost: quoteResult.financials.totalCost,
                          margin: quoteResult.financials.marginPct,
                          profit: quoteResult.financials.profit,
                          final_client_quote: quoteResult.financials.grandTotal,
                          generated_json: quoteResult
                        };
                        const res = await axios.post('https://osv-construct-backend.onrender.com/api/quotes', payload);
                        alert(`Quote Drafted: ${res.data.quoteNum}`);
                      } catch (err) {
                        console.error(err);
                        alert('Database error executing save.');
                      }
                    }}
                    className="w-full h-12 bg-transparent border border-osv-green/40 text-osv-green font-medium rounded-lg hover:bg-osv-green/10 hover:border-osv-green hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-green mt-4"
                   >
                    Approve & Draft Quote
                   </button>
                 </div>
               )}
               
               {!quoteResult && !loading && !error && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-osv-panel/20">
                   <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-6 text-osv-muted/50">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                     </svg>
                   </div>
                   <p className="text-osv-white text-xl font-heading font-medium tracking-wide">
                     {step === 1 && "Awaiting Scope Details"}
                     {step === 2 && "Awaiting Photographic Evidence"}
                     {step === 3 && "Awaiting Clarifications"}
                   </p>
                   {step === 2 && <p className="text-osv-muted text-sm mt-3 font-sans leading-relaxed max-w-sm">Review requested images in the left panel and provide the necessary visual evidence.</p>}
                   {step === 3 && <p className="text-osv-muted text-sm mt-3 font-sans leading-relaxed max-w-sm">Complete the qualitative Q&A to provide context for AI pricing.</p>}
                 </div>
               )}
               
               {loading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-osv-bg/60 backdrop-blur-md z-20">
                   <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-osv-accent animate-spin mb-4 shadow-[0_0_15px_rgba(245,158,11,0.3)]"></div>
                   <p className="text-osv-accent font-medium tracking-wide animate-pulse font-mono text-sm">PROCESSING DATA MODULE...</p>
                 </div>
               )}
            </div>
         </div>
       </div>
    </div>
  );
}
