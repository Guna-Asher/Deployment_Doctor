"""
Blueprint Validation Engine
Validates incidents.json at startup. Fails hard on any violation.
Includes DAG cycle detection for causes_incidents relationships.
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

from app.schemas import IncidentBlueprint, BlueprintPattern

logger = logging.getLogger(__name__)

BLUEPRINTS_PATH = Path(__file__).parent.parent.parent / "rules" / "incidents.json"

_cached_blueprints: Dict[str, IncidentBlueprint] = {}


def load_blueprints() -> Dict[str, IncidentBlueprint]:
    """Load and return blueprints from disk. Uses cache after first load."""
    if _cached_blueprints:
        return _cached_blueprints
    validate_blueprints()
    return _cached_blueprints


def validate_blueprints() -> Dict[str, IncidentBlueprint]:
    """
    Load incidents.json, validate every blueprint, detect DAG cycles.
    Raises ValueError with descriptive message on any violation.
    Caches validated blueprints for runtime use.
    """
    global _cached_blueprints

    if not BLUEPRINTS_PATH.exists():
        raise FileNotFoundError(f"Blueprint file not found: {BLUEPRINTS_PATH}")

    raw = json.loads(BLUEPRINTS_PATH.read_text())
    blueprints: Dict[str, IncidentBlueprint] = {}
    errors: List[str] = []

    for item in raw:
        try:
            bp = IncidentBlueprint(**item)
        except Exception as e:
            errors.append(f"Blueprint parse error: {e}")
            continue

        bp_id = bp.id

        # Rule: unique IDs
        if bp_id in blueprints:
            errors.append(f"Duplicate blueprint ID: {bp_id}")
            continue

        # Rule: minimum 3 patterns
        if len(bp.patterns) < 3:
            errors.append(f"{bp_id}: requires >= 3 patterns, has {len(bp.patterns)}")

        # Rule: minimum 3 causes
        if len(bp.possible_causes) < 3:
            errors.append(f"{bp_id}: requires >= 3 possible_causes, has {len(bp.possible_causes)}")

        # Rule: minimum 3 fixes
        if len(bp.recommended_fixes) < 3:
            errors.append(f"{bp_id}: requires >= 3 recommended_fixes, has {len(bp.recommended_fixes)}")

        # Rule: minimum 3 verification commands
        if len(bp.verification_steps) < 3:
            errors.append(f"{bp_id}: requires >= 3 verification_steps, has {len(bp.verification_steps)}")

        # Rule: pattern weights > 0
        for pat in bp.patterns:
            if pat.weight <= 0:
                errors.append(f"{bp_id}: pattern '{pat.match}' has weight <= 0")

        # Rule: no duplicate patterns within a blueprint (case-insensitive)
        seen_patterns = set()
        for pat in bp.patterns:
            key = pat.match.lower()
            if key in seen_patterns:
                errors.append(f"{bp_id}: duplicate pattern '{pat.match}'")
            seen_patterns.add(key)

        blueprints[bp_id] = bp

    # Rule: relationship targets must exist
    for bp_id, bp in blueprints.items():
        for target in bp.causes_incidents:
            if target not in blueprints:
                errors.append(f"{bp_id}: causes_incidents target '{target}' does not exist")

    # Rule: DAG validation — detect cycles using DFS
    cycle_path = _detect_dag_cycle(blueprints)
    if cycle_path:
        errors.append(f"Circular dependency detected in causes_incidents: {' -> '.join(cycle_path)}")

    if errors:
        error_msg = f"Blueprint validation FAILED with {len(errors)} error(s):\n" + "\n".join(
            f"  [{i+1}] {e}" for i, e in enumerate(errors)
        )
        raise ValueError(error_msg)

    _cached_blueprints = blueprints
    logger.info(f"Blueprint validation PASSED: {len(blueprints)} blueprints loaded")
    return blueprints


def _detect_dag_cycle(blueprints: Dict[str, IncidentBlueprint]) -> List[str]:
    """DFS-based cycle detection. Returns cycle path if found, else empty list."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {bp_id: WHITE for bp_id in blueprints}
    parent = {}

    def dfs(node: str) -> List[str]:
        color[node] = GRAY
        for neighbor in blueprints[node].causes_incidents:
            if neighbor not in color:
                continue  # external ref (already caught by reference validation)
            if color[neighbor] == GRAY:
                # Reconstruct cycle path
                path = [neighbor, node]
                cur = node
                while cur in parent and parent[cur] != neighbor:
                    cur = parent[cur]
                    path.append(cur)
                path.reverse()
                path.append(neighbor)
                return path
            if color[neighbor] == WHITE:
                parent[neighbor] = node
                result = dfs(neighbor)
                if result:
                    return result
        color[node] = BLACK
        return []

    for bp_id in blueprints:
        if color[bp_id] == WHITE:
            result = dfs(bp_id)
            if result:
                return result

    return []


def get_blueprint_count() -> int:
    return len(_cached_blueprints)


def get_total_rules_count() -> int:
    return sum(len(bp.patterns) for bp in _cached_blueprints.values())
