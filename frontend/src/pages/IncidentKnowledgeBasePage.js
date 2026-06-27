import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Tag, GitBranch, ChevronDown, ChevronRight, Terminal, Wrench, Activity } from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { SeverityBadge } from '../components/dd/IncidentSummary';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_CONFIG = {
  DATABASE:      { color: '#f97316', border: '#f9731630', bg: '#f9731608' },
  NETWORKING:    { color: '#3b82f6', border: '#3b82f630', bg: '#3b82f608' },
  KUBERNETES:    { color: '#06b6d4', border: '#06b6d430', bg: '#06b6d408' },
  RESOURCES:     { color: '#ef4444', border: '#ef444430', bg: '#ef444408' },
  SECURITY:      { color: '#eab308', border: '#eab30830', bg: '#eab30808' },
  STORAGE:       { color: '#8b5cf6', border: '#8b5cf630', bg: '#8b5cf608' },
  CONFIGURATION: { color: '#10b981', border: '#10b98130', bg: '#10b98108' },
  APPLICATION:   { color: '#ec4899', border: '#ec489930', bg: '#ec489908' },
  CACHE:         { color: '#f59e0b', border: '#f59e0b30', bg: '#f59e0b08' },
  MESSAGING:     { color: '#6366f1', border: '#6366f130', bg: '#6366f108' },
  CLOUD:         { color: '#0ea5e9', border: '#0ea5e930', bg: '#0ea5e908' },
};

const DEFAULT_CAT_CFG = { color: '#94a3b8', border: '#94a3b830', bg: '#94a3b808' };
const getCatCfg = cat => CATEGORY_CONFIG[cat] || DEFAULT_CAT_CFG;

// Custom tooltip for recharts
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1a1c23', border: '1px solid #2d313a', borderRadius: 5, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{d.category}</div>
      <div style={{ color: '#94a3b8' }}>{d.rules} rules · {d.blueprints} blueprint(s)</div>
    </div>
  );
}

