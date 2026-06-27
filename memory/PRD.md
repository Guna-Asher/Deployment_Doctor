# Deployment Doctor — PRD

## Original Problem Statement
Build a professional operational knowledge platform for deterministic root-cause analysis of deployment logs. Reposition the product as a premium observability-style tool (Grafana/Datadog-inspired UI), with:
1. A premium landing page positioning it as "Deterministic Root Cause Analysis"
2. An upgraded Knowledge Base experience (Operational Knowledge Library)
3. A Relationship & Cascade Visualization page with interactive directed graph

Strict constraint: Do NOT modify the backend detection engine, scoring logic, rule matching, or backend architecture. Preserve API contracts and deterministic behavior.

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
│   │   └── incidents.json       — Source of truth: 38 blueprints, 445 rules, 53 DAG edges
│   ├── sample-logs/             — 50 demo log files (01-50)
│   ├── tests/
│   │   └── test_engine.py       — 70 tests (all passing)
│   ├── server.py, Dockerfile
│   └── .env                     — MONGO_URL, DB_NAME, DATABASE_URL
├── frontend/src/
│   ├── components/dd/           — DashboardLayout, IncidentGraph, etc.
│   ├── pages/
│   │   ├── HomePage.js          — Landing page (redesigned)
│   │   ├── IncidentKnowledgeBasePage.js  — Knowledge Library (upgraded)
│   │   ├── RelationshipsPage.js — Cascade Explorer (NEW)
│   │   ├── SampleScenariosPage.js
│   │   └── ReportPage.js
│   ├── App.js                   — Routes (4 pages + /relationships)
│   └── index.css                — ReactFlow overrides + base theme
├── AUDIT_REPORT.md
└── memory/PRD.md
```

---

## Tech Stack
- **Backend**: FastAPI + PostgreSQL (SQLAlchemy/asyncpg) + MongoDB + Python 3.11
- **Frontend**: React 19 + Tailwind CSS + Manrope/JetBrains Mono fonts
- **Graph viz**: @xyflow/react v12.11.1 (ReactFlow)
- **Charts**: recharts v3.6.0 (already installed)
- **Animations**: framer-motion v11 (available)
- **Engine**: Deterministic rule-based pattern matching, DAG relationship validation
- **Testing**: pytest (70 tests)

---

## What's Been Implemented

### Session 1 (Audit)
- Generated comprehensive 18-section AUDIT_REPORT.md

### Session 2 (Knowledge Expansion) — 2026-06-27
- 10 → 38 blueprints, 90 → 445 rules, 11 → 50 demo scenarios
- 53 DAG edges (multi-hop chains)
- 70/70 backend tests passing

### Session 3 (UI Overhaul) — 2026-06-27
**Part 1 — Landing Page Repositioning (HomePage.js)**
- Hero: "Deterministic Root Cause Analysis" headline, left-aligned layout
- Engine status badge (pulse animation)
- 5 animated metric counters: 38 Blueprints, 445 Rules, 53 Edges, 50 Scenarios, 70 Tests
- Upload zone preserved (functionality unchanged)
- "How It Works" 3-step row (Upload → Rules → Cascade)
- 4 Value Props: Explainability, Auditability, Reproducibility, No Hallucinations

**Part 2 — Knowledge Base Upgrade (IncidentKnowledgeBasePage.js)**
- Header: "Operational Knowledge Library" with live stats
- Recharts horizontal BarChart — rules per category with per-category colors
- Category filter pills (ALL + 11 categories) with blueprint counts
- Enhanced blueprint rows: severity badge, category tag, rule count, → children count, ← parent count
- Expanded detail: parent incidents, child incidents prominently at top
- Verification commands + recommended fixes
- Footer metadata (role, priority, max score, relationship count)

**Part 3 — Cascade Explorer (RelationshipsPage.js — NEW)**
- Route: /relationships, nav: "Cascade Explorer" with Network icon
- @xyflow/react v12 for interactive DAG visualization
- 38 custom nodes, 53 edges, topological layout algorithm (no external dagre)
- Node roles (computed from graph topology):
  - Root Cause (21 nodes): orange border/bg
  - Intermediate (11 nodes): amber border/bg
  - Symptom (6 nodes): cyan border/bg
- Header stats: Root Causes 21 · Intermediates 11 · Symptoms 6 · Edges 53
- Left panel: Search (dims non-matching), Role filter, Scenario Overlay, Legend, Node Detail
- Scenario Overlay: select 1 of 50 scenarios → calls /api/analyze → highlights detected nodes with glow + animated edges, fades undetected to 15% opacity
- Node click: shows parents/children in detail panel (clickable to navigate)
- MiniMap, Controls, Background dots

**Infrastructure**
- yarn add @xyflow/react (v12.11.1)
- index.css: ReactFlow dark theme overrides
- DashboardLayout.js: Added "Cascade Explorer" nav item
- App.js: Added /relationships route

---

## Final Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Blueprints | 38 | ✅ |
| Rules/Patterns | 445 | ✅ |
| Demo Scenarios | 50 | ✅ |
| DAG Edges | 53 | ✅ |
| Tests passing | 70 | ✅ |
| Frontend test pass rate | 97% | ✅ |

---

## Constraints Preserved
- No .py engine files rewritten
- No SaaS features added
- Deterministic engine behavior unchanged
- API contracts unchanged (/api/analyze, /api/incidents, /api/samples)
- All 70 backend tests still passing

---

## Backlog / Future Work
- P1: Add unit tests for DAG cycle detection on new blueprints specifically
- P1: Add vendor-specific sub-patterns (e.g., Postgres vs MySQL patterns)
- P2: Exportable incident reports (PDF/JSON) from the Analyze page
- P2: Build a "guided walkthrough" mode showing multi-hop cascade step-by-step in the Cascade Explorer
- P2: Add confidence score explanations per pattern matched
- P3: Permalink/sharable URLs for specific graph states (selected node, active scenario)
- P3: Timeline view for multi-hop cascades showing propagation order
