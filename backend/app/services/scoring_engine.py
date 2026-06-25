"""
Confidence Scoring Engine
Stateless. Calculates incident_score and confidence for each detected blueprint.

Formulas:
  pattern_score  = sum of unique matched pattern weights
  evidence_bonus = +10 if matched_patterns >= 3
  relationship_bonus = +20 per validated cause-effect pair (applied externally)
  symptom_penalty = -20 if incident_role == "symptom"

  incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
  confidence     = min(incident_score, 100)

Incident score may exceed 100. Confidence is display-only, capped at 100.
"""
from typing import List, Tuple
from app.schemas import (
    IncidentBlueprint,
    PatternMatch,
    EvidenceRecord,
    IncidentResult,
    AuditTrailEntry,
    EVIDENCE_BONUS,
    SYMPTOM_PENALTY,
    MIN_SCORE,
)


def score_incident(
    blueprint: IncidentBlueprint,
    matched_patterns: List[PatternMatch],
    evidence: List[EvidenceRecord],
    relationship_bonus: float,
    audit_trail: List[AuditTrailEntry],
) -> IncidentResult:
    """
    Compute all scoring components and build an IncidentResult.
    Returns None if incident_score < MIN_SCORE.
    """
    # Pattern score — each unique pattern contributes weight exactly once
    pattern_score = float(sum(p.weight for p in matched_patterns))
    audit_trail.append(AuditTrailEntry(
        stage="PATTERN_SCORE",
        description=(
            f"{blueprint.id}: {len(matched_patterns)} unique pattern(s) matched. "
            f"Weights: [{', '.join(str(p.weight) for p in matched_patterns)}]"
        ),
        score_change=pattern_score,
    ))

    # Evidence bonus: +10 if >= 3 distinct patterns matched
    evidence_bonus = float(EVIDENCE_BONUS) if len(matched_patterns) >= 3 else 0.0
    if evidence_bonus > 0:
        audit_trail.append(AuditTrailEntry(
            stage="EVIDENCE_BONUS",
            description=f"{blueprint.id}: >= 3 patterns matched → +{EVIDENCE_BONUS} evidence bonus",
            score_change=evidence_bonus,
        ))

    # Relationship bonus is pre-computed by the Relationship Engine
    if relationship_bonus > 0:
        audit_trail.append(AuditTrailEntry(
            stage="RELATIONSHIP_BONUS",
            description=(
                f"{blueprint.id}: cause-effect relationship validated with proximity check → "
                f"+{relationship_bonus}"
            ),
            score_change=relationship_bonus,
        ))

    # Symptom penalty: -20 if incident_role == "symptom"
    symptom_penalty = float(SYMPTOM_PENALTY) if blueprint.incident_role == "symptom" else 0.0
    if symptom_penalty > 0:
        audit_trail.append(AuditTrailEntry(
            stage="SYMPTOM_PENALTY",
            description=(
                f"{blueprint.id}: incident_role=symptom → -{SYMPTOM_PENALTY} symptom penalty"
            ),
            score_change=-symptom_penalty,
        ))

    incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
    confidence = min(incident_score, 100.0)

    return IncidentResult(
        blueprint_id=blueprint.id,
        title=blueprint.title,
        category=blueprint.category,
        severity=blueprint.severity,
        incident_role=blueprint.incident_role,
        priority=blueprint.priority,
        pattern_score=pattern_score,
        evidence_bonus=evidence_bonus,
        relationship_bonus=relationship_bonus,
        symptom_penalty=symptom_penalty,
        incident_score=incident_score,
        confidence=confidence,
        matched_patterns=matched_patterns,
        evidence=evidence,
        possible_causes=blueprint.possible_causes,
        verification_steps=blueprint.verification_steps,
        recommended_fixes=blueprint.recommended_fixes,
        causes_incidents=blueprint.causes_incidents,
    )
