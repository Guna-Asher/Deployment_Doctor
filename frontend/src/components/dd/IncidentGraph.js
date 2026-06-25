import React from 'react';
import { GitBranch, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: 'border-red-500/40 bg-red-500/5 text-red-300',
  ERROR: 'border-orange-500/40 bg-orange-500/5 text-orange-300',
  WARNING: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-300',
  INFO: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-300',
};

export default function IncidentGraph({ relationshipGraph, detectedIds = [] }) {
  if (!relationshipGraph || !relationshipGraph.edges || relationshipGraph.edges.length === 0) {
    return (
      <div className="panel" data-testid="incident-graph">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">Incident Relationship Graph</span>
          </div>
        </div>
        <div className="p-6 text-center text-slate-600 text-sm">
          No incident relationships applicable for this analysis.
        </div>
      </div>
    );
  }

  const { nodes, edges, bonuses_applied } = relationshipGraph;
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  return (
    <div className="panel" data-testid="incident-graph">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Incident Relationship Graph</span>
          {bonuses_applied.length > 0 && (
            <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded font-mono-code">
              {bonuses_applied.length} bonus(es) applied
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2" data-testid="incident-graph-content">
        {edges.map((edge, i) => {
          const sourceNode = nodeMap[edge.source];
          const targetNode = nodeMap[edge.target];
          if (!sourceNode || !targetNode) return null;

          return (
            <div
              key={i}
              className="flex items-center gap-3 flex-wrap"
              data-testid={`graph-edge-${i}`}
            >
              <GraphNode
                node={sourceNode}
                isDetected={detectedIds.includes(sourceNode.id)}
              />
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight
                  size={14}
                  className={edge.bonus_applied ? 'text-violet-400' : 'text-slate-600'}
                />
                <span className={`text-[9px] font-mono-code whitespace-nowrap
                  ${edge.bonus_applied ? 'text-violet-400' : 'text-slate-600'}`}
                >
                  {edge.bonus_applied
                    ? `causes (+20)`
                    : edge.proximity_validated === false && detectedIds.includes(edge.source) && detectedIds.includes(edge.target)
                    ? 'causes (>200 lines)'
                    : 'causes'}
                </span>
              </div>
              <GraphNode
                node={targetNode}
                isDetected={detectedIds.includes(targetNode.id)}
              />
            </div>
          );
        })}

        {bonuses_applied.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#2d313a]">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Bonuses Applied</div>
            {bonuses_applied.map((bonus, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-violet-300 font-mono-code">
                <CheckCircle2 size={10} className="text-violet-400" />
                {bonus}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GraphNode({ node, isDetected }) {
  const colorClass = SEVERITY_COLORS[node.severity] || SEVERITY_COLORS.INFO;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono-code
        ${isDetected ? colorClass : 'border-[#2d313a] bg-[#1a1c23] text-slate-500 opacity-50'}`}
      data-testid={`graph-node-${node.id}`}
    >
      {isDetected
        ? <CheckCircle2 size={10} className="shrink-0" />
        : <Circle size={10} className="shrink-0" />
      }
      <div>
        <div className="font-semibold text-[10px] uppercase tracking-wider">{node.id}</div>
        <div className="text-[9px] opacity-70 font-sans normal-case">{node.severity}</div>
      </div>
      {node.is_primary && (
        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded">PRIMARY</span>
      )}
    </div>
  );
}
