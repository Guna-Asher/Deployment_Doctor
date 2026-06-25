import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, HelpCircle, List } from 'lucide-react';
import axios from 'axios';

import IncidentSummary from '../components/dd/IncidentSummary';
import DetectionStatus from '../components/dd/DetectionStatus';
import ConfidenceBreakdown from '../components/dd/ConfidenceBreakdown';
import EvidenceViewer from '../components/dd/EvidenceViewer';
import IncidentGraph from '../components/dd/IncidentGraph';
import VerificationCommands from '../components/dd/VerificationCommands';
import RecommendedFixes from '../components/dd/RecommendedFixes';
import AuditTrailViewer from '../components/dd/AuditTrailViewer';
import AISummary from '../components/dd/AISummary';
import EngineMetadata from '../components/dd/EngineMetadata';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ReportPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!analysisId) return;
    const stored = sessionStorage.getItem(`report_${analysisId}`);
    if (stored) {
      try { setResult(JSON.parse(stored)); setLoading(false); return; } catch {}
    }
    axios.get(`${API}/api/results/${analysisId}`)
      .then(r => setResult(r.data))
      .catch(() => setError('Report not found.'))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64" data-testid="report-loading">
      <Loader size={20} className="animate-spin text-cyan-400" />
    </div>
  );

  if (error) return (
    <div className="p-6 flex items-center gap-2 text-red-400" data-testid="report-error">
      <AlertCircle size={16} /> {error}
    </div>
  );

  if (!result) return null;

  const primary = result.primary_incident;
  const detectedIds = [
    ...(primary ? [primary.blueprint_id] : []),
    ...result.contributing_incidents.map(c => c.blueprint_id),
  ];

  return (
    <div className="min-h-full" data-testid="report-page">
      {/* Header */}
      <div className="border-b border-[#2d313a] bg-[#1a1c23] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-100 transition-colors"
          data-testid="back-to-upload-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-100 truncate">
            {result.filename}
          </h1>
          <div className="text-xs text-slate-500 font-mono-code mt-0.5">
            {result.analysis_id}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        {/* Section 1: Primary Incident */}
        {primary ? (
          <IncidentSummary incident={primary} isPrimary />
        ) : (
          <div className="panel p-6 flex items-center gap-3" data-testid="no-incident-detected">
            <HelpCircle size={20} className="text-slate-500" />
            <div>
              <div className="text-sm font-semibold text-slate-200">No Incident Detected</div>
              <div className="text-xs text-slate-400 mt-0.5">
                No pattern exceeded the minimum confidence threshold.
              </div>
            </div>
          </div>
        )}

        {/* Section 2–3: Status & Confidence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <SectionLabel>Detection Status</SectionLabel>
            <DetectionStatus status={result.detection_status} />
          </div>
          {primary && (
            <div className="space-y-3">
              <SectionLabel>Why This Root Cause Was Selected</SectionLabel>
              <div className="panel p-3 text-xs text-slate-300 leading-relaxed" data-testid="why-selected">
                <span className="font-semibold text-slate-100">{primary.blueprint_id}</span> ranked first because it had the
                highest incident score ({primary.incident_score.toFixed(1)})
                {primary.relationship_bonus > 0 && `, including a +${primary.relationship_bonus} relationship bonus`}
                {primary.evidence_bonus > 0 && ` and +${primary.evidence_bonus} evidence bonus`}
                {primary.symptom_penalty > 0 ? '' : ''}
                . {result.contributing_incidents.length > 0
                  ? `${result.contributing_incidents.length} contributing incident(s) were identified.`
                  : 'No other incidents exceeded the detection threshold.'
                }
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Confidence Breakdown */}
        {primary && <ConfidenceBreakdown incident={primary} />}

        {/* Section 5: Contributing Incidents */}
        {result.contributing_incidents.length > 0 && (
          <div className="space-y-3">
            <SectionLabel>Contributing Incidents ({result.contributing_incidents.length})</SectionLabel>
            {result.contributing_incidents.map(inc => (
              <IncidentSummary key={inc.blueprint_id} incident={inc} isPrimary={false} />
            ))}
          </div>
        )}

        {/* Section 6: Evidence Attribution */}
        {primary && <EvidenceViewer evidence={primary.evidence} blueprintId={primary.blueprint_id} />}

        {/* Section 7: Incident Relationship Graph */}
        <IncidentGraph
          relationshipGraph={result.relationship_graph}
          detectedIds={detectedIds}
        />

        {/* Section 8: Possible Causes */}
        {primary && (
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <List size={14} className="text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Possible Causes</span>
              </div>
            </div>
            <ul className="p-4 space-y-2" data-testid="possible-causes-list">
              {primary.possible_causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300" data-testid={`cause-${i}`}>
                  <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-cyan-500/50 mt-1.5" />
                  {cause}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections 9–10: Commands & Fixes */}
        {primary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <VerificationCommands commands={primary.verification_steps} />
            <RecommendedFixes fixes={primary.recommended_fixes} />
          </div>
        )}

        {/* Section 11: Engine Metadata */}
        <EngineMetadata
          metadata={result.engine_metadata}
          logStats={{ lines: result.log_lines_analyzed, bytes: result.log_size_bytes }}
        />

        {/* Section 12: Audit Trail */}
        <AuditTrailViewer auditTrail={result.audit_trail} />

        {/* Section 13: AI Summary (collapsed by default) */}
        <AISummary summary={result.ai_summary} isAvailable={result.ai_summary_available} />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider" data-testid="section-label">
      {children}
    </div>
  );
}
