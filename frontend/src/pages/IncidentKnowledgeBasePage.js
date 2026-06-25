import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Search, Tag } from 'lucide-react';
import axios from 'axios';
import { SeverityBadge } from '../components/dd/IncidentSummary';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_COLOR = {
  DATABASE: 'text-orange-400',
  NETWORKING: 'text-blue-400',
  KUBERNETES: 'text-cyan-400',
  RESOURCES: 'text-red-400',
  SECURITY: 'text-yellow-400',
  STORAGE: 'text-violet-400',
  CONFIGURATION: 'text-emerald-400',
};

export default function IncidentKnowledgeBasePage() {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/incidents`)
      .then(r => setBlueprints(r.data))
      .catch(() => setError('Failed to load knowledge base'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = blueprints.filter(bp =>
    !search ||
    bp.id.toLowerCase().includes(search.toLowerCase()) ||
    bp.title.toLowerCase().includes(search.toLowerCase()) ||
    bp.category.toLowerCase().includes(search.toLowerCase()) ||
    bp.patterns.some(p => p.match.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-full" data-testid="knowledge-base-page">
      {/* Header */}
      <div className="border-b border-[#2d313a] bg-[#1a1c23] px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={16} className="text-cyan-400" />
          <h1 className="text-xl font-semibold text-slate-100">Incident Knowledge Base</h1>
        </div>
        <p className="text-sm text-slate-400">All detection rules and incident blueprints powering the engine.</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search blueprints by ID, title, category, or pattern..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xl bg-[#1a1c23] border border-[#2d313a] rounded px-9 py-2 text-sm text-slate-300
              placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            data-testid="kb-search-input"
          />
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono-code">
          <span data-testid="kb-total-count">{filtered.length} blueprints</span>
          <span>·</span>
          <span>{filtered.reduce((acc, bp) => acc + bp.patterns.length, 0)} total rules</span>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        {/* Blueprint list */}
        <div className="space-y-2" data-testid="blueprints-list">
          {filtered.map(bp => (
            <BlueprintRow
              key={bp.id}
              blueprint={bp}
              isExpanded={expanded === bp.id}
              onToggle={() => setExpanded(expanded === bp.id ? null : bp.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BlueprintRow({ blueprint, isExpanded, onToggle }) {
  const categoryColor = CATEGORY_COLOR[blueprint.category] || 'text-slate-400';
  const totalWeight = blueprint.patterns.reduce((a, p) => a + p.weight, 0);

  return (
    <div
      className={`panel transition-colors ${isExpanded ? 'border-cyan-500/20' : ''}`}
      data-testid={`blueprint-${blueprint.id}`}
    >
      {/* Row header */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#23252e] transition-colors text-left"
        onClick={onToggle}
        data-testid={`blueprint-toggle-${blueprint.id}`}
      >
        <div className="shrink-0">
          {isExpanded
            ? <ChevronDown size={14} className="text-slate-400" />
            : <ChevronRight size={14} className="text-slate-400" />
          }
        </div>

        <span className="text-xs font-mono-code font-semibold text-slate-400 w-48 shrink-0 truncate" data-testid={`bp-id-${blueprint.id}`}>
          {blueprint.id}
        </span>

        <span className="text-sm font-medium text-slate-100 flex-1 truncate">{blueprint.title}</span>

        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={blueprint.severity} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${categoryColor}`}>
            {blueprint.category}
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 bg-[#0f1117] border border-[#2d313a] px-2 py-0.5 rounded">
            {blueprint.patterns.length} rules
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#2d313a] px-4 py-4 space-y-4" data-testid={`blueprint-detail-${blueprint.id}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Patterns */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Detection Patterns ({blueprint.patterns.length})
              </div>
              <div className="space-y-1">
                {blueprint.patterns.map((pat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-2.5 py-1.5 bg-[#0f1117] rounded border border-[#2d313a]"
                    data-testid={`pattern-${blueprint.id}-${i}`}
                  >
                    <span className="font-mono-code text-xs text-cyan-300 truncate">{pat.match}</span>
                    <span className="shrink-0 text-[10px] font-mono-code text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      +{pat.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Causes */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Possible Causes
              </div>
              <ul className="space-y-1">
                {blueprint.possible_causes.map((cause, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500/30" />
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Verification + Fixes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Verification Commands
              </div>
              <div className="space-y-1">
                {blueprint.verification_steps.map((cmd, i) => (
                  <div key={i} className="flex items-start gap-2 bg-black/50 border border-[#2d313a] rounded px-2.5 py-1.5">
                    <span className="text-cyan-500 font-mono-code text-xs shrink-0">$</span>
                    <span className="font-mono-code text-xs text-slate-300 break-all">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recommended Fixes
              </div>
              <ul className="space-y-1">
                {blueprint.recommended_fixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="shrink-0 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full w-4 h-4 flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="font-mono-code break-all">{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Relationships */}
          {blueprint.causes_incidents.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Causes
              </div>
              <div className="flex flex-wrap gap-2">
                {blueprint.causes_incidents.map(id => (
                  <span
                    key={id}
                    className="text-[11px] font-mono-code bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-1 rounded"
                    data-testid={`causes-${id}`}
                  >
                    → {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-500 font-mono-code">
            <span>Role: <span className="text-slate-400">{blueprint.incident_role}</span></span>
            <span>Priority: <span className="text-slate-400">{blueprint.priority}</span></span>
            <span>Max Score: <span className="text-slate-400">{totalWeight + 10} (with evidence bonus)</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
