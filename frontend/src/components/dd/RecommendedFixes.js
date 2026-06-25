import React from 'react';
import { Wrench, ChevronRight } from 'lucide-react';

export default function RecommendedFixes({ fixes = [] }) {
  return (
    <div className="panel" data-testid="recommended-fixes">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Recommended Fixes</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5" data-testid="fixes-list">
        {fixes.map((fix, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2.5 rounded bg-[#0f1117] border border-[#2d313a] hover:border-emerald-500/20 transition-colors"
            data-testid={`fix-${i}`}
          >
            <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-emerald-400">{i + 1}</span>
            </div>
            <span className="text-xs text-slate-300 font-mono-code leading-relaxed flex-1">{fix}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
