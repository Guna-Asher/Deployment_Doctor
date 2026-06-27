# Deployment Doctor — PRD

## Original Problem Statement
Expand Deployment Doctor's operational knowledge engine by significantly increasing incident blueprints (from 10 to minimum 30), detection rules (from 90 to minimum 300), and demo scenarios (from 11 to minimum 40). Add specific incident categories spanning Kubernetes, Databases, Redis, Kafka, AWS/Cloud, and Networking. Expand the DAG relationship model with new realistic root-cause → symptom chains. Ensure the UI automatically reflects these updates. Ensure all new and existing tests pass. Do NOT redesign the system, add SaaS features (auth/billing), or replace the deterministic engine with AI.

---

## Architecture
```
/app/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── samples.py       — Demo scenario registry (50 scenarios)
│   │   ├── services/
│   │   │   ├── root_cause_engine.py
│   │   │   └── scoring_engine.py
│   │   ├── models.py, schemas.py, database.py
│   ├── rules/
│   │   └── incidents.json       — Source of truth: 38 blueprints, 445 rules
│   ├── sample-logs/             — 50 demo log files (01-50)
│   ├── tests/
│   │   └── test_engine.py       — 70 tests (all passing)
│   ├── server.py, Dockerfile
│   └── .env                     — MONGO_URL, DB_NAME, DATABASE_URL
├── frontend/src/
│   ├── components/dd/
│   └── pages/
├── AUDIT_REPORT.md
└── memory/PRD.md
```

---

## Tech Stack
- **Backend**: FastAPI + PostgreSQL (SQLAlchemy/asyncpg) + MongoDB + Python 3.11
- **Frontend**: React + Tailwind CSS (dark theme)
- **Engine**: Deterministic rule-based pattern matching, DAG relationship validation
- **Testing**: pytest (70 tests)

---

## What's Been Implemented

### Session 1 (Audit)
- Generated comprehensive 18-section AUDIT_REPORT.md
- Understood full codebase architecture

### Session 2 (Knowledge Expansion) — 2026-06-27
**incidents.json expansion:**
- 10 → 38 blueprints (+28 new)
- 90 → 445 rules/patterns (+355)
- New categories: APPLICATION (2), CONFIGURATION (2), KUBERNETES (6), DATABASE (4), CACHE (3), MESSAGING (3), CLOUD (4), NETWORKING (6, including TLS/DNS)

**New blueprints added:**
APPLICATION_STARTUP_FAILURE, CONFIGURATION_VALIDATION_FAILURE, POD_PENDING, NODE_NOT_READY, RESOURCE_QUOTA_EXCEEDED, POD_EVICTED, LIVENESS_PROBE_FAILURE, READINESS_PROBE_FAILURE, DB_DEADLOCK, DB_SLOW_QUERY, DB_MIGRATION_FAILURE, DB_REPLICATION_LAG, REDIS_OOM, REDIS_CONNECTION_TIMEOUT, REDIS_REPLICATION_BROKEN, CONSUMER_LAG, MESSAGE_BROKER_DOWN, QUEUE_FULL, CLOUD_IAM_DENIED, OBJECT_STORAGE_ACCESS_FAILURE, CLOUD_RATE_LIMIT, CAPACITY_EXCEEDED, SSL_TLS_CERTIFICATE_EXPIRED, TLS_HANDSHAKE_FAILURE, NETWORK_TIMEOUT, HTTP_GATEWAY_ERROR, SERVICE_CIRCUIT_BREAKER_OPEN, LOAD_BALANCER_UNHEALTHY

**Existing blueprints updated (causes_incidents extended):**
- DNS_FAILURE → added TLS_HANDSHAKE_FAILURE
- DISK_FULL → added MESSAGE_BROKER_DOWN
- MISSING_CONFIGURATION → added APPLICATION_STARTUP_FAILURE

**DAG relationships (53 total edges, no cycles):**
Multi-hop chains include:
- DISK_FULL → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF (3-hop)
- DB_SLOW_QUERY → DB_DEADLOCK → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF (4-hop)
- REDIS_REPLICATION_BROKEN → REDIS_CONNECTION_TIMEOUT → CRASH_LOOP_BACKOFF (3-hop)
- SSL_TLS_CERTIFICATE_EXPIRED → TLS_HANDSHAKE_FAILURE → AUTHENTICATION_FAILURE (3-hop)
- CLOUD_IAM_DENIED → OBJECT_STORAGE_ACCESS_FAILURE → APPLICATION_STARTUP_FAILURE → CRASH_LOOP_BACKOFF (4-hop)
- CONFIGURATION_VALIDATION_FAILURE → MISSING_CONFIGURATION → APPLICATION_STARTUP_FAILURE → CRASH_LOOP_BACKOFF (4-hop)
- NETWORK_TIMEOUT → SERVICE_CIRCUIT_BREAKER_OPEN → HTTP_GATEWAY_ERROR (3-hop)
- DNS_FAILURE → TLS_HANDSHAKE_FAILURE → AUTHENTICATION_FAILURE (3-hop)
- QUEUE_FULL → MESSAGE_BROKER_DOWN → CONSUMER_LAG (3-hop)
- NODE_NOT_READY → POD_EVICTED → CRASH_LOOP_BACKOFF (3-hop)
- RESOURCE_QUOTA_EXCEEDED → POD_EVICTED → CRASH_LOOP_BACKOFF (3-hop)

**Demo log files:**
- 11 → 50 scenarios (+39)
- 28 single-incident logs (12–39)
- 11 multi-hop cascade logs (40–50)
- samples.py SCENARIOS registry updated to all 50

**Tests:**
- 41 → 70 tests (+29 new tests)
- All 70 pass
- New test classes: TestBlueprintValidation (expanded), TestNewCategoryAcceptance, TestMultiHopCascadeAcceptance

**Infrastructure fix:**
- Installed and configured PostgreSQL 15 (required by backend init_db)
- Created user/database: deploymentdoctor / deployment_doctor

---

## Final Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Blueprints | 10 | 38 | ≥ 30 | ✅ |
| Rules/Patterns | 90 | 445 | ≥ 300 | ✅ |
| Demo Scenarios | 11 | 50 | ≥ 40 | ✅ |
| Multi-hop chains | 2 | 12+ | ≥ 10 | ✅ |
| Tests passing | 41 | 70 | All pass | ✅ |

---

## Constraints Preserved
- No .py engine files rewritten
- No React components modified
- No SaaS features added (no auth/billing)
- Deterministic engine behavior unchanged
- API contracts unchanged (/api/analyze, /api/incidents, /api/samples)

---

## Backlog / Future Work
- P1: Add unit tests for DAG cycle detection on the new blueprints specifically
- P1: Add vendor-specific sub-patterns (e.g., separate Postgres vs MySQL patterns)
- P2: Build a "guided walkthrough" mode in the Demo Center showing multi-hop cascades
- P2: Add confidence score explanations per pattern matched
- P3: Exportable incident reports (PDF/JSON) from the Analyze page
