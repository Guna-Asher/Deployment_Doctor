# Architecture — Deployment Doctor

**Detailed technical breakdown of the detection pipeline, scoring model, evidence attribution system, relationship analysis engine, and root cause ranking logic.**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Detection Pipeline](#2-detection-pipeline)
3. [Pattern Matching Engine](#3-pattern-matching-engine)
4. [Evidence Attribution Engine](#4-evidence-attribution-engine)
5. [Confidence Scoring Engine](#5-confidence-scoring-engine)
6. [Relationship Analysis Engine](#6-relationship-analysis-engine)
7. [Root Cause Ranking Engine](#7-root-cause-ranking-engine)
8. [DAG Validation](#8-dag-validation)
9. [Blueprint Validator](#9-blueprint-validator)
10. [Technology Stack](#10-technology-stack)
11. [Design Principles](#11-design-principles)

---

## 1. System Overview

Deployment Doctor is a **deterministic, rules-based diagnostic engine** for Kubernetes and cloud-native deployment failures. It ingests a log file and applies a structured multi-stage pipeline to produce an evidence-backed, auditable incident report.

### Core Architectural Principles

- **Determinism**: Given the same input, the output is always identical. No stochastic components.
- **Transparency**: Every conclusion is traceable to specific log lines and rule weights.
- **Isolation**: The detection engine is entirely decoupled from the presentation layer. The API is stateless.
- **Fail-fast validation**: At startup, all 38 blueprints are validated for schema integrity and DAG consistency. The application refuses to start if validation fails.

### System Layers

```
┌─────────────────────────────────────┐
│      Frontend (React)               │
│  - Interactive incident dashboard   │
│  - Cascade explorer                 │
│  - Relationship graph viewer        │
└──────────────┬──────────────────────┘
               │ REST API (stateless)
┌──────────────▼──────────────────────┐
│   Detection Engine (Python/FastAPI) │
│  - Pattern Matching                 │
│  - Evidence Attribution             │
│  - Confidence Scoring               │
│  - Relationship Analysis            │
│  - Root Cause Ranking               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Knowledge Base (incidents.json)   │
│  - 38 blueprints                    │
│  - 445 detection rules              │
│  - 53 relationship edges            │
│  - 11 incident categories           │
└─────────────────────────────────────┘
```

---

## 2. Detection Pipeline

The pipeline executes the following stages in strict sequence:

```
Stage 1: Input Validation
         ↓
Stage 2: Blueprint Loading (incidents.json)
         ↓
Stage 3: Pattern Matching (445 rules × every log line)
         ↓
Stage 4: Evidence Attribution (deduplicated line-level proof)
         ↓
Stage 5: Confidence Scoring (weighted sum + bonuses)
         ↓
Stage 6: Relationship Analysis (DAG traversal, proximity validation)
         ↓
Stage 7: Root Cause Ranking (bonus/penalty application, tie resolution)
         ↓
Stage 8: Report Assembly (incident report + audit trail)
```

Each stage is implemented as a discrete function with explicit inputs and outputs, making the pipeline fully unit-testable at every step.

### Input Validation

```python
def validate_input(log_content: str) -> tuple[list[str], str]:
    """
    Validates input file:
    - Size: ≤ 5 MB
    - Lines: ≤ 50,000
    - Encoding: UTF-8
    """
    if len(log_content) > 5 * 1024 * 1024:
        raise ValueError("File exceeds 5 MB limit")
    
    lines = log_content.strip().split('\n')
    if len(lines) > 50_000:
        raise ValueError("File exceeds 50,000 lines")
    
    return lines, hashlib.sha256(log_content.encode()).hexdigest()
```

---

## 3. Pattern Matching Engine

**Module**: `app/services/root_cause_engine.py`

The core of the detection system. Evaluates all 445 detection rules against every line in the uploaded log.

### Matching Algorithm

```python
def match_patterns(
    log_lines: list[str],
    blueprints: dict[str, Blueprint]
) -> dict[str, list[EvidenceRecord]]:
    """
    Core pattern matching: O(n × m)
    where n = lines, m = total patterns across blueprints
    
    In practice: ~445 patterns × ~10,000 lines = ~4.45M substring checks (~50ms)
    """
    matched_evidence = defaultdict(list)
    
    for line_num, line in enumerate(log_lines, start=1):
        line_lower = line.lower()
        
        for blueprint_id, blueprint in blueprints.items():
            for pattern in blueprint.patterns:
                if pattern.match.lower() in line_lower:
                    # Record evidence (always add for visibility)
                    matched_evidence[blueprint_id].append(EvidenceRecord(
                        line_number=line_num,
                        line_text=line[:300],
                        matched_pattern=pattern.match,
                        weight=pattern.weight,
                    ))
    
    return matched_evidence
```

### Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Patterns to match | 445 | Across all 38 blueprints |
| Average lines | 10,000 | Range: 100–50,000 |
| Operations | ~4.45M | 445 × 10,000 substring checks |
| Time | ~50ms | Python's `in` operator is O(n) with early termination |

### Key Properties

- **Exact substring matching** — no regex, no fuzzy matching, no ML inference
- **Case-insensitive** — patterns match regardless of log formatting conventions
- **Multi-match accumulation** — the same pattern can match multiple lines, each recorded separately
- **Cross-blueprint matching** — the same log line can match patterns from multiple blueprints

---

## 4. Evidence Attribution Engine

Every matched pattern produces an **Evidence Record** with complete provenance.

### Evidence Record Schema

```python
@dataclass
class EvidenceRecord:
    line_number: int              # 1-indexed
    line_text: str                # First 300 chars, original case
    matched_pattern: str          # Pattern text that matched
    matched_blueprint_id: str     # Blueprint containing this pattern
    weight: float                 # Score contribution if unique
```

### Deduplication Strategy

**Critical design principle**: Evidence cannot be double-counted. Only **unique patterns** per blueprint contribute to scoring, regardless of how many times they appear:

```python
# WRONG: Count pattern occurrences
pattern_hits = defaultdict(int)
for line_num, line in enumerate(log_lines):
    for pattern in blueprint.patterns:
        if pattern.match.lower() in line.lower():
            pattern_hits[pattern.match] += 1

# Score = sum of weights × occurrences = 40 × 500 = 20,000 ❌

# CORRECT: Count unique patterns (Deployment Doctor approach)
unique_patterns = set()
evidence_records = []
for line_num, line in enumerate(log_lines):
    for pattern in blueprint.patterns:
        if pattern.match.lower() in line.lower():
            unique_patterns.add(pattern.match)
            evidence_records.append(EvidenceRecord(...))  # Always track

# Score = sum of unique pattern weights = 40 + 50 + 45 + ... ✅
```

### Why Deduplication Matters

Without deduplication, a chatty application printing "connection refused" repeatedly would inflate scores artificially. The correct signal is the **diversity of matched patterns**, not their frequency. Frequency is tracked separately for display purposes.

---

## 5. Confidence Scoring Engine

**Module**: `app/services/scoring_engine.py`

The scoring formula is **transparent, deterministic, and fully auditable**.

### Score Calculation

```
incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty

where:
  pattern_score        = sum of unique matched pattern weights
  evidence_bonus       = +10 if ≥ 3 unique patterns matched
  relationship_bonus   = +20 per confirmed parent-child incident chain
  symptom_penalty      = -20 if incident classified as symptom
  
confidence = min(incident_score, 100)  # Display percentage, capped at 100
```

### Score Components

| Component | Formula | Range | Purpose |
|-----------|---------|-------|---------|
| **Pattern Score** | `Σ unique_pattern.weight` | 0–1000+ | Base score from pattern diversity |
| **Evidence Bonus** | `+10 if len(unique_patterns) ≥ 3` | 0 or 10 | Reward multiple matching patterns |
| **Relationship Bonus** | `+20 per cause-effect validated` | 0–∞ | Reward cascading incident chains |
| **Symptom Penalty** | `-20 if role == 'symptom'` | 0 or -20 | Suppress false positives on symptoms |
| **Incident Score** | `pattern_score + bonuses - penalties` | 0–∞ | Unbounded internal ranking value |
| **Confidence** | `min(incident_score, 100)` | 0–100 | Bounded display percentage |

### Why Incident Score is Unbounded

The `incident_score` needs to be unbounded so ranking remains meaningful when multiple incidents cap at 100% confidence:

```
DB_CONNECTION_FAILURE:  incident_score = 285  (rank 1st) → display 100%
CRASH_LOOP_BACKOFF:     incident_score = 140  (rank 2nd) → display 100%

If both capped at 100, ranking would be a coin flip.
Unbounded score preserves ranking signal above the display cap.
```

---

## 6. Relationship Analysis Engine

**Module**: `app/services/relationship_engine.py`

Analyzes cause-effect relationships between detected incidents using DAG traversal.

### DAG Model

```python
@dataclass
class Blueprint:
    id: str
    title: str
    causes_incidents: list[str]  # Outgoing edges in the DAG
    incident_role: Literal["root_cause", "symptom"]
    ...
```

Example graph structure:

```
DNS_FAILURE
  ├─ causes ─> DB_CONNECTION_FAILURE
  │               ├─ causes ─> CRASH_LOOP_BACKOFF
  │               └─ causes ─> APPLICATION_TIMEOUT
  └─ causes ─> SERVICE_UNAVAILABLE

MISSING_CONFIG
  ├─ causes ─> AUTHENTICATION_FAILURE
  └─ causes ─> PERMISSION_DENIED
```

### Relationship Bonus with Proximity Validation

When two blueprints have a declared relationship, we check:

1. **Both detected**: Is the caused blueprint also in the detected set?
2. **Proximity**: Are their evidence lines within 200 lines of each other?

```python
def validate_relationship(
    source_blueprint: Blueprint,
    target_blueprint_id: str,
    source_evidence: list[EvidenceRecord],
    target_evidence: list[EvidenceRecord],
    proximity_threshold: int = 200
) -> bool:
    """
    Validates a cause-effect relationship by proximity.
    Returns True if distance ≤ threshold.
    """
    if not target_evidence:
        return False
    
    source_lines = sorted({e.line_number for e in source_evidence})
    target_lines = sorted({e.line_number for e in target_evidence})
    
    min_dist = min_line_distance(source_lines, target_lines)
    return min_dist <= proximity_threshold
```

### Efficient Proximity Calculation

Using a two-pointer algorithm for O(n log n) performance:

```python
def min_line_distance(lines_a: list[int], lines_b: list[int]) -> int:
    """
    Find minimum distance between any element in lines_a and lines_b.
    O(n log n) where n = len(lines_a) + len(lines_b)
    """
    if not lines_a or not lines_b:
        return float('inf')
    
    a, b = sorted(lines_a), sorted(lines_b)
    min_dist, i, j = float('inf'), 0, 0
    
    while i < len(a) and j < len(b):
        dist = abs(a[i] - b[j])
        min_dist = min(min_dist, dist)
        if a[i] < b[j]:
            i += 1
        else:
            j += 1
    
    return min_dist
```

### Why 200-Line Window?

- **Below 200**: Relationship is "local" and meaningful (same application error cascading through same component)
- **Above 200**: Incidents may be unrelated (different deployment phases, different services)
- **Tunable**: The value can be made configurable if needed

---

## 7. Root Cause Ranking Engine

**Module**: `app/services/root_cause_engine.py`

Ranks all detected incidents using a deterministic multi-key sort.

### Deterministic Sort Key

```python
def sort_key(incident: IncidentResult) -> tuple:
    """
    Produces a stable, deterministic sort key.
    Identical inputs always produce identical sort order.
    """
    return (
        -incident.incident_score,           # 1. Highest score first (descending)
        -SEVERITY_ORDER[incident.severity],  # 2. CRITICAL > ERROR > WARNING
        incident.priority,                   # 3. Lower priority number = higher importance
        incident.blueprint_id                # 4. Alphabetical tiebreaker (deterministic)
    )

SEVERITY_ORDER = {
    "CRITICAL": 4,
    "ERROR": 3,
    "WARNING": 2,
    "INFO": 1,
}

ranked = sorted(incidents, key=sort_key)
```

### Ranking Example

```
Incident A: score=285, severity=CRITICAL, priority=1
Incident B: score=140, severity=CRITICAL, priority=2
Incident C: score=140, severity=ERROR, priority=1

Sort keys:
A: (-285, -4, 1, 'A')
B: (-140, -4, 2, 'B')
C: (-140, -3, 1, 'C')

Final order: A > B > C
```

### Detection Status Classification

```python
def classify_detection_status(ranked: list[IncidentResult]) -> DetectionStatus:
    """
    Classify overall detection confidence.
    """
    # No incidents above minimum score threshold
    if not ranked:
        return DetectionStatus.INSUFFICIENT_EVIDENCE
    
    # Score gap between 1st and 2nd too small
    if len(ranked) >= 2:
        gap = ranked[0].incident_score - ranked[1].incident_score
        if gap < 10:
            return DetectionStatus.AMBIGUOUS
    
    # Clear winner
    return DetectionStatus.CONFIDENT
```

| Status | Meaning | Trigger |
|--------|---------|---------|
| `CONFIDENT` | Primary incident is clear winner | gap ≥ 10, or only one incident above threshold |
| `AMBIGUOUS` | Multiple competing incidents | gap < 10 between rank 1 and 2 |
| `INSUFFICIENT_EVIDENCE` | No incidents above threshold | All scores < 50 |

---

## 8. DAG Validation

The DAG is validated at startup and continuously maintained as a structural constraint of the knowledge base.

### Cycle Detection

Uses **Depth-First Search (DFS)** with color marking:

```python
def detect_cycles(blueprints: dict[str, Blueprint]) -> list[str]:
    """
    Detects cycles in the DAG using DFS coloring.
    WHITE=0 (unvisited), GRAY=1 (visiting), BLACK=2 (visited)
    """
    color = {bp_id: 0 for bp_id in blueprints}
    
    def dfs(node_id: str) -> list[str]:
        color[node_id] = 1  # Mark as GRAY (visiting)
        
        for neighbor_id in blueprints[node_id].causes_incidents:
            if color[neighbor_id] == 1:  # Back edge found (cycle)
                return [neighbor_id, node_id]
            if color[neighbor_id] == 0:  # Unvisited
                result = dfs(neighbor_id)
                if result:
                    return result
        
        color[node_id] = 2  # Mark as BLACK (visited)
        return []
    
    for bp_id in blueprints:
        if color[bp_id] == 0:
            cycle = dfs(bp_id)
            if cycle:
                return cycle
    
    return []
```

### Reference Integrity

Every ID in any `causes_incidents` array must refer to a blueprint that exists in `incidents.json`. Dangling references cause startup failure with a diagnostic message.

---

## 9. Blueprint Validator

**Module**: `app/services/blueprint_validator.py`

Runs at application startup. Validates the entire `incidents.json` knowledge base before the server accepts any requests.

### Validation Checks

| Check | Description | Failure Action |
|-------|-------------|-----------------|
| Schema completeness | All required fields present on every blueprint | Exit with error |
| Type validation | Patterns are objects with `match` (string) and `weight` (int) | Exit with error |
| DAG reference integrity | Every ID in `causes_incidents` must exist | Exit with error |
| DAG cycle detection | No directed cycles permitted | Exit with error |
| Severity enum | Value must be `CRITICAL`, `ERROR`, `WARNING`, `INFO` | Exit with error |
| Role enum | Value must be `root_cause` or `symptom` | Exit with error |

### Startup Failure Example

If validation fails:

```
ValueError: Cycle detected in incident relationships:
  CRASH_LOOP_BACKOFF → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF
  
Fix: Remove one of these edges from incidents.json
```

The application refuses to start until the issue is resolved.

---

## 10. Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | FastAPI | Async HTTP API with automatic OpenAPI docs |
| **ORM** | SQLAlchemy 2.0 | Async database operations with type hints |
| **Database** | PostgreSQL | Production-grade ACID-compliant JSONB storage |
| **Validation** | Pydantic v2 | Strong typing, runtime validation, schema generation |
| **Testing** | pytest | Unit/integration testing with 90%+ coverage |
| **Serialization** | Orjson | Fast JSON encoding/decoding |
| **Server** | Uvicorn | ASGI server with automatic hot reload in dev |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | React 18 | Component-based UI with hooks |
| **Styling** | Tailwind CSS | Utility-first CSS with dark theme |
| **Graph Viz** | Recharts / Custom | Relationship visualization |
| **Testing** | Jest | Component and unit tests |
| **HTTP Client** | Fetch API | Native browser HTTP client |

---

## 11. Design Principles

### Principle 1: Determinism Over Adaptability

**Chosen**: Deterministic pattern matching with explicit weights

**Rejected**: Machine learning classifier

**Rationale**: Rule-based systems are inherently explainable, auditable, and don't hallucinate. ML models are black boxes.

---

### Principle 2: Simplicity Over Expressiveness

**Chosen**: Case-insensitive substring matching

**Rejected**: Full regex pattern matching

**Rationale**: Substring matching is O(n) and simple to debug. Regex can be O(n²) and prone to ReDoS attacks.

---

### Principle 3: Embedded Knowledge Over External Models

**Chosen**: JSON file with 38 blueprints and 445 rules

**Rejected**: Calling external AI APIs for detection

**Rationale**: Knowledge is version-controlled, deterministic, auditable, and free to run.

---

### Principle 4: Vertical Integration Over Microservices

**Chosen**: Single FastAPI process with all engines as pure functions

**Rejected**: Separate microservices for each engine

**Rationale**: Function calls are 1000× faster than HTTP. No service discovery overhead. Stateless design is trivial to test and scale.

---

**Last Updated**: June 2026  
**Architecture Version**: 1.6.0  
**Deterministic**: ✅ Yes  
**Auditability**: ✅ Complete trail
