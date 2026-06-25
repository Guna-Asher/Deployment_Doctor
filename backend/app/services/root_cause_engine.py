"""
Root Cause Engine — Main Orchestrator
Stateless. Coordinates all engine stages and produces the final EngineResult.

Pipeline:
  1. Pattern Matching
  2. Relationship Analysis
  3. Scoring (with bonuses applied)
  4. Filtering (MIN_SCORE)
  5. Deterministic Ranking
  6. Detection Status
  7. Result Assembly
"""
import time
import uuid
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.schemas import (
    AnalysisRequest,
    IncidentBlueprint,
    IncidentResult,
    EngineResult,
    AuditTrailEntry,
    RelationshipResult,
    EngineMetadata,
    MIN_SCORE,
    AMBIGUITY_THRESHOLD,
    SEVERITY_ORDER,
)
from app.services.pattern_matcher import match_blueprints
from app.services.relationship_engine import analyze_relationships
from app.services.scoring_engine import score_incident
from app.services.blueprint_validator import (
    load_blueprints,
    get_blueprint_count,
    get_total_rules_count,
)

logger = logging.getLogger(__name__)


def run_analysis(request: AnalysisRequest) -> EngineResult:
    """
    Execute the full detection pipeline for a log file.
    Deterministic: same input always produces same output.
    """
    start_time = time.monotonic()
    analysis_id = str(uuid.uuid4())
    audit_trail: List[AuditTrailEntry] = []

    blueprints: Dict[str, IncidentBlueprint] = load_blueprints()
    log_content = request.log_content
    log_lines = log_content.splitlines()
    log_size = len(log_content.encode("utf-8"))

    audit_trail.append(AuditTrailEntry(
        stage="ENGINE_START",
        description=(
            f"Analysis started. File: {request.filename}. "
            f"Lines: {len(log_lines):,}. "
            f"Size: {log_size / 1024:.1f} KB. "
            f"Blueprints loaded: {len(blueprints)}."
        ),
        score_change=0.0,
    ))

    # Stage 1: Pattern Matching
    audit_trail.append(AuditTrailEntry(
        stage="PATTERN_MATCHING",
        description=f"Scanning {len(log_lines):,} log lines against {get_total_rules_count()} rules across {len(blueprints)} blueprints.",
        score_change=0.0,
    ))
    blueprint_matches = match_blueprints(log_content, blueprints)
    audit_trail.append(AuditTrailEntry(
        stage="PATTERN_MATCHING_COMPLETE",
        description=(
            f"Pattern matching complete. "
            f"{len(blueprint_matches)} blueprint(s) with matches: "
            f"[{', '.join(blueprint_matches.keys())}]"
        ),
        score_change=0.0,
    ))

    # Stage 2: Relationship Analysis
    audit_trail.append(AuditTrailEntry(
        stage="RELATIONSHIP_ANALYSIS",
        description="Analyzing cause-effect relationships with proximity validation.",
        score_change=0.0,
    ))
    relationship_bonuses, relationship_result = analyze_relationships(
        blueprint_matches, blueprints, audit_trail
    )

    # Stage 3: Scoring
    audit_trail.append(AuditTrailEntry(
        stage="SCORING",
        description="Calculating incident scores with bonuses and penalties.",
        score_change=0.0,
    ))
    scored_incidents: List[IncidentResult] = []

    for bp_id, (matched_patterns, evidence) in blueprint_matches.items():
        blueprint = blueprints[bp_id]
        rel_bonus = relationship_bonuses.get(bp_id, 0.0)
        incident = score_incident(
            blueprint=blueprint,
            matched_patterns=matched_patterns,
            evidence=evidence,
            relationship_bonus=rel_bonus,
            audit_trail=audit_trail,
        )
        scored_incidents.append(incident)

    # Stage 4: Filter by MIN_SCORE
    above_threshold = [i for i in scored_incidents if i.incident_score >= MIN_SCORE]
    below_threshold = [i for i in scored_incidents if i.incident_score < MIN_SCORE]

    for inc in below_threshold:
        audit_trail.append(AuditTrailEntry(
            stage="THRESHOLD_FILTER",
            description=(
                f"{inc.blueprint_id}: score {inc.incident_score:.1f} < MIN_SCORE {MIN_SCORE} → excluded"
            ),
            score_change=0.0,
        ))

    # Stage 5: Deterministic Ranking
    ranked = _rank_incidents(above_threshold, audit_trail)

    # Stage 6: Detection Status
    primary: Optional[IncidentResult] = None
    contributing: List[IncidentResult] = []
    detection_status = "INSUFFICIENT_EVIDENCE"
    final_confidence = 0.0

    if ranked:
        detection_status, primary, contributing = _determine_status(ranked, audit_trail)
        final_confidence = primary.confidence if primary else 0.0

    # Mark primary node in relationship graph
    if primary:
        for node in relationship_result.nodes:
            if node.id == primary.blueprint_id:
                node.is_primary = True

    # Engine metadata
    duration_ms = (time.monotonic() - start_time) * 1000
    metadata = EngineMetadata(
        engine_version=os.environ.get("ENGINE_VERSION", "1.6.0"),
        blueprint_version=os.environ.get("BLUEPRINT_VERSION", "1.0.0"),
        blueprints_loaded=get_blueprint_count(),
        rules_loaded=get_total_rules_count(),
        analysis_duration_ms=round(duration_ms, 2),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    audit_trail.append(AuditTrailEntry(
        stage="ENGINE_COMPLETE",
        description=(
            f"Analysis complete in {duration_ms:.1f}ms. "
            f"Status: {detection_status}. "
            f"Primary: {primary.blueprint_id if primary else 'None'}. "
            f"Contributing: {len(contributing)}."
        ),
        score_change=0.0,
    ))

    return EngineResult(
        analysis_id=analysis_id,
        filename=request.filename,
        primary_incident=primary,
        contributing_incidents=contributing,
        detection_status=detection_status,
        confidence=final_confidence,
        audit_trail=audit_trail,
        engine_metadata=metadata,
        relationship_graph=relationship_result,
        log_lines_analyzed=len(log_lines),
        log_size_bytes=log_size,
    )


def _rank_incidents(
    incidents: List[IncidentResult],
    audit_trail: List[AuditTrailEntry],
) -> List[IncidentResult]:
    """
    Deterministic ranking by:
    1. incident_score (descending)
    2. severity (CRITICAL > ERROR > WARNING > INFO)
    3. priority (ascending — lower number = higher priority)
    4. blueprint_id (alphabetical — tiebreaker)
    """
    def sort_key(inc: IncidentResult):
        return (
            -inc.incident_score,
            -SEVERITY_ORDER.get(inc.severity, 0),
            inc.priority,
            inc.blueprint_id,
        )

    ranked = sorted(incidents, key=sort_key)

    audit_trail.append(AuditTrailEntry(
        stage="RANKING",
        description=(
            f"Ranked {len(ranked)} incident(s) deterministically. "
            f"Order: [{', '.join(f'{i.blueprint_id}({i.incident_score:.1f})' for i in ranked)}]"
        ),
        score_change=0.0,
    ))

    return ranked


def _determine_status(
    ranked: List[IncidentResult],
    audit_trail: List[AuditTrailEntry],
) -> Tuple[str, Optional[IncidentResult], List[IncidentResult]]:
    """
    CONFIDENT: top score is >= MIN_SCORE AND gap to second >= AMBIGUITY_THRESHOLD
    AMBIGUOUS: top score is >= MIN_SCORE AND gap to second < AMBIGUITY_THRESHOLD
    INSUFFICIENT_EVIDENCE: no incident >= MIN_SCORE (handled before call)
    """
    from app.schemas import AMBIGUITY_THRESHOLD

    primary = ranked[0]
    contributing = ranked[1:]

    if len(ranked) >= 2:
        gap = abs(ranked[0].incident_score - ranked[1].incident_score)
        if gap < AMBIGUITY_THRESHOLD:
            status = "AMBIGUOUS"
            audit_trail.append(AuditTrailEntry(
                stage="AMBIGUITY_DETECTED",
                description=(
                    f"Top two incidents have score gap of {gap:.1f} < {AMBIGUITY_THRESHOLD}. "
                    f"Status: AMBIGUOUS. "
                    f"[{ranked[0].blueprint_id}={ranked[0].incident_score:.1f}, "
                    f"{ranked[1].blueprint_id}={ranked[1].incident_score:.1f}]"
                ),
                score_change=0.0,
            ))
        else:
            status = "CONFIDENT"
            audit_trail.append(AuditTrailEntry(
                stage="STATUS_CONFIDENT",
                description=(
                    f"Score gap {gap:.1f} >= {AMBIGUITY_THRESHOLD}. "
                    f"Primary: {primary.blueprint_id} ({primary.incident_score:.1f}). "
                    f"Status: CONFIDENT."
                ),
                score_change=0.0,
            ))
    else:
        status = "CONFIDENT"
        audit_trail.append(AuditTrailEntry(
            stage="STATUS_CONFIDENT",
            description=(
                f"Single incident above threshold: {primary.blueprint_id} "
                f"({primary.incident_score:.1f}). Status: CONFIDENT."
            ),
            score_change=0.0,
        ))

    return status, primary, contributing
