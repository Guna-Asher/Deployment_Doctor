# Deployment Doctor — PRD
_Last updated: 2026-02-13 — Audit report generated_

## Overview
Production-grade Explainable Incident Detection Engine for DevOps/SRE/Platform Engineering teams.
Version: 1.6.0 | Engine: Deterministic Rule-Based | AI Layer: Optional (OpenRouter)

## Problem Statement
Deployment Doctor is a deterministic troubleshooting platform that analyzes deployment logs using
rule-based pattern matching. Every conclusion is traceable to evidence. No AI guessing.

## Architecture
User Upload → Validation → Blueprint Matching → Evidence Attribution → Confidence Scoring
→ Relationship Analysis (DAG, Proximity) → Root Cause Ranking → Report Generation → Optional AI Summary

## User Personas
- DevOps Engineers, SREs, Platform Engineers, Backend Engineers
- Recruiters and interviewers reviewing engineering demos

## Tech Stack
- **Frontend**: React (CRA), TailwindCSS, Lucide-React
- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL
- **AI Layer**: OpenRouter (optional) + emergentintegrations fallback + deterministic fallback
- **Tests**: Pytest (41 tests, 100% pass)

## Core Requirements (Static)
1. Deterministic: same log always produces same result
2. Explainable: every conclusion traceable to evidence
3. No AI for detection — AI only for optional presentation summary
4. PostgreSQL relational storage
5. Blueprint validation at startup (hard fail on error)
6. DAG validation for incident relationships (hard fail on cycle)

## What's Been Implemented (2026-06-25)

### Backend Engine
- [x] 10 Incident Blueprints (incidents.json) with realistic production patterns
- [x] Blueprint Validation Engine (validate_blueprints) — validates at startup
- [x] DAG Cycle Detection — DFS-based, detects direct/transitive cycles
- [x] Pattern Matching Engine — case-insensitive, substring, multi-blueprint
- [x] Deduped Scoring — each pattern contributes weight ONCE per blueprint
- [x] Evidence Attribution Engine — line_number, line_text, pattern, blueprint_id, weight
- [x] Confidence Scoring Engine — pattern_score + evidence_bonus + relationship_bonus - symptom_penalty
- [x] Relationship Analysis Engine — proximity validation (200-line window)
- [x] Root Cause Ranking Engine — deterministic tie-breaking (score → severity → priority → ID)
- [x] Detection Status: CONFIDENT / AMBIGUOUS / INSUFFICIENT_EVIDENCE
- [x] AI Summary Layer — OpenRouter (primary) → emergentintegrations (fallback) → deterministic template
- [x] Analysis API — multipart upload + JSON body
- [x] Incidents API — knowledge base
- [x] Samples API — Demo Center
- [x] PostgreSQL models (SQLAlchemy async + JSONB result storage)

### Sample Logs
- [x] 11 sample log files (01-db-connection-failure through 11-root-cause-demo)
- [x] All 11 produce CONFIDENT detection status

### Frontend (Dark Grafana/Datadog/Kibana Theme)
- [x] Dashboard Layout with sidebar navigation
- [x] Home/Upload Page — drag-drop, file validation
- [x] Report Page — 12 sections: Primary Incident, Status, Why Selected, Confidence Breakdown,
      Contributing Incidents, Evidence Attribution, Relationship Graph, Possible Causes,
      Verification Commands, Recommended Fixes, Engine Metadata, Audit Trail, AI Summary
- [x] Demo Center (/sample-scenarios) — 11 one-click scenario cards
- [x] Incident Knowledge Base (/incidents) — search + expand blueprints
- [x] All components: DashboardLayout, IncidentSummary, ConfidenceBreakdown, EvidenceViewer,
      AuditTrailViewer, IncidentGraph, VerificationCommands, RecommendedFixes, EngineMetadata,
      DetectionStatus, AISummary

### Testing
- [x] 41 pytest tests covering: blueprint validation, DAG, pattern matching, deduped scoring,
      evidence attribution, proximity validation, relationship analysis, root cause ranking,
      ambiguity detection, insufficient evidence, AI fallback
- [x] 3 acceptance tests: DB failure, Root Cause Demo, Unknown Log

## Acceptance Test Results
- 01-db-connection-failure.log: Primary=DB_CONNECTION_FAILURE, Confidence=100%, Evidence=11, Status=CONFIDENT ✓
- 11-root-cause-demo.log: Primary=DB_CONNECTION_FAILURE, Contributing=CRASH_LOOP_BACKOFF, Relationship Bonus Applied, Status=CONFIDENT ✓
- Unknown log: Status=INSUFFICIENT_EVIDENCE, Confidence=0%, Primary=None ✓

## Prioritized Backlog

### P0 (Critical — Must Do Next)
- None. All MVP requirements delivered.

### P1 (High Priority)
- OpenRouter API key integration (user to provide OPENROUTER_API_KEY)
- ~~README.md~~ DONE — 1,394-line README with all 22 spec sections + Mermaid diagrams
- ~~Docker Compose~~ DONE — docker-compose.yml + backend/frontend Dockerfiles
- ~~GitHub Actions~~ DONE — .github/workflows/ci.yml with 4 jobs

### P2 (Nice to Have)
- Analysis history page (view past analyses)
- Exportable PDF/Markdown report
- Custom blueprint creation UI
- Webhook/Slack notification on detection

## Known Limitations
- AI Summary uses deterministic fallback (OpenRouter key not yet provided)
- PostgreSQL must be running (service postgresql start required in this env)
