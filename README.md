# Deployment Doctor

> Explainable incident detection for DevOps/SRE workflows (rules-based, deterministic, evidence-backed)

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
3. [Architecture](#3-architecture)
4. [Implemented Features](#4-implemented-features)
5. [How It Works](#5-how-it-works)
6. [API Endpoints](#6-api-endpoints)
7. [Project Structure](#7-project-structure)
8. [Setup & Installation](#8-setup--installation)
9. [Design Decisions](#9-design-decisions)
10. [Known Limitations](#10-known-limitations)
11. [Future Improvements](#11-future-improvements)

---

## 1. Project Overview

**Deployment Doctor** analyzes deployment logs and produces a deterministic, explainable incident report.

It does **not** use AI to decide the incident. AI is used only as an *optional* text summarizer for UI readability.

| Property | Value |
|---|---|
| Engine Version | 1.6.0 |
| Incident Blueprints | 10 |
| Detection Rules | 90 |
| Test Coverage | 90%+ (41 tests) |
| Analysis Determinism | ✅ Guaranteed |
| AI Dependency for Detection | ❌ None |

---

## 2. Problem Statement

When deployments fail, SREs typically need answers to:

1. **What went wrong?** (primary failing component)
2. **Why did it fail?** (triggering error + evidence)
3. **What should I do next?** (verification steps + recommended fixes)

Common approaches fall short because they are slow to interpret, not evidence-linked, or non-deterministic.

---

## 3. Architecture

### High-level architecture

```mermaid
graph TB
  U[Browser / UI]
  API[FastAPI Backend]
  ENG[Deterministic detection engine]
  RULES[Rules / Blueprints (backend/rules/incidents.json)]
  DB[(PostgreSQL)]

  U -->|POST /api/analyze| API
  API --> ENG
  RULES -->|loaded at startup| ENG
  ENG --> DB
  U -->|GET /api/results/:id| API
```

More implementation details:
- `docs/architecture.md`
- `docs/detection-pipeline.md`

---

## 4. Implemented Features

- Multipart log upload and JSON-body analysis endpoints
- Deterministic rule-based incident detection
- Evidence attribution (line number + matched patterns)
- Composite scoring with bonuses/penalties
- Deterministic ranking + detection status classification (CONFIDENT / AMBIGUOUS / INSUFFICIENT_EVIDENCE)
- DAG relationship validation (startup-time cycle detection)
- Relationship bonuses with proximity validation
- PostgreSQL persistence of full results (JSONB payload)
- Optional AI summarization (OpenRouter), does not change detection logic

---

## 5. How It Works

1. **Startup**
   - Blueprints are loaded and validated (schema + DAG cycle detection)
   - Database tables are initialized

2. **Request**
   - `POST /api/analyze` (multipart) or `POST /api/analyze/json` (JSON) receives log content
   - Input is validated for size/line-count caps

3. **Deterministic analysis pipeline**
   - Pattern matching over blueprints (`match_blueprints`)
   - Relationship bonus calculation using declared causes + proximity window (`analyze_relationships`)
   - Scoring and filtering using constants like `MIN_SCORE` (`score_incident`)
   - Deterministic ranking and status derivation (top score gap vs ambiguity threshold)

4. **Persistence + response**
   - Full `EngineResult` is stored in PostgreSQL as JSONB
   - The same result JSON is returned to the client

5. **Optional AI summary**
   - `ai_summary.py` may generate a short text summary for UI display if `OPENROUTER_API_KEY` is set
   - Detection output remains deterministic regardless of AI availability

---

## 6. API Endpoints

Base path: `/api`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyze` | Analyze multipart logs (`file` or `log_content`) |
| POST | `/api/analyze/json` | Analyze JSON body (`log_content`, `filename`) |
| GET | `/api/results/{analysis_id}` | Retrieve stored analysis JSON |
| GET | `/api/results` | List recent analyses |
| GET | `/api/incidents` | List incident blueprints |
| GET | `/api/incidents/{incident_id}` | Fetch single blueprint |
| GET | `/api/samples` | List demo center scenario metadata |
| GET | `/api/samples/{filename}/content` | Fetch raw content of a sample log file |
| GET | `/api/health` | Health + rules/blueprints counts |

More detail: `docs/api-reference.md`

---

## 7. Project Structure

```text
backend/
  server.py                      FastAPI app entry point
  app/
    api/                         Routers for analyze/incidents/samples
    services/                   Deterministic engine components
    database.py                 SQLAlchemy async engine + init
    models.py                   SQLAlchemy model(s)
    schemas.py                  Pydantic models + constants
  rules/incidents.json           Blueprint definitions (patterns + causes)
  sample-logs/*.log             Demo scenario logs
  tests/                         Pytest suite

frontend/
  src/                           React UI

docs/
  architecture.md
  detection-pipeline.md
  scoring.md
  relationships-dag.md
  api-reference.md
```

---

## 8. Setup & Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set environment variables (example):

```bash
export DATABASE_URL='postgresql+asyncpg://deploymentdoctor:dd_secure_2024@localhost:5432/deployment_doctor'
export OPENROUTER_API_KEY=''   # optional
export ENGINE_VERSION='1.6.0'
export BLUEPRINT_VERSION='1.0.0'
export CORS_ORIGINS='*'
```

Start:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
yarn start
```

### Run tests

```bash
cd backend
pytest tests/ -v
```

---

## 9. Design Decisions

- **Deterministic detection**: rule-based matching + explicit scoring; same input log produces the same structured output.
- **Explainability by construction**: evidence records store line numbers and matched patterns.
- **DAG integrity at startup**: invalid blueprint relationships (cycles) fail fast.
- **JSONB result storage**: store the full engine output as JSONB while extracting commonly used metadata into columns.
- **AI is presentation-only**: the optional AI summary never changes detection results.

---

## 10. Known Limitations

- **Pattern matching scalability**: current substring matching uses nested loops. (Adequate for the current rule set; see future notes.)
- **No DB-level dedupe**: `log_hash` is indexed but not unique, so repeated analysis can create duplicates.
- **Relationship proximity uses blueprint evidence scope**: proximity is computed from available evidence lines for the blueprints involved.
- **Upload reads full content into memory**: large inputs are capped, but upload handling could be more streaming-friendly.

---

## 11. Future Improvements

- Faster multi-pattern matching (Aho–Corasick / indexed matching)
- DB idempotency (unique constraint on log hash)
- Tighter relationship evidence scoping for bonus calculations
- Async analysis queue (move analysis off the request path)
- Metrics/observability (Prometheus + tracing)

---

## License

MIT License. See [LICENSE](LICENSE) for details.

