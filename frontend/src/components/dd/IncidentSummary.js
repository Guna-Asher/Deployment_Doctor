import React from 'react';
import { AlertTriangle, AlertCircle, Info, Zap } from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: AlertTriangle,
    label: 'CRITICAL',
  },
  ERROR: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: AlertCircle,
    label: 'ERROR',
  },
  WARNING: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: AlertTriangle,
    label: 'WARNING',
  },
  INFO: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    icon: Info,
    label: 'INFO',
  },
};

export function SeverityBadge({ severity, size = 'sm' }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
        ${cfg.bg} ${cfg.color} border ${cfg.border}`}
      data-testid={`severity-badge-${severity}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export default function IncidentSummary({ incident, isPrimary = false }) {
  if (!incident) return null;
  const cfg = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.INFO;
  const Icon = cfg.icon;

  return (
    <div
      className={`panel p-5 ${isPrimary ? `border-l-2 ${cfg.border.replace('border-', 'border-l-')}` : ''}`}
      data-testid="incident-summary-card"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${cfg.bg} border ${cfg.border}`}>
            <Icon size={14} className={cfg.color} />
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-slate-500 uppercase tracking-wider mb-0.5">
              {isPrimary ? 'PRIMARY ROOT CAUSE' : 'CONTRIBUTING INCIDENT'}
            </div>
            <h2
              className="text-lg font-semibold text-slate-100"
              data-testid="incident-title"
            >
              {incident.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={incident.severity} />
          <span className="text-[10px] text-slate-500 font-mono-code bg-[#0f1117] border border-[#2d313a] px-2 py-0.5 rounded">
            {incident.blueprint_id}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Confidence" value={`${incident.confidence.toFixed(0)}%`} color={cfg.color} testId="incident-confidence" />
        <StatBox label="Evidence" value={`${incident.evidence.length} records`} color="text-slate-300" testId="incident-evidence-count" />
        <StatBox label="Category" value={incident.category} color="text-slate-300" testId="incident-category" />
      </div>
    </div>
  );
}

function StatBox({ label, value, color, testId }) {
  return (
    <div className="bg-[#0f1117] border border-[#2d313a] rounded p-3" data-testid={testId}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-semibold font-mono-code ${color}`}>{value}</div>
    </div>
  );
}
