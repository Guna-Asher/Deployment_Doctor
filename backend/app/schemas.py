from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

SEVERITY_ORDER = {"CRITICAL": 4, "ERROR": 3, "WARNING": 2, "INFO": 1}
MIN_SCORE = 50
AMBIGUITY_THRESHOLD = 10
RELATIONSHIP_BONUS = 20
EVIDENCE_BONUS = 10
SYMPTOM_PENALTY = 20
PROXIMITY_WINDOW = 200


class BlueprintPattern(BaseModel):
    match: str
    weight: int


class IncidentBlueprint(BaseModel):
    id: str
    title: str
    category: str
    severity: str
    incident_role: str
    priority: int
    patterns: List[BlueprintPattern]
    possible_causes: List[str]
    verification_steps: List[str]
    recommended_fixes: List[str]
    causes_incidents: List[str] = []


class AnalysisRequest(BaseModel):
    log_content: str
    filename: str = "uploaded.log"


class PatternMatch(BaseModel):
    pattern: str
    weight: int
    occurrences: int  # frequency — display only, NOT used in scoring


class EvidenceRecord(BaseModel):
    line_number: int
    line_text: str
    matched_pattern: str
    matched_blueprint_id: str
    weight: int


class AuditTrailEntry(BaseModel):
    stage: str
    description: str
    score_change: float


class RelationshipNode(BaseModel):
    id: str
    title: str
    severity: str
    is_primary: bool
    is_detected: bool


class RelationshipEdge(BaseModel):
    source: str
    target: str
    relationship_type: str
    bonus_applied: bool
    proximity_validated: bool


class RelationshipResult(BaseModel):
    nodes: List[RelationshipNode]
    edges: List[RelationshipEdge]
    bonuses_applied: List[str]


class EngineMetadata(BaseModel):
    engine_version: str
    blueprint_version: str
    blueprints_loaded: int
    rules_loaded: int
    analysis_duration_ms: float
    timestamp: str


class IncidentResult(BaseModel):
    blueprint_id: str
    title: str
    category: str
    severity: str
    incident_role: str
    priority: int
    pattern_score: float
    evidence_bonus: float
    relationship_bonus: float
    symptom_penalty: float
    incident_score: float
    confidence: float
    matched_patterns: List[PatternMatch]
    evidence: List[EvidenceRecord]
    possible_causes: List[str]
    verification_steps: List[str]
    recommended_fixes: List[str]
    causes_incidents: List[str]


class EngineResult(BaseModel):
    analysis_id: str
    filename: str
    primary_incident: Optional[IncidentResult] = None
    contributing_incidents: List[IncidentResult] = []
    detection_status: str
    confidence: float
    audit_trail: List[AuditTrailEntry]
    engine_metadata: EngineMetadata
    relationship_graph: RelationshipResult
    ai_summary: Optional[str] = None
    ai_summary_available: bool = False
    log_lines_analyzed: int
    log_size_bytes: int


class StoredAnalysisSummary(BaseModel):
    analysis_id: str
    filename: str
    created_at: str
    detection_status: str
    primary_incident_id: Optional[str] = None
    confidence: float
    log_lines_count: int


class SampleScenario(BaseModel):
    id: str
    title: str
    description: str
    filename: str
    expected_incident: str
    severity: str
    expected_status: str
    category: str
