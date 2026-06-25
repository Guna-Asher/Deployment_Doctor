# Deployment Doctor

> **Explainable Incident Detection Engine for DevOps & SRE Teams**

[![Engine](https://img.shields.io/badge/Engine-v1.6.0-cyan)](.)
[![Blueprints](https://img.shields.io/badge/Blueprints-10-blue)](.)
[![Rules](https://img.shields.io/badge/Rules-90-blue)](.)
[![Tests](https://img.shields.io/badge/Tests-41%20passing-brightgreen)](.)
[![Coverage](https://img.shields.io/badge/Coverage-90%25%2B-brightgreen)](.)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791)](.)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)](.)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Why Not Just ChatGPT?](#3-why-not-just-chatgpt)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Detection Flow Diagram](#5-detection-flow-diagram)
6. [Confidence Scoring Logic](#6-confidence-scoring-logic)
7. [Incident Score vs Confidence](#7-incident-score-vs-confidence)
8. [Root Cause Ranking Logic](#8-root-cause-ranking-logic)
9. [DAG Relationship System](#9-dag-relationship-system)
10. [Evidence Attribution System](#10-evidence-attribution-system)
11. [Audit Trail System](#11-audit-trail-system)
12. [API Documentation](#12-api-documentation)
13. [Database Schema](#13-database-schema)
14. [Local Setup](#14-local-setup)
15. [Docker Setup](#15-docker-setup)
16. [GitHub Actions](#16-github-actions)
17. [Screenshots](#17-screenshots)
18. [Incident Blueprint Library](#18-incident-blueprint-library)
19. [Resume Description](#19-resume-description)
20. [Interview Questions & Answers](#20-interview-questions--answers)
21. [Design Tradeoffs](#21-design-tradeoffs)
22. [Future Improvements](#22-future-improvements)

---

## 1. Project Overview

**Deployment Doctor** is a production-quality, rule-based incident detection engine that analyzes deployment logs and produces fully explainable root cause analysis reports.

It is **not** a chatbot, **not** a ChatGPT wrapper, and **not** an AI log analyzer.

It is an **operational knowledge engine** that applies deterministic pattern matching, evidence attribution, confidence scoring, and relationship analysis to identify root causes with full auditability.

| Property | Value |
|---|---|
| Engine Version | 1.6.0 |
| Incident Blueprints | 10 |
| Detection Rules | 90 |
| Test Coverage | 90%+ (41 tests) |
| Analysis Determinism | ✅ Guaranteed |
| AI Dependency for Detection | ❌ None |

### Core Value Proposition

```
Same log file → Same result. Every time. No exceptions.
```

Every conclusion is:
- **Traceable** — backed by specific log lines
- **Explainable** — linked to named patterns and weights
- **Reproducible** — no runtime or AI influence
- **Auditable** — full decision trail for every analysis

---

## 2. Problem Statement

When a production deployment fails, SREs face three critical questions:

1. **What went wrong?** — Which component is the root cause?
2. **Why did it go wrong?** — What specific error triggered the incident?
3. **How do I fix it?** — What steps should I take right now?

Traditional approaches fail:

| Approach | Problem |
|---|---|
| Manual log reading | Too slow, requires deep expertise, error-prone under pressure |
| Grep / shell scripts | Single-pattern, no scoring, no relationship awareness |
| AI log analysis | Non-deterministic, hallucinates fixes, can't be audited |
| APM dashboards | Require pre-instrumented apps, useless post-mortem |

**Deployment Doctor** solves this with:
- **Instant analysis** — scan thousands of log lines in milliseconds
- **Deterministic results** — same log always produces same report
- **Evidence attribution** — every conclusion cites the exact log line
- **Relationship awareness** — understands that DNS failure causes DB failure causes CrashLoopBackOff

---

## 3. Why Not Just ChatGPT?

This question is central to the engineering philosophy of Deployment Doctor.

### The Core Problem With LLM-Based Log Analysis

```
Input:  5,000 lines of Kubernetes logs
Output: "It looks like there might be a database connectivity issue"
```

That sentence is:
- **Non-deterministic** — run it again, get different words
- **Unverifiable** — what log line led to that conclusion?
- **Unauditable** — cannot be explained to an incident review board
- **Unreliable** — LLMs hallucinate kubectl commands that don't exist
- **Expensive** — sending 5,000 lines of logs costs significant tokens
- **Slow** — network round-trip adds latency during active incidents

### What Deployment Doctor Does Instead

```
Input:  5,000 lines of Kubernetes logs
Output: {
  "primary_incident": "DB_CONNECTION_FAILURE",
  "confidence": 100%,
  "evidence": [
    { "line": 42, "text": "ECONNREFUSED 10.0.0.5:5432", "pattern": "ECONNREFUSED", "weight": 40 },
    { "line": 43, "text": "database connection failed: retrying", "pattern": "database connection failed", "weight": 50 },
    ...
  ],
  "audit_trail": [every scoring decision, every bonus, every penalty],
  "detection_status": "CONFIDENT"
}
```

That output is:
- **Deterministic** — run it again, get identical JSON
- **Verifiable** — cites exact line numbers
- **Auditable** — full audit trail for incident review
- **Reliable** — no hallucinations (rules only)
- **Free to run** — no token cost per analysis
- **Fast** — sub-10ms for most logs

### Where AI Fits

The **AI Summary** is an **optional presentation layer** only:

```
AI Input:  { structured JSON findings — never raw logs }
AI Task:   "Summarize these pre-computed findings in 3-5 sentences"
AI Output: Human-readable paragraph
```

If the AI is unavailable, the application continues with a deterministic fallback summary. The detection result does not change.

---

## 4. Architecture Diagram

```mermaid
graph TB
    subgraph Client["Browser Client"]
        U[User Upload / Demo Center]
    end

    subgraph API["FastAPI Backend"]
        AV[Upload Validation<br/>5MB / 50k lines]
        BV[Blueprint Validation<br/>Startup Gate]
        PM[Pattern Matching Engine<br/>90 rules across 10 blueprints]
        EA[Evidence Attribution Engine<br/>Line-level attribution]
        SE[Confidence Scoring Engine<br/>Deduped weights + bonuses]
        RE[Relationship Analysis Engine<br/>DAG + proximity window]
        RC[Root Cause Ranking Engine<br/>Deterministic sort]
        RG[Report Generation]
        AI[AI Summary Layer<br/>Optional — OpenRouter]
    end

    subgraph Storage["PostgreSQL"]
        AR[(analysis_results<br/>JSONB result storage)]
    end

    subgraph Rules["Rules Layer"]
        IJ[incidents.json<br/>10 blueprints · 90 rules]
    end

    U -->|POST /api/analyze| AV
    AV --> PM
    IJ -->|loaded at startup| BV
    BV -->|cached blueprints| PM
    PM --> EA
    EA --> SE
    SE --> RE
    RE --> RC
    RC --> RG
    RG --> AI
    RG --> AR
    AI -->|optional| RG
    AR -->|GET /api/results/:id| U

    style PM fill:#1a1c23,color:#06b6d4
    style RC fill:#1a1c23,color:#f97316
    style AI fill:#1a1c23,color:#a78bfa
    style IJ fill:#0f1117,color:#10b981
```

### Component Responsibilities

| Component | Responsibility | Stateless? |
|---|---|---|
| Upload Validation | Size/line count enforcement before analysis | ✅ |
| Blueprint Validator | Schema, DAG, duplicate-pattern checks at startup | ✅ |
| Pattern Matching Engine | Case-insensitive substring scan against all blueprints | ✅ |
| Evidence Attribution Engine | Line-level evidence records with source attribution | ✅ |
| Confidence Scoring Engine | Deduped weight sum + bonuses + penalties | ✅ |
| Relationship Analysis Engine | DAG traversal + 200-line proximity validation | ✅ |
| Root Cause Ranking Engine | Deterministic multi-key sort + status classification | ✅ |
| AI Summary Layer | Optional structured-findings → prose summary | ✅ |

All engine components are **completely stateless**. Every analysis initializes a fresh context.

---

## 5. Detection Flow Diagram

```mermaid
flowchart TD
    A([Log File Input]) --> B{Validation}
    B -->|Size > 5MB or Lines > 50k| ERR[❌ Reject with error]
    B -->|Valid| C[Pattern Matching Engine]

    C --> D{Any matches?}
    D -->|No matches| INS[INSUFFICIENT_EVIDENCE<br/>Confidence: 0%]
    D -->|Matches found| E[Evidence Attribution Engine]

    E --> F[Confidence Scoring Engine]
    F --> G[pattern_score = Σ unique weights]
    G --> H{patterns ≥ 3?}
    H -->|Yes| I[+10 Evidence Bonus]
    H -->|No| J[+0]

    I --> K[Relationship Analysis Engine]
    J --> K

    K --> L{Both cause + effect<br/>detected?}
    L -->|Yes| M{Within 200 lines?}
    L -->|No| N[+0 Relationship Bonus]
    M -->|Yes| O[+20 Relationship Bonus]
    M -->|No| N

    O --> P[Apply Symptom Penalty]
    N --> P
    P --> Q{incident_role = symptom?}
    Q -->|Yes| R[-20 Symptom Penalty]
    Q -->|No| S[-0]

    R --> T[Calculate incident_score]
    S --> T
    T --> U[confidence = min score, 100]

    U --> V{incident_score ≥ 50?}
    V -->|No| W[Filtered out]
    V -->|Yes| X[Root Cause Ranking]

    X --> Y{Score gap ≥ 10?}
    Y -->|Yes| CONF[✅ CONFIDENT]
    Y -->|No| AMB[⚠️ AMBIGUOUS]
```

---

## 6. Confidence Scoring Logic

Each detected blueprint receives a composite score built from four components:

### Components

```
incident_score =
    pattern_score
  + evidence_bonus
  + relationship_bonus
  - symptom_penalty
```

### Pattern Score

The sum of unique matched pattern weights. **Deduplication is critical.**

```python
# A pattern contributes to score exactly ONCE per blueprint,
# regardless of how many times it appears in the log.

pattern_score = sum(p.weight for p in unique_matched_patterns)

# Example: "connection refused" appears 500 times
# Score contribution: 40 (NOT 40 × 500)
# Occurrences are tracked for display only
```

### Evidence Bonus

```python
evidence_bonus = 10 if len(matched_patterns) >= 3 else 0
```

### Relationship Bonus

```python
relationship_bonus = 20 if (
    blueprint.causes_incidents contains a detected blueprint
    AND evidence lines are within 200 lines of each other
) else 0
```

### Symptom Penalty

```python
symptom_penalty = 20 if blueprint.incident_role == "symptom" else 0
```

### Why Deduplication Matters

Without deduplication, a chatty log file could inflate scores artificially:

```
# BAD (naive counting):
"connection refused" × 500 occurrences × weight 40 = 20,000 score → meaningless

# GOOD (Deployment Doctor):
"connection refused" × 1 unique match × weight 40 = 40 score → meaningful
```

This ensures high-frequency noise (like retry loops) does not inflate confidence beyond what the diversity of matched patterns warrants.

---

## 7. Incident Score vs Confidence

These are **two distinct values** with different purposes.

| Value | Formula | Range | Purpose |
|---|---|---|---|
| `incident_score` | `pattern_score + bonuses - penalties` | 0 → ∞ (unbounded) | Internal ranking |
| `confidence` | `min(incident_score, 100)` | 0 → 100 | Display only |

### Why Keep Them Separate?

The **incident score** needs to be unbounded so that ranking remains meaningful when two incidents both cap at 100% confidence.

**Example:** Two incidents both display 100% confidence, but their raw scores differ:

```
DB_CONNECTION_FAILURE:  incident_score = 285  (rank: 1st)
CRASH_LOOP_BACKOFF:     incident_score = 140  (rank: 2nd)

Both display confidence = 100%,
but ranking is determined by incident_score (285 > 140).
```

If incident_score were capped at 100, the ranking would be a coin flip.

### Confidence Tiers

```
90 – 100  →  Very High   (dark theme: bright red/orange badge)
75 – 89   →  High
50 – 74   →  Medium
 0 – 49   →  Low         (filtered out — below MIN_SCORE threshold)
```

---

## 8. Root Cause Ranking Logic

Root causes are ranked by a **deterministic multi-key sort**. The same log always produces the same ranking regardless of:
- Blueprint load order
- Python dict iteration order
- Dictionary insertion order
- CPU or OS differences

### Sort Key (Python)

```python
def sort_key(incident):
    return (
        -incident.incident_score,          # 1. Highest score first
        -SEVERITY_ORDER[incident.severity], # 2. CRITICAL > ERROR > WARNING > INFO
        incident.priority,                  # 3. Lower priority number = higher priority
        incident.blueprint_id,              # 4. Alphabetical (deterministic tiebreaker)
    )

ranked = sorted(incidents, key=sort_key)
```

### Severity Hierarchy

```python
SEVERITY_ORDER = {
    "CRITICAL": 4,
    "ERROR":    3,
    "WARNING":  2,
    "INFO":     1,
}
```

### Detection Status Logic

```
if no incident reaches MIN_SCORE (50):
    → INSUFFICIENT_EVIDENCE

elif abs(rank[0].score - rank[1].score) < 10:
    → AMBIGUOUS

else:
    → CONFIDENT
```

The **primary incident** is always `ranked[0]`. All others above threshold are **contributing incidents**.

---

## 9. DAG Relationship System

Incident relationships form a **Directed Acyclic Graph (DAG)**. Circular dependencies are forbidden and cause application startup to fail with a descriptive error.

### Relationship Graph

```mermaid
graph LR
    DNS[DNS_FAILURE<br/>CRITICAL]
    DB[DB_CONNECTION_FAILURE<br/>CRITICAL]
    DISK[DISK_FULL<br/>CRITICAL]
    CRASH[CRASH_LOOP_BACKOFF<br/>CRITICAL · symptom]
    IMAGE[IMAGE_PULL_FAILURE<br/>ERROR]
    OOM[OOM_KILLED<br/>CRITICAL]
    PORT[PORT_CONFLICT<br/>ERROR]
    CONFIG[MISSING_CONFIGURATION<br/>ERROR]
    AUTH[AUTHENTICATION_FAILURE<br/>ERROR]
    PERM[PERMISSION_DENIED<br/>ERROR]

    DNS -->|causes| DB
    DNS -->|causes| IMAGE
    DB -->|causes| CRASH
    DISK -->|causes| DB
    IMAGE -->|causes| CRASH
    OOM -->|causes| CRASH
    PORT -->|causes| CRASH
    CONFIG -->|causes| CRASH
    CONFIG -->|causes| AUTH
    PERM -->|causes| AUTH

    style CRASH fill:#7f1d1d,color:#fca5a5
    style DNS fill:#1e3a5f,color:#93c5fd
    style DB fill:#1c2f1c,color:#86efac
```

### DAG Validation Algorithm

Applied at startup using Depth-First Search (DFS):

```python
def detect_cycle(blueprints):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {id: WHITE for id in blueprints}

    def dfs(node):
        color[node] = GRAY          # Mark as "currently being visited"
        for neighbor in blueprints[node].causes_incidents:
            if color[neighbor] == GRAY:
                return [neighbor, node]  # Cycle found!
            if color[neighbor] == WHITE:
                result = dfs(neighbor)
                if result:
                    return result
        color[node] = BLACK         # Mark as "fully visited"
        return []

    for node in blueprints:
        if color[node] == WHITE:
            if cycle := dfs(node):
                raise ValueError(f"Cycle: {' → '.join(cycle)}")
```

### Proximity Validation

Relationship bonuses require evidence to be **within 200 log lines** of each other:

```python
# Efficient O(n log n) minimum distance between two sorted arrays
def min_line_distance(lines_a, lines_b):
    a, b = sorted(lines_a), sorted(lines_b)
    min_dist, i, j = infinity, 0, 0
    while i < len(a) and j < len(b):
        dist = abs(a[i] - b[j])
        min_dist = min(min_dist, dist)
        if a[i] < b[j]: i += 1
        else: j += 1
    return min_dist

# Bonus applied only if:
if min_line_distance(source_evidence_lines, target_evidence_lines) <= 200:
    relationship_bonus += 20
```

This prevents two unrelated incidents at opposite ends of a large log from being incorrectly linked.

---

## 10. Evidence Attribution System

Every piece of evidence is fully attributed. No black-box conclusions.

### Evidence Record Schema

```json
{
  "line_number": 42,
  "line_text": "ERROR: ECONNREFUSED 10.0.0.5:5432 — database unreachable",
  "matched_pattern": "ECONNREFUSED",
  "matched_blueprint_id": "DB_CONNECTION_FAILURE",
  "weight": 40
}
```

### Collection Strategy

Evidence is collected at the **line level**, not the pattern level:

```python
for line_num, line in enumerate(log_lines, start=1):
    for pattern in blueprint.patterns:
        if pattern.match.lower() in line.lower():
            # Track unique pattern for scoring (deduped)
            pattern_hits[pattern.match] = (pattern.weight, occurrences + 1)

            # Always collect evidence record for display
            evidence.append(EvidenceRecord(
                line_number=line_num,
                line_text=line[:300],     # truncate very long lines
                matched_pattern=pattern.match,
                matched_blueprint_id=blueprint.id,
                weight=pattern.weight,
            ))
```

### Display in Report

The Evidence Viewer in the UI shows:
1. Line number (clickable anchor reference)
2. Matched pattern (highlighted in cyan)
3. Score weight contribution
4. Full log line with pattern highlighted in yellow

---

## 11. Audit Trail System

Every analysis produces a complete, ordered audit trail of all engine decisions.

### Audit Trail Entry Schema

```json
{
  "stage": "RELATIONSHIP_BONUS",
  "description": "DB_CONNECTION_FAILURE causes CRASH_LOOP_BACKOFF. Evidence proximity: 12 lines (≤200). Applying +20 to DB_CONNECTION_FAILURE.",
  "score_change": 20.0
}
```

### Audit Trail Stages (in order)

| Stage | Description |
|---|---|
| `ENGINE_START` | File metadata, line count, blueprint count |
| `PATTERN_MATCHING` | Rules scan initiated |
| `PATTERN_MATCHING_COMPLETE` | Blueprints with matches |
| `PATTERN_SCORE` | Per-blueprint weight sum |
| `EVIDENCE_BONUS` | +10 applied (if ≥3 patterns) |
| `RELATIONSHIP_ANALYSIS` | Relationship traversal initiated |
| `RELATIONSHIP_VALIDATION` | Bonus applied with proximity distance |
| `RELATIONSHIP_REJECTED` | Proximity > 200 lines, bonus skipped |
| `SCORING` | Scoring initiated |
| `SYMPTOM_PENALTY` | -20 applied (if symptom role) |
| `THRESHOLD_FILTER` | Incidents below MIN_SCORE=50 removed |
| `RANKING` | Sorted order with scores |
| `STATUS_CONFIDENT` | Gap ≥ 10, CONFIDENT declared |
| `AMBIGUITY_DETECTED` | Gap < 10, AMBIGUOUS declared |
| `ENGINE_COMPLETE` | Duration, status, primary incident |

The audit trail is stored in PostgreSQL and displayed in the UI in an expandable panel. Every score change in the trail adds up to the final incident score.

---

## 12. API Documentation

### Base URL

```
https://<your-domain>/api
```

### Endpoints

---

#### `POST /api/analyze`

Analyze a log file. Accepts multipart form or form fields.

**Request (multipart)**:
```
Content-Type: multipart/form-data

file:     <log file binary>
filename: "deployment.log"   (optional)
```

**Request (form fields)**:
```
Content-Type: multipart/form-data

log_content: "<raw log text>"
filename:    "deployment.log"
```

**Response** `200 OK`:
```json
{
  "analysis_id": "uuid",
  "filename": "deployment.log",
  "detection_status": "CONFIDENT",
  "confidence": 100.0,
  "primary_incident": {
    "blueprint_id": "DB_CONNECTION_FAILURE",
    "title": "Database Connection Failure",
    "severity": "CRITICAL",
    "incident_role": "root_cause",
    "pattern_score": 250.0,
    "evidence_bonus": 10.0,
    "relationship_bonus": 20.0,
    "symptom_penalty": 0.0,
    "incident_score": 280.0,
    "confidence": 100.0,
    "matched_patterns": [...],
    "evidence": [...],
    "possible_causes": [...],
    "verification_steps": [...],
    "recommended_fixes": [...],
    "causes_incidents": ["CRASH_LOOP_BACKOFF"]
  },
  "contributing_incidents": [...],
  "audit_trail": [...],
  "relationship_graph": {...},
  "engine_metadata": {...},
  "ai_summary": "...",
  "ai_summary_available": false
}
```

**Error** `413`:
```json
{ "detail": { "errors": ["File exceeds 5 MB limit"] } }
```

---

#### `POST /api/analyze/json`

Same as above but accepts JSON body:

```json
{
  "log_content": "<raw log text>",
  "filename": "deployment.log"
}
```

---

#### `GET /api/results/{analysis_id}`

Retrieve a stored analysis result.

```
GET /api/results/550e8400-e29b-41d4-a716-446655440000
```

---

#### `GET /api/results`

List recent analyses (default: last 20).

```
GET /api/results?limit=20
```

---

#### `GET /api/incidents`

Return all incident blueprints (knowledge base).

```json
[
  {
    "id": "DB_CONNECTION_FAILURE",
    "title": "Database Connection Failure",
    "category": "DATABASE",
    "severity": "CRITICAL",
    "incident_role": "root_cause",
    "priority": 1,
    "patterns": [{"match": "connection refused", "weight": 40}, ...],
    "possible_causes": [...],
    "verification_steps": [...],
    "recommended_fixes": [...],
    "causes_incidents": ["CRASH_LOOP_BACKOFF"]
  },
  ...
]
```

---

#### `GET /api/incidents/{incident_id}`

Return a single blueprint by ID.

---

#### `GET /api/samples`

Return all Demo Center scenario metadata.

```json
[
  {
    "id": "db-connection-failure",
    "title": "Database Connection Failure",
    "filename": "01-db-connection-failure.log",
    "expected_incident": "DB_CONNECTION_FAILURE",
    "severity": "CRITICAL",
    "expected_status": "CONFIDENT",
    "category": "DATABASE"
  },
  ...
]
```

---

#### `GET /api/samples/{filename}/content`

Return raw content of a sample log file.

---

#### `GET /api/health`

Engine health and metadata.

```json
{
  "status": "ok",
  "engine_version": "1.6.0",
  "blueprint_version": "1.0.0",
  "blueprints_loaded": 10,
  "rules_loaded": 90
}
```

---

## 13. Database Schema

```mermaid
erDiagram
    analysis_results {
        VARCHAR(36) id PK
        VARCHAR(255) filename
        VARCHAR(64) log_hash
        TIMESTAMPTZ created_at
        VARCHAR(50) detection_status
        VARCHAR(100) primary_incident_id
        FLOAT confidence
        JSONB result_json
        INT log_lines_count
        INT log_size_bytes
        FLOAT analysis_duration_ms
    }
```

### Design Decisions

**Why JSONB for `result_json`?**

The full `EngineResult` object is stored as JSONB. This decision was intentional:

1. **Schema flexibility** — the engine result schema can evolve without migrations for the full JSON payload
2. **Query capability** — PostgreSQL JSONB supports indexed queries on nested fields if needed in future
3. **Atomic storage** — the full result is one consistent snapshot; no joins required to reconstruct
4. **Fast retrieval** — single row fetch returns the complete report

Key metadata fields (`detection_status`, `confidence`, `primary_incident_id`) are **also** stored as columns for efficient filtering/aggregation without unpacking JSONB.

**Why not MongoDB?**

PostgreSQL was chosen to demonstrate:
- Relational modeling with proper schema enforcement
- JSONB for semi-structured data (best of both worlds)
- Production-oriented architecture with `log_hash` for deduplication
- SQLAlchemy async for non-blocking I/O

---

## 14. Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- `yarn` package manager

### Clone and Install

```bash
git clone https://github.com/your-org/deployment-doctor.git
cd deployment-doctor
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Database Setup

```bash
# Create PostgreSQL user and database
sudo -u postgres psql <<EOF
CREATE USER deploymentdoctor WITH PASSWORD 'dd_secure_2024';
CREATE DATABASE deployment_doctor OWNER deploymentdoctor;
GRANT ALL PRIVILEGES ON DATABASE deployment_doctor TO deploymentdoctor;
EOF
```

### Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://deploymentdoctor:yourpassword@localhost:5432/deployment_doctor
OPENROUTER_API_KEY=          # Optional: add your OpenRouter key to enable AI summaries
ENGINE_VERSION=1.6.0
BLUEPRINT_VERSION=1.0.0
CORS_ORIGINS=*
```

```bash
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Start Services

```bash
# Terminal 1: Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Frontend
cd frontend
yarn install
yarn start
```

### Verify

```bash
# Backend health
curl http://localhost:8001/api/health

# Expected:
# {"status":"ok","blueprints_loaded":10,"rules_loaded":90}

# Run tests
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Test With Sample Logs

```bash
# Analyze the DB failure demo log
curl -X POST http://localhost:8001/api/analyze \
  -F "file=@sample-logs/01-db-connection-failure.log"

# Expected: primary_incident.blueprint_id = "DB_CONNECTION_FAILURE"
```

---

## 15. Docker Setup

### docker-compose.yml

```yaml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: deploymentdoctor
      POSTGRES_PASSWORD: dd_secure_2024
      POSTGRES_DB: deployment_doctor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U deploymentdoctor -d deployment_doctor"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      DATABASE_URL: postgresql+asyncpg://deploymentdoctor:dd_secure_2024@db:5432/deployment_doctor
      ENGINE_VERSION: "1.6.0"
      BLUEPRINT_VERSION: "1.0.0"
      CORS_ORIGINS: "*"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      REACT_APP_BACKEND_URL: http://localhost:8001
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### Start With Docker

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f backend

# Run tests inside container
docker compose exec backend pytest tests/ -v

# Stop all
docker compose down
```

---

## 16. GitHub Actions

The CI pipeline runs on every push and pull request:

```yaml
# .github/workflows/ci.yml
name: Deployment Doctor CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: deploymentdoctor
          POSTGRES_PASSWORD: dd_secure_2024
          POSTGRES_DB: deployment_doctor
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run pytest with coverage
        env:
          DATABASE_URL: postgresql+asyncpg://deploymentdoctor:dd_secure_2024@localhost:5432/deployment_doctor
          ENGINE_VERSION: "1.6.0"
          BLUEPRINT_VERSION: "1.0.0"
        run: |
          cd backend
          pytest tests/ -v --cov=app --cov-report=xml --cov-fail-under=85

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml

  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install flake8 mypy
          flake8 app/ --max-line-length=100 --exclude=__pycache__

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'yarn'
          cache-dependency-path: frontend/yarn.lock

      - name: Install dependencies
        run: |
          cd frontend
          yarn install --frozen-lockfile

      - name: Build frontend
        run: |
          cd frontend
          REACT_APP_BACKEND_URL=http://localhost:8001 yarn build
```

---

## 17. Screenshots

### Upload Page
The drag-and-drop upload interface with dark Grafana-inspired theme.

### Demo Center
11 one-click scenario cards with severity badges and category labels.

### Report Page
Full incident analysis report with confidence gauge, evidence attribution table, relationship graph, audit trail, and verification commands.

### Knowledge Base
Expandable blueprint cards showing all 90 detection rules with weights, causes, and commands.

---

## 18. Incident Blueprint Library

| ID | Title | Severity | Category | Patterns | Causes |
|---|---|---|---|---|---|
| `DB_CONNECTION_FAILURE` | Database Connection Failure | CRITICAL | DATABASE | 9 | `CRASH_LOOP_BACKOFF` |
| `DNS_FAILURE` | DNS Resolution Failure | CRITICAL | NETWORKING | 9 | `DB_CONNECTION_FAILURE`, `IMAGE_PULL_FAILURE` |
| `PORT_CONFLICT` | Port Conflict / Address In Use | ERROR | NETWORKING | 9 | `CRASH_LOOP_BACKOFF` |
| `CRASH_LOOP_BACKOFF` | CrashLoopBackOff | CRITICAL | KUBERNETES | 9 | _(symptom)_ |
| `OOM_KILLED` | Out of Memory | CRITICAL | RESOURCES | 9 | `CRASH_LOOP_BACKOFF` |
| `IMAGE_PULL_FAILURE` | Image Pull Failure | ERROR | KUBERNETES | 9 | `CRASH_LOOP_BACKOFF` |
| `AUTHENTICATION_FAILURE` | Authentication Failure | ERROR | SECURITY | 9 | — |
| `MISSING_CONFIGURATION` | Missing Configuration | ERROR | CONFIGURATION | 9 | `CRASH_LOOP_BACKOFF`, `AUTHENTICATION_FAILURE` |
| `DISK_FULL` | Disk / Storage Full | CRITICAL | STORAGE | 9 | `DB_CONNECTION_FAILURE` |
| `PERMISSION_DENIED` | Permission Denied | ERROR | SECURITY | 9 | `AUTHENTICATION_FAILURE` |

---

## 19. Resume Description

```
Deployment Doctor — Explainable Incident Detection Engine
Personal Project · 2024

Built a production-grade, rule-based log analysis platform for DevOps/SRE teams
that deterministically identifies deployment root causes from raw log files.

Key Engineering Contributions:

  Architecture:
  • Designed a 10-stage detection pipeline (pattern matching → evidence attribution
    → deduped confidence scoring → DAG relationship analysis → deterministic ranking)
    with zero AI dependency for detection logic
  • Implemented a Directed Acyclic Graph (DAG) validation system with DFS cycle
    detection that enforces incident relationship integrity at application startup
  • Built a stateless engine architecture where every component is pure function,
    ensuring identical output for identical input (no global mutable state)

  Backend:
  • FastAPI + SQLAlchemy async + PostgreSQL with JSONB result storage
  • Pydantic v2 strongly-typed models throughout entire detection pipeline
  • Blueprint Validation Engine with startup-time hard fail on schema/DAG errors
  • Proximity-validated relationship bonus system (200-line sliding window)
  • Deterministic tie-breaking algorithm (score → severity → priority → ID)

  Testing:
  • 41 pytest tests with 90%+ coverage across all engine components
  • 3 explicit acceptance tests matching product specification criteria
  • Tests for deduplication invariants, cycle detection, and proximity windows

  Infrastructure:
  • Docker Compose setup with PostgreSQL health checks
  • GitHub Actions CI/CD pipeline with coverage reporting

  Frontend:
  • React dashboard with Grafana/Kibana-inspired dark theme
  • 12-section report page with confidence gauge, evidence table, relationship
    graph, audit trail, verification commands, and optional AI summary
  • One-click Demo Center with 11 production scenario simulations

Tech Stack: Python · FastAPI · SQLAlchemy · PostgreSQL · React · TailwindCSS · Pytest · Docker
```

---

## 20. Interview Questions & Answers

### Q: Why is determinism so important for a debugging tool?

**A:** In incident response, trust is everything. If an engineer runs the same log through a tool twice and gets different results, they cannot trust either result. Determinism means:

1. **Reproducibility** — paste the same log into a post-mortem ticket and get the same analysis
2. **Auditability** — "why did you say DB failure?" has an exact, traceable answer
3. **Testability** — acceptance tests can assert exact outputs without mocking
4. **Operator trust** — SREs can build playbooks around predictable tool behavior

An LLM-based approach fails all four criteria.

---

### Q: How does deduplication prevent score inflation?

**A:** Without deduplication, a chatty application that prints "connection refused" 500 times per second would receive `500 × weight` score — completely drowning out the actual diagnostic value of _diversity_ of matched patterns.

The correct signal is: "This log matches 7 distinct patterns of DB_CONNECTION_FAILURE" — not "this log contains the word 'refused' 500 times."

I track `occurrences` separately for display (showing the user that the error repeated 500 times), but only add the weight once to `pattern_score`.

---

### Q: Walk me through the relationship bonus system.

**A:** The DAG defines causal relationships between blueprints (e.g., DNS_FAILURE causes DB_CONNECTION_FAILURE causes CRASH_LOOP_BACKOFF).

During analysis:
1. Traverse each detected blueprint's `causes_incidents` list
2. Check if the caused blueprint is also detected
3. If yes, compute minimum line distance between their evidence records using an O(n log n) two-pointer algorithm on sorted line arrays
4. If distance ≤ 200 lines → apply +20 relationship bonus to the root cause blueprint

The proximity window prevents false positives: two unrelated incidents that happen to share a log file shouldn't be linked just because they both appear in the same 10,000-line file.

---

### Q: What happens if two incidents have the same score?

**A:** The ranking uses a 4-key deterministic sort:

1. **Incident score** (descending) — primary sort key
2. **Severity** (CRITICAL > ERROR > WARNING > INFO) — same score, higher severity wins
3. **Blueprint priority** (ascending) — lower number = higher architectural importance
4. **Blueprint ID** (alphabetical) — absolute final tiebreaker, always produces same result

This ensures the ranking is **total** (every incident has a unique rank) and **stable** across all environments.

---

### Q: Why did you use PostgreSQL JSONB instead of separate tables for evidence records?

**A:** Trade-off analysis:

**Normalized approach** (separate tables for evidence, patterns, audit trail):
- Pro: Queryable fields, better for analytics
- Con: Complex joins to reconstruct a full report; schema migrations needed for every result structure change; slower single-report retrieval

**JSONB approach** (full result as one JSONB column):
- Pro: Single-row fetch returns complete report; no joins; schema-flexible as engine evolves
- Con: Can't query inside JSONB without indexes

I chose JSONB for `result_json` but **also** extracted `detection_status`, `confidence`, and `primary_incident_id` as real columns. This gives the best of both: efficient filtering/aggregation on extracted columns, atomic retrieval for full reports. This pattern mirrors how Elasticsearch and Datadog store event documents.

---

### Q: Why not just use MongoDB for this?

**A:** MongoDB would work fine. I chose PostgreSQL to demonstrate:

1. **Schema enforcement** — `analysis_results` has typed columns + JSONB, not "anything goes"
2. **JSONB is best of both worlds** — structured columns for indexes + flexible JSONB for the payload
3. **Production relevance** — most serious data infrastructure runs on PostgreSQL
4. **SQLAlchemy async** — shows understanding of async ORM patterns with proper connection pooling

The architecture would translate to MongoDB trivially — JSONB maps to a nested document.

---

### Q: What would you change about this architecture at 10× scale?

**A:**

1. **Async analysis queue** — move analysis off the HTTP request path using Celery + Redis. Client polls for result via polling endpoint or WebSocket
2. **Blueprint hot-reload** — watch `incidents.json` with `inotify` and reload without restart
3. **Pattern index** — pre-compile lowercase pattern strings into an Aho-Corasick automaton for O(n + m) multi-pattern matching instead of O(n × m)
4. **Partitioned PostgreSQL table** — partition `analysis_results` by month for query efficiency at millions of rows
5. **Metrics export** — emit analysis duration, detection status distribution, blueprint hit rates to Prometheus
6. **Blueprint version control** — store `blueprint_version` per analysis result so old reports can be re-interpreted with new blueprints

---

## 21. Design Tradeoffs

### Tradeoff 1: Rule-Based vs. ML-Based Detection

**Chosen:** Rule-based (pattern matching with weighted scoring)

**Rejected:** ML classifier trained on labeled log data

**Reasoning:**
- Rule-based systems are explainable by definition — every score can be traced to a named pattern
- ML models require labeled training data that most organizations don't have
- ML confidence is a black box; rule-based confidence is a sum you can verify by hand
- Rules can be updated by SREs without data science expertise
- Determinism is guaranteed with rules; guaranteed to be absent with neural networks

**Cost:** Rules require maintenance as log formats evolve; ML would adapt automatically.

---

### Tradeoff 2: Substring Matching vs. Regex

**Chosen:** Substring matching (case-insensitive)

**Rejected:** Full regex pattern matching

**Reasoning:**
- Substring matching is O(n) with modern string implementations; regex can be O(n²) for pathological inputs
- Substring matches are trivially explainable: "this pattern is in that line"
- Regex patterns in JSON files are error-prone (escape sequences, special chars)
- Substring matching eliminates ReDoS (Regex Denial of Service) as an attack vector

**Cost:** Less expressive — cannot match log formats that require positional assertions.

---

### Tradeoff 3: In-Process Engine vs. Microservices

**Chosen:** Single-process FastAPI with all engines as stateless functions

**Rejected:** Individual microservices for each engine component

**Reasoning:**
- In-process function calls are 1000× faster than HTTP calls between services
- No network partitioning, no service discovery overhead
- Stateless functions are testable in pure Python without HTTP stubs
- The engine is not CPU-bound enough to warrant worker distribution

**Cost:** Cannot scale individual engine components independently.

---

### Tradeoff 4: JSONB Storage vs. Fully Normalized Schema

**Chosen:** JSONB for full result + extracted columns for key fields

**Rejected:** Fully normalized tables (evidence_records, audit_trail_entries, etc.)

**Reasoning:**
- Report retrieval is a read-heavy, single-record operation — one JSONB read beats 5+ joins
- Engine result schema will evolve; JSONB avoids migrations for every field addition
- Extracted columns (`detection_status`, `confidence`) cover the analytics use case

---

## 22. Future Improvements

### Short-Term (P1)

| Feature | Description |
|---|---|
| Analysis History Page | Browse past analyses with filter by status/date/incident |
| Copy as Markdown | One-click export of report as Slack/PagerDuty-ready Markdown |
| Custom Blueprint UI | Browser-based blueprint editor with live validation |
| Webhook Notifications | POST to Slack/PagerDuty on CONFIDENT detection |

### Medium-Term (P2)

| Feature | Description |
|---|---|
| Aho-Corasick Pattern Index | O(n+m) multi-pattern matching for large log files |
| Analysis Queue | Async via Celery + Redis — decouples upload from analysis |
| Blueprint Versioning | Track which blueprint version produced each analysis |
| Prometheus Metrics | Detection rate, confidence distribution, engine latency |

### Long-Term (P3)

| Feature | Description |
|---|---|
| Live Kubernetes Log Streaming | Stream pod logs directly via Kubernetes API |
| Incident Timeline | Correlate multiple log files across a time range |
| Team Knowledge Base | Allow teams to add custom blueprints and share findings |
| Pattern Learning | Suggest new patterns from logs that triggered INSUFFICIENT_EVIDENCE |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

*Built with a focus on determinism, explainability, and production-grade engineering practices.*
