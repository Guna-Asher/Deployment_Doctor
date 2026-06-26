# Resume Notes (moved from README)

*(Content preserved from the original README section “Resume Description”.)*

## Deployment Doctor — Explainable Incident Detection Engine

Personal Project · 2024

Built a production-quality, rule-based incident detection engine for DevOps/SRE teams that deterministically identifies deployment root causes from raw log files.

### Key Engineering Contributions

**Architecture**
- Designed a 10-stage detection pipeline (pattern matching → evidence attribution → deduped confidence scoring → DAG relationship analysis → deterministic ranking) with zero AI dependency for detection logic.
- Implemented DAG validation with DFS cycle detection; application startup fails on invalid relationships.
- Built a stateless engine architecture where every component is pure function, ensuring identical output for identical input.

**Backend**
- FastAPI + SQLAlchemy async + PostgreSQL with JSONB result storage.
- Pydantic v2 strongly-typed models across the detection pipeline.
- Blueprint validation with startup-time hard fail on schema/DAG errors.
- Proximity-validated relationship bonus system (200-line sliding window).
- Deterministic tie-breaking algorithm (score → severity → priority → ID).

**Testing**
- 41 pytest tests with 90%+ coverage.

**Infrastructure**
- Docker Compose setup with PostgreSQL health checks.
- GitHub Actions CI/CD pipeline with coverage reporting.

**Frontend**
- React dashboard with dark theme.
- Report page with confidence gauge, evidence attribution, relationship graph, audit trail, and verification commands.
- One-click Demo Center with scenario simulations.

