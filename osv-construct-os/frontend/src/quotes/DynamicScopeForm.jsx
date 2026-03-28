import React, { useState } from 'react';

function HintTooltip({ hint }) {
  const [visible, setVisible] = useState(false);

  if (!hint) return null;

  return (
    <span className="relative inline-flex ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => { e.preventDefault(); setVisible(v => !v); }}
        className="w-4 h-4 rounded-full border border-white/20 text-osv-muted hover:border-osv-accent/50 hover:text-osv-accent flex items-center justify-center transition-all text-[9px] font-bold leading-none focus:outline-none"
        aria-label="More info"
      >
        ?
      </button>
      {visible && (
        <div className="absolute z-50 left-6 top-1/2 -translate-y-1/2 w-56 bg-osv-bg border border-white/10 shadow-xl rounded-lg p-3 text-xs text-osv-white/80 leading-relaxed font-sans pointer-events-none">
          <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-white/10"></div>
          {hint}
        </div>
      )}
    </span>
  );
}

export default function DynamicScopeForm({ fields, scope, onChange, disabled }) {
  const inputClass = "w-full bg-osv-bg/80 backdrop-blur-sm border border-white/10 p-3 h-11 text-osv-white text-sm rounded-lg focus:border-osv-accent/50 focus:ring-2 focus:ring-osv-accent/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all duration-200 outline-none placeholder:text-osv-muted disabled:opacity-60";
  const labelClass = "text-xs font-mono text-osv-muted tracking-wide mb-2 flex items-center";

  const handleChange = (key, value) => {
    onChange({ ...scope, [key]: value });
  };

  const toggleMultiSelect = (key, option) => {
    const current = scope[key] || [];
    const next = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    handleChange(key, next);
  };

  const visibleFields = fields.filter(field => {
    if (!field.showWhen) return true;
    return field.showWhen(scope);
  });

  return (
    <div className="space-y-4">
      {visibleFields.map(field => (
        <div key={field.key}>
          <label className={labelClass}>
            {field.label.toUpperCase()}
            {field.required && <span className="text-osv-accent ml-1">*</span>}
            <HintTooltip hint={field.hint} />
          </label>

          {field.type === 'text' && (
            <input
              type="text"
              value={scope[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              disabled={disabled}
              placeholder={field.placeholder || ''}
              className={inputClass}
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              value={scope[field.key] ?? ''}
              onChange={e => handleChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
              disabled={disabled}
              min={0}
              className={inputClass}
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              value={scope[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder={field.placeholder || ''}
              className={`${inputClass} min-h-[80px] h-auto resize-none`}
            />
          )}

          {field.type === 'select' && (
            <select
              value={scope[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              disabled={disabled}
              className={inputClass}
            >
              <option value="">Select...</option>
              {(field.options || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === 'multi-select' && (
            <div className="flex flex-wrap gap-2">
              {(field.options || []).map(opt => {
                const selected = (scope[field.key] || []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMultiSelect(field.key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-osv-accent/15 border-osv-accent/40 text-osv-accent'
                        : 'bg-osv-bg/50 border-white/10 text-osv-muted hover:border-white/20 hover:text-osv-white'
                    } disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {field.type === 'boolean' && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleChange(field.key, !scope[field.key])}
              className="flex items-center gap-3 group disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className={`w-10 h-5 rounded-full transition-all duration-200 relative ${
                scope[field.key] ? 'bg-osv-accent/30 border-osv-accent/50' : 'bg-osv-bg/80 border-white/10'
              } border`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow ${
                  scope[field.key] ? 'left-[calc(100%-18px)] bg-osv-accent' : 'left-0.5 bg-white/40'
                }`} />
              </div>
              <span className={`text-xs font-mono ${scope[field.key] ? 'text-osv-accent' : 'text-osv-muted'}`}>
                {scope[field.key] ? 'Yes' : 'No'}
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
