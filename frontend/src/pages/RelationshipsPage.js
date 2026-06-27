import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import {
  Network, Search, Play, Loader, AlertCircle, X,
  GitBranch, ChevronDown, Activity, Cpu, ArrowRight,
  Info, Filter,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ─── Role configuration ───────────────────────────────────────────────────────
const ROLE_CONFIG = {
  'root-cause': {
    label: 'Root Cause',
    borderColor: '#f97316',
    bgColor: '#1c0a02',
    textColor: '#fb923c',
    dotColor: '#f97316',
    glowColor: 'rgba(249,115,22,0.3)',
    miniMapColor: '#f97316',
  },
  intermediate: {
    label: 'Intermediate',
    borderColor: '#eab308',
    bgColor: '#1a1400',
    textColor: '#fbbf24',
    dotColor: '#eab308',
    glowColor: 'rgba(234,179,8,0.3)',
    miniMapColor: '#eab308',
  },
  symptom: {
    label: 'Symptom',
    borderColor: '#06b6d4',
    bgColor: '#011b20',
    textColor: '#22d3ee',
    dotColor: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.3)',
    miniMapColor: '#06b6d4',
  },
};

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  ERROR: '#f97316',
  WARNING: '#eab308',
  INFO: '#06b6d4',
};

// ─── Compute display role from graph topology ────────────────────────────────
function computeDisplayRole(id, causesSet, targetedSet) {
  const hasChildren = causesSet.has(id);
  const hasParents = targetedSet.has(id);
  if (hasChildren && hasParents) return 'intermediate';
  if (hasChildren && !hasParents) return 'root-cause';
  return 'symptom';
}

// ─── Topological layout algorithm ────────────────────────────────────────────
function computeLayout(rawNodes, rawEdges) {
  const NODE_W = 230;
  const NODE_H = 82;
  const X_GAP = 70;
  const Y_GAP = 16;

  if (!rawNodes.length) return {};

  const childrenOf = {};
  const parentsOf = {};
  rawNodes.forEach(n => { childrenOf[n.id] = []; parentsOf[n.id] = []; });
  rawEdges.forEach(e => {
    childrenOf[e.source]?.push(e.target);
    parentsOf[e.target]?.push(e.source);
  });

  // Kahn's topological sort
  const inDeg = {};
  rawNodes.forEach(n => { inDeg[n.id] = parentsOf[n.id].length; });
  const topoOrder = [];
  const q = rawNodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  let head = 0;
  while (head < q.length) {
    const curr = q[head++];
    topoOrder.push(curr);
    childrenOf[curr].forEach(child => {
      inDeg[child]--;
      if (inDeg[child] === 0) q.push(child);
    });
  }
  rawNodes.forEach(n => { if (!topoOrder.includes(n.id)) topoOrder.push(n.id); });

  // Longest-path level assignment
  const levels = {};
  rawNodes.forEach(n => { levels[n.id] = 0; });
  topoOrder.forEach(id => {
    childrenOf[id].forEach(child => {
      if (levels[child] < levels[id] + 1) levels[child] = levels[id] + 1;
    });
  });

  // Group by level
  const levelGroups = {};
  rawNodes.forEach(n => {
    const lvl = levels[n.id];
    if (!levelGroups[lvl]) levelGroups[lvl] = [];
    levelGroups[lvl].push(n.id);
  });

  const positions = {};
  Object.entries(levelGroups).forEach(([lvl, ids]) => {
    const x = Number(lvl) * (NODE_W + X_GAP);
    const totalH = ids.length * NODE_H + (ids.length - 1) * Y_GAP;
    const startY = -totalH / 2;
    ids.forEach((id, i) => {
      positions[id] = { x, y: startY + i * (NODE_H + Y_GAP) };
    });
  });

  return positions;
}

