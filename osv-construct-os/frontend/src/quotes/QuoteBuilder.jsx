import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { JOB_TYPES, JOB_TYPE_KEYS, getDefaultScope } from './jobTypeConfig';
import DynamicScopeForm, { SubcategorySelect } from './DynamicScopeForm';

const API_BASE = import.meta.env.VITE_API_URL || 'https://osv-construct-backend.onrender.com';

export default function QuoteBuilder() {
  const [step, setStep] = useState(1);

  // Step 1: Photos + Scope
  const [photos, setPhotos] = useState([]); // [{ id, file, preview, base64, description }]
  const [jobTypeKey, setJobTypeKey] = useState(JOB_TYPE_KEYS[0]);
  const [subcategory, setSubcategory] = useState('');
  const [scopeData, setScopeData] = useState(getDefaultScope(JOB_TYPE_KEYS[0]));
  const [formData, setFormData] = useState({
    description: '',
    site_notes: ''
  });

  // After AI analysis in step 1
  const [scopeAnalyzed, setScopeAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [needsAttention, setNeedsAttention] = useState([]);

  // Step 2: Additional photos (conditional)
  const [additionalImages, setAdditionalImages] = useState([]);
  const [additionalUploads, setAdditionalUploads] = useState({});

  // Step 3: Q&A
  const [qualifyingQuestions, setQualifyingQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});

  // Step 4: Quote
  const [quoteResult, setQuoteResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const compressImage = (file, maxDim = 1600, quality = 0.75) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  });

  const addPhoto = useCallback((file) => {
    if (photos.length >= 5) return;
    compressImage(file).then(base64 => {
      setPhotos(prev => [...prev, {
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        base64,
        description: ''
      }]);
    });
  }, [photos.length]);

  const removePhoto = (id) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo?.preview) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
    if (scopeAnalyzed) {
      setScopeAnalyzed(false);
      setAnalysisResult(null);
    }
  };

  const updatePhotoDescription = (id, description) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, description } : p));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    const slotsLeft = 5 - photos.length;
    files.slice(0, slotsLeft).forEach(addPhoto);
  }, [photos.length, addPhoto]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    const slotsLeft = 5 - photos.length;
    files.slice(0, slotsLeft).forEach(addPhoto);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentConfig = JOB_TYPES[jobTypeKey];

  const handleJobTypeChange = (newKey) => {
    setJobTypeKey(newKey);
    setSubcategory('');
    setScopeData(getDefaultScope(newKey));
    if (scopeAnalyzed) {
      setScopeAnalyzed(false);
      setAnalysisResult(null);
    }
  };

  const handleSubcategoryChange = (newSub) => {
    setSubcategory(newSub);
  };

  const buildFullPayload = () => ({
    job_type: currentConfig.label,
    subcategory,
    scope: scopeData,
    description: formData.description,
    site_notes: formData.site_notes
  });

  // Step 1: Analyze all photos + scope
  const handleAnalyzeScope = async () => {
    setLoading(true);
    setError(null);
    setNeedsAttention([]);
    try {
      const fieldSchema = currentConfig.scopeFields.map(f => ({
        key: f.key, label: f.label, type: f.type, required: !!f.required,
        ...(f.options ? { options: f.options } : {})
      }));
      const subcatLabels = currentConfig.subcategories.map(s => s.label);

      const payload = {
        photos: photos.map(p => ({ image: p.base64, description: p.description })),
        ...buildFullPayload(),
        scope_field_schema: fieldSchema,
        subcategory_options: subcatLabels
      };
      const res = await axios.post(`${API_BASE}/api/ai/analyze-scope`, payload);
      const data = res.data.data;

      setAnalysisResult(data);
      if (data.enhanced_scope) {
        setFormData(prev => ({
          ...prev,
          description: data.enhanced_scope.description || prev.description,
          site_notes: data.enhanced_scope.site_notes || prev.site_notes
        }));

        if (data.enhanced_scope.subcategory) {
          const matchedSub = subcatLabels.find(
            s => s.toLowerCase() === data.enhanced_scope.subcategory.toLowerCase()
          );
          if (matchedSub) setSubcategory(matchedSub);
        }

        if (data.enhanced_scope.scope_fields && typeof data.enhanced_scope.scope_fields === 'object') {
          setScopeData(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(data.enhanced_scope.scope_fields)) {
              if (value !== null && value !== undefined && value !== '') {
                merged[key] = value;
              }
            }
            return merged;
          });
        }

        setNeedsAttention(data.enhanced_scope.unfilled_fields || []);
      }
      setAdditionalImages(data.additional_images_needed || []);
      setScopeAnalyzed(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze photos and scope.');
    }
    setLoading(false);
  };

  // Step 1 → Step 2 or Step 3
  const handleConfirmScope = () => {
    if (additionalImages.length > 0) {
      setStep(2);
    } else {
      handleFetchQuestions();
    }
  };

  // Step 2: Handle additional photo upload
  const handleAdditionalFileChange = (title, file) => {
    if (!file) return;
    compressImage(file).then(base64 => {
      setAdditionalUploads(prev => ({ ...prev, [title]: base64 }));
    });
  };

  // Collect all images (original + additional) for downstream API calls
  const getAllImages = () => {
    const originals = photos.map(p => p.base64);
    const extras = Object.values(additionalUploads);
    return [...originals, ...extras];
  };

  // Step 2 → Step 3: Submit additional photos and fetch qualifying questions
  const handleSubmitAdditional = async () => {
    await handleFetchQuestions();
  };

  // Fetch qualifying questions (used from step 1 confirm or step 2 submit)
  const handleFetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const imagesArray = getAllImages();
      const payload = { ...buildFullPayload(), images: imagesArray };
      const res = await axios.post(`${API_BASE}/api/ai/qualifying-questions`, payload);
      setQualifyingQuestions(res.data.data.questions || []);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate qualifying questions.');
    }
    setLoading(false);
  };

  // Step 3 → Step 4: Generate quote
  const handleGenerateQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const imagesArray = getAllImages();
      const qaFormatted = qualifyingQuestions.map(q => ({
        question: q.text,
        answer: questionAnswers[q.id] || "No answer provided"
      }));
      const payload = { ...buildFullPayload(), images: imagesArray, qa_responses: qaFormatted };
      const res = await axios.post(`${API_BASE}/api/ai/generate-quote`, payload);
      setQuoteResult(res.data.data);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quote.');
    }
    setLoading(false);
  };

  const resetAll = () => {
    photos.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
    setStep(1);
    setPhotos([]);
    setJobTypeKey(JOB_TYPE_KEYS[0]);
    setSubcategory('');
    setScopeData(getDefaultScope(JOB_TYPE_KEYS[0]));
    setFormData({ description: '', site_notes: '' });
    setScopeAnalyzed(false);
    setAnalysisResult(null);
    setAdditionalImages([]);
    setAdditionalUploads({});
    setQualifyingQuestions([]);
    setQuestionAnswers({});
    setQuoteResult(null);
    setError(null);
    setNeedsAttention([]);
  };

  const inputClass = "w-full bg-osv-bg/80 backdrop-blur-sm border border-white/10 p-3 h-11 text-osv-white text-sm rounded-lg focus:border-osv-accent/50 focus:ring-2 focus:ring-osv-accent/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-200 outline-none placeholder:text-osv-muted";
  const labelClass = "block text-xs font-mono text-osv-muted tracking-wide mb-2";
  const btnPrimary = "w-full h-12 bg-osv-accent text-[#0A0A0F] font-medium rounded-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg disabled:opacity-50 disabled:pointer-events-none";
  const btnSecondary = "w-full h-11 bg-transparent border border-white/10 text-osv-white font-medium rounded-lg hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-osv-accent focus-visible:ring-offset-2 focus-visible:ring-offset-osv-bg";

  // ──────────────────────────── STEP 1: SCOPE & PHOTOS ────────────────────────────
  const renderStep1 = () => (
    <div className="flex flex-col h-full">
      <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">

        {/* Photo Upload Zone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>SITE PHOTOS</label>
            <span className={`text-xs font-mono tracking-wide ${photos.length >= 3 ? 'text-osv-green' : 'text-osv-muted'}`}>
              {photos.length}/5 {photos.length < 3 ? `(min 3 required)` : '✓'}
            </span>
          </div>

          {photos.length < 5 && !scopeAnalyzed && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-osv-accent/30 hover:bg-osv-accent/5 transition-all duration-200 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-osv-accent/30 transition-colors">
                <svg className="w-5 h-5 text-osv-muted group-hover:text-osv-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-osv-muted font-sans">Drop photos here or <span className="text-osv-accent">browse</span></p>
              <p className="text-xs text-osv-muted/60 mt-1 font-mono">Blueprints, sketches & site photos all accepted</p>
            </div>
          )}

          {/* Photo Cards */}
          {photos.length > 0 && (
            <div className="space-y-3">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="bg-osv-bg/50 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
                  <div className="flex gap-3 p-3">
                    <div className="relative shrink-0">
                      <img
                        src={photo.preview}
                        alt={`Photo ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-white/5"
                      />
                      <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-osv-accent text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center shadow-lg">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-mono text-osv-muted truncate">
                          {photo.file.name}
                        </p>
                        {!scopeAnalyzed && (
                          <button
                            onClick={() => removePhoto(photo.id)}
                            className="text-osv-muted hover:text-osv-red transition-colors p-0.5 shrink-0 ml-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={photo.description}
                        onChange={e => updatePhotoDescription(photo.id, e.target.value)}
                        placeholder="Describe what this shows & what you need..."
                        disabled={scopeAnalyzed}
                        rows={2}
                        className="w-full bg-osv-bg/60 border border-white/5 p-2 text-osv-white text-xs rounded-lg focus:border-osv-accent/50 focus:ring-1 focus:ring-osv-accent/20 transition-all outline-none placeholder:text-osv-muted/50 resize-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                  {/* Per-photo AI analysis (shown after analysis) */}
                  {scopeAnalyzed && analysisResult?.photo_analysis?.per_photo?.[idx] && (
                    <div className="px-3 pb-3">
                      <div className="bg-osv-accent/5 border border-osv-accent/10 rounded-lg p-2.5 flex items-start gap-2">
                        <div className="w-1 h-full min-h-[16px] bg-osv-accent/40 rounded-full shrink-0 mt-0.5"></div>
                        <div>
                          <span className="text-[10px] font-mono text-osv-accent uppercase tracking-wider">
                            {analysisResult.photo_analysis.per_photo[idx].type?.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-osv-white/70 leading-relaxed mt-0.5">
                            {analysisResult.photo_analysis.per_photo[idx].observations}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scope Fields */}
        <div className="border-t border-white/5 pt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-osv-accent/60"></div>
            <span className="text-xs font-mono text-osv-muted tracking-wide">SCOPE DETAILS</span>
            {scopeAnalyzed && (
              <span className="text-[10px] font-mono text-osv-green bg-osv-green/10 px-2 py-0.5 rounded border border-osv-green/20">AI ENHANCED</span>
            )}
          </div>

          {/* Job Type */}
          <div>
            <label className={labelClass}>JOB TYPE</label>
            <select
              value={jobTypeKey}
              onChange={e => handleJobTypeChange(e.target.value)}
              disabled={scopeAnalyzed}
              className={inputClass}
            >
              {JOB_TYPE_KEYS.map(key => (
                <option key={key} value={key}>{JOB_TYPES[key].label}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {currentConfig && (
            <div>
              <label className={labelClass}>SUBCATEGORY</label>
              <SubcategorySelect
                options={currentConfig.subcategories}
                value={subcategory}
                onChange={handleSubcategoryChange}
                disabled={scopeAnalyzed}
              />
            </div>
          )}

          {/* Dynamic trade-specific fields */}
          {currentConfig && (
            <DynamicScopeForm
              fields={currentConfig.scopeFields}
              scope={scopeData}
              onChange={(newScope) => {
                setScopeData(newScope);
                const changedKeys = Object.keys(newScope).filter(k => newScope[k] !== scopeData[k]);
                if (changedKeys.length > 0) {
                  setNeedsAttention(prev => prev.filter(k => !changedKeys.includes(k)));
                }
              }}
              disabled={scopeAnalyzed}
              attentionFields={needsAttention}
            />
          )}

          {/* Common fields */}
          <div>
            <label className={labelClass}>DESCRIPTION</label>
            <textarea
              rows={3}
              placeholder="Describe the overall job requirements..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={`${inputClass} min-h-[80px] h-auto resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>SITE NOTES / HAZARDS</label>
            <input
              type="text"
              placeholder="e.g. Sloping block, hard rock, tight access"
              value={formData.site_notes}
              onChange={e => setFormData({ ...formData, site_notes: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-5 border-t border-white/10 shrink-0">
        {!scopeAnalyzed ? (
          <button
            onClick={handleAnalyzeScope}
            disabled={loading || photos.length < 3}
            className={btnPrimary}
          >
            {loading ? 'Analyzing Photos & Scope...' : `Analyze Scope (${photos.length} photo${photos.length !== 1 ? 's' : ''})`}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setScopeAnalyzed(false); setAnalysisResult(null); }}
              disabled={loading}
              className={btnSecondary}
            >
              Re-analyze
            </button>
            <button
              onClick={handleConfirmScope}
              disabled={loading}
              className={btnPrimary}
            >
              {loading ? 'Processing...' : additionalImages.length > 0 ? 'Continue → Photos' : 'Continue → Q&A'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ──────────────────────────── STEP 2: ADDITIONAL PHOTOS ────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6 flex flex-col h-full">
      <div className="bg-osv-accent/5 border border-osv-accent/20 p-4 rounded-xl">
        <p className="text-sm text-osv-white leading-relaxed">
          <span className="text-osv-accent font-medium">AI Analysis Gap Detected —</span> The AI reviewed your {photos.length} photos and identified {additionalImages.length} additional angle{additionalImages.length !== 1 ? 's' : ''} needed for maximum quote accuracy.
        </p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {additionalImages.map((img, idx) => (
          <div key={idx} className="bg-osv-bg/50 backdrop-blur-sm border border-white/5 p-5 rounded-xl transition-all hover:border-white/10">
            <h3 className="text-osv-white font-medium mb-1 text-base flex items-center justify-between">
              {img.title}
              <span className="text-osv-accent/80 font-mono text-[10px] bg-osv-accent/10 px-2 py-0.5 rounded uppercase tracking-wide border border-osv-accent/20">Recommended</span>
            </h3>
            <p className="text-osv-muted text-sm mb-2 leading-relaxed">{img.description}</p>
            <p className="text-xs text-osv-accent/70 mb-4 italic">{img.reason}</p>
            <input
              type="file"
              accept="image/*"
              onChange={e => handleAdditionalFileChange(img.title, e.target.files[0])}
              className="text-sm text-osv-muted w-full bg-osv-alt/50 p-3 border border-white/5 rounded-lg focus:border-osv-accent/50 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white/5 file:text-osv-white hover:file:bg-white/10 transition-all font-sans"
            />
            {additionalUploads[img.title] && (
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
          className={btnSecondary}
        >
          Back to Scope
        </button>
        <button
          onClick={handleSubmitAdditional}
          disabled={loading}
          className={btnPrimary}
        >
          {loading ? 'Analyzing...' : 'Continue → Q&A'}
        </button>
      </div>
    </div>
  );

  // ──────────────────────────── STEP 3: QUALIFYING QUESTIONS ────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6 flex flex-col h-full">
      <p className="text-osv-muted text-sm border-b border-white/10 pb-4 font-sans leading-relaxed">Based on your photos and scope details, the AI needs a few more answers to finalize the quote.</p>
      <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {qualifyingQuestions.map((q, idx) => (
          <div key={idx} className="bg-osv-bg/50 backdrop-blur-sm border border-white/5 p-5 rounded-xl">
            <label className="block text-sm text-osv-white font-medium mb-3 leading-snug">{q.text}</label>
            <input
              type="text"
              value={questionAnswers[q.id] || ''}
              onChange={e => setQuestionAnswers({ ...questionAnswers, [q.id]: e.target.value })}
              className={inputClass}
              placeholder="Your answer..."
            />
          </div>
        ))}
      </div>
      <div className="mt-auto pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
        <button
          onClick={() => setStep(additionalImages.length > 0 ? 2 : 1)}
          disabled={loading}
          className={btnSecondary}
        >
          Back
        </button>
        <button
          onClick={handleGenerateQuote}
          disabled={loading}
          className={btnPrimary}
        >
          {loading ? 'Generating...' : 'Finalize Quote'}
        </button>
      </div>
    </div>
  );

  // ──────────────────────────── STEP 4: SUCCESS ────────────────────────────
  const renderStep4 = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 pb-12">
      <div className="w-16 h-16 rounded-full bg-osv-green/10 border border-osv-green/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <svg className="w-8 h-8 text-osv-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-osv-white text-2xl font-heading tracking-tight font-medium">Quote Generated Successfully</p>
      <p className="text-osv-muted text-sm max-w-xs font-sans leading-relaxed">
        Review the full breakdown in the panel to the right. Approve it to save as a draft quote.
      </p>
      <button
        onClick={resetAll}
        className="h-11 px-8 bg-transparent border border-white/20 text-osv-white font-medium rounded-lg hover:bg-white/5 hover:border-white/30 transition-all active:scale-[0.98]"
      >
        Start New Quote
      </button>
    </div>
  );

  const renderLeftPanel = () => {
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    if (step === 3) return renderStep3();
    return renderStep4();
  };

  // ──────────────────────────── STEP LABELS ────────────────────────────
  const stepLabels = [
    { num: 1, label: 'SCOPE' },
    { num: 2, label: 'PHOTOS' },
    { num: 3, label: 'Q&A' },
    { num: 4, label: 'QUOTE' }
  ];

  const getLeftTitle = () => {
    if (step === 1) return scopeAnalyzed ? 'Review Scope' : 'Photos & Scope';
    if (step === 2) return 'Additional Photos';
    if (step === 3) return 'Qualifying Questions';
    return 'Status';
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-osv-bg text-osv-text relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-osv-accent/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto h-[calc(100vh-80px)] min-h-[700px] flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-osv-panel/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg gap-4">
          <h1 className="text-3xl md:text-4xl font-heading font-medium text-osv-white tracking-tight flex items-center gap-3">
            Quote Engine
            <span className="text-xs font-mono bg-osv-accent/10 text-osv-accent border border-osv-accent/20 px-2 py-1 rounded-full tracking-wide">AI POWERED</span>
          </h1>
          <div className="flex gap-3 text-[10px] sm:text-xs font-mono tracking-widest bg-osv-bg/50 px-4 py-2 rounded-lg border border-white/5">
            {stepLabels.map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <span className="text-white/10">/</span>}
                <span className={step >= s.num ? 'text-osv-accent' : 'text-osv-muted'}>
                  {s.num}. {s.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
          {/* Left Panel */}
          <div className="bg-osv-panel/60 backdrop-blur-md border border-white/5 p-8 rounded-2xl flex flex-col overflow-hidden shadow-xl relative">
            <h2 className="text-xl font-heading font-medium text-osv-white tracking-wide border-b border-white/5 pb-4 mb-6 shrink-0 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-osv-accent"></div>
              {getLeftTitle()}
            </h2>
            <div className="flex-1 overflow-hidden">
              {renderLeftPanel()}
            </div>
          </div>

          {/* Right Panel */}
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

            {/* AI Analysis Summary (after step 1 analysis) */}
            {scopeAnalyzed && analysisResult && step <= 2 && !loading && (
              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                <div className="bg-osv-bg/50 backdrop-blur-sm p-5 border border-white/5 rounded-xl">
                  <h3 className="text-xs font-mono text-osv-muted tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-osv-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI PHOTO ANALYSIS
                  </h3>
                  <p className="text-osv-white text-sm leading-relaxed font-sans">
                    {analysisResult.photo_analysis?.summary}
                  </p>
                </div>

                {analysisResult.photo_analysis?.per_photo?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono text-osv-muted tracking-wide mb-3">PER-PHOTO BREAKDOWN</h3>
                    <div className="space-y-2">
                      {analysisResult.photo_analysis.per_photo.map((pa, idx) => (
                        <div key={idx} className="flex gap-3 bg-osv-alt/30 border border-white/5 p-3 rounded-lg">
                          {photos[idx] && (
                            <img src={photos[idx].preview} alt="" className="w-12 h-12 object-cover rounded-md border border-white/5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-osv-accent text-[10px] font-mono uppercase tracking-wider">Photo {idx + 1}</span>
                              <span className="text-osv-muted text-[10px] font-mono">• {pa.type?.replace('_', ' ')}</span>
                            </div>
                            <p className="text-xs text-osv-white/70 leading-relaxed">{pa.observations}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {additionalImages.length > 0 && (
                  <div className="bg-osv-accent/5 border border-osv-accent/20 p-4 rounded-xl">
                    <h3 className="text-xs font-mono text-osv-accent tracking-wide mb-2">ADDITIONAL PHOTOS REQUESTED</h3>
                    <p className="text-xs text-osv-muted mb-3">
                      {additionalImages.length} additional photo{additionalImages.length !== 1 ? 's' : ''} will improve quote accuracy.
                    </p>
                    {additionalImages.map((img, idx) => (
                      <div key={idx} className="flex items-start gap-2 mb-2 last:mb-0">
                        <div className="w-1 h-1 rounded-full bg-osv-accent mt-1.5 shrink-0"></div>
                        <p className="text-xs text-osv-white/80"><span className="font-medium">{img.title}</span> — {img.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {additionalImages.length === 0 && (
                  <div className="bg-osv-green/5 border border-osv-green/20 p-4 rounded-xl flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-osv-green/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-osv-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-osv-green font-medium">Photos are comprehensive</p>
                      <p className="text-xs text-osv-muted mt-1">No additional photos needed. Ready to proceed to qualifying questions.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quote Result (step 4) */}
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
                        trade: currentConfig.label,
                        summary: quoteResult.scope_summary,
                        total_cost: quoteResult.financials.totalCost,
                        margin: quoteResult.financials.marginPct,
                        profit: quoteResult.financials.profit,
                        final_client_quote: quoteResult.financials.grandTotal,
                        generated_json: quoteResult
                      };
                      const res = await axios.post(`${API_BASE}/api/quotes`, payload);
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

            {/* Empty states */}
            {!quoteResult && !loading && !error && !scopeAnalyzed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-osv-panel/20">
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-6 text-osv-muted/50">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-osv-white text-xl font-heading font-medium tracking-wide">
                  {step === 1 && "Upload Photos to Begin"}
                  {step === 3 && "Awaiting Clarifications"}
                </p>
                <p className="text-osv-muted text-sm mt-3 font-sans leading-relaxed max-w-sm">
                  {step === 1 && "Add 3–5 site photos with descriptions, fill in the scope details, then let the AI analyze everything."}
                  {step === 3 && "Complete the qualifying questions to provide context for AI pricing."}
                </p>
              </div>
            )}

            {/* Q&A waiting state */}
            {!quoteResult && !loading && !error && !scopeAnalyzed && step === 3 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-osv-panel/20">
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-6 text-osv-muted/50">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-osv-white text-xl font-heading font-medium tracking-wide">Awaiting Clarifications</p>
                <p className="text-osv-muted text-sm mt-3 font-sans leading-relaxed max-w-sm">Complete the qualifying Q&A to provide context for AI pricing.</p>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-osv-bg/60 backdrop-blur-md z-20">
                <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-osv-accent animate-spin mb-4 shadow-[0_0_15px_rgba(245,158,11,0.3)]"></div>
                <p className="text-osv-accent font-medium tracking-wide animate-pulse font-mono text-sm">
                  {step === 1 && 'ANALYZING VISUAL EVIDENCE...'}
                  {step === 2 && 'PROCESSING ADDITIONAL DATA...'}
                  {step === 3 && 'GENERATING QUOTE...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
