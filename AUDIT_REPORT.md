# Deployment Doctor — Engineering & Product Audit Report

**Generated:** 2026-02-13  
**Engine Version:** 1.6.0  
**Blueprint Version:** 1.0.0  
**Source of Truth:** Repository at `/app/` — read-only inspection, no code changes made.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repository Structure](#2-repository-structure)
3. [Backend Audit](#3-backend-audit)
4. [Detection Blueprint Audit](#4-detection-blueprint-audit)
5. [Rule Engine Audit](#5-rule-engine-audit)
6. [Relationship Engine Audit](#6-relationship-engine-audit)
7. [Database Audit](#7-database-audit)
8. [API Audit](#8-api-audit)
9. [Frontend Audit](#9-frontend-audit)
10. [UI Feature Audit](#10-ui-feature-audit)
11. [AI Integration Audit](#11-ai-integration-audit)
12. [Testing Audit](#12-testing-audit)
13. [Deployment Audit](#13-deployment-audit)
14. [Product Readiness Assessment](#14-product-readiness-assessment)
15. [Competitive Positioning](#15-competitive-positioning)
16. [Acquisition Readiness Assessment](#16-acquisition-readiness-assessment)
17. [Feature Gap Analysis](#17-feature-gap-analysis)
18. [Current Product Definition](#18-current-product-definition)

---

## 1. Executive Summary

### What is this product?

Deployment Doctor is a deterministic, rule-based incident detection engine for deployment and operations logs. It ingests a plain-text log file, scans it against a library of named incident blueprints using substring pattern matching, attributes evidence to specific log lines, calculates a scored confidence value through a transparent multi-component formula, evaluates Directed Acyclic Graph (DAG) cause-effect relationships between incidents, and produces a ranked root-cause report. Every decision in the pipeline is traceable via a full audit trail. AI involvement is strictly limited to an optional natural-language summary generated after detection is complete.

### What problem does it solve?

When a Kubernetes deployment or service fails, engineers face a wall of logs containing hundreds or thousands of lines. Identifying the true root cause from symptoms (e.g., `CrashLoopBackOff`) rather than the underlying cause (e.g., `DB_CONNECTION_FAILURE`) requires experience and time. Deployment Doctor automates this triage by:

- Separating root causes from downstream symptoms using a typed incident role system (`root_cause` vs `symptom`).
- Applying a penalty to symptom-role incidents so they do not crowd out root causes in the ranking.
- Validating cause-effect chains via DAG relationships and proximity checks, issuing a scoring bonus when a declared chain is confirmed in the log.
- Producing a complete, deterministic audit trail so the engineer can verify every scoring decision.

### Who is the target user?

- **Primary:** Site Reliability Engineers (SREs) and DevOps engineers performing incident triage on Kubernetes-hosted applications.
- **Secondary:** Platform engineers building internal tooling, developers learning incident patterns from the Knowledge Base.

### What is currently implemented?

| Area | Status |
|------|--------|
| Deterministic pattern-matching detection engine | COMPLETE |
| 10 incident blueprints, 90 detection rules | COMPLETE |
| DAG relationship engine with proximity validation | COMPLETE |
| Multi-component confidence scoring with audit trail | COMPLETE |
| Root-cause ranking with ambiguity detection | COMPLETE |
| PostgreSQL persistence of analysis results | COMPLETE |
| FastAPI backend with 5 routes across 3 routers | COMPLETE |
| React/Tailwind dark-theme observability UI | COMPLETE |
| 4 frontend pages (Analyze, Report, Demo Center, Knowledge Base) | COMPLETE |
| 11 sample log files covering all 10 blueprints | COMPLETE |
| Demo Center (one-click scenario execution) | COMPLETE |
| Incident Knowledge Base (browseable, searchable) | COMPLETE |
| Deterministic AI summary fallback | COMPLETE |
| Optional OpenRouter AI summary (requires API key) | COMPLETE |
| Docker + Docker Compose local deployment | COMPLETE |
| GitHub Actions CI pipeline (5 jobs) | COMPLETE |
| 41 unit/integration engine tests (pytest) | COMPLETE |
| 13 API integration tests (pytest + requests) | COMPLETE |

### What is not implemented?

| Area | Status |
|------|--------|
| User authentication / access control | NOT IMPLEMENTED |
| Multi-tenant or team workspace support | NOT IMPLEMENTED |
| Real-time log streaming / tail analysis | NOT IMPLEMENTED |
| Interactive visual DAG graph (force-directed, d3, etc.) | NOT IMPLEMENTED — current graph is a text-based edge list |
| Historical analysis dashboard / trend charts | NOT IMPLEMENTED |
| Webhook / Slack / PagerDuty alert integrations | NOT IMPLEMENTED |
| Custom blueprint authoring via UI | NOT IMPLEMENTED |
| Regex-based pattern matching (current: substring only) | NOT IMPLEMENTED |
| Multi-file analysis / cross-log correlation | NOT IMPLEMENTED |
| Report export (PDF, JSON download) | NOT IMPLEMENTED |
| Pagination for results list | NOT IMPLEMENTED |
| User-configurable scoring thresholds | NOT IMPLEMENTED |

---

## 2. Repository Structure

```
/app/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI pipeline (5 jobs)
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py             # SQLAlchemy async engine + session + init_db()
│   │   ├── models.py               # SQLAlchemy ORM model: AnalysisResult
│   │   ├── schemas.py              # Pydantic models + all global scoring constants
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── analyze.py          # /api/analyze, /api/analyze/json, /api/results
│   │   │   ├── incidents.py        # /api/incidents, /api/incidents/{id}
│   │   │   └── samples.py          # /api/samples, /api/samples/{filename}/content
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── ai_summary.py       # Optional OpenRouter call + deterministic fallback
│   │       ├── blueprint_validator.py  # Startup validation + DAG cycle detection + cache
│   │       ├── pattern_matcher.py  # Case-insensitive substring matching, deduplication
│   │       ├── relationship_engine.py  # DAG cause-effect bonus + proximity check
│   │       ├── root_cause_engine.py    # Main orchestrator — 7-stage pipeline
│   │       └── scoring_engine.py   # Scoring formula: pattern + bonus + penalty
│   ├── rules/
│   │   └── incidents.json          # 10 blueprints, 90 patterns — single source of truth
│   ├── sample-logs/
│   │   ├── 01-db-connection-failure.log
│   │   ├── 02-dns-failure.log
│   │   ├── 03-port-conflict.log
│   │   ├── 04-crashloopbackoff.log
│   │   ├── 05-oomkilled.log
│   │   ├── 06-imagepullfailure.log
│   │   ├── 07-authentication-failure.log
│   │   ├── 08-missing-configuration.log
│   │   ├── 09-disk-full.log
│   │   ├── 10-permission-denied.log
│   │   └── 11-root-cause-demo.log  # Multi-incident: DB failure → CrashLoop chain
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_engine.py          # 41 engine unit tests across 12 test classes
│   │   └── test_api.py             # 13 API integration tests (require live backend)
│   ├── Dockerfile                  # python:3.11-slim, exposes 8001
│   ├── requirements.txt            # 9 direct dependencies
│   └── server.py                   # FastAPI app factory + lifespan + CORS + routers
│
├── frontend/
│   ├── src/
│   │   ├── App.js                  # Router setup: 4 routes
│   │   ├── App.css                 # Minimal global styles
│   │   ├── index.js                # React 19 root render
│   │   ├── index.css               # Tailwind directives + design tokens + badge utilities
│   │   ├── components/
│   │   │   ├── dd/                 # 11 feature-specific components
│   │   │   │   ├── AISummary.js
│   │   │   │   ├── AuditTrailViewer.js
│   │   │   │   ├── ConfidenceBreakdown.js
│   │   │   │   ├── DashboardLayout.js
│   │   │   │   ├── DetectionStatus.js
│   │   │   │   ├── EngineMetadata.js
│   │   │   │   ├── EvidenceViewer.js
│   │   │   │   ├── IncidentGraph.js
│   │   │   │   ├── IncidentSummary.js
│   │   │   │   ├── RecommendedFixes.js
│   │   │   │   └── VerificationCommands.js
│   │   │   └── ui/                 # Shadcn/Radix UI component library (unused in app logic)
│   │   ├── hooks/
│   │   │   └── use-toast.js
│   │   ├── lib/
│   │   │   └── utils.js
│   │   └── pages/
│   │       ├── HomePage.js                 # Log upload + drag-drop
│   │       ├── IncidentKnowledgeBasePage.js # Searchable blueprint browser
│   │       ├── ReportPage.js               # Full analysis report view
│   │       └── SampleScenariosPage.js      # Demo Center
│   ├── Dockerfile                  # Multi-stage: node:18-alpine build + nginx:alpine serve
│   ├── craco.config.js
│   ├── jsconfig.json
│   ├── package.json                # React 19, react-router-dom 7, axios, lucide-react, TailwindCSS
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── yarn.lock
│
├── docker-compose.yml              # 3 services: db (postgres:15), backend, frontend
├── README.md                       # Architecture, setup guide, engine documentation
├── AUDIT_REPORT.md                 # This file
└── memory/
    └── PRD.md                      # Product requirements document
```

**Purpose summary by directory:**

| Directory / File | Purpose |
|---|---|
| `backend/app/services/` | All detection logic — entirely stateless, no side effects |
| `backend/rules/incidents.json` | Sole source of truth for all detection blueprints and patterns |
| `backend/sample-logs/` | Demo inputs — one file per incident type plus a multi-incident chain demo |
| `backend/tests/` | Pytest test suite — engine unit tests + API integration tests |
| `frontend/src/pages/` | Four top-level views served by React Router |
| `frontend/src/components/dd/` | Report sub-components, each rendering one logical section of the analysis result |
| `docker-compose.yml` | Complete local development stack definition |
| `.github/workflows/ci.yml` | Automated CI: test, validate blueprints, lint, build frontend, acceptance tests |

---

## 3. Backend Audit

### FastAPI Architecture

The application is a single-process FastAPI application defined in `server.py`. It uses the `lifespan` async context manager pattern (FastAPI's recommended startup/shutdown hook) to:
1. Validate and load all blueprints from `incidents.json` at startup — fails hard if invalid.
2. Initialize the PostgreSQL schema via `Base.metadata.create_all`.

Three `APIRouter` instances are included with the `/api` prefix:
- `analyze_router` — log analysis endpoints
- `incidents_router` — blueprint knowledge base endpoints
- `samples_router` — demo center endpoints

A standalone `GET /api/health` route reports engine health.

CORS is configured via `CORSMiddleware`. Origins are read from the `CORS_ORIGINS` environment variable (defaults to `"*"` when the variable is set to that value in `docker-compose.yml`).

**Server runtime:** Uvicorn, port 8001, host `0.0.0.0`.  
**Async I/O:** All database operations are async via `asyncpg` and `AsyncSession`.  
**Framework version:** FastAPI 0.110.1, Pydantic 2.11.5, SQLAlchemy 2.0.36.

### Service Layer

All business logic is in `backend/app/services/`. Every module is **stateless** — functions receive inputs and return outputs with no shared mutable state (the blueprint cache in `blueprint_validator.py` is a read-only module-level dict populated once at startup).

| Module | Responsibility | Inputs | Outputs |
|--------|----------------|--------|---------|
| `blueprint_validator.py` | Load, validate, and cache blueprints from JSON. DAG cycle detection. | File path | `Dict[str, IncidentBlueprint]` |
| `pattern_matcher.py` | Scan log lines against all blueprints. Deduplicate pattern hits. | `log_content: str`, `blueprints` | `Dict[bp_id, (List[PatternMatch], List[EvidenceRecord])]` |
| `relationship_engine.py` | Validate cause-effect pairs. Apply proximity check. Build graph. | `blueprint_matches`, `blueprints`, `audit_trail` | `(Dict[bp_id, float], RelationshipResult)` |
| `scoring_engine.py` | Compute pattern score, evidence bonus, relationship bonus, symptom penalty. | `blueprint`, `matched_patterns`, `evidence`, `relationship_bonus`, `audit_trail` | `IncidentResult` |
| `root_cause_engine.py` | Orchestrate all stages. Rank results. Determine detection status. | `AnalysisRequest` | `EngineResult` |
| `ai_summary.py` | Generate optional prose summary. Never participates in detection. | `EngineResult` | `(Optional[str], bool)` |

### Detection Engine

The detection engine is implemented in `root_cause_engine.run_analysis()`. It is a 7-stage sequential pipeline:

```
Stage 1: PATTERN_MATCHING      — match_blueprints()
Stage 2: RELATIONSHIP_ANALYSIS — analyze_relationships()
Stage 3: SCORING               — score_incident() per blueprint
Stage 4: THRESHOLD_FILTER      — exclude incidents with score < MIN_SCORE (50)
Stage 5: RANKING               — deterministic 4-key sort
Stage 6: DETECTION_STATUS      — CONFIDENT / AMBIGUOUS / INSUFFICIENT_EVIDENCE
Stage 7: RESULT_ASSEMBLY       — EngineResult construction
```

Every stage appends one or more `AuditTrailEntry` records to the shared `audit_trail` list, creating a complete step-by-step log of every decision.

**Determinism guarantee:** The ranking sort key is `(-incident_score, -SEVERITY_ORDER[severity], priority, blueprint_id)`. The final tiebreaker on `blueprint_id` (alphabetical) ensures the same input always produces the same ranked output regardless of Python dict insertion order.

### Evidence Attribution Engine

Implemented in `pattern_matcher.match_blueprints()`.

For every line in the log and every pattern in every blueprint, if the pattern (lowercased) is found as a substring of the line (lowercased), an `EvidenceRecord` is created containing:
- `line_number` (1-based)
- `line_text` (truncated to 300 chars)
- `matched_pattern` (original casing preserved)
- `matched_blueprint_id`
- `weight`

Evidence records are collected for all occurrences (for display in the UI), but **deduplication is enforced for scoring**: each unique pattern contributes its weight to the score exactly once per blueprint, regardless of repetition count. Occurrence counts are tracked separately in `PatternMatch.occurrences` and are display-only.

### Confidence Scoring Engine

Implemented in `scoring_engine.score_incident()`.

```
pattern_score    = Σ weight(unique matched patterns)
evidence_bonus   = +10  if len(matched_patterns) >= 3, else 0
relationship_bonus = +20 per validated cause-effect pair (pre-computed)
symptom_penalty  = -20  if blueprint.incident_role == "symptom", else 0

incident_score   = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
confidence       = min(incident_score, 100.0)
```

`incident_score` is not capped and may exceed 100. `confidence` is capped at 100 and is the display-facing percentage. Both values are returned in the response.

### Relationship Analysis Engine

Implemented in `relationship_engine.analyze_relationships()`.

For every `(source, target)` pair declared in `blueprint.causes_incidents`:
1. Both blueprints must have produced at least one pattern match in the current log.
2. The minimum line distance between any evidence line of the source and any evidence line of the target must be `<= PROXIMITY_WINDOW` (200 lines).
3. If both conditions hold: `relationship_bonus += RELATIONSHIP_BONUS` (+20) is added to the source blueprint's score.

The minimum distance algorithm is O(n log n) via sorted merge (see `_min_line_distance()`).

### Ranking Engine

Implemented in `root_cause_engine._rank_incidents()` and `_determine_status()`.

**Sort key (descending priority):**
1. `incident_score` — highest first
2. `severity` — CRITICAL (4) > ERROR (3) > WARNING (2) > INFO (1)
3. `priority` — lowest number first (lower = higher importance)
4. `blueprint_id` — alphabetical (absolute tiebreaker)

**Status determination** (`_determine_status()`):
- `CONFIDENT`: single incident above threshold, or top-two score gap `>= AMBIGUITY_THRESHOLD` (10)
- `AMBIGUOUS`: two or more incidents above threshold with score gap `< 10`
- `INSUFFICIENT_EVIDENCE`: no incident reached `MIN_SCORE` (50)

---

## 4. Detection Blueprint Audit

**Source file:** `/app/backend/rules/incidents.json`

**Total blueprints: 10**  
**Total rules (patterns): 90** (9 patterns per blueprint, consistent across all)

---

### Blueprint 1: DB_CONNECTION_FAILURE

| Field | Value |
|---|---|
| **Incident ID** | `DB_CONNECTION_FAILURE` |
| **Title** | Database Connection Failure |
| **Category** | DATABASE |
| **Severity** | CRITICAL |
| **Incident Role** | `root_cause` |
| **Priority** | 1 (highest) |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `CRASH_LOOP_BACKOFF` |
| **Max Pattern Score** | 360 (sum of all 9 weights) |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | `min(pattern_score + evidence_bonus + relationship_bonus, 100)` |

**Patterns:**

| Pattern | Weight |
|---|---|
| `connection refused` | 40 |
| `could not connect to server` | 45 |
| `database connection failed` | 50 |
| `ECONNREFUSED` | 40 |
| `connection pool exhausted` | 35 |
| `too many connections` | 30 |
| `unable to connect to database` | 45 |
| `sql: database is closed` | 35 |
| `lost connection to MySQL server` | 40 |

---

### Blueprint 2: DNS_FAILURE

| Field | Value |
|---|---|
| **Incident ID** | `DNS_FAILURE` |
| **Title** | DNS Resolution Failure |
| **Category** | NETWORKING |
| **Severity** | CRITICAL |
| **Incident Role** | `root_cause` |
| **Priority** | 2 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `DB_CONNECTION_FAILURE`, `IMAGE_PULL_FAILURE` |
| **Max Pattern Score** | 400 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `no such host` | 50 |
| `Name or service not known` | 45 |
| `getaddrinfo ENOTFOUND` | 45 |
| `Could not resolve host` | 45 |
| `dns lookup failed` | 50 |
| `NXDOMAIN` | 40 |
| `Temporary failure in name resolution` | 40 |
| `failed to resolve hostname` | 45 |
| `dial tcp: lookup` | 40 |

---

### Blueprint 3: PORT_CONFLICT

| Field | Value |
|---|---|
| **Incident ID** | `PORT_CONFLICT` |
| **Title** | Port Conflict / Address Already in Use |
| **Category** | NETWORKING |
| **Severity** | ERROR |
| **Incident Role** | `root_cause` |
| **Priority** | 5 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `CRASH_LOOP_BACKOFF` |
| **Max Pattern Score** | 445 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `address already in use` | 55 |
| `EADDRINUSE` | 55 |
| `bind: address already in use` | 60 |
| `port is already allocated` | 50 |
| `listen tcp: bind` | 40 |
| `failed to bind to port` | 50 |
| `only one usage of each socket address` | 50 |
| `socket already in use` | 45 |
| `address in use` | 40 |

---

### Blueprint 4: CRASH_LOOP_BACKOFF

| Field | Value |
|---|---|
| **Incident ID** | `CRASH_LOOP_BACKOFF` |
| **Title** | CrashLoopBackOff — Container Restart Loop |
| **Category** | KUBERNETES |
| **Severity** | CRITICAL |
| **Incident Role** | `symptom` ← **the only symptom-role blueprint** |
| **Priority** | 3 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → (none) |
| **Max Pattern Score** | 345 |
| **Symptom Penalty** | −20 applied to incident_score |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | `min(pattern_score + evidence_bonus - 20, 100)` |

**Patterns:**

| Pattern | Weight |
|---|---|
| `CrashLoopBackOff` | 60 |
| `Back-off restarting failed container` | 55 |
| `Error: failed to start container` | 40 |
| `container terminated with exit code` | 35 |
| `Liveness probe failed` | 30 |
| `restarting container` | 25 |
| `pod restart count` | 25 |
| `container exited with error` | 30 |
| `pod is in a restart loop` | 45 |

---

### Blueprint 5: OOM_KILLED

| Field | Value |
|---|---|
| **Incident ID** | `OOM_KILLED` |
| **Title** | Out of Memory — Container Killed by OOM Killer |
| **Category** | RESOURCES |
| **Severity** | CRITICAL |
| **Incident Role** | `root_cause` |
| **Priority** | 4 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `CRASH_LOOP_BACKOFF` |
| **Max Pattern Score** | 495 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `OOMKilled` | 65 |
| `Out of memory` | 55 |
| `memory limit exceeded` | 55 |
| `container OOMKilled` | 60 |
| `java.lang.OutOfMemoryError` | 60 |
| `cannot allocate memory` | 45 |
| `Killed process` | 40 |
| `oom-killer` | 55 |
| `Exited with OOMKilled` | 60 |

---

### Blueprint 6: IMAGE_PULL_FAILURE

| Field | Value |
|---|---|
| **Incident ID** | `IMAGE_PULL_FAILURE` |
| **Title** | Container Image Pull Failure |
| **Category** | KUBERNETES |
| **Severity** | ERROR |
| **Incident Role** | `root_cause` |
| **Priority** | 6 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `CRASH_LOOP_BACKOFF` |
| **Max Pattern Score** | 450 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `Failed to pull image` | 55 |
| `ErrImagePull` | 55 |
| `ImagePullBackOff` | 60 |
| `repository does not exist` | 50 |
| `unauthorized: authentication required` | 45 |
| `manifest unknown` | 50 |
| `pull access denied` | 50 |
| `image not found` | 45 |
| `Error response from daemon: pull` | 40 |

---

### Blueprint 7: AUTHENTICATION_FAILURE

| Field | Value |
|---|---|
| **Incident ID** | `AUTHENTICATION_FAILURE` |
| **Title** | Authentication Failure |
| **Category** | SECURITY |
| **Severity** | ERROR |
| **Incident Role** | `root_cause` |
| **Priority** | 7 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → (none) |
| **Max Pattern Score** | 470 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `authentication failed` | 55 |
| `invalid credentials` | 55 |
| `401 Unauthorized` | 50 |
| `invalid token` | 50 |
| `password mismatch` | 55 |
| `login failed` | 55 |
| `access denied` | 40 |
| `FATAL: password authentication failed` | 60 |
| `SSH authentication error` | 50 |

---

### Blueprint 8: MISSING_CONFIGURATION

| Field | Value |
|---|---|
| **Incident ID** | `MISSING_CONFIGURATION` |
| **Title** | Missing or Invalid Configuration |
| **Category** | CONFIGURATION |
| **Severity** | ERROR |
| **Incident Role** | `root_cause` |
| **Priority** | 8 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `CRASH_LOOP_BACKOFF`, `AUTHENTICATION_FAILURE` |
| **Max Pattern Score** | 485 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `missing required environment variable` | 60 |
| `environment variable not set` | 55 |
| `config file not found` | 60 |
| `required configuration` | 45 |
| `undefined environment variable` | 55 |
| `mandatory configuration missing` | 60 |
| `could not load configuration` | 50 |
| `configuration key not found` | 55 |
| `Error loading config` | 45 |

---

### Blueprint 9: DISK_FULL

| Field | Value |
|---|---|
| **Incident ID** | `DISK_FULL` |
| **Title** | Disk / Storage Volume Full |
| **Category** | STORAGE |
| **Severity** | CRITICAL |
| **Incident Role** | `root_cause` |
| **Priority** | 9 |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `DB_CONNECTION_FAILURE` |
| **Max Pattern Score** | 535 (highest of all blueprints) |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `No space left on device` | 65 |
| `disk full` | 60 |
| `ENOSPC` | 60 |
| `write failed: No space` | 60 |
| `filesystem is full` | 60 |
| `not enough disk space` | 55 |
| `Disk quota exceeded` | 60 |
| `unable to write: no space` | 55 |
| `storage volume is full` | 60 |

---

### Blueprint 10: PERMISSION_DENIED

| Field | Value |
|---|---|
| **Incident ID** | `PERMISSION_DENIED` |
| **Title** | Permission Denied — Insufficient Privileges |
| **Category** | SECURITY |
| **Severity** | ERROR |
| **Incident Role** | `root_cause` |
| **Priority** | 10 (lowest) |
| **Number of Rules** | 9 |
| **Relationships** | Causes → `AUTHENTICATION_FAILURE` |
| **Max Pattern Score** | 455 |
| **Detection Threshold** | MIN_SCORE = 50 |
| **Confidence Logic** | Standard formula |

**Patterns:**

| Pattern | Weight |
|---|---|
| `Permission denied` | 55 |
| `EACCES` | 55 |
| `access is denied` | 55 |
| `Operation not permitted` | 50 |
| `EPERM` | 50 |
| `insufficient privileges` | 55 |
| `you do not have permission` | 50 |
| `cannot read file` | 40 |
| `denied by policy` | 45 |

---

### Blueprint Summary Table

| ID | Category | Severity | Role | Rules | Causes |
|---|---|---|---|---|---|
| `DB_CONNECTION_FAILURE` | DATABASE | CRITICAL | root_cause | 9 | CRASH_LOOP_BACKOFF |
| `DNS_FAILURE` | NETWORKING | CRITICAL | root_cause | 9 | DB_CONNECTION_FAILURE, IMAGE_PULL_FAILURE |
| `PORT_CONFLICT` | NETWORKING | ERROR | root_cause | 9 | CRASH_LOOP_BACKOFF |
| `CRASH_LOOP_BACKOFF` | KUBERNETES | CRITICAL | **symptom** | 9 | — |
| `OOM_KILLED` | RESOURCES | CRITICAL | root_cause | 9 | CRASH_LOOP_BACKOFF |
| `IMAGE_PULL_FAILURE` | KUBERNETES | ERROR | root_cause | 9 | CRASH_LOOP_BACKOFF |
| `AUTHENTICATION_FAILURE` | SECURITY | ERROR | root_cause | 9 | — |
| `MISSING_CONFIGURATION` | CONFIGURATION | ERROR | root_cause | 9 | CRASH_LOOP_BACKOFF, AUTHENTICATION_FAILURE |
| `DISK_FULL` | STORAGE | CRITICAL | root_cause | 9 | DB_CONNECTION_FAILURE |
| `PERMISSION_DENIED` | SECURITY | ERROR | root_cause | 9 | AUTHENTICATION_FAILURE |

**Categories covered:** DATABASE (1), NETWORKING (2), KUBERNETES (2), RESOURCES (1), SECURITY (2), STORAGE (1), CONFIGURATION (1)  
**Severity distribution:** CRITICAL (5), ERROR (5), WARNING (0), INFO (0)  
**Total patterns:** 90

---

## 5. Rule Engine Audit

### Rule Schema

Each rule is a `BlueprintPattern` (Pydantic model defined in `schemas.py`):

```python
class BlueprintPattern(BaseModel):
    match: str   # The substring to search for (original case preserved)
    weight: int  # Scoring weight; must be > 0; validated at startup
```

Validation constraints enforced by `blueprint_validator.validate_blueprints()`:
- `weight > 0` — hard fail at startup if violated
- No duplicate patterns within a blueprint (case-insensitive comparison) — hard fail
- Minimum 3 patterns per blueprint — hard fail

### Pattern Matching Mechanism

**Algorithm:** Case-insensitive substring search.

```python
# From pattern_matcher.py
line_lower = raw_line.lower()
if pattern.match.lower() in line_lower:
    # match found
```

This is **not** regex. It is a literal string containment check (`in` operator). There is no wildcard, anchoring, or field-scoped matching. Any line containing the pattern as a substring (in any position) will match.

**Scanning scope:** Every line of the log is scanned against every pattern of every blueprint. There is no early termination.

**Line limits enforced before analysis:**
- Maximum file size: 5 MB (`MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024`)
- Maximum line count: 50,000 (`MAX_LOG_LINES = 50_000`)
- Violations return HTTP 413.

**Line truncation:** Evidence records truncate `line_text` to 300 characters for storage (`line_text[:300]`).

### Weighting System

Each pattern has a fixed integer `weight` (range observed across all blueprints: 25–65). Weights are not configurable at runtime — they are embedded in `incidents.json` and validated at startup.

Weight distribution across all 90 rules:
- Minimum weight: 25 (two patterns in `CRASH_LOOP_BACKOFF`: `restarting container`, `pod restart count`)
- Maximum weight: 65 (one pattern each in `OOM_KILLED`: `OOMKilled`; `DISK_FULL`: `No space left on device`)
- Most common range: 40–60

There is no multiplicative weight, contextual weight adjustment, or runtime weight override.

### Scoring Algorithm

```
pattern_score = Σ weight(p) for each UNIQUE matched pattern p
```

**Deduplication is critical to the scoring design.** If pattern `"connection refused"` (weight 40) appears on 500 lines, it contributes exactly 40 points — not 20,000. The occurrence count is tracked in `PatternMatch.occurrences` for display purposes only. From `pattern_matcher.py`:

```python
if pat_key in pattern_hits:
    w, cnt = pattern_hits[pat_key]
    pattern_hits[pat_key] = (w, cnt + 1)   # occurrence++ only
else:
    pattern_hits[pat_key] = (pattern.weight, 1)   # register weight once
```

### Threshold System

All thresholds are defined as module-level constants in `schemas.py`:

```python
MIN_SCORE           = 50    # Minimum incident_score to be included in results
AMBIGUITY_THRESHOLD = 10    # Minimum score gap between top-2 for CONFIDENT status
RELATIONSHIP_BONUS  = 20    # Added to cause blueprint when chain is validated
EVIDENCE_BONUS      = 10    # Added when >= 3 distinct patterns matched
SYMPTOM_PENALTY     = 20    # Subtracted when incident_role == "symptom"
PROXIMITY_WINDOW    = 200   # Max line distance for relationship bonus to apply
```

These constants are not configurable at runtime or via environment variables. Changing them requires editing `schemas.py`.

### Evidence Bonus System

```python
evidence_bonus = EVIDENCE_BONUS (10) if len(matched_patterns) >= 3 else 0.0
```

This is a flat +10 bonus awarded when 3 or more **distinct** patterns are matched. It does not scale with the number of patterns matched beyond 3. Maximum evidence bonus per incident: 10.

### Penalty System

```python
symptom_penalty = SYMPTOM_PENALTY (20) if blueprint.incident_role == "symptom" else 0.0
```

Currently, only `CRASH_LOOP_BACKOFF` has `incident_role = "symptom"`. This penalty ensures that even if `CrashLoopBackOff` generates a high pattern score, it ranks below root-cause blueprints that explain *why* the crash loop is occurring.

### Real Code Examples

**Evidence record creation** (`pattern_matcher.py`, lines 72–80):
```python
evidence_records.append(
    EvidenceRecord(
        line_number=line_num,
        line_text=line_text[:300],
        matched_pattern=pattern.match,
        matched_blueprint_id=bp_id,
        weight=pattern.weight,
    )
)
```

**Score computation** (`scoring_engine.py`, lines 41–82):
```python
pattern_score = float(sum(p.weight for p in matched_patterns))
evidence_bonus = float(EVIDENCE_BONUS) if len(matched_patterns) >= 3 else 0.0
incident_score = pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
confidence = min(incident_score, 100.0)
```

**Ranking sort key** (`root_cause_engine.py`, lines 197–203):
```python
def sort_key(inc: IncidentResult):
    return (
        -inc.incident_score,
        -SEVERITY_ORDER.get(inc.severity, 0),
        inc.priority,
        inc.blueprint_id,
    )
```

---

## 6. Relationship Engine Audit

### Storage Mechanism

Relationships are stored as a list of strings in each blueprint's `causes_incidents` field in `incidents.json`. Example:

```json
{
  "id": "DB_CONNECTION_FAILURE",
  "causes_incidents": ["CRASH_LOOP_BACKOFF"]
}
```

At runtime, the `RelationshipEdge` and `RelationshipNode` Pydantic models (defined in `schemas.py`) represent the in-memory graph structure returned in the API response. The relationship graph is not persisted to the database independently — it is serialized as part of `result_json` (JSONB column) in the `analysis_results` table.

### DAG Structure

The relationship system is a typed Directed Acyclic Graph where edges are directional cause-effect relationships. `blueprint_validator.py` enforces acyclicity at startup using a DFS-based 3-color algorithm:

```python
WHITE, GRAY, BLACK = 0, 1, 2
```

- WHITE = unvisited
- GRAY = in current DFS path (detecting back-edges = cycles)
- BLACK = fully explored

If a cycle is detected, startup fails with a descriptive error including the cycle path.

### Parent-Child Relationships (Cause → Effect)

Complete adjacency list from `incidents.json`:

| Source (Cause) | Target (Effect) |
|---|---|
| `DB_CONNECTION_FAILURE` | `CRASH_LOOP_BACKOFF` |
| `DNS_FAILURE` | `DB_CONNECTION_FAILURE` |
| `DNS_FAILURE` | `IMAGE_PULL_FAILURE` |
| `PORT_CONFLICT` | `CRASH_LOOP_BACKOFF` |
| `OOM_KILLED` | `CRASH_LOOP_BACKOFF` |
| `IMAGE_PULL_FAILURE` | `CRASH_LOOP_BACKOFF` |
| `MISSING_CONFIGURATION` | `CRASH_LOOP_BACKOFF` |
| `MISSING_CONFIGURATION` | `AUTHENTICATION_FAILURE` |
| `DISK_FULL` | `DB_CONNECTION_FAILURE` |
| `PERMISSION_DENIED` | `AUTHENTICATION_FAILURE` |

**Total declared edges: 10**  
**`CRASH_LOOP_BACKOFF` is the most common effect node**, appearing as a target of 4 different root causes.  
**`AUTHENTICATION_FAILURE` and `DB_CONNECTION_FAILURE`** each appear as effect targets of 2 root causes.

### Cause-Effect Chains (Transitive Paths)

Following the DAG edges transitively:

```
DNS_FAILURE → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF
DNS_FAILURE → IMAGE_PULL_FAILURE    → CRASH_LOOP_BACKOFF
DISK_FULL   → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF
MISSING_CONFIGURATION → AUTHENTICATION_FAILURE
MISSING_CONFIGURATION → CRASH_LOOP_BACKOFF
PERMISSION_DENIED     → AUTHENTICATION_FAILURE
```

Maximum chain depth: 3 nodes (DNS → DB → CRASH).

### Validation Logic

For each declared `(source, target)` edge during analysis, validation requires:

1. **Co-detection:** Both `source` and `target` blueprint IDs must appear as keys in `blueprint_matches` (i.e., both produced at least one pattern hit).
2. **Proximity:** The minimum absolute line-number distance between any evidence line of `source` and any evidence line of `target` must be `<= PROXIMITY_WINDOW` (200).

If validation passes: `relationship_bonus[source] += 20`.  
If co-detection passes but proximity fails: logged in audit trail as `RELATIONSHIP_REJECTED`, no bonus.  
If only one is detected: no edge entry in audit trail.

The graph data structure (`RelationshipResult`) includes all declared edges regardless of whether they were validated, with `bonus_applied` and `proximity_validated` boolean flags per edge.

### Complete Relationship Map

```
Nodes (10):
  DB_CONNECTION_FAILURE  [CRITICAL, root_cause]
  DNS_FAILURE            [CRITICAL, root_cause]
  PORT_CONFLICT          [ERROR,    root_cause]
  CRASH_LOOP_BACKOFF     [CRITICAL, symptom   ]  ← most targeted node
  OOM_KILLED             [CRITICAL, root_cause]
  IMAGE_PULL_FAILURE     [ERROR,    root_cause]
  AUTHENTICATION_FAILURE [ERROR,    root_cause]
  MISSING_CONFIGURATION  [ERROR,    root_cause]
  DISK_FULL              [CRITICAL, root_cause]
  PERMISSION_DENIED      [ERROR,    root_cause]

Edges (10, directed):
  DNS_FAILURE           ──causes──▶  DB_CONNECTION_FAILURE
  DNS_FAILURE           ──causes──▶  IMAGE_PULL_FAILURE
  DB_CONNECTION_FAILURE ──causes──▶  CRASH_LOOP_BACKOFF
  PORT_CONFLICT         ──causes──▶  CRASH_LOOP_BACKOFF
  OOM_KILLED            ──causes──▶  CRASH_LOOP_BACKOFF
  IMAGE_PULL_FAILURE    ──causes──▶  CRASH_LOOP_BACKOFF
  MISSING_CONFIGURATION ──causes──▶  CRASH_LOOP_BACKOFF
  MISSING_CONFIGURATION ──causes──▶  AUTHENTICATION_FAILURE
  DISK_FULL             ──causes──▶  DB_CONNECTION_FAILURE
  PERMISSION_DENIED     ──causes──▶  AUTHENTICATION_FAILURE
```

---

## 7. Database Audit

### PostgreSQL Schema

**Dialect:** PostgreSQL 15 (as defined in `docker-compose.yml`).  
**ORM:** SQLAlchemy 2.0.36 async (`asyncpg` driver).  
**Table creation:** Automatic via `Base.metadata.create_all` in the `lifespan` startup hook.

### Tables

**Table: `analysis_results`**

| Column | SQLAlchemy Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| `id` | `String(36)` | NOT NULL | PRIMARY KEY | UUID v4, generated in Python via `uuid.uuid4()` |
| `filename` | `String(255)` | NOT NULL | — | Original filename from upload |
| `log_hash` | `String(64)` | NULL | INDEX | SHA-256 hex of log content |
| `created_at` | `DateTime(timezone=True)` | NOT NULL | DEFAULT `func.now()` | PostgreSQL `server_default` |
| `detection_status` | `String(50)` | NOT NULL | — | One of: `CONFIDENT`, `AMBIGUOUS`, `INSUFFICIENT_EVIDENCE` |
| `primary_incident_id` | `String(100)` | NULL | — | Blueprint ID string, e.g., `DB_CONNECTION_FAILURE` |
| `confidence` | `Float` | NOT NULL | DEFAULT `0.0` | Capped at 100.0 |
| `result_json` | `JSONB` | NOT NULL | — | Full `EngineResult` serialized via `model_dump()` |
| `log_lines_count` | `Integer` | NOT NULL | DEFAULT `0` | Line count of analyzed log |
| `log_size_bytes` | `Integer` | NOT NULL | DEFAULT `0` | Byte size of analyzed log |
| `analysis_duration_ms` | `Float` | NOT NULL | DEFAULT `0.0` | Engine runtime in milliseconds |

**Total tables: 1**

### Indexes

| Column | Index Type |
|---|---|
| `id` | Primary key (implicit B-tree) |
| `log_hash` | Explicit B-tree index (`index=True`) |
| `created_at` | No explicit index — queries use `ORDER BY created_at DESC` in `list_results` |

### Constraints

- `id` is a PRIMARY KEY.
- `filename`, `detection_status`, `confidence`, `result_json`, `log_lines_count`, `log_size_bytes`, `analysis_duration_ms` are `NOT NULL`.
- No foreign keys (single-table schema).
- No unique constraints other than the primary key.
- No check constraints.

### SQLAlchemy Model

Defined in `backend/app/models.py`:

```python
class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    log_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    detection_status = Column(String(50), nullable=False)
    primary_incident_id = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    result_json = Column(JSONB, nullable=False)
    log_lines_count = Column(Integer, nullable=False, default=0)
    log_size_bytes = Column(Integer, nullable=False, default=0)
    analysis_duration_ms = Column(Float, nullable=False, default=0.0)
```

### Data Storage Rationale

The design uses a single-table schema where the normalized columns (`detection_status`, `primary_incident_id`, `confidence`, etc.) allow SQL-level querying and ordering, while `result_json` (JSONB) stores the complete denormalized `EngineResult` to avoid the cost of re-computing results on retrieval. The `GET /api/results/{id}` endpoint returns `record.result_json` directly without any re-computation.

The `log_hash` column is indexed to enable future deduplication queries (identifying repeated log submissions). It is currently not used in any active query or constraint.

---

## 8. API Audit

**Base URL prefix:** `/api`  
**Framework:** FastAPI 0.110.1  
**Serialization:** Pydantic `model_dump()` via JSON response

---

### Endpoint 1: POST /api/analyze

| Property | Value |
|---|---|
| **Route** | `POST /api/analyze` |
| **Method** | POST |
| **Content-Type** | `multipart/form-data` |
| **Request** | `file: UploadFile` (optional) OR `log_content: str` form field (optional) + `filename: str` form field |
| **Response** | Full `EngineResult` as JSON (see schema below) |
| **Status Codes** | 200 OK, 400 Bad Request (no content provided), 413 Request Entity Too Large (file too big) |
| **Purpose** | Primary analysis endpoint. Accepts file upload or raw text, runs full detection pipeline, persists result, returns `EngineResult` |

This is the main endpoint consumed by the frontend `HomePage` (file upload) and `SampleScenariosPage` (form-posted text content).

---

### Endpoint 2: POST /api/analyze/json

| Property | Value |
|---|---|
| **Route** | `POST /api/analyze/json` |
| **Method** | POST |
| **Content-Type** | `application/json` |
| **Request** | `{"log_content": "...", "filename": "..."}` (`AnalysisRequest` Pydantic model) |
| **Response** | Full `EngineResult` as JSON |
| **Status Codes** | 200 OK, 413 if oversized |
| **Purpose** | JSON-body analysis for programmatic/API client use |

---

### Endpoint 3: GET /api/results/{analysis_id}

| Property | Value |
|---|---|
| **Route** | `GET /api/results/{analysis_id}` |
| **Method** | GET |
| **Path Parameter** | `analysis_id: str` (UUID) |
| **Request** | None |
| **Response** | Stored `result_json` (JSONB column, `EngineResult` shape) |
| **Status Codes** | 200 OK, 404 if not found |
| **Purpose** | Retrieve a previously analyzed result by UUID. Used by `ReportPage` when the report is not in `sessionStorage` |

---

### Endpoint 4: GET /api/results

| Property | Value |
|---|---|
| **Route** | `GET /api/results` |
| **Method** | GET |
| **Query Parameter** | `limit: int = 20` (max 100) |
| **Request** | None |
| **Response** | `List[StoredAnalysisSummary]` — lightweight summary objects (no full result JSON) |
| **Status Codes** | 200 OK |
| **Purpose** | List recent analysis results ordered by `created_at DESC`. Not currently wired to any frontend page (frontend does not render a history list) |

---

### Endpoint 5: GET /api/incidents

| Property | Value |
|---|---|
| **Route** | `GET /api/incidents` |
| **Method** | GET |
| **Request** | None |
| **Response** | `List[IncidentBlueprint]` — all 10 blueprints with full patterns, causes, fixes, verification steps |
| **Status Codes** | 200 OK |
| **Purpose** | Knowledge base data source for `IncidentKnowledgeBasePage` |

---

### Endpoint 6: GET /api/incidents/{incident_id}

| Property | Value |
|---|---|
| **Route** | `GET /api/incidents/{incident_id}` |
| **Method** | GET |
| **Path Parameter** | `incident_id: str` (blueprint ID, e.g., `DB_CONNECTION_FAILURE`) |
| **Request** | None |
| **Response** | Single `IncidentBlueprint` |
| **Status Codes** | 200 OK, 404 if not found |
| **Purpose** | Retrieve a single blueprint by ID. Not used by current frontend pages |

---

### Endpoint 7: GET /api/samples

| Property | Value |
|---|---|
| **Route** | `GET /api/samples` |
| **Method** | GET |
| **Request** | None |
| **Response** | `List[SampleScenario]` — 11 scenario metadata objects |
| **Status Codes** | 200 OK |
| **Purpose** | Demo Center data source for `SampleScenariosPage` |

---

### Endpoint 8: GET /api/samples/{filename}/content

| Property | Value |
|---|---|
| **Route** | `GET /api/samples/{filename}/content` |
| **Method** | GET |
| **Path Parameter** | `filename: str` (must be in the known set of 11 filenames — allowlist enforced) |
| **Request** | None |
| **Response** | `{"filename": "...", "content": "..."}` |
| **Status Codes** | 200 OK, 404 if filename not in allowlist or file missing |
| **Purpose** | Returns raw content of a sample log file. Used by `SampleScenariosPage.runScenario()` to fetch log text before posting to `/api/analyze` |
| **Security** | Server-side allowlist check prevents path traversal |

---

### Endpoint 9: GET /api/health

| Property | Value |
|---|---|
| **Route** | `GET /api/health` |
| **Method** | GET |
| **Request** | None |
| **Response** | `{"status": "ok", "engine_version": "1.6.0", "blueprint_version": "1.0.0", "blueprints_loaded": 10, "rules_loaded": 90}` |
| **Status Codes** | 200 OK |
| **Purpose** | Health check for load balancers and CI |

---

### EngineResult Response Schema (abbreviated)

```json
{
  "analysis_id": "uuid-string",
  "filename": "string",
  "detection_status": "CONFIDENT | AMBIGUOUS | INSUFFICIENT_EVIDENCE",
  "confidence": 0.0,
  "primary_incident": {
    "blueprint_id": "string",
    "title": "string",
    "category": "string",
    "severity": "CRITICAL | ERROR | WARNING | INFO",
    "incident_role": "root_cause | symptom",
    "priority": 1,
    "pattern_score": 0.0,
    "evidence_bonus": 0.0,
    "relationship_bonus": 0.0,
    "symptom_penalty": 0.0,
    "incident_score": 0.0,
    "confidence": 0.0,
    "matched_patterns": [{"pattern": "...", "weight": 0, "occurrences": 0}],
    "evidence": [{"line_number": 1, "line_text": "...", "matched_pattern": "...", "matched_blueprint_id": "...", "weight": 0}],
    "possible_causes": ["..."],
    "verification_steps": ["..."],
    "recommended_fixes": ["..."],
    "causes_incidents": ["..."]
  },
  "contributing_incidents": [],
  "audit_trail": [{"stage": "...", "description": "...", "score_change": 0.0}],
  "engine_metadata": {
    "engine_version": "1.6.0",
    "blueprint_version": "1.0.0",
    "blueprints_loaded": 10,
    "rules_loaded": 90,
    "analysis_duration_ms": 0.0,
    "timestamp": "ISO-8601"
  },
  "relationship_graph": {
    "nodes": [{"id": "...", "title": "...", "severity": "...", "is_primary": false, "is_detected": false}],
    "edges": [{"source": "...", "target": "...", "relationship_type": "causes", "bonus_applied": false, "proximity_validated": false}],
    "bonuses_applied": []
  },
  "ai_summary": null,
  "ai_summary_available": false,
  "log_lines_analyzed": 0,
  "log_size_bytes": 0
}
```

---

## 9. Frontend Audit

### Routing

Configured in `App.js` using `react-router-dom` v7.15.0 with `BrowserRouter`:

| Route | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | Log file upload + drag-drop + analyze trigger |
| `/report/:analysisId` | `ReportPage` | Full analysis result display |
| `/sample-scenarios` | `SampleScenariosPage` | Demo Center — 11 runnable scenario cards |
| `/incidents` | `IncidentKnowledgeBasePage` | Searchable knowledge base |

All routes are wrapped in `DashboardLayout`, which provides the sidebar navigation, mobile hamburger menu, and top bar.

### Pages

**`HomePage.js`** (189 lines)
- Drag-and-drop file upload zone (`.log`, `.txt` accepted)
- Client-side file size validation (> 5 MB rejected before POST)
- `axios.post` to `${API}/api/analyze` with `FormData`
- On success: `navigate('/report/${data.analysis_id}')`
- Three static feature cards (Deterministic, Evidence-Backed, Explainable)
- Error display with `AlertCircle` icon

**`ReportPage.js`** (192 lines)
- Fetches result from `sessionStorage` first, falls back to `GET /api/results/:analysisId`
- Renders 13 sub-sections using dedicated components (see Components below)
- Loading/error states handled

**`SampleScenariosPage.js`** (157 lines)
- Fetches 11 scenario metadata from `GET /api/samples` on mount
- Renders a responsive 1/2/3-column grid of scenario cards
- "Run Demo" button: fetches log content → posts to `/api/analyze` → navigates to report
- Per-card loading state (`running === scenario.id`)

**`IncidentKnowledgeBasePage.js`** (234 lines)
- Fetches all 10 blueprints from `GET /api/incidents` on mount
- Search input filtering by ID, title, category, or pattern text
- Expandable blueprint rows (accordion style)
- Expanded view shows: patterns + weights, possible causes, verification commands, recommended fixes, relationship targets, role/priority metadata

### Components (in `components/dd/`)

| Component | File | Lines | Responsibility |
|---|---|---|---|
| `DashboardLayout` | `DashboardLayout.js` | 116 | Sidebar nav, mobile menu, main content wrapper |
| `IncidentSummary` | `IncidentSummary.js` | 101 | Primary/contributing incident header card with confidence, evidence count, category stats |
| `DetectionStatus` | `DetectionStatus.js` | 49 | Status badge: CONFIDENT / AMBIGUOUS / INSUFFICIENT_EVIDENCE with descriptions |
| `ConfidenceBreakdown` | `ConfidenceBreakdown.js` | 116 | SVG circular gauge + score component rows (pattern, evidence bonus, rel bonus, penalty) |
| `EvidenceViewer` | `EvidenceViewer.js` | 120 | Filterable evidence table with pattern highlighting in log line text |
| `IncidentGraph` | `IncidentGraph.js` | 123 | Text-based relationship graph: node-arrow-node pairs with bonus annotations |
| `VerificationCommands` | `VerificationCommands.js` | 55 | Command list with clipboard copy button |
| `RecommendedFixes` | `RecommendedFixes.js` | 29 | Numbered fix list |
| `AuditTrailViewer` | `AuditTrailViewer.js` | 77 | Scrollable audit trail with per-stage color coding and score change display |
| `AISummary` | `AISummary.js` | 49 | Collapsible panel showing AI-generated or deterministic fallback summary |
| `EngineMetadata` | `EngineMetadata.js` | 42 | 6-cell metadata grid: engine version, blueprint version, blueprints, rules, duration, log lines |

### State Management

**No global state manager** (no Redux, Zustand, Context API, etc.). State is local to each component/page using React `useState` and `useEffect`. Data flow:

1. `HomePage` posts to API, navigates to `/report/:id`.
2. Before navigation, result is stored in `sessionStorage` with key `report_${analysis_id}`.
3. `ReportPage` reads from `sessionStorage` first. This avoids a round-trip on initial load and enables re-hydration on browser refresh by falling back to `GET /api/results/:id`.

### API Integration

All API calls use `axios`. The base URL is `process.env.REACT_APP_BACKEND_URL` (set via `.env` file). No interceptors, no auth headers. API calls are made directly in page-level `useEffect` hooks and event handlers.

### Design System

- **Framework:** TailwindCSS 3.4.17 with `craco` for CRA integration
- **Typography:** Manrope (UI text, 400/500/600/700) + JetBrains Mono (code/monospace, via `font-mono-code` utility class)
- **Color palette:** Dark background `#0f1117`, panel `#1a1c23`, border `#2d313a`, accent `cyan-500/600`
- **Custom utilities defined in `index.css`:** `.panel`, `.panel-header`, `.badge-critical`, `.badge-error`, `.badge-warning`, `.badge-info`, `.badge-success`, `.font-mono-code`, `.log-line`

---

## 10. UI Feature Audit

| Feature | Status | Notes |
|---|---|---|
| **Log file upload** (drag-and-drop) | COMPLETE | `.log` / `.txt`, max 5 MB, client-side validation |
| **Log file upload** (click-to-browse) | COMPLETE | Hidden `<input type="file">` triggered by dropzone click |
| **Run analysis from upload** | COMPLETE | POST to `/api/analyze`, navigate to report on success |
| **Analysis loading state** | COMPLETE | Spinner + "Running Detection Engine..." button text |
| **Upload error display** | COMPLETE | Red bordered error box with icon |
| **Demo Center** | COMPLETE | 11 scenario cards with one-click execution |
| **Demo Center — per-card loading state** | COMPLETE | Spinner on individual card "Run Demo" button |
| **Demo Center — scenario metadata display** | COMPLETE | Severity badge, category badge, expected incident, filename |
| **Incident report — primary incident card** | COMPLETE | Title, severity, category, confidence %, evidence count |
| **Incident report — contributing incidents list** | COMPLETE | Same card format as primary |
| **Incident report — detection status badge** | COMPLETE | CONFIDENT / AMBIGUOUS / INSUFFICIENT_EVIDENCE with descriptions |
| **Incident report — confidence breakdown gauge** | COMPLETE | SVG circular gauge + score component rows |
| **Incident report — evidence viewer** | COMPLETE | Table with line numbers, patterns, weights, highlighted log lines |
| **Evidence viewer — filter** | COMPLETE | Text filter on pattern and log line text |
| **Evidence viewer — pattern highlight** | COMPLETE | Yellow highlight of matched substring in log line |
| **Incident report — relationship graph** | PARTIAL | Edge-list text representation only; no visual force-directed graph |
| **Incident report — possible causes list** | COMPLETE | Bulleted list |
| **Incident report — verification commands** | COMPLETE | Terminal-styled list with clipboard copy |
| **Incident report — recommended fixes** | COMPLETE | Numbered list |
| **Incident report — engine metadata** | COMPLETE | Version, blueprints loaded, rules loaded, duration, log lines |
| **Incident report — audit trail** | COMPLETE | Scrollable entry list with stage labels and score change values |
| **AI summary panel** | COMPLETE | Collapsible; shows `OPENROUTER_API_KEY` hint when AI unavailable |
| **Knowledge Base — blueprint list** | COMPLETE | 10 blueprints with severity, category, rule count |
| **Knowledge Base — search/filter** | COMPLETE | Filters by ID, title, category, pattern text |
| **Knowledge Base — blueprint expansion** | COMPLETE | Patterns + weights, causes, verification commands, fixes, relationships |
| **Knowledge Base — total counts** | COMPLETE | "X blueprints · Y total rules" summary row |
| **Sidebar navigation** | COMPLETE | 3 nav items + brand logo + engine version footer |
| **Mobile responsive sidebar** | COMPLETE | Hamburger menu + overlay |
| **History / past analyses list** | NOT IMPLEMENTED | `GET /api/results` endpoint exists but no frontend page renders it |
| **Report export (PDF / JSON)** | NOT IMPLEMENTED | — |
| **Custom alert thresholds in UI** | NOT IMPLEMENTED | — |
| **Visual DAG graph** | NOT IMPLEMENTED | Current implementation: text edges only |
| **Audit trail** | COMPLETE | Full step-by-step engine decisions visible in report |

---

## 11. AI Integration Audit

### OpenRouter Implementation Status

**PARTIAL.** The OpenRouter integration is fully coded and deployed as an optional capability, but it is **disabled by default** because `OPENROUTER_API_KEY` is set to an empty string (`""`) in `docker-compose.yml`.

### Models Configured

| Setting | Value |
|---|---|
| **API endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **Model** | `openai/gpt-4o-mini` (hardcoded in `ai_summary.py`) |
| **Max tokens** | 300 |
| **Temperature** | 0 (deterministic output) |
| **HTTP client** | `httpx` v0.28.1 (standard REST, no proprietary SDK) |
| **Timeout** | 15 seconds |

### Fallback Behavior

When `OPENROUTER_API_KEY` is absent or empty, or when the OpenRouter call fails for any reason (timeout, HTTP error, unexpected exception), the system falls back to `_deterministic_summary()`. This fallback:
- Is always available with no external dependencies.
- Produces a fixed template: `"Detection Engine identified '{title}' as the primary incident with {confidence}% confidence (status: {status}). {len(evidence)} evidence records were collected from the log. Most likely cause: {top_cause}. Recommended first action: {top_fix}"`
- Returns `ai_summary_available = False`.

### Current Functionality

- `generate_ai_summary(result: EngineResult)` is called in both `POST /api/analyze` and `POST /api/analyze/json` after detection completes.
- The AI module receives only pre-computed structured data (incident title, confidence, matched patterns, top 3 causes/fixes/steps, contributing incidents). It **never receives raw log content**.
- The frontend `AISummary` component displays `"Rules Engine Fallback"` label when `ai_summary_available = false`.

### Unfinished Functionality

- No model selection UI — the model (`openai/gpt-4o-mini`) is hardcoded.
- No retry logic on transient failures — a single failure silently falls back to the deterministic template.
- No streaming — the response is collected in full before returning.
- No caching of AI summaries — the same result re-analyzed will call the API again.

---

## 12. Testing Audit

### Test Count

| File | Classes | Tests | Type |
|---|---|---|---|
| `tests/test_engine.py` | 12 | 41 | Unit / integration (pure Python, no server required) |
| `tests/test_api.py` | 4 | 13 | API integration (requires live backend + PostgreSQL) |
| **Total** | **16** | **54** | |

### Coverage Estimate

The 41 engine tests cover all service modules directly:
- `blueprint_validator.py` — 6 validation tests + 4 DAG tests
- `pattern_matcher.py` — 3 matching tests + 2 deduplication tests + 2 evidence attribution tests + 4 log validation tests
- `scoring_engine.py` — 5 scoring tests (evidence bonus, symptom penalty, score cap)
- `relationship_engine.py` — 4 proximity tests + 2 bonus application tests
- `root_cause_engine.py` — 3 ranking tests + 4 status tests + 1 ambiguity test
- `ai_summary.py` — 1 fallback template test

The CI pipeline (`ci.yml`) runs pytest with `--cov-fail-under=85`, enforcing a minimum 85% branch coverage for the `app/` directory.

### Test Categories

| Category | Tests | File |
|---|---|---|
| Blueprint validation (structural) | 6 | `test_engine.py::TestBlueprintValidation` |
| DAG cycle detection | 4 | `test_engine.py::TestDAGValidation` |
| Log size/line validation | 4 | `test_engine.py::TestLogValidation` |
| Pattern matching (case, multi-blueprint, no-match) | 3 | `test_engine.py::TestPatternMatching` |
| Deduplication (score inflation prevention) | 2 | `test_engine.py::TestDedupedScoring` |
| Evidence attribution (fields, line numbers) | 2 | `test_engine.py::TestEvidenceAttribution` |
| Confidence scoring (cap, bonuses, penalties) | 5 | `test_engine.py::TestConfidenceScoring` |
| Proximity validation (min distance, bonus on/off) | 6 | `test_engine.py::TestProximityValidation` |
| Root cause ranking (determinism, acceptance tests) | 3 | `test_engine.py::TestRootCauseRanking` |
| Detection status (CONFIDENT/AMBIGUOUS/INSUFFICIENT) | 4 | `test_engine.py::TestDetectionStatus` |
| Ambiguity detection | 1 | `test_engine.py::TestAmbiguityDetection` |
| AI summary fallback template | 1 | `test_engine.py::TestAISummaryFallback` |
| Health endpoint | 3 | `test_api.py::TestHealthEndpoint` |
| Samples endpoint | 2 | `test_api.py::TestSamplesEndpoint` |
| Incidents endpoint | 2 | `test_api.py::TestIncidentsEndpoint` |
| Analyze endpoint (acceptance) | 6 | `test_api.py::TestAnalyzeEndpoint` |

### Notable Test Cases

- **`test_score_not_inflated_by_repetition`** — Confirms that a pattern appearing 500 times scores identically to the same pattern appearing once.
- **`test_all_sample_logs_produce_confident_status`** — All 11 sample log files are iterated; each must produce `detection_status == "CONFIDENT"`.
- **`test_deterministic_same_log_same_result`** — Runs the same log twice and asserts identical `blueprint_id` and `confidence`.
- **`test_root_cause_demo_acceptance`** — Verifies that sample 11 produces `DB_CONNECTION_FAILURE` as primary, `CRASH_LOOP_BACKOFF` as contributing, and `relationship_bonus == 20`.

### Missing Test Areas

| Area | Status |
|---|---|
| Frontend component tests (React Testing Library / Jest) | NOT IMPLEMENTED |
| API concurrency / load tests | NOT IMPLEMENTED |
| Database persistence tests (verify stored JSON round-trips correctly) | NOT IMPLEMENTED |
| OpenRouter API integration tests (mocked httpx) | NOT IMPLEMENTED |
| Endpoint authentication tests (N/A — no auth implemented) | NOT APPLICABLE |
| Test for the `GET /api/results` list endpoint | NOT IMPLEMENTED in `test_api.py` |
| Test for `GET /api/incidents/{incident_id}` (single blueprint fetch) | NOT IMPLEMENTED |
| Negative tests for file upload (corrupted UTF-8, binary files) | NOT IMPLEMENTED |

---

## 13. Deployment Audit

### Docker Setup

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
- Multi-stage build: `node:18-alpine` builds the React app, `nginx:alpine` serves the static files.
- `REACT_APP_BACKEND_URL` is accepted as an ARG at build time.
- Nginx listens on port 3000.
- Nginx config: serves React SPA with `try_files $uri $uri/ /index.html` fallback; proxies `/api` requests to `http://backend:8001`.

### Docker Compose Setup

**File:** `docker-compose.yml`  
**Version:** `3.9`

Three services:

| Service | Image | Port | Notes |
|---|---|---|---|
| `db` | `postgres:15-alpine` | 5432:5432 | Healthcheck configured (`pg_isready`); named volume `postgres_data` |
| `backend` | Build from `./backend` | 8001:8001 | Depends on `db` with `condition: service_healthy`; volume mounts `./backend:/app` for hot reload |
| `frontend` | Build from `./frontend` | 3000:3000 | Depends on `backend` |

### Environment Variables

| Variable | Service | Required | Source | Default in Compose |
|---|---|---|---|---|
| `DATABASE_URL` | backend | YES | `docker-compose.yml` env | `postgresql+asyncpg://deploymentdoctor:dd_secure_2024@db:5432/deployment_doctor` |
| `ENGINE_VERSION` | backend | NO | `docker-compose.yml` env | `"1.6.0"` |
| `BLUEPRINT_VERSION` | backend | NO | `docker-compose.yml` env | `"1.0.0"` |
| `CORS_ORIGINS` | backend | NO | `docker-compose.yml` env | `"*"` |
| `OPENROUTER_API_KEY` | backend | NO | `docker-compose.yml` env | `""` (empty — AI disabled) |
| `REACT_APP_BACKEND_URL` | frontend (build-time) | YES | `docker-compose.yml` env | `http://localhost:8001` |
| `POSTGRES_USER` | db | YES | `docker-compose.yml` env | `deploymentdoctor` |
| `POSTGRES_PASSWORD` | db | YES | `docker-compose.yml` env | `dd_secure_2024` |
| `POSTGRES_DB` | db | YES | `docker-compose.yml` env | `deployment_doctor` |

### Local Run Process

```bash
# 1. Clone repository
git clone <repo-url>
cd deployment-doctor

# 2. Start all services
docker-compose up --build

# 3. Access
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:8001
#    API docs:  http://localhost:8001/docs
#    Health:    http://localhost:8001/api/health
```

No `.env` file is required for local development — all values are embedded in `docker-compose.yml`. For production, environment variables should be injected via secrets management.

### GitHub Actions CI Pipeline

**File:** `.github/workflows/ci.yml`  
**Triggers:** Push to `main`/`develop`, pull requests to `main`  
**Python version:** 3.11  
**Node version:** 18

| Job | Purpose | Dependency |
|---|---|---|
| `test-backend` | Run 41 pytest engine tests with 85% coverage gate (Codecov upload) | — |
| `validate-blueprints` | Standalone blueprint validation + DAG cycle check via Python script | — |
| `lint-backend` | flake8 lint with max-line-length=100, ignores E501/W503 | — |
| `build-frontend` | `yarn build` + artifact upload | — |
| `acceptance-tests` | 3 inline Python acceptance tests (DB failure, root cause demo, unknown log) | `test-backend`, `validate-blueprints` |

### Production Readiness Level

| Aspect | Status | Notes |
|---|---|---|
| Containerization | COMPLETE | Docker + Compose |
| CI/CD pipeline | COMPLETE | 5-job GitHub Actions |
| Database persistence | COMPLETE | PostgreSQL with named volume |
| Health check endpoint | COMPLETE | `/api/health` |
| Structured logging | PARTIAL | `logging.basicConfig` in `server.py`; no structured JSON logs |
| Secret management | NOT IMPLEMENTED | Credentials embedded in `docker-compose.yml` plaintext |
| TLS / HTTPS | NOT IMPLEMENTED | Nginx does not configure SSL |
| Rate limiting | NOT IMPLEMENTED | No request rate limiting |
| Authentication | NOT IMPLEMENTED | All endpoints are public |
| Horizontal scaling | NOT IMPLEMENTED | No session affinity concerns (stateless engine) but no K8s manifests |
| Monitoring / metrics | NOT IMPLEMENTED | No Prometheus endpoints, no Grafana dashboards |
| Log aggregation | NOT IMPLEMENTED | No Loki, ELK, or CloudWatch configuration |
| Database migrations | NOT IMPLEMENTED | `create_all` is used; no Alembic migration history |

---

## 14. Product Readiness Assessment

### MVP Completeness: 85%

**Justification:** All core detection pipeline stages are fully implemented and tested. All 11 sample scenarios pass acceptance tests. The frontend renders a complete analysis report. The Demo Center and Knowledge Base are fully operational. Missing from "full MVP": history page, report export, and a visual graph render — these are expected in v1 but are absent.

### Technical Completeness: 80%

**Justification:** Engine logic, API, database layer, and CI are complete. The main technical gaps are: no database migration system (Alembic), no structured logging, no rate limiting, no authentication, and no observability instrumentation (Prometheus, tracing). The `GET /api/results` endpoint has no frontend consumer. The relationship graph is data-complete but visually incomplete (text-only, no rendered graph).

### Production Readiness: 45%

**Justification:** The application runs correctly in Docker and passes all tests, but is not hardened for public deployment. Critical gaps: no authentication, no secrets management, no TLS, no rate limiting, no horizontal scaling configuration, no monitoring. The database password is hardcoded in `docker-compose.yml`. The CORS policy is `"*"`. These are acceptable for a demo/development environment but not a production deployment.

### Maintainability: HIGH

**Justification:** The codebase has strong separation of concerns — each service module has a single responsibility and documented inputs/outputs. All scoring constants are centralized in `schemas.py`. The blueprint system is data-driven (JSON) and extends without code changes. Pydantic models enforce contract validation throughout. The test suite provides a regression safety net with 85%+ coverage enforcement.

### Code Quality: HIGH

**Justification:**
- All modules have docstrings explaining their contract, algorithm, and rules.
- No circular imports. No shared mutable state across requests.
- Determinism is explicitly designed for and tested (`test_deterministic_same_log_same_result`).
- Comments explain non-obvious decisions (e.g., "occurrences tracked for display only, NOT used in scoring").
- Line length is consistent (max 100 per flake8 config).
- Pydantic v2 is used throughout with explicit field types.

---

## 15. Competitive Positioning

### Product Category

Deployment Doctor occupies the **log-based incident triage tooling** niche within the broader observability/AIOps market. More specifically, it is a **deterministic, offline log diagnostic tool** — distinguished from cloud-based AIOps platforms by its absence of LLMs in the detection path.

### Differentiators (Based on Current Implementation)

| Differentiator | Description |
|---|---|
| **Full determinism** | Same input always produces same output. Every scoring decision is reproducible and auditable. No probabilistic models in the detection pipeline. |
| **Evidence attribution** | Every claim is tied to a specific log line number with the matched pattern and its weight shown. |
| **Typed incident roles** | Explicit `root_cause` vs `symptom` separation prevents `CrashLoopBackOff` from masking the actual root cause. |
| **DAG relationship engine** | Cause-effect chains are declared and validated with proximity verification, not just asserted. |
| **Full audit trail** | Every pipeline stage (pattern matching, scoring, relationship validation, ranking) emits a labeled entry with score delta. |
| **Vendor neutrality** | No proprietary SDKs, no cloud lock-in. Runs on any host with Docker. No managed database requirements. |
| **Transparent scoring** | The confidence breakdown (pattern score + evidence bonus + relationship bonus − symptom penalty) is shown in the UI. |

### Unique Capabilities

- The **proximity window** (200-line) constraint on relationship bonuses is an unusual design choice that prevents false cause-effect attributions in large logs.
- The **startup-time DAG validation** with cycle detection ensures blueprint consistency before any request is served.
- The **deterministic fallback AI summary** means the tool works fully offline with no external API dependency.

### Missing Capabilities Relative to Commercial Products

| Capability | Status |
|---|---|
| Real-time log ingestion / streaming | NOT IMPLEMENTED |
| Regex, glob, or structured log (JSON/logfmt) pattern matching | NOT IMPLEMENTED — substring only |
| Multi-service, multi-file correlated analysis | NOT IMPLEMENTED |
| Historical trend analysis / time-series incident frequency | NOT IMPLEMENTED |
| Alerting integrations (Slack, PagerDuty, OpsGenie) | NOT IMPLEMENTED |
| RBAC / team access controls | NOT IMPLEMENTED |
| Custom blueprint authoring via UI | NOT IMPLEMENTED |
| ML-based anomaly detection (complementary layer) | NOT IMPLEMENTED — design deliberately excludes this |
| Pre-built Kubernetes/cloud platform integrations | NOT IMPLEMENTED |
| SLA / MTTR dashboards | NOT IMPLEMENTED |

---

## 16. Acquisition Readiness Assessment

### Portfolio Value

The project demonstrates clean, well-documented full-stack engineering with a novel domain-specific engine design. It is suitable as a portfolio showpiece for senior backend/platform engineering roles. The explicit design philosophy (determinism, evidence attribution, vendor neutrality) is articulate and defensible.

### Open-Source Value

**Moderate.** The project fills a real gap in the OSS observability tooling space — there are very few deterministic, explainable, self-hosted log triage tools. The transparent scoring model and DAG relationship system are interesting technical contributions. Barriers to OSS adoption: the pattern library is currently Kubernetes-focused and limited to 10 incident types; the lack of a visual DAG and real-time streaming limits daily usefulness compared to existing tools like `stern`, `k9s`, or full AIOps platforms.

### Recruiter Attractiveness

**High.** The codebase demonstrates:
- Domain knowledge in Kubernetes/SRE incident response
- Clean API design (FastAPI, Pydantic v2, async SQLAlchemy)
- Production-grade practices (CI/CD, test coverage enforcement, Docker multi-stage builds)
- Deliberate, documented architectural decisions
- Observability-domain UI/UX literacy (Grafana-style dark theme, audit trails, evidence tables)

### Microns / Acquire.com Attractiveness

**Low-to-Moderate.** The product is at an early stage. It currently has no:
- User acquisition / analytics
- Subscription or payment flow
- Recurring revenue model
- Integrations that create switching costs

Reasons to buy: specialized knowledge base, working MVP, clean codebase, domain positioning, no technical debt.  
Reasons not to buy: no users, no growth, no monetization path, limited to 10 incident types, no real-time capability, no integrations.

### Reasons Someone Would Buy It

1. As a foundation for an enterprise incident automation product, saving 6–12 months of engine development.
2. As an internal tooling template for a SRE/platform team at a mid-size tech company.
3. As a training/demo tool for incident response training programs.
4. As part of a broader observability portfolio acquisition.

### Reasons Someone Would Not Buy It

1. The pattern library (10 incident types) is too narrow for production use without significant expansion.
2. No real-time or streaming capability makes it unsuitable for live incident response.
3. No user base, no validated market demand.
4. The deterministic design (explicitly no ML) limits appeal to AIOps buyers.
5. Open-source alternatives (Prometheus alerting rules, Loki LogQL) cover some of the same use cases.

---

## 17. Feature Gap Analysis

| Feature | Exists | Partial | Missing | Importance |
|---|---|---|---|---|
| Log file upload (drag-drop + click) | ✓ | | | HIGH |
| Text paste log analysis (JSON endpoint) | ✓ | | | MEDIUM |
| Incident detection engine | ✓ | | | CRITICAL |
| Evidence attribution (line-level) | ✓ | | | HIGH |
| Confidence scoring (multi-component) | ✓ | | | HIGH |
| Audit trail (step-by-step decisions) | ✓ | | | HIGH |
| Root cause ranking (deterministic) | ✓ | | | HIGH |
| Ambiguity detection (AMBIGUOUS status) | ✓ | | | MEDIUM |
| DAG relationship engine | ✓ | | | HIGH |
| Relationship bonus + proximity validation | ✓ | | | HIGH |
| Symptom penalty system | ✓ | | | HIGH |
| 10 incident blueprints | ✓ | | | CRITICAL |
| 90 detection rules | ✓ | | | CRITICAL |
| Demo Center (11 scenarios) | ✓ | | | HIGH |
| Incident Knowledge Base | ✓ | | | MEDIUM |
| Knowledge Base search | ✓ | | | MEDIUM |
| AI summary (optional OpenRouter) | ✓ | | | LOW |
| Deterministic AI fallback | ✓ | | | MEDIUM |
| Report — confidence gauge (SVG) | ✓ | | | MEDIUM |
| Report — evidence table with highlight | ✓ | | | HIGH |
| Report — verification commands (copy) | ✓ | | | MEDIUM |
| Report — recommended fixes | ✓ | | | MEDIUM |
| Report — engine metadata panel | ✓ | | | LOW |
| PostgreSQL persistence | ✓ | | | HIGH |
| Docker + Docker Compose | ✓ | | | HIGH |
| GitHub Actions CI (5 jobs) | ✓ | | | HIGH |
| Relationship graph (visual DAG) | | ✓ | | HIGH — text-only currently |
| AI summary model selection | | ✓ | | LOW — hardcoded |
| Structured logging (JSON) | | | ✓ | MEDIUM |
| Analysis history page | | | ✓ | MEDIUM |
| Report export (PDF / JSON download) | | | ✓ | MEDIUM |
| User authentication | | | ✓ | HIGH (for multi-user) |
| Rate limiting | | | ✓ | HIGH (for public deploy) |
| Real-time log streaming | | | ✓ | HIGH |
| Regex / structured log pattern matching | | | ✓ | HIGH |
| Custom blueprint authoring UI | | | ✓ | HIGH |
| Webhook / Slack / PagerDuty integration | | | ✓ | HIGH |
| Multi-file / multi-service analysis | | | ✓ | HIGH |
| Historical trend charts | | | ✓ | MEDIUM |
| TLS / HTTPS | | | ✓ | HIGH (production) |
| Database migrations (Alembic) | | | ✓ | MEDIUM |
| Prometheus metrics endpoint | | | ✓ | MEDIUM |
| Frontend unit tests | | | ✓ | MEDIUM |
| Kubernetes deployment manifests (Helm/Kustomize) | | | ✓ | MEDIUM |

---

## 18. Current Product Definition

Deployment Doctor, as of this audit, is a fully functional, self-hosted, deterministic log diagnostic tool for Kubernetes deployments: it accepts a plain-text log file via file upload or API call, scans every line against 90 pattern rules distributed across 10 incident blueprints covering the most common Kubernetes failure modes (database connectivity, DNS, OOM, image pull, port conflicts, authentication, configuration, disk, permissions, and crash loops), computes a transparent multi-component confidence score that explicitly accounts for pattern deduplication, evidence density, cause-effect DAG relationship validation with a 200-line proximity window, and a symptom penalty that prevents `CrashLoopBackOff` from masking true root causes, then produces a ranked incident report with per-line evidence attribution, a full step-by-step scoring audit trail, kubectl verification commands, recommended fixes, and an optional AI-generated plain-language summary backed by a deterministic fallback; the entire pipeline is deterministic (same input always produces same output), vendor-neutral (no proprietary SDKs or managed services required), fully containerized with Docker Compose, covered by 41 passing engine unit tests plus 13 API integration tests, and accessible via a React/Tailwind dark-theme observability dashboard containing an analysis upload page, a one-click Demo Center with 11 pre-built scenarios, and a searchable Incident Knowledge Base exposing all detection rules.
