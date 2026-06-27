import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, AlertCircle, Loader, Activity,
  Shield, Zap, Eye, CheckCircle2, GitBranch,
  BookOpen, FlaskConical, TestTube, ArrowRight, Network,
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const MAX_SIZE_MB = 5;
const MAX_LINES = 50000;

const ENGINE_METRICS = [
  { key: 'blueprints', target: 38, label: 'Incident Blueprints', icon: BookOpen, color: '#06b6d4', borderColor: '#06b6d430', bg: '#06b6d408' },
  { key: 'rules', target: 445, label: 'Detection Rules', icon: Zap, color: '#f97316', borderColor: '#f9731630', bg: '#f9731608' },
  { key: 'edges', target: 53, label: 'Relationship Edges', icon: GitBranch, color: '#8b5cf6', borderColor: '#8b5cf630', bg: '#8b5cf608' },
  { key: 'scenarios', target: 50, label: 'Failure Scenarios', icon: FlaskConical, color: '#10b981', borderColor: '#10b98130', bg: '#10b98108' },
  { key: 'tests', target: 70, label: 'Automated Tests', icon: TestTube, color: '#eab308', borderColor: '#eab30830', bg: '#eab30808' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload Log File',
    desc: 'Drop any .log or .txt deployment log. Up to 5 MB, 50k lines.',
    color: '#06b6d4',
  },
  {
    step: '02',
    icon: Zap,
    title: 'Rule Engine Runs',
    desc: '445 deterministic rules scan every line. Each match yields a weighted confidence score.',
    color: '#f97316',
  },
  {
    step: '03',
    icon: Network,
    title: 'Cascade Traced',
    desc: 'The DAG engine walks 53 relationship edges to separate root causes from downstream symptoms.',
    color: '#8b5cf6',
  },
];

const VALUE_PROPS = [
  {
    icon: Eye,
    color: '#06b6d4',
    title: 'Explainable',
    desc: 'Every verdict traces to exact log lines. No opaque confidence scores without evidence.',
  },
  {
    icon: BookOpen,
    color: '#8b5cf6',
    title: 'Auditable',
    desc: 'Full scoring audit trail — see exactly which rules fired, their weights, and why the primary was chosen.',
  },
  {
    icon: CheckCircle2,
    color: '#10b981',
    title: 'Reproducible',
    desc: 'Same log in = same root cause out. Always. No drift, no randomness, no model updates to worry about.',
  },
  {
    icon: Shield,
    color: '#f97316',
    title: 'No Hallucinations',
    desc: 'Rules-based pattern matching only. Zero LLM. Nothing is fabricated or inferred beyond what the log says.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [counters, setCounters] = useState({ blueprints: 0, rules: 0, edges: 0, scenarios: 0, tests: 0 });

  // Animated counters on mount
  useEffect(() => {
    const targets = { blueprints: 38, rules: 445, edges: 53, scenarios: 50, tests: 70 };
    const DURATION = 1200;
    const FPS = 30;
    const steps = DURATION / (1000 / FPS);
    let step = 0;
    const id = setInterval(() => {
      step++;
      const p = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounters({
        blueprints: Math.round(targets.blueprints * ease),
        rules: Math.round(targets.rules * ease),
        edges: Math.round(targets.edges * ease),
        scenarios: Math.round(targets.scenarios * ease),
        tests: Math.round(targets.tests * ease),
      });
      if (p >= 1) clearInterval(id);
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, []);

  const handleFile = useCallback((f) => {
    setError(null);
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_SIZE_MB} MB limit (got ${(f.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('filename', file.name);
      const { data } = await axios.post(`${API}/api/analyze`, form);
      navigate(`/report/${data.analysis_id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail?.errors)) {
        setError(detail.errors.join('\n'));
      } else {
        setError(detail?.toString() || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#0f1117]" data-testid="home-page">

      {/* ── Hero ── */}
      <div className="px-6 pt-10 pb-8 border-b border-[#1e2028]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[#2d313a] bg-[#1a1c23]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono-code uppercase tracking-widest">Engine Active · Rules-Based · Deterministic</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 leading-tight mb-3">
            Deterministic<br />
            <span className="text-cyan-400">Root Cause Analysis</span>
          </h1>
          <p className="text-base text-slate-400 max-w-xl leading-relaxed">
            Upload a deployment log. Get a traceable, evidence-backed root cause in seconds —
            with full audit trail, no AI guessing, and 100% reproducible results.
          </p>
        </div>
      </div>

      {/* ── Engine Metrics ── */}
      <div className="border-b border-[#1e2028] bg-[#0d0f16]">
        <div className="px-6 py-5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono-code mb-4">Engine Knowledge Base</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ENGINE_METRICS.map(({ key, label, icon: Icon, color, borderColor, bg }) => (
              <div
                key={key}
                style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 6 }}
                className="p-4"
                data-testid={`metric-card-${key}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color }} />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <div style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {counters[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upload Zone ── */}
      <div className="px-6 py-8 max-w-3xl border-b border-[#1e2028]">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono-code mb-4">Analyze a Log File</div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all
            ${dragging ? 'border-cyan-500 bg-cyan-500/5'
              : file ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-[#2d313a] hover:border-cyan-500/40 hover:bg-[#13151c]'}`}
          data-testid="upload-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
            data-testid="file-input"
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <FileText size={22} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-400 font-mono-code" data-testid="selected-filename">{file.name}</div>
                <div className="text-xs text-slate-500 mt-1 font-mono-code">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <div className="text-xs text-slate-500">Click to change file</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-[#0f1117] border border-[#2d313a]">
                <Upload size={22} className="text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-300">
                  Drop your log file here or <span className="text-cyan-400">click to browse</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono-code">
                  .log · .txt · max {MAX_SIZE_MB} MB · max {MAX_LINES.toLocaleString()} lines
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 mt-3 rounded bg-red-500/10 border border-red-500/20" data-testid="upload-error">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <pre className="text-xs text-red-300 font-mono-code whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`mt-4 w-full py-3 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all
            ${file && !loading ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer' : 'bg-[#1e2028] text-slate-600 cursor-not-allowed'}`}
          data-testid="analyze-btn"
        >
          {loading ? (
            <><Loader size={13} className="animate-spin" />Running Detection Engine...</>
          ) : (
            <><Activity size={13} />Run Incident Analysis</>
          )}
        </button>
      </div>

      {/* ── How It Works ── */}
      <div className="px-6 py-8 border-b border-[#1e2028]">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono-code mb-5">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }, i) => (
            <div key={step} className="relative">
              <div className="panel p-5" style={{ borderColor: color + '25' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div style={{ background: color + '15', border: `1px solid ${color}30`, borderRadius: 6 }} className="p-1.5">
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-600">{step}</span>
                </div>
                <div className="text-sm font-semibold text-slate-100 mb-1.5">{title}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
              </div>
              {i < 2 && (
                <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight size={14} className="text-slate-700" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Value Props ── */}
      <div className="px-6 py-8">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono-code mb-5">Why Deterministic</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
          {VALUE_PROPS.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="panel p-5" style={{ borderColor: color + '20' }}>
              <div style={{ background: color + '12', border: `1px solid ${color}25`, borderRadius: 6 }} className="inline-flex p-2 mb-3">
                <Icon size={15} style={{ color }} />
              </div>
              <div className="text-sm font-semibold text-slate-100 mb-1.5">{title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
