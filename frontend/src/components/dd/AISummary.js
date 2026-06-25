import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function AISummary({ summary, isAvailable }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel" data-testid="ai-summary">
      <button
        className="panel-header w-full text-left cursor-pointer hover:bg-[#23252e] transition-colors rounded-t-md"
        onClick={() => setOpen(v => !v)}
        data-testid="ai-summary-toggle-btn"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className={isAvailable ? 'text-violet-400' : 'text-slate-600'} />
          <span className="text-sm font-medium text-slate-200">AI Summary</span>
          <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded border
            ${isAvailable
              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              : 'bg-slate-800 text-slate-500 border-[#2d313a]'
            }`}
          >
            {isAvailable ? 'AI Generated' : 'Rules Engine Fallback'}
          </span>
          <span className="ml-auto text-xs text-slate-500">
            {open ? 'Collapse' : 'Expand'}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <div className="p-4" data-testid="ai-summary-content">
          {!isAvailable && (
            <div className="flex items-start gap-2 mb-3 p-2.5 rounded bg-[#0f1117] border border-[#2d313a]">
              <AlertCircle size={12} className="text-slate-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500">
                AI Summary Unavailable — Rules Engine Active. Add <code className="font-mono-code text-slate-400">OPENROUTER_API_KEY</code> to enable AI-generated summaries.
              </p>
            </div>
          )}
          <p className="text-sm text-slate-300 leading-relaxed" data-testid="ai-summary-text">
            {summary || 'No summary available.'}
          </p>
        </div>
      )}
    </div>
  );
}
