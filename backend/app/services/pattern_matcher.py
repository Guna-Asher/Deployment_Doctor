"""
Pattern Matching Engine
Stateless. Case-insensitive substring matching.
Collects ALL matches — never stops after first hit.
Deduplicates: each unique pattern contributes score only once per blueprint.
"""
from typing import Dict, List, Tuple
from app.schemas import IncidentBlueprint, PatternMatch, EvidenceRecord

MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_LOG_LINES = 50_000


def validate_log(log_content: str, filename: str) -> Tuple[bool, List[str], int, int]:
    """
    Validate log size and line count before analysis.
    Returns (is_valid, errors, line_count, size_bytes)
    """
    errors = []
    size_bytes = len(log_content.encode("utf-8"))
    lines = log_content.splitlines()
    line_count = len(lines)

    if size_bytes > MAX_LOG_SIZE_BYTES:
        errors.append(
            f"File '{filename}' is {size_bytes / 1024:.1f} KB — exceeds 5 MB limit"
        )

    if line_count > MAX_LOG_LINES:
        errors.append(
            f"File '{filename}' has {line_count:,} lines — exceeds 50,000 line limit"
        )

    return len(errors) == 0, errors, line_count, size_bytes


def match_blueprints(
    log_content: str,
    blueprints: Dict[str, IncidentBlueprint],
) -> Dict[str, Tuple[List[PatternMatch], List[EvidenceRecord]]]:
    """
    Scan log_content against all blueprints.
    Returns dict of blueprint_id -> (unique_pattern_matches, evidence_records).

    Deduplication rule: each pattern contributes to score only ONCE per blueprint,
    regardless of how many times it appears. Occurrences are tracked for display only.
    """
    lines = log_content.splitlines()
    results: Dict[str, Tuple[List[PatternMatch], List[EvidenceRecord]]] = {}

    for bp_id, blueprint in blueprints.items():
        # Track: pattern_text -> (weight, occurrence_count)
        pattern_hits: Dict[str, Tuple[int, int]] = {}
        evidence_records: List[EvidenceRecord] = []

        for line_num, raw_line in enumerate(lines, start=1):
            line_lower = raw_line.lower()
            line_text = raw_line.strip()

            for pattern in blueprint.patterns:
                if pattern.match.lower() in line_lower:
                    pat_key = pattern.match.lower()
                    if pat_key in pattern_hits:
                        # Already seen — increment occurrence count only
                        w, cnt = pattern_hits[pat_key]
                        pattern_hits[pat_key] = (w, cnt + 1)
                    else:
                        # First occurrence — register
                        pattern_hits[pat_key] = (pattern.weight, 1)

                    # Always collect evidence record for display
                    evidence_records.append(
                        EvidenceRecord(
                            line_number=line_num,
                            line_text=line_text[:300],  # truncate long lines
                            matched_pattern=pattern.match,
                            matched_blueprint_id=bp_id,
                            weight=pattern.weight,
                        )
                    )

        if pattern_hits:
            unique_patterns = [
                PatternMatch(
                    pattern=original_case(blueprint.patterns, pat_key),
                    weight=weight,
                    occurrences=occurrences,
                )
                for pat_key, (weight, occurrences) in pattern_hits.items()
            ]
            results[bp_id] = (unique_patterns, evidence_records)

    return results


def original_case(patterns, pat_key_lower: str) -> str:
    """Return the original-case pattern string."""
    for p in patterns:
        if p.match.lower() == pat_key_lower:
            return p.match
    return pat_key_lower
