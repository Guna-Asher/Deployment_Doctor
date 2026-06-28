# API Reference

Base path: `/api`

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyze` | Analyze a log uploaded as multipart form-data (file= or log_content=). |
| POST | `/api/analyze/json` | Analyze a log passed as JSON body. |
| GET | `/api/results/{analysis_id}` | Fetch stored analysis JSON (JSONB result). |
| GET | `/api/results` | List recent analyses. |
| GET | `/api/incidents` | List incident blueprints (knowledge base). |
| GET | `/api/incidents/{incident_id}` | Fetch a single blueprint. |
| GET | `/api/samples` | List demo center sample scenarios. |
| GET | `/api/samples/{filename}/content` | Fetch raw content of a sample log file. |
| GET | `/api/health` | Engine health + blueprint/rules counts. |

## Request/response notes

- `POST /api/analyze`:
  - Accepts `multipart/form-data`
  - Either provide:
    - `file` (UploadFile)
    - or `log_content` (string form field)
- Input validation for size/lines is enforced in `app/services/pattern_matcher.py::validate_log()`.
- Optional AI summary does **not** change detection logic.

## Response objects

- Full analysis is returned as `EngineResult.model_dump()`.
- Results are stored with `analysis_results.result_json` (JSONB).