export default function IncidentKnowledgeBasePage() {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    axios.get(`${API}/api/incidents`)
      .then(r => setBlueprints(r.data))
      .catch(() => setError('Failed to load knowledge base'))
      .finally(() => setLoading(false));
  }, []);

  // Build category stats
  const categoryStats = useMemo(() => {
    const map = {};
    blueprints.forEach(bp => {
      if (!map[bp.category]) map[bp.category] = { blueprints: 0, rules: 0 };
      map[bp.category].blueprints++;
      map[bp.category].rules += bp.patterns?.length || 0;
    });
    return Object.entries(map)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.rules - a.rules);
  }, [blueprints]);

  const categories = useMemo(() => ['ALL', ...categoryStats.map(c => c.category)], [categoryStats]);

  // Build reverse relationship map (who causes whom)
  const causedByMap = useMemo(() => {
    const map = {};
    blueprints.forEach(bp => {
      bp.causes_incidents?.forEach(target => {
        if (!map[target]) map[target] = [];
        map[target].push(bp.id);
      });
    });
    return map;
  }, [blueprints]);

  const filtered = useMemo(() => blueprints.filter(bp => {
    const catMatch = selectedCategory === 'ALL' || bp.category === selectedCategory;
    const searchMatch = !search || bp.id.toLowerCase().includes(search.toLowerCase()) ||
      bp.title.toLowerCase().includes(search.toLowerCase()) ||
      bp.category.toLowerCase().includes(search.toLowerCase()) ||
      bp.patterns?.some(p => p.match.toLowerCase().includes(search.toLowerCase()));
    return catMatch && searchMatch;
  }), [blueprints, selectedCategory, search]);

  const totalRules = filtered.reduce((acc, bp) => acc + (bp.patterns?.length || 0), 0);

  return (
    <div className="min-h-full" data-testid="knowledge-base-page">

      {/* ── Header ── */}
      <div className="border-b border-[#2d313a] bg-[#1a1c23] px-6 py-4">
        <div className="flex items-center gap-2 mb-0.5">
          <BookOpen size={15} className="text-cyan-400" />
          <h1 className="text-xl font-semibold text-slate-100">Operational Knowledge Library</h1>
        </div>
        <p className="text-xs text-slate-500">
          {blueprints.length} incident blueprints · {blueprints.reduce((a, b) => a + (b.patterns?.length || 0), 0)} detection rules · {blueprints.reduce((a, b) => a + (b.causes_incidents?.length || 0), 0)} relationship edges
        </p>
      </div>

      {/* ── Category Distribution Chart ── */}
      {categoryStats.length > 0 && (
        <div className="border-b border-[#2d313a] bg-[#0d0f16] px-6 py-5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono-code mb-3">Rules per Category</div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryStats}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: '#2d313a' }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={110}
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="rules" radius={[0, 3, 3, 0]} barSize={10}>
                  {categoryStats.map(({ category }) => (
                    <Cell key={category} fill={getCatCfg(category).color} opacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">

        {/* ── Category Filter ── */}
        <div className="flex flex-wrap gap-2" data-testid="category-filter-row">
          {categories.map(cat => {
            const cfg = cat === 'ALL' ? { color: '#94a3b8', border: '#94a3b830', bg: '#94a3b808' } : getCatCfg(cat);
            const isActive = selectedCategory === cat;
            const stats = categoryStats.find(c => c.category === cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                data-testid={`category-pill-${cat}`}
                style={{
                  background: isActive ? cfg.bg : 'transparent',
                  border: `1px solid ${isActive ? cfg.color + '60' : '#2d313a'}`,
                  color: isActive ? cfg.color : '#64748b',
                  borderRadius: 5,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {cat}
                {stats && (
                  <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}>{stats.blueprints}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + Summary ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search blueprints, patterns, or IDs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#1a1c23] border border-[#2d313a] rounded px-9 py-2 text-xs text-slate-300 placeholder-slate-600
                focus:outline-none focus:border-cyan-500/60 w-72"
              data-testid="kb-search-input"
            />
          </div>
          <div className="text-[10px] text-slate-600 font-mono-code flex items-center gap-3">
            <span data-testid="kb-total-count" className="text-slate-500">{filtered.length} blueprints</span>
            <span>·</span>
            <span>{totalRules} rules</span>
          </div>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        {/* ── Blueprint List ── */}
        <div className="space-y-2" data-testid="blueprints-list">
          {filtered.map(bp => (
            <BlueprintRow
              key={bp.id}
              blueprint={bp}
              isExpanded={expanded === bp.id}
              onToggle={() => setExpanded(expanded === bp.id ? null : bp.id)}
              causedBy={causedByMap[bp.id] || []}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── Blueprint Row ─────────────────────────────────────────────────────────────
function BlueprintRow({ blueprint, isExpanded, onToggle, causedBy }) {
  const catCfg = getCatCfg(blueprint.category);
  const totalWeight = blueprint.patterns?.reduce((a, p) => a + p.weight, 0) || 0;

  return (
    <div
      className={`border rounded-md overflow-hidden transition-colors ${isExpanded ? 'border-[#2d313a]' : 'border-[#1e2028] hover:border-[#2d313a]'}`}
      style={{ background: '#1a1c23' }}
      data-testid={`blueprint-${blueprint.id}`}
    >
      {/* Row header */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#20232c] transition-colors text-left"
        onClick={onToggle}
        data-testid={`blueprint-toggle-${blueprint.id}`}
      >
        {isExpanded
          ? <ChevronDown size={13} className="text-slate-500 shrink-0" />
          : <ChevronRight size={13} className="text-slate-500 shrink-0" />
        }

        <span className="font-mono-code text-xs font-bold text-slate-400 w-52 shrink-0 truncate" data-testid={`bp-id-${blueprint.id}`}>
          {blueprint.id}
        </span>

        <span className="text-sm font-medium text-slate-100 flex-1 truncate">{blueprint.title}</span>

        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={blueprint.severity} />
          <span
            style={{ color: catCfg.color, background: catCfg.bg, border: `1px solid ${catCfg.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {blueprint.category}
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 bg-[#0f1117] border border-[#2d313a] px-2 py-0.5 rounded">
            {blueprint.patterns?.length}r
          </span>
          {blueprint.causes_incidents?.length > 0 && (
            <span className="text-[10px] font-mono-code text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
              →{blueprint.causes_incidents.length}
            </span>
          )}
          {causedBy.length > 0 && (
            <span className="text-[10px] font-mono-code text-cyan-400/70 bg-cyan-500/5 border border-cyan-500/15 px-2 py-0.5 rounded">
              ←{causedBy.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1e2028] px-4 py-5 space-y-5 bg-[#16181f]" data-testid={`blueprint-detail-${blueprint.id}`}>

          {/* ── Relationships – most prominent ── */}
          {(blueprint.causes_incidents?.length > 0 || causedBy.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {causedBy.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch size={11} className="text-cyan-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Parent Incidents (caused by)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {causedBy.map(id => (
                      <span key={id} className="text-[11px] font-mono-code bg-cyan-500/8 text-cyan-300 border border-cyan-500/20 px-2 py-1 rounded" data-testid={`parent-${id}`}>
                        ← {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {blueprint.causes_incidents?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch size={11} className="text-violet-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Child Incidents (causes)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.causes_incidents.map(id => (
                      <span key={id} className="text-[11px] font-mono-code bg-violet-500/8 text-violet-300 border border-violet-500/20 px-2 py-1 rounded" data-testid={`causes-${id}`}>
                        → {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Patterns + Causes ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Detection Patterns ({blueprint.patterns?.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {blueprint.patterns?.map((pat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-2.5 py-1.5 bg-[#0f1117] rounded border border-[#1e2028]"
                    data-testid={`pattern-${blueprint.id}-${i}`}
                  >
                    <span className="font-mono-code text-[10px] text-cyan-300 truncate">{pat.match}</span>
                    <span className="shrink-0 text-[9px] font-mono-code text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                      +{pat.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Possible Causes
              </div>
              <ul className="space-y-1.5">
                {blueprint.possible_causes?.map((cause, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500/30" />
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Verification + Fixes ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Terminal size={11} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Verification Commands ({blueprint.verification_steps?.length})
                </span>
              </div>
              <div className="space-y-1">
                {blueprint.verification_steps?.map((cmd, i) => (
                  <div key={i} className="flex items-start gap-2 bg-black/40 border border-[#1e2028] rounded px-2.5 py-1.5">
                    <span className="text-cyan-500 font-mono-code text-xs shrink-0">$</span>
                    <span className="font-mono-code text-[10px] text-slate-300 break-all">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wrench size={11} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Recommended Fixes ({blueprint.recommended_fixes?.length})
                </span>
              </div>
              <ul className="space-y-1.5">
                {blueprint.recommended_fixes?.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-slate-300">
                    <span className="shrink-0 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full w-4 h-4 flex items-center justify-center mt-0.5 font-bold">
                      {i + 1}
                    </span>
                    <span className="font-mono-code break-all leading-relaxed">{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Footer metadata ── */}
          <div className="flex items-center gap-4 pt-2 border-t border-[#1e2028] text-[10px] font-mono-code text-slate-600">
            <span>Role: <span className="text-slate-500">{blueprint.incident_role}</span></span>
            <span>Priority: <span className="text-slate-500">{blueprint.priority}</span></span>
            <span>Max Score: <span className="text-slate-500">{totalWeight + 10}</span></span>
            <span>Relationship Count: <span className="text-slate-500">{(blueprint.causes_incidents?.length || 0) + (causedBy.length || 0)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
