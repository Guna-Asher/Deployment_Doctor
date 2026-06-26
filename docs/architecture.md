# Architecture

## Components (from backend code)

```mermaid
graph TB
  U[Browser / UI] 
  API[FastAPI Backend (server.py + routers)]
  BP[Rules / Blueprints (backend/rules/incidents.json)]
  ENG[Deterministic Engine (root_cause_engine.py)]
  DB[(PostgreSQL)]

  U -->|POST /api/analyze| API
  U -->|GET /api/results/:id| API
  U -->|GET /api/incidents| API

  API -->|validate at startup| BP
  API -->|run_analysis()| ENG
  ENG --> DB
  BP --> ENG
```

## Runtime pipeline (high-level)

1. **Startup**
   - Blueprint loading + validation (schema, DAG cycles) in `app/services/blueprint_validator.py`.
   - DB table creation in `app/database.py`.

2. **Request handling**
   - `POST /api/analyze` or `POST /api/analyze/json` receives log content.
   - Input is validated for size/line count in `app/services/pattern_matcher.py::validate_log()`.

3. **Deterministic analysis**
   - `app/services/root_cause_engine.py::run_analysis()` orchestrates:
     - pattern matching: `match_blueprints()`
     - relationship analysis: `analyze_relationships()`
     - scoring: `score_incident()`
     - filtering by `MIN_SCORE`
     - deterministic ranking + status classification

4. **Persistence**
   - Result is stored in PostgreSQL as JSONB (`analysis_results.result_json`) via `app/models.py`.

5. **Optional AI summary**
   - `app/services/ai_summary.py::generate_ai_summary()` optionally calls OpenRouter.
   - Detection logic does not depend on the AI summary.

