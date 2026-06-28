# Operational Knowledge Engine — Deployment Doctor

**The knowledge engine is the strategic core of Deployment Doctor. It encodes years of Kubernetes and cloud-native incident experience into a structured, queryable, and maintainable format.**

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Blueprint System](#2-the-blueprint-system)
3. [Blueprint Schema Reference](#3-blueprint-schema-reference)
4. [The Rule System](#4-the-rule-system)
5. [Pattern Matching](#5-pattern-matching)
6. [Category Structure](#6-category-structure)
7. [Incident Relationships](#7-incident-relationships)
8. [Operational Runbook Data](#8-operational-runbook-data)
9. [Knowledge Base Statistics](#9-knowledge-base-statistics)
10. [Extending the Knowledge Base](#10-extending-the-knowledge-base)

---

## 1. Overview

The operational knowledge engine stores all detection knowledge in a single structured JSON file: `backend/rules/incidents.json`.

### Why This Design?

This design is intentional:

- **Version-controlled** — Every change to the knowledge base is a diff in git
- **Human-readable** — Engineers can read and edit blueprints directly
- **Testable** — The full test suite validates the knowledge base at every CI run
- **Portable** — No database migration needed to add new incident types
- **Zero-latency** — Loaded at startup, held in memory, no I/O during analysis

### Strategic Asset

The **Operational Knowledge Engine is the most valuable part of Deployment Doctor**. The detection code is standard pattern matching, but the **445 rules, 38 blueprints, and 53 relationships** represent curated incident knowledge that would take years for a team to build from scratch.

### Current Scope

- **38 Incident Blueprints** across 11 categories
- **445 Detection Rules** (patterns)
- **53 Relationship Edges** (cause-effect chains)
- **11 Incident Categories** (DATABASE, NETWORKING, KUBERNETES, etc.)
- **50 Incident Scenarios** (demo/testing logs)

---

## 2. The Blueprint System

An **incident blueprint** is the fundamental unit of knowledge in Deployment Doctor. Each blueprint encodes everything the engine needs to:

1. Detect the incident from log patterns
2. Explain why it was detected (evidence)
3. Guide an engineer to confirm it (verification steps)
4. Provide remediation guidance (recommended fixes)
5. Understand its role in incident cascades (relationship edges)

### Blueprint Example: Database Connection Failure

```json
{
  "id": "DB_CONNECTION_FAILURE",
  "title": "Database Connection Failure",
  "category": "DATABASE",
  "severity": "CRITICAL",
  "incident_role": "root_cause",
  "priority": 1,
  
  "patterns": [
    {"match": "connection refused", "weight": 40},
    {"match": "could not connect to server", "weight": 45},
    {"match": "database connection failed", "weight": 50},
    {"match": "ECONNREFUSED", "weight": 40},
    {"match": "connection pool exhausted", "weight": 35},
    {"match": "too many connections", "weight": 30},
    {"match": "unable to connect to database", "weight": 45},
    {"match": "sql: database is closed", "weight": 35},
    {"match": "lost connection to MySQL server", "weight": 40}
  ],
  
  "possible_causes": [
    "Database server is not running or has crashed",
    "Incorrect database host, port, or credentials in configuration",
    "Network connectivity issue between service and database pod",
    "Database connection pool exhausted due to connection leaks",
    "Database is overloaded and rejecting new connections",
    "Firewall or network policy rules blocking the database port"
  ],
  
  "verification_steps": [
    "kubectl exec -it <pod> -- nc -zv <db-host> 5432",
    "kubectl logs <db-pod> --tail=100",
    "kubectl get endpoints <db-service>",
    "kubectl describe pod <app-pod> | grep -A5 'Env'",
    "psql -h <db-host> -U <user> -d <db> -c '\\conninfo'"
  ],
  
  "recommended_fixes": [
    "Verify database pod is running: kubectl get pods -l app=<db-label>",
    "Check service endpoints: kubectl get svc <db-service>",
    "Increase database connection pool size in application config",
    "Verify database credentials in Kubernetes secrets",
    "Check network policies: kubectl get networkpolicies -A",
    "Restart the database: kubectl rollout restart deployment/<db-deployment>"
  ],
  
  "causes_incidents": ["CRASH_LOOP_BACKOFF"]
}
```

---

## 3. Blueprint Schema Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (SCREAMING_SNAKE_CASE) |
| `title` | string | Human-readable name |
| `category` | string | One of 11 categories |
| `severity` | string | CRITICAL, ERROR, WARNING, or INFO |
| `incident_role` | string | "root_cause" or "symptom" |
| `priority` | integer | Lower number = higher importance |
| `patterns` | array | Detection rules (see below) |
| `possible_causes` | array | Bullet list of likely root causes |
| `verification_steps` | array | kubectl/debugging commands |
| `recommended_fixes` | array | Remediation guidance |
| `causes_incidents` | array | IDs of downstream incidents |

### Pattern Schema

Each pattern is an object:

```json
{
  "match": "string to find in logs",
  "weight": 40
}
```

- **match** (string): Case-insensitive substring to search for
- **weight** (integer): Score contribution (typically 30–50)

### Incident Role

- **"root_cause"**: The underlying failure (e.g., DNS down, config invalid, storage full)
- **"symptom"**: The downstream effect (e.g., CrashLoopBackOff, pod eviction, connection timeout)

The ranking algorithm penalizes symptoms so true root causes float to the top.

---

## 4. The Rule System

**445 Detection Rules** are organized as patterns within blueprints. Each rule is a simple object:

```json
{"match": "connection refused", "weight": 40}
```

### Weight Assignment

Weights reflect diagnostic specificity:

| Weight Range | Meaning | Example |
|-------------|---------|---------|
| 5–10 | Weak indicator | "error", "failed", "timeout" |
| 10–20 | Moderate indicator | "connection error", "DNS lookup failed" |
| 20–40 | Strong indicator | "ECONNREFUSED", "connection refused" |
| 40+ | Critical indicator | "database connection failed", "FATAL: database" |

### Weight Distribution

Most blueprints have 9–12 patterns, ranging from 30 to 50 in weight:

```json
[
  {"match": "weak indicator", "weight": 10},
  {"match": "moderate indicator", "weight": 25},
  {"match": "strong indicator", "weight": 40},
  {"match": "critical indicator", "weight": 50}
]
```

This ensures diversity: a blueprint needs multiple pattern matches to achieve high confidence, preventing false positives from any single pattern.

---

## 5. Pattern Matching

### Matching Algorithm

```
for each line in log:
  for each blueprint B:
    for each pattern P in B.patterns:
      if P.match (case-insensitive) in line:
        record evidence line
```

### Case Sensitivity

- **Matching**: Case-insensitive (both pattern and log line converted to lowercase)
- **Display**: Matches highlighted in original case

### Multiple Occurrences

If "connection refused" appears 500 times in a log:

- **Evidence records**: All 500 lines are recorded
- **Scoring**: Pattern contributes weight only once (deduplicated)
- **Display**: User sees "500 occurrences" in the UI

This prevents high-frequency noise from artificially inflating scores.

---

## 6. Category Structure

The 11 incident categories organize blueprints by infrastructure domain:

| Category | Count | Examples |
|----------|-------|----------|
| **DATABASE** | 5 | Connection failure, pool exhaustion, deadlock |
| **NETWORKING** | 4 | DNS failure, port conflict, latency |
| **KUBERNETES** | 6 | CrashLoopBackOff, ImagePullBackOff, eviction |
| **CONFIGURATION** | 4 | Missing config, bad secrets, version mismatch |
| **AUTHENTICATION** | 3 | Auth failure, permission denied, unauthorized |
| **RESOURCES** | 4 | OOM, CPU throttle, disk full, memory pressure |
| **STORAGE** | 2 | Disk full, I/O error |
| **DEPLOYMENT** | 2 | Rollout failure, deployment timeout |
| **MONITORING** | 2 | Metrics missing, health check failure |
| **RUNTIME** | 1 | Segmentation fault |
| **OTHER** | 0 | Miscellaneous |

### Why Categories Matter

- User filtering in knowledge base browser
- Dashboard grouping
- Alert configuration (enable/disable by category)
- Future: learning to suggest patterns for underrepresented categories

---

## 7. Incident Relationships

Incidents form a **Directed Acyclic Graph (DAG)** with **53 relationship edges**.

### Example Graph

```
DNS_FAILURE
  ├─ causes ─> DB_CONNECTION_FAILURE
  │               ├─ causes ─> CRASH_LOOP_BACKOFF
  │               └─ causes ─> APPLICATION_TIMEOUT
  └─ causes ─> SERVICE_UNAVAILABLE

MISSING_CONFIGURATION
  ├─ causes ─> AUTHENTICATION_FAILURE
  │               └─ causes ─> API_FORBIDDEN_ERROR
  └─ causes ─> PERMISSION_DENIED
```

### Relationship Scoring

When both a cause and its declared effect are detected:

1. Check that evidence lines are within **200 lines** of each other
2. If yes: apply **+20 relationship bonus** to the cause's score
3. If no: relationship ignored (evidence too far apart)

This ensures the engine correctly identifies cascading failures while avoiding spurious relationships across unrelated log sections.

### Graph Statistics

- **Root Causes** (no incoming edges): 21 blueprints
- **Intermediates** (both incoming/outgoing): 11 blueprints
- **Symptoms** (no outgoing edges): 6 blueprints
- **Total Edges**: 53

---

## 8. Operational Runbook Data

Each blueprint includes three types of operational guidance:

### 1. Possible Causes

A bullet list of likely root causes:

```json
"possible_causes": [
  "Database server is not running or has crashed",
  "Incorrect database host, port, or credentials in configuration",
  "Network connectivity issue between service and database pod",
  "Database connection pool exhausted due to connection leaks"
]
```

Used by engineers to focus investigation.

### 2. Verification Steps

Shell commands to confirm the diagnosis:

```json
"verification_steps": [
  "kubectl exec -it <pod> -- nc -zv <db-host> 5432",
  "kubectl logs <db-pod> --tail=100",
  "kubectl get endpoints <db-service>",
  "psql -h <db-host> -U <user> -d <db> -c '\\conninfo'"
]
```

All commands are ready-to-use (with placeholder substitution).

### 3. Recommended Fixes

Remediation actions ranked by likelihood:

```json
"recommended_fixes": [
  "Verify database pod is running: kubectl get pods -l app=<db-label>",
  "Check service endpoints: kubectl get svc <db-service>",
  "Increase database connection pool size in application config",
  "Verify database credentials in Kubernetes secrets",
  "Check network policies: kubectl get networkpolicies -A"
]
```

Guides the engineer through likely remediation paths.

---

## 9. Knowledge Base Statistics

### Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Incident Blueprints** | 38 | Complete incident types |
| **Detection Rules** | 445 | Individual patterns |
| **Avg Rules per Blueprint** | 11.7 | Range: 6–15 |
| **Relationship Edges** | 53 | Cause-effect chains |
| **Incident Categories** | 11 | Infrastructure domains |
| **Avg Weight per Pattern** | 36.8 | Range: 10–50 |
| **Root Cause Blueprints** | 21 | No incoming edges |
| **Symptom Blueprints** | 6 | No outgoing edges |

### Distribution by Category

```
DATABASE:        5 blueprints (72 rules)
KUBERNETES:      6 blueprints (95 rules)
NETWORKING:      4 blueprints (58 rules)
CONFIGURATION:   4 blueprints (62 rules)
RESOURCES:       4 blueprints (48 rules)
AUTHENTICATION:  3 blueprints (35 rules)
STORAGE:         2 blueprints (20 rules)
DEPLOYMENT:      2 blueprints (18 rules)
MONITORING:      2 blueprints (22 rules)
RUNTIME:         1 blueprint  (8 rules)
OTHER:           5 blueprints (12 rules)
```

---

## 10. Extending the Knowledge Base

### Adding a New Blueprint

1. **Create blueprint JSON** in `incidents.json`:

```json
{
  "id": "NEW_INCIDENT_TYPE",
  "title": "Human-Readable Title",
  "category": "DATABASE",
  "severity": "CRITICAL",
  "incident_role": "root_cause",
  "priority": 10,
  "patterns": [
    {"match": "pattern1", "weight": 40},
    {"match": "pattern2", "weight": 35}
  ],
  "possible_causes": ["Cause 1", "Cause 2"],
  "verification_steps": ["kubectl command 1", "kubectl command 2"],
  "recommended_fixes": ["Fix 1", "Fix 2"],
  "causes_incidents": []
}
```

2. **Add relationship edges** in `causes_incidents` arrays (if applicable)
3. **Run validation**: `pytest tests/test_engine.py::test_blueprint_validation`
4. **Add test scenario** (demo log) to `backend/sample-logs/`
5. **Test end-to-end**: Upload scenario and verify detection

### Adding a New Pattern

1. Edit the blueprint's `patterns` array
2. Assign a weight (30–50 typical)
3. Run validation
4. Test with real logs

### Validating Changes

```bash
# Validate at startup (automatic)
python server.py

# Run unit tests
pytest tests/ -v

# Validate schema and DAG
python -m app.services.blueprint_validator
```

### Best Practices

- **Pattern Weights**: Assign higher weights to more specific patterns (e.g., "ECONNREFUSED" > "connection")
- **Multiple Patterns**: Include 8–12 patterns per blueprint for robustness
- **Relationships**: Keep the DAG acyclic (no cycles permitted)
- **Categories**: Place incident in the most specific category
- **Severity**: Use CRITICAL for true root causes, ERROR for contributing factors
- **Verification Steps**: Include 4–6 commands that help confirm the diagnosis
- **Fixes**: Rank from most likely to least likely

---

## Knowledge Base as a Product

### Why This Matters

The operational knowledge base is **not just a data file**—it's the core intellectual property of Deployment Doctor. It represents:

- **Years of incident experience** encoded in queryable form
- **Kubernetes best practices** validated against real failures
- **SRE wisdom** translated into detection rules
- **Production patterns** for cloud-native applications

### Competitive Advantage

Building 38 blueprints with 445 rules and 53 relationships takes significant time and expertise. This knowledge base:

- Saves new teams months of incident response learning
- Encodes hard-won SRE knowledge
- Is version-controlled and auditable
- Can be customized per organization
- Serves as the foundation for future products

---

**Last Updated**: June 2026  
**Knowledge Base Version**: 1.0.0  
**Total Blueprints**: 38  
**Total Rules**: 445  
**Total Relationships**: 53
