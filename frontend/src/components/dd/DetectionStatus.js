import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

const STATUS_CONFIG = {
  CONFIDENT: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'CONFIDENT',
    description: 'Root cause identified with high certainty',
  },
  AMBIGUOUS: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    label: 'AMBIGUOUS',
    description: 'Multiple incidents have similar confidence — review all candidates',
  },
  INSUFFICIENT_EVIDENCE: {
    icon: HelpCircle,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    label: 'INSUFFICIENT EVIDENCE',
    description: 'No incident pattern exceeded the minimum detection threshold',
  },
};

export default function DetectionStatus({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.INSUFFICIENT_EVIDENCE;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded border ${cfg.bg} ${cfg.border}`}
      data-testid="detection-status"
    >
      <Icon size={16} className={cfg.color} />
      <div>
        <div className={`text-xs font-bold font-mono-code uppercase tracking-wider ${cfg.color}`} data-testid="detection-status-label">
          {cfg.label}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{cfg.description}</div>
      </div>
    </div>
  );
}
