# Detection Pipeline

This document describes the workflow implemented in `backend/app/services/root_cause_engine.py`.

## Step-by-step

### 0) Engine start / context init
- Creates a new `analysis_id`.
- Loads blueprints: `load_blueprints()`.
- Splits the log into `log_lines` and calculates `log_size`.
- Initializes `audit_trail`.

### 1) Pattern matching (rules → hits)
Implemented in:
- `app/services/pattern_matcher.py::match_blueprints()`

Produces:
- `blueprint_matches[bp_id] = (unique_pattern_matches, evidence_records)`

Key behaviors:
- Case-insensitive substring matching.
- Evidence is collected at **line level** for UI display.
- Scoring pattern contribution is **deduped** per blueprint (a pattern weight is added once even if it appears many times).

### 2) Relationship analysis (DAG + proximity)
Implemented in:
- `app/services/relationship_engine.py::analyze_relationships()`

Produces:
- `relationship_bonuses[bp_id]` and a `RelationshipResult` graph.

Rule of relationship bonus:
- For every `(bp_id -> caused_id)` where `bp_id.causes_incidents` contains `caused_id`:
  - if both are detected and their evidence lines are within `PROXIMITY_WINDOW` (200 lines), apply `RELATIONSHIP_BONUS` (+20) to `bp_id`.

### 3) Scoring per blueprint
Implemented in:
- `app/services/scoring_engine.py::score_incident()`

Calculates:
- `pattern_score` = sum of deduped matched pattern weights
- `evidence_bonus` = +10 if `len(matched_patterns) >= 3`
- `relationship_bonus` = passed in from relationship analysis (+0 or +20s)
- `symptom_penalty` = -20 if blueprint `incident_role == "symptom"`

Then:
- `incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty`
- `confidence = min(incident_score, 100)`

### 4) Threshold filter
- Incidents with `incident_score < MIN_SCORE` are excluded.

### 5) Deterministic ranking
- Deterministic multi-key sort (see `docs/scoring.md`).

### 6) Detection status
- `CONFIDENT` if top gap ≥ `AMBIGUITY_THRESHOLD`.
- `AMBIGUOUS` if top gap < `AMBIGUITY_THRESHOLD`.
- `INSUFFICIENT_EVIDENCE` if no incident reached `MIN_SCORE`.

### 7) Engine completion
- Produces a structured `EngineResult` with:
  - primary incident
  - contributing incidents
  - full audit trail
  - relationship graph
  - engine metadata
  - optional AI summary

