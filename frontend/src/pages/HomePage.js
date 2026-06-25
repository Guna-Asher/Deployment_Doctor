import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader, Activity, Shield, Zap, FlaskConical } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const MAX_SIZE_MB = 5;
const MAX_LINES = 50000;

export default function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="min-h-full flex flex-col" data-testid="home-page">
      {/* Header */}
      <div className="border-b border-[#2d313a] bg-[#1a1c23] px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-100">Analyze Log File</h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload a deployment log to detect incidents deterministically</p>
      </div>

      <div className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-cyan-500 bg-cyan-500/5'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-[#2d313a] hover:border-cyan-500/40 hover:bg-[#1a1c23]'
            }
          `}
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
                <FileText size={24} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-400" data-testid="selected-filename">{file.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono-code">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="text-xs text-slate-500">Click to change file</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-[#0f1117] border border-[#2d313a]">
                <Upload size={24} className="text-slate-500" />
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

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20" data-testid="upload-error">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <pre className="text-xs text-red-300 font-mono-code whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`
            w-full py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all
            ${file && !loading
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
              : 'bg-[#2d313a] text-slate-500 cursor-not-allowed'
            }
          `}
          data-testid="analyze-btn"
        >
          {loading ? (
            <>
              <Loader size={14} className="animate-spin" />
              Running Detection Engine...
            </>
          ) : (
            <>
              <Activity size={14} />
              Run Incident Analysis
            </>
          )}
        </button>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <FeatureCard
            icon={<Shield size={16} className="text-cyan-400" />}
            title="Deterministic"
            description="Same log always produces the same result. No AI guessing."
          />
          <FeatureCard
            icon={<Zap size={16} className="text-orange-400" />}
            title="Evidence-Backed"
            description="Every conclusion is traceable to specific log lines."
          />
          <FeatureCard
            icon={<FlaskConical size={16} className="text-violet-400" />}
            title="Explainable"
            description="Full audit trail with scoring breakdown and relationship graph."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-slate-200">{title}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
