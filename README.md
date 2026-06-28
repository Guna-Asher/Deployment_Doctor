# Deployment Doctor

> Deterministic Incident Intelligence for Kubernetes and Cloud-Native Platforms

<p align="center">

[![Version](https://img.shields.io/badge/version-v2.0.0-blue)]()
[![Python](https://img.shields.io/badge/python-3.11+-green)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-production-ready-009688)]()
[![React](https://img.shields.io/badge/react-frontend-61DAFB)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()
[![Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)]()

</p>

---

## What Is Deployment Doctor?

Deployment Doctor is a deterministic incident diagnosis platform that transforms raw Kubernetes and cloud-native deployment logs into explainable, evidence-backed root cause analysis.

Unlike traditional observability tools that surface symptoms, Deployment Doctor reconstructs failure chains, distinguishes root causes from downstream effects, and generates auditable diagnoses with complete reasoning transparency.

Every conclusion is:

* Traceable
* Explainable
* Reproducible
* Auditable

No hallucinations.

No black-box scoring.

No hidden reasoning.

Just deterministic diagnosis.

---

## The Problem

When production deployments fail, teams rarely struggle to detect incidents.

They struggle to explain them.

A single infrastructure failure often triggers dozens of downstream symptoms:

```text
DNS Failure
    ↓
Database Connection Errors
    ↓
Application Timeouts
    ↓
CrashLoopBackOff
    ↓
Service Unavailable
```

Most tools surface every symptom.

Few identify the originating cause.

Deployment Doctor was built to close the gap between detection and diagnosis.

---

## Why Existing Solutions Fall Short

| Approach                   | Limitation                                                |
| -------------------------- | --------------------------------------------------------- |
| Manual Log Investigation   | Slow, expertise-dependent, inconsistent                   |
| Shell Scripts & Grep       | Single-pattern visibility                                 |
| Monitoring & APM Platforms | Excellent detection, limited diagnosis                    |
| AI Log Analysis            | Non-deterministic, difficult to audit                     |
| Deployment Doctor          | Deterministic, explainable, auditable root cause analysis |

---

# Platform Metrics

| Metric              | Value |
| ------------------- | ----- |
| Incident Blueprints | 38    |
| Detection Rules     | 445   |
| Relationship Edges  | 53    |
| Incident Scenarios  | 50    |
| Automated Tests     | 83    |
| Test Coverage       | 90%+  |
| Incident Categories | 11    |

---

# Core Capabilities

## Deterministic Analysis

Identical logs always produce identical results.

No randomness.

No probabilistic interpretation.

No model drift.

---

## Evidence Attribution

Every incident is linked directly to:

* Exact matching log entries
* Source line numbers
* Matching rule identifiers
* Confidence contribution

Every diagnosis can be independently verified.

---

## Confidence Scoring Engine

Transparent weighted scoring system built from:

* Pattern confidence
* Relationship validation
* Incident role weighting
* Symptom penalties
* Cascade bonuses

No hidden scoring logic.

---

## Relationship Analysis Engine

Deployment Doctor models incidents as a Directed Acyclic Graph (DAG).

This enables:

* Multi-hop cascade discovery
* Root cause identification
* Symptom suppression
* Relationship validation
* Dependency-aware ranking

---

## Root Cause Ranking

The ranking engine prioritizes:

* Upstream failures
* Validated causality chains
* Strong evidence density

And suppresses:

* Repeated symptoms
* Cascading noise
* Secondary failures

---

## Audit Trail Generation

Every analysis produces:

* Rule evaluations
* Scoring breakdowns
* Relationship validations
* Evidence mappings
* Final ranking decisions

Complete transparency from input to conclusion.

---

# Operational Knowledge Engine

The Operational Knowledge Engine is Deployment Doctor's core asset.

It contains structured operational intelligence collected from real-world Kubernetes and cloud-native failure scenarios.

## Knowledge Assets

### Incident Blueprints

38 production incident blueprints covering:

* Container failures
* Networking issues
* Database outages
* Resource exhaustion
* Configuration errors
* Storage failures
* Orchestration issues
* Security failures
* Service discovery issues
* Dependency failures
* Platform instability

---

### Detection Rules

445 deterministic detection rules.

Each rule contains:

* Match pattern
* Severity
* Category
* Weight
* Verification guidance
* Remediation guidance

---

### Relationship Model

53 causal relationships define how failures propagate through infrastructure systems.

Example:

```text
DNS_FAILURE
   ├── DB_CONNECTION_FAILURE
   │       ├── APPLICATION_TIMEOUT
   │       └── CRASH_LOOP_BACKOFF
   │
   └── SERVICE_UNAVAILABLE
```

This enables automated cascade reconstruction.

---

# How Deployment Doctor Works

```text
Raw Logs
    │
    ▼
Pattern Matching Engine
    │
    ▼
Evidence Attribution Engine
    │
    ▼
Confidence Scoring Engine
    │
    ▼
Relationship Analysis Engine
    │
    ▼
Root Cause Ranking Engine
    │
    ▼
Incident Report
```

Every stage produces traceable intermediate outputs.

Nothing is hidden.

---

# Architecture

```text
┌─────────────────────────────────────────────┐
│                React Frontend               │
│                                             │
│ Dashboard • Incident Explorer • Graph UI    │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                FastAPI API                  │
└─────────────────────┬───────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼

 Pattern Engine   Relationship   Scoring Engine
                  Engine

      └───────────────┼───────────────┘
                      ▼

      Operational Knowledge Engine

       38 Blueprints
       445 Rules
       53 Relationships
```

---

# Technology Stack

| Layer            | Technology                       |
| ---------------- | -------------------------------- |
| Backend          | Python, FastAPI                  |
| Frontend         | React, Tailwind CSS              |
| Database         | PostgreSQL                       |
| Containerization | Docker                           |
| Orchestration    | Kubernetes                       |
| Testing          | Pytest, Jest                     |
| Analysis Engine  | Custom Deterministic Rule Engine |

---

# Product Walkthrough

## Executive Dashboard

Monitor incidents, severity trends, and root cause rankings.

> Screenshot Placeholder

---

## Incident Explorer

Inspect evidence, confidence scoring, and diagnosis details.

> Screenshot Placeholder

---

## Cascade Explorer

Visualize failure propagation across systems.

> Screenshot Placeholder

---

## Knowledge Library

Browse blueprints, rules, relationships, and remediation guidance.

> Screenshot Placeholder

---

# Quick Start

## Clone Repository

```bash
git clone https://github.com/Guna-Asher/Deployment_Doctor.git

cd deployment-doctor
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

python server.py
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm start
```

---

## Analyze Logs

```bash
curl -X POST http://localhost:8000/api/analyze \
-H "Content-Type: application/json" \
-d '{
"log_content":"sample log"
}'
```

---

# API Overview

## Health Check

```http
GET /api/health
```

Returns:

* Engine status
* Blueprint count
* Rule count
* System health

---

## Analyze Logs

```http
POST /api/analyze
```

Returns:

* Root causes
* Symptoms
* Confidence scores
* Evidence mappings
* Relationship chains
* Audit trail

---

## Sample Scenarios

```http
GET /api/samples
```

Returns 50 production-inspired incident scenarios.

---

## Knowledge Base

```http
GET /api/incidents
```

Returns all blueprints, rules, relationships, and remediation guidance.

---

# Engineering Highlights

* Deterministic diagnosis architecture
* DAG-based relationship analysis
* Explainable confidence scoring
* Evidence attribution framework
* Root cause prioritization
* Audit-grade traceability
* API-first architecture
* Kubernetes-ready deployment model
* Production-grade testing strategy

---

# Competitive Differentiators

| Capability            | Deployment Doctor | Traditional APM | AI Log Analysis |
| --------------------- | ----------------- | --------------- | --------------- |
| Deterministic         | ✅                 | ✅               | ❌               |
| Explainable           | ✅                 | Partial         | ❌               |
| Auditable             | ✅                 | Limited         | ❌               |
| Root Cause Focus      | ✅                 | Partial         | Partial         |
| Relationship Analysis | ✅                 | Limited         | Limited         |
| Hallucination Free    | ✅                 | ✅               | ❌               |

---

# Roadmap

## v2.x

* Rule Builder Studio
* Historical Incident Analytics
* Advanced Cascade Visualization
* Multi-Tenant Deployments
* Kubernetes Operator
* Distributed Correlation Engine

## Long-Term Vision

Deployment Doctor aims to become the operational intelligence layer for cloud-native infrastructure.

Not merely detecting incidents.

Explaining them.

---

# Contributing

Contributions are welcome.

Areas of contribution include:

* New incident blueprints
* Detection rules
* Relationship models
* Test scenarios
* Documentation improvements
* Frontend enhancements

---

# License

MIT License

See LICENSE for details.

---

# Built For

* Site Reliability Engineers
* Platform Engineers
* DevOps Teams
* Infrastructure Architects
* Cloud Operations Teams

---

## Philosophy

Production incidents deserve evidence.

Not guesses.

Deployment Doctor exists to make incident diagnosis deterministic, explainable, and trustworthy.
