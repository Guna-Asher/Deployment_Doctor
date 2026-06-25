import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Search } from 'lucide-react';

function getSeverityClass(line) {
  const l = line.toLowerCase();
  if (l.includes(' fatal ') || l.includes('fatal:')) return 'text-red-400';
  if (l.includes(' error ') || l.includes('error:') || l.includes('[error]')) return 'text-red-300';
  if (l.includes(' warn ') || l.includes('warn:') || l.includes('[warn]')) return 'text-yellow-300';
  if (l.includes(' info ') || l.includes('[info]')) return 'text-slate-300';
  return 'text-slate-400';
}

export default function EvidenceViewer({ evidence = [], blueprintId }) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? evidence.filter(
        e =>
          e.matched_pattern.toLowerCase().includes(filter.toLowerCase()) ||
          e.line_text.toLowerCase().includes(filter.toLowerCase())
      )
    : evidence;

  return (
    <div className="panel" data-testid="evidence-viewer">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Evidence Attribution</span>
          <span className="text-[10px] font-mono-code bg-[#0f1117] border border-[#2d313a] text-slate-400 px-2 py-0.5 rounded">
            {evidence.length} records
          </span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-100 transition-colors"
          onClick={() => setExpanded(v => !v)}
          data-testid="evidence-toggle-btn"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="px-4 py-2 border-b border-[#2d313a]">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by pattern or log text..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2d313a] rounded px-8 py-1.5 text-xs text-slate-300 placeholder-slate-600
                  focus:outline-none focus:border-cyan-500 font-mono-code"
                data-testid="evidence-filter-input"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="evidence-table">
              <thead>
                <tr className="border-b border-[#2d313a]">
                  <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold w-14">Line</th>
                  <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Matched Pattern</th>
                  <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold w-14">Weight</th>
                  <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Log Line</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-600 text-xs">
                      No matching evidence
                    </td>
                  </tr>
                )}
                {filtered.map((ev, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1e2028] hover:bg-[#23252e] transition-colors"
                    data-testid={`evidence-row-${i}`}
                  >
                    <td className="px-4 py-1.5 font-mono-code text-slate-500 tabular-nums">{ev.line_number}</td>
                    <td className="px-4 py-1.5">
                      <span className="font-mono-code bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[11px]">
                        {ev.matched_pattern}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 font-mono-code text-emerald-400 tabular-nums">+{ev.weight}</td>
                    <td className="px-4 py-1.5 font-mono-code max-w-xs truncate">
                      <HighlightedLine text={ev.line_text} pattern={ev.matched_pattern} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function HighlightedLine({ text, pattern }) {
  const idx = text.toLowerCase().indexOf(pattern.toLowerCase());
  if (idx === -1) return <span className="text-slate-400">{text}</span>;

  return (
    <span className="text-slate-400">
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/25 text-yellow-200 rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + pattern.length)}
      </mark>
      {text.slice(idx + pattern.length)}
    </span>
  );
}
