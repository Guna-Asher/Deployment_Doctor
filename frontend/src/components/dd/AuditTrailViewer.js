import React, { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

const STAGE_COLOR = {
  ENGINE_START: 'text-cyan-400',
  ENGINE_COMPLETE: 'text-emerald-400',
  PATTERN_MATCHING: 'text-blue-400',
  PATTERN_MATCHING_COMPLETE: 'text-blue-400',
  PATTERN_SCORE: 'text-cyan-300',
  EVIDENCE_BONUS: 'text-emerald-300',
  RELATIONSHIP_BONUS: 'text-violet-300',
  RELATIONSHIP_VALIDATION: 'text-violet-300',
  RELATIONSHIP_REJECTED: 'text-slate-500',
  RELATIONSHIP_ANALYSIS: 'text-violet-400',
  SYMPTOM_PENALTY: 'text-red-400',
  SCORING: 'text-yellow-400',
  THRESHOLD_FILTER: 'text-slate-500',
  RANKING: 'text-orange-300',
  STATUS_CONFIDENT: 'text-emerald-400',
  AMBIGUITY_DETECTED: 'text-yellow-400',
};

export default function AuditTrailViewer({ auditTrail = [] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="panel" data-testid="audit-trail-viewer">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Detection Audit Trail</span>
          <span className="text-[10px] font-mono-code bg-[#0f1117] border border-[#2d313a] text-slate-400 px-2 py-0.5 rounded">
            {auditTrail.length} entries
          </span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-400 hover:text-slate-100 transition-colors"
          data-testid="audit-trail-toggle-btn"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="divide-y divide-[#1e2028] max-h-96 overflow-y-auto" data-testid="audit-trail-list">
          {auditTrail.map((entry, i) => (
            <div
              key={i}
              className="px-4 py-2 hover:bg-[#23252e] transition-colors"
              data-testid={`audit-entry-${i}`}
            >
              <div className="flex items-center justify-between gap-4">
                <span
                  className={`text-[10px] font-mono-code font-semibold uppercase tracking-wider shrink-0
                    ${STAGE_COLOR[entry.stage] || 'text-slate-400'}`}
                >
                  {entry.stage}
                </span>
                {entry.score_change !== 0 && (
                  <span
                    className={`text-[10px] font-mono-code font-bold tabular-nums shrink-0
                      ${entry.score_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    data-testid={`audit-score-${i}`}
                  >
                    {entry.score_change > 0 ? `+${entry.score_change.toFixed(0)}` : entry.score_change.toFixed(0)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{entry.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