// ─── Custom ReactFlow node ────────────────────────────────────────────────────
function IncidentNode({ data, selected }) {
  const role = data.role || 'symptom';
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.symptom;
  const sevColor = SEVERITY_COLORS[data.severity] || '#94a3b8';

  const opacity = data.scenarioMode ? (data.isDetected ? 1 : 0.15) : 1;
  const isHighlighted = data.isDetected && data.scenarioMode;

  return (
    <div
      data-testid={`rf-node-${data.id}`}
      style={{
        width: 230,
        background: cfg.bgColor,
        border: `1px solid ${selected ? '#ffffff60' : isHighlighted ? cfg.borderColor : cfg.borderColor + '80'}`,
        borderRadius: 6,
        opacity,
        transition: 'opacity 0.25s, box-shadow 0.25s',
        boxShadow: isHighlighted ? `0 0 14px ${cfg.glowColor}` : selected ? `0 0 0 2px #ffffff30` : 'none',
        cursor: 'pointer',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: cfg.dotColor, border: 'none', width: 8, height: 8, borderRadius: '50%' }} />

      {/* Role stripe */}
      <div style={{ height: 3, background: cfg.borderColor, borderRadius: '5px 5px 0 0', opacity: 0.7 }} />

      <div style={{ padding: '8px 10px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: cfg.textColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 9, color: sevColor, background: sevColor + '18', border: `1px solid ${sevColor}40`, borderRadius: 3, padding: '1px 5px' }}>
            {data.severity}
          </span>
        </div>
        <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', marginBottom: 3, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.id}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
          {data.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>
            {data.patternCount}r
          </span>
          {data.causesCount > 0 && (
            <span style={{ fontSize: 9, color: cfg.textColor + '80', fontFamily: 'monospace' }}>
              → {data.causesCount}
            </span>
          )}
          {data.isDetected && data.scenarioMode && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: cfg.textColor, fontWeight: 700 }}>
              ● DETECTED
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: cfg.dotColor, border: 'none', width: 8, height: 8, borderRadius: '50%' }} />
    </div>
  );
}

