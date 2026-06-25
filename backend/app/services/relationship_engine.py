"""
Relationship Analysis Engine
Stateless. Validates cause-effect incident relationships.

Rules:
  1. Blueprint A must declare B in its causes_incidents list.
  2. Both A and B must be detected in the same log (any score > 0).
  3. The nearest evidence lines for A and B must be within PROXIMITY_WINDOW lines.

If all three conditions hold → apply +RELATIONSHIP_BONUS to A's incident score.
"""
from typing import Dict, List, Tuple
from app.schemas import (
    IncidentBlueprint,
    PatternMatch,
    EvidenceRecord,
    RelationshipNode,
    RelationshipEdge,
    RelationshipResult,
    AuditTrailEntry,
    RELATIONSHIP_BONUS,
    PROXIMITY_WINDOW,
)


def analyze_relationships(
    blueprint_matches: Dict[str, Tuple[List[PatternMatch], List[EvidenceRecord]]],
    blueprints: Dict[str, IncidentBlueprint],
    audit_trail: List[AuditTrailEntry],
) -> Tuple[Dict[str, float], RelationshipResult]:
    """
    Determine relationship bonuses and build the relationship graph.
    Returns:
      - relationship_bonuses: dict of blueprint_id -> bonus amount
      - relationship_result: graph structure for UI rendering
    """
    bonuses: Dict[str, float] = {}
    bonuses_applied: List[str] = []
    edges: List[RelationshipEdge] = []
    detected_ids = set(blueprint_matches.keys())

    for bp_id, blueprint in blueprints.items():
        for caused_id in blueprint.causes_incidents:
            if caused_id not in blueprints:
                continue

            bonus_applied = False
            proximity_validated = False
            proximity_lines = None

            if bp_id in detected_ids and caused_id in detected_ids:
                # Both detected — check proximity
                source_lines = [e.line_number for e in blueprint_matches[bp_id][1]]
                target_lines = [e.line_number for e in blueprint_matches[caused_id][1]]

                if source_lines and target_lines:
                    # Find minimum distance between any evidence lines
                    min_dist = _min_line_distance(source_lines, target_lines)
                    proximity_lines = min_dist

                    if min_dist <= PROXIMITY_WINDOW:
                        proximity_validated = True
                        bonus_applied = True
                        bonuses[bp_id] = bonuses.get(bp_id, 0.0) + RELATIONSHIP_BONUS
                        bonuses_applied.append(
                            f"{bp_id} → {caused_id} (distance: {min_dist} lines)"
                        )
                        audit_trail.append(AuditTrailEntry(
                            stage="RELATIONSHIP_VALIDATION",
                            description=(
                                f"Validated: {bp_id} causes {caused_id}. "
                                f"Evidence proximity: {min_dist} lines (≤{PROXIMITY_WINDOW}). "
                                f"Applying +{RELATIONSHIP_BONUS} to {bp_id}."
                            ),
                            score_change=RELATIONSHIP_BONUS,
                        ))
                    else:
                        audit_trail.append(AuditTrailEntry(
                            stage="RELATIONSHIP_REJECTED",
                            description=(
                                f"Skipped: {bp_id} → {caused_id}. "
                                f"Evidence distance {min_dist} lines exceeds {PROXIMITY_WINDOW}-line window. "
                                f"No bonus applied."
                            ),
                            score_change=0.0,
                        ))
                else:
                    audit_trail.append(AuditTrailEntry(
                        stage="RELATIONSHIP_REJECTED",
                        description=(
                            f"Skipped: {bp_id} → {caused_id}. "
                            "One or both incidents have no evidence lines."
                        ),
                        score_change=0.0,
                    ))

            edges.append(RelationshipEdge(
                source=bp_id,
                target=caused_id,
                relationship_type="causes",
                bonus_applied=bonus_applied,
                proximity_validated=proximity_validated,
            ))

    # Build nodes for all blueprints that participate in any relationship
    node_ids = set()
    for e in edges:
        node_ids.add(e.source)
        node_ids.add(e.target)

    nodes = [
        RelationshipNode(
            id=bp_id,
            title=blueprints[bp_id].title if bp_id in blueprints else bp_id,
            severity=blueprints[bp_id].severity if bp_id in blueprints else "INFO",
            is_primary=False,  # set by root cause engine after ranking
            is_detected=bp_id in detected_ids,
        )
        for bp_id in node_ids
    ]

    return bonuses, RelationshipResult(
        nodes=nodes,
        edges=edges,
        bonuses_applied=bonuses_applied,
    )


def _min_line_distance(lines_a: List[int], lines_b: List[int]) -> int:
    """
    Efficiently compute the minimum distance between any pair (a, b)
    where a ∈ lines_a and b ∈ lines_b.
    O(n log n) via sorting.
    """
    sorted_a = sorted(lines_a)
    sorted_b = sorted(lines_b)

    min_dist = float("inf")
    i, j = 0, 0

    while i < len(sorted_a) and j < len(sorted_b):
        dist = abs(sorted_a[i] - sorted_b[j])
        if dist < min_dist:
            min_dist = dist
        if sorted_a[i] < sorted_b[j]:
            i += 1
        else:
            j += 1

    return int(min_dist)
