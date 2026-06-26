# Scoring

## Score components (from `app/services/scoring_engine.py`)

### Pattern score (deduped)
```text
pattern_score = sum(weight for each unique matched pattern per blueprint)
```
- Repeated occurrences of the same matched substring do **not** add more weight.
- Occurrence counts are tracked for display only.

### Evidence bonus
```text
evidence_bonus = +10  if (number_of_unique_matched_patterns >= 3)
               =  0   otherwise
```

### Relationship bonus
- Computed in `app/services/relationship_engine.py::analyze_relationships()`.
- Applied into scoring as `relationship_bonus`.

### Symptom penalty
```text
symptom_penalty = 20  if blueprint.incident_role == "symptom"
                = 0   otherwise
```

### Final formulas
```text
incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
confidence     = min(incident_score, 100)
```

## Deterministic ranking (from `app/services/root_cause_engine.py`)

Sort order:
1. `incident_score` descending
2. `severity` descending (CRITICAL > ERROR > WARNING > INFO)
3. `priority` ascending (lower number = higher)
4. `blueprint_id` alphabetical

This produces a stable total ordering.

## Detection status

Status is based on the top-2 `incident_score` gap:
- `CONFIDENT` if `gap >= AMBIGUITY_THRESHOLD` (10)
- `AMBIGUOUS` if `gap < AMBIGUITY_THRESHOLD` (10)