const nodeTypes = { incidentNode: IncidentNode };

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RelationshipsPage() {
  const [blueprints, setBlueprints] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [selectedScenario, setSelectedScenario] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(null);
  const [scenarioDetectedIds, setScenarioDetectedIds] = useState([]);
  const [scenarioMode, setScenarioMode] = useState(false);

  // Derived sets for role computation
  const { causesSet, targetedSet } = useMemo(() => {
    const causesSet = new Set();
    const targetedSet = new Set();
    blueprints.forEach(bp => {
      if (bp.causes_incidents?.length) {
        causesSet.add(bp.id);
        bp.causes_incidents.forEach(t => targetedSet.add(t));
      }
    });
    return { causesSet, targetedSet };
  }, [blueprints]);

  // Graph stats
  const graphStats = useMemo(() => {
    const rootCauses = blueprints.filter(bp => causesSet.has(bp.id) && !targetedSet.has(bp.id)).length;
    const intermediates = blueprints.filter(bp => causesSet.has(bp.id) && targetedSet.has(bp.id)).length;
    const symptoms = blueprints.filter(bp => !causesSet.has(bp.id) && targetedSet.has(bp.id)).length;
    const edgeCount = blueprints.reduce((acc, bp) => acc + (bp.causes_incidents?.length || 0), 0);
    return { rootCauses, intermediates, symptoms, edgeCount };
  }, [blueprints, causesSet, targetedSet]);

  // Build ReactFlow nodes/edges from blueprints
  const buildGraph = useCallback((bps, detectedIds = [], inScenarioMode = false) => {
    const csSet = new Set();
    const tgtSet = new Set();
    bps.forEach(bp => {
      if (bp.causes_incidents?.length) {
        csSet.add(bp.id);
        bp.causes_incidents.forEach(t => tgtSet.add(t));
      }
    });

    const rawEdges = [];
    bps.forEach(bp => {
      bp.causes_incidents?.forEach(target => {
        rawEdges.push({
          id: `${bp.id}->${target}`,
          source: bp.id,
          target,
          type: 'smoothstep',
          animated: inScenarioMode && detectedIds.includes(bp.id) && detectedIds.includes(target),
          style: {
            stroke: inScenarioMode
              ? (detectedIds.includes(bp.id) && detectedIds.includes(target) ? '#f97316' : '#1e2028')
              : '#374151',
            strokeWidth: inScenarioMode && detectedIds.includes(bp.id) && detectedIds.includes(target) ? 2 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: inScenarioMode
              ? (detectedIds.includes(bp.id) && detectedIds.includes(target) ? '#f97316' : '#1e2028')
              : '#374151',
          },
        });
      });
    });

    const rawNodes = bps.map(bp => ({
      id: bp.id,
      type: 'incidentNode',
      data: {},
    }));

    const positions = computeLayout(rawNodes, rawEdges);

    const flowNodes = bps.map(bp => ({
      id: bp.id,
      type: 'incidentNode',
      position: positions[bp.id] || { x: 0, y: 0 },
      draggable: true,
      data: {
        id: bp.id,
        title: bp.title,
        severity: bp.severity,
        role: computeDisplayRole(bp.id, csSet, tgtSet),
        patternCount: bp.patterns?.length || 0,
        causesCount: bp.causes_incidents?.length || 0,
        isDetected: detectedIds.includes(bp.id),
        scenarioMode: inScenarioMode,
      },
    }));

    return { flowNodes, flowEdges: rawEdges };
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/incidents`),
      axios.get(`${API}/api/samples`),
    ]).then(([incRes, sampRes]) => {
      setBlueprints(incRes.data);
      setScenarios(sampRes.data);
      const { flowNodes, flowEdges } = buildGraph(incRes.data);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }).catch(() => setError('Failed to load graph data'))
      .finally(() => setLoading(false));
  }, [buildGraph, setNodes, setEdges]);

  // Search + role filter → dim/highlight nodes
  useEffect(() => {
    if (!blueprints.length) return;
    const term = search.toLowerCase();
    setNodes(nds => nds.map(n => {
      const matchesSearch = !term || n.id.toLowerCase().includes(term) || n.data.title?.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'all' || n.data.role === roleFilter;
      const visible = matchesSearch && matchesRole;
      return { ...n, style: { ...n.style, opacity: visible ? 1 : 0.08 } };
    }));
  }, [search, roleFilter, blueprints, setNodes]);

  // Selected node detail
  const selectedBlueprint = useMemo(() => blueprints.find(b => b.id === selectedNodeId), [blueprints, selectedNodeId]);

  // Scenario overlay
  const runScenario = async (scenarioId) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const { data: content } = await axios.get(`${API}/api/samples/${scenario.filename}/content`);
      const form = new FormData();
      form.append('log_content', content.content);
      form.append('filename', scenario.filename);
      const { data: result } = await axios.post(`${API}/api/analyze`, form);

      const detectedIds = [
        ...(result.primary_incident ? [result.primary_incident.blueprint_id] : []),
        ...(result.contributing_incidents || []).map(c => c.blueprint_id),
      ];
      setScenarioDetectedIds(detectedIds);
      setScenarioMode(true);

      const { flowNodes, flowEdges } = buildGraph(blueprints, detectedIds, true);
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch {
      setScenarioError('Scenario analysis failed');
    } finally {
      setScenarioLoading(false);
    }
  };

  const clearScenario = () => {
    setScenarioMode(false);
    setScenarioDetectedIds([]);
    setSelectedScenario('');
    setScenarioError(null);
    const { flowNodes, flowEdges } = buildGraph(blueprints);
    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const onNodeClick = useCallback((_evt, node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size={20} className="animate-spin text-cyan-400" />
    </div>
  );

  if (error) return (
    <div className="p-6 flex items-center gap-2 text-red-400">
      <AlertCircle size={16} /> {error}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0f1117' }} data-testid="relationships-page">

      {/* ── Page Header ── */}
      <div style={{ borderBottom: '1px solid #2d313a', background: '#1a1c23', padding: '14px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Network size={16} color="#06b6d4" />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Cascade Explorer</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Interactive incident relationship graph · {graphStats.edgeCount} DAG edges
              </div>
            </div>
          </div>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatBadge color="#f97316" label="Root Causes" value={graphStats.rootCauses} />
            <StatBadge color="#eab308" label="Intermediates" value={graphStats.intermediates} />
            <StatBadge color="#06b6d4" label="Symptoms" value={graphStats.symptoms} />
            <div style={{ width: 1, height: 20, background: '#2d313a', margin: '0 4px' }} />
            <StatBadge color="#8b5cf6" label="Edges" value={graphStats.edgeCount} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left Panel ── */}
        <aside style={{ width: 276, flexShrink: 0, borderRight: '1px solid #2d313a', background: '#13151c', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Search */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} color="#475569" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="graph-search-input"
                style={{ width: '100%', background: '#0f1117', border: '1px solid #2d313a', borderRadius: 5, padding: '6px 8px 6px 28px', fontSize: 11, color: '#cbd5e1', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
          </div>

          {/* Role Filter */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>Filter by Role</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['all', '#94a3b8', 'All Nodes', blueprints.length], ['root-cause', '#f97316', 'Root Cause', graphStats.rootCauses], ['intermediate', '#eab308', 'Intermediate', graphStats.intermediates], ['symptom', '#06b6d4', 'Symptom', graphStats.symptoms]].map(([val, color, label, count]) => (
                <button
                  key={val}
                  onClick={() => setRoleFilter(val)}
                  data-testid={`role-filter-${val}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                    background: roleFilter === val ? color + '18' : 'transparent',
                    border: `1px solid ${roleFilter === val ? color + '50' : 'transparent'}`,
                    color: roleFilter === val ? color : '#64748b',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {label}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569' }}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Overlay */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>
              Scenario Overlay
            </div>
            {scenarioMode ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#f97316', fontWeight: 600 }}>
                    {scenarioDetectedIds.length} node(s) detected
                  </span>
                  <button onClick={clearScenario} style={{ color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <X size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {scenarioDetectedIds.map(id => (
                    <span key={id} style={{ fontSize: 9, background: '#f9731618', color: '#fb923c', border: '1px solid #f9731640', borderRadius: 3, padding: '2px 6px', fontFamily: 'monospace' }}>
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={selectedScenario}
                  onChange={e => setSelectedScenario(e.target.value)}
                  data-testid="scenario-select"
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #2d313a', borderRadius: 5, padding: '6px 8px', fontSize: 11, color: '#cbd5e1', outline: 'none', marginBottom: 6 }}
                >
                  <option value="">Select a scenario...</option>
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <button
                  disabled={!selectedScenario || scenarioLoading}
                  onClick={() => runScenario(selectedScenario)}
                  data-testid="run-scenario-overlay-btn"
                  style={{
                    width: '100%', padding: '6px 0', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    cursor: selectedScenario && !scenarioLoading ? 'pointer' : 'not-allowed',
                    background: selectedScenario && !scenarioLoading ? '#f97316' : '#1e2028',
                    color: selectedScenario && !scenarioLoading ? '#fff' : '#374151',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {scenarioLoading ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />Analyzing...</> : <><Play size={11} />Highlight Cascade</>}
                </button>
                {scenarioError && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} />{scenarioError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2028' }}>
            <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>Legend</div>
            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 28, height: 14, border: `1.5px solid ${cfg.borderColor}`, borderRadius: 3, background: cfg.bgColor, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: cfg.textColor }}>{cfg.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ width: 28, height: 1, background: '#374151', borderRadius: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#475569' }}>Causes edge</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <div style={{ width: 28, height: 2, background: '#f97316', borderRadius: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#64748b' }}>Active cascade</span>
            </div>
          </div>

          {/* Selected Node Detail */}
          {selectedBlueprint ? (
            <div style={{ padding: '10px 12px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Node Detail</div>
                <button onClick={() => setSelectedNodeId(null)} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>

              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{selectedBlueprint.id}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 }}>{selectedBlueprint.title}</div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, background: '#1a1c23', border: '1px solid #2d313a', borderRadius: 3, padding: '2px 6px', color: '#64748b' }}>{selectedBlueprint.severity}</span>
                <span style={{ fontSize: 9, background: '#1a1c23', border: '1px solid #2d313a', borderRadius: 3, padding: '2px 6px', color: '#64748b' }}>{selectedBlueprint.category}</span>
                <span style={{ fontSize: 9, background: '#1a1c23', border: '1px solid #2d313a', borderRadius: 3, padding: '2px 6px', color: '#64748b' }}>{selectedBlueprint.patterns?.length}r</span>
              </div>

              {selectedBlueprint.causes_incidents?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>Causes →</div>
                  {selectedBlueprint.causes_incidents.map(id => (
                    <div key={id} onClick={() => setSelectedNodeId(id)} style={{ fontSize: 9, fontFamily: 'monospace', color: '#fb923c', background: '#f9731610', border: '1px solid #f9731630', borderRadius: 3, padding: '2px 7px', marginBottom: 3, cursor: 'pointer' }}>
                      {id}
                    </div>
                  ))}
                </div>
              )}

              {/* Parents */}
              {(() => {
                const parents = blueprints.filter(b => b.causes_incidents?.includes(selectedBlueprint.id));
                return parents.length > 0 ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>← Caused by</div>
                    {parents.map(p => (
                      <div key={p.id} onClick={() => setSelectedNodeId(p.id)} style={{ fontSize: 9, fontFamily: 'monospace', color: '#22d3ee', background: '#06b6d410', border: '1px solid #06b6d430', borderRadius: 3, padding: '2px 7px', marginBottom: 3, cursor: 'pointer' }}>
                        {p.id}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#334155', fontSize: 11, lineHeight: 1.6 }}>
                <Network size={22} color="#1e2a35" style={{ margin: '0 auto 6px' }} />
                Click a node to<br />inspect details
              </div>
            </div>
          )}
        </aside>

        {/* ── ReactFlow Canvas ── */}
        <div style={{ flex: 1, minWidth: 0, background: '#0a0c12' }} data-testid="reactflow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            defaultViewport={{ x: 60, y: 300, zoom: 0.52 }}
            minZoom={0.15}
            maxZoom={2}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1a1e28" />
            <Controls
              showInteractive={false}
              style={{ background: '#1a1c23', border: '1px solid #2d313a', borderRadius: 6 }}
            />
            <MiniMap
              nodeColor={node => {
                const cfg = ROLE_CONFIG[node.data?.role];
                return cfg ? cfg.miniMapColor : '#374151';
              }}
              maskColor="#0a0c1288"
              style={{ background: '#13151c', border: '1px solid #2d313a', borderRadius: 6 }}
            />

            <Panel position="top-right" style={{ marginTop: 8, marginRight: 8 }}>
              {scenarioMode && (
                <div style={{ background: '#1c0a02', border: '1px solid #f9731640', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={11} />
                  Cascade overlay active · {scenarioDetectedIds.length} detected
                </div>
              )}
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────
function StatBadge({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: color + '10', border: `1px solid ${color}30`, borderRadius: 5, padding: '4px 9px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 4 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color }}>{value}</span>
    </div>
  );
}
