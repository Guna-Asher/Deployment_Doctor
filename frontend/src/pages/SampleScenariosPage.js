import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SEVERITY_COLORS = {
  CRITICAL: 'badge-critical',
  ERROR: 'badge-error',
  WARNING: 'badge-warning',
  INFO: 'badge-info',
};

const CATEGORY_COLORS = {
  DATABASE: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  NETWORKING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  KUBERNETES: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  RESOURCES: 'text-red-400 bg-red-500/10 border-red-500/20',
  SECURITY: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  STORAGE: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  CONFIGURATION: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export default function SampleScenariosPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/samples`)
      .then(r => setScenarios(r.data))
      .catch(() => setError('Failed to load sample scenarios'))
      .finally(() => setLoading(false));
  }, []);

  const runScenario = async (scenario) => {
    setRunning(scenario.id);
    setError(null);
    try {
      const { data: content } = await axios.get(`${API}/api/samples/${scenario.filename}/content`);
      const form = new FormData();
      form.append('log_content', content.content);
      form.append('filename', scenario.filename);
      const { data } = await axios.post(`${API}/api/analyze`, form);
      sessionStorage.setItem(`report_${data.analysis_id}`, JSON.stringify(data));
      navigate(`/report/${data.analysis_id}`);
    } catch (err) {
      setError(`Failed to run "${scenario.title}": ${err.response?.data?.detail || err.message}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="min-h-full" data-testid="demo-center-page">
      {/* Header */}
      <div className="border-b border-[#2d313a] bg-[#1a1c23] px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={16} className="text-cyan-400" />
          <h1 className="text-xl font-semibold text-slate-100">Demo Center</h1>
        </div>
        <p className="text-sm text-slate-400">
          Click any scenario to instantly run the detection engine on a sample log file.
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded bg-red-500/10 border border-red-500/20" data-testid="demo-error">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader size={18} className="animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="scenarios-grid">
            {scenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isRunning={running === scenario.id}
                onRun={() => runScenario(scenario)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, isRunning, onRun }) {
  const severityClass = SEVERITY_COLORS[scenario.severity] || 'badge-info';
  const categoryColors = CATEGORY_COLORS[scenario.category] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <div
      className="panel flex flex-col hover:border-cyan-500/30 transition-colors"
      data-testid={`scenario-card-${scenario.id}`}
    >
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={severityClass} data-testid={`scenario-severity-${scenario.id}`}>
            {scenario.severity}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${categoryColors}`}>
            {scenario.category}
          </span>
        </div>
        <h3
          className="text-sm font-semibold text-slate-100 mb-1.5"
          data-testid={`scenario-title-${scenario.id}`}
        >
          {scenario.title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{scenario.description}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono-code">
          <span className="text-slate-600">Expected:</span>
          <span className="text-slate-400">{scenario.expected_incident}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono-code mt-0.5">
          <span className="text-slate-600">File:</span>
          <span className="text-slate-400">{scenario.filename}</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`
            w-full py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
            ${isRunning
              ? 'bg-[#2d313a] text-slate-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
            }
          `}
          data-testid={`run-scenario-btn-${scenario.id}`}
        >
          {isRunning ? (
            <><Loader size={11} className="animate-spin" /> Running...</>
          ) : (
            <><Play size={11} /> Run Demo</>
          )}
        </button>
      </div>
    </div>
  );
}
