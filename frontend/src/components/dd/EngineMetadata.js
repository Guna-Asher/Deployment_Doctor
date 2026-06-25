import React from 'react';
import { Cpu, Clock, Shield } from 'lucide-react';

export default function EngineMetadata({ metadata, logStats = {} }) {
  if (!metadata) return null;

  const ts = metadata.timestamp
    ? new Date(metadata.timestamp).toLocaleString()
    : 'N/A';

  return (
    <div className="panel" data-testid="engine-metadata">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Engine Metadata</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono-code">{ts}</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetaItem label="Engine" value={`v${metadata.engine_version}`} icon={<Cpu size={11} />} testId="meta-engine-version" />
        <MetaItem label="Blueprint" value={`v${metadata.blueprint_version}`} icon={<Shield size={11} />} testId="meta-blueprint-version" />
        <MetaItem label="Blueprints" value={metadata.blueprints_loaded} testId="meta-blueprints-loaded" />
        <MetaItem label="Rules" value={metadata.rules_loaded} testId="meta-rules-loaded" />
        <MetaItem label="Duration" value={`${metadata.analysis_duration_ms.toFixed(1)}ms`} icon={<Clock size={11} />} testId="meta-duration" />
        <MetaItem label="Log Lines" value={logStats.lines?.toLocaleString() || 'N/A'} testId="meta-log-lines" />
      </div>
    </div>
  );
}

function MetaItem({ label, value, icon, testId }) {
  return (
    <div className="bg-[#0f1117] border border-[#2d313a] rounded p-2.5" data-testid={testId}>
      <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xs font-mono-code font-semibold text-slate-200">{value}</div>
    </div>
  );
}
