import React from 'react';
import { BarChart2 } from 'lucide-react';

function ScoreRow({ label, value, color = 'bg-cyan-500', sign = '+', testId }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2d313a] last:border-0" data-testid={testId}>
      <span className="text-xs text-slate-400 w-40 shrink-0">{label}</span>
      <span className={`text-xs font-mono-code font-semibold w-14 shrink-0 text-right
        ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-slate-500'}`}>
        {value > 0 ? `+${value.toFixed(0)}` : value === 0 ? '—' : value.toFixed(0)}
      </span>
      {value !== 0 && (
        <div className="flex-1 bg-[#0f1117] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${Math.min(Math.abs(value) / 2, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ConfidenceBreakdown({ incident }) {
  if (!incident) return null;

  const displayConfidence = Math.round(incident.confidence);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (displayConfidence / 100) * circumference;

  const severityColor =
    incident.severity === 'CRITICAL' ? '#ef4444'
    : incident.severity === 'ERROR' ? '#f97316'
    : '#06b6d4';

  return (
    <div className="panel" data-testid="confidence-breakdown">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Confidence Breakdown</span>
        </div>
      </div>

      <div className="p-4 flex items-center gap-6">
        {/* Gauge */}
        <div className="relative shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="#2d313a" strokeWidth="8" />
            <circle
              cx="44" cy="44" r="36"
              fill="none"
              stroke={severityColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-xl font-bold font-mono-code"
              style={{ color: severityColor }}
              data-testid="confidence-value"
            >
              {displayConfidence}%
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">confidence</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 min-w-0">
          <ScoreRow
            label="Pattern Score"
            value={incident.pattern_score}
            color="bg-cyan-500"
            testId="score-pattern"
          />
          <ScoreRow
            label="Evidence Bonus (≥3 patterns)"
            value={incident.evidence_bonus}
            color="bg-emerald-500"
            testId="score-evidence-bonus"
          />
          <ScoreRow
            label="Relationship Bonus"
            value={incident.relationship_bonus}
            color="bg-violet-500"
            testId="score-relationship-bonus"
          />
          <ScoreRow
            label="Symptom Penalty"
            value={-incident.symptom_penalty}
            color="bg-red-500"
            testId="score-symptom-penalty"
          />
          <div className="flex items-center gap-3 pt-2 mt-1">
            <span className="text-xs font-semibold text-slate-300 w-40 shrink-0">Incident Score (raw)</span>
            <span className="text-xs font-mono-code font-bold text-slate-100 w-14 text-right" data-testid="incident-score-raw">
              {incident.incident_score.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500 w-40 shrink-0">Confidence (capped at 100)</span>
            <span className="text-xs font-mono-code font-bold text-cyan-400 w-14 text-right">
              {displayConfidence}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
