# Relationship Analysis & Cascade Detection

**Deep dive into DAG modeling, cascade detection, and root cause identification through incident relationships.**

---

## Table of Contents

1. [Overview](#1-overview)
2. [The DAG Model](#2-the-dag-model)
3. [Cascade Detection](#3-cascade-detection)
4. [Root Cause Identification](#4-root-cause-identification)
5. [Proximity Validation](#5-proximity-validation)
6. [Graph Visualization](#6-graph-visualization)
7. [Real-World Examples](#7-real-world-examples)

---

## 1. Overview

Deployment Doctor understands that **one failure cascades into many**. The relationship analysis engine uses a directed acyclic graph (DAG) to model causal chains and automatically identify cascading failures.

### The Problem

Traditional log analysis treats each incident independently:

```
Event A: DNS lookup failed
Event B: Database connection failed
Event C: Application crashed (CrashLoopBackOff)

Traditional approach: "Three separate problems"
```

### The Deployment Doctor Approach

Understand the causal chain:

```
DNS_FAILURE (root cause)
  ↓
  causes
  ↓
DB_CONNECTION_FAILURE (cascading effect)
  ↓
  causes
  ↓
CRASH_LOOP_BACKOFF (downstream symptom)

Result: One root cause with a clear remediation path
```

---

## 2. The DAG Model

The knowledge base encodes incident relationships as a directed acyclic graph.

### DAG Properties

```
Nodes:  38 incident blueprints
Edges:  53 causal relationships (A causes B)

Direction: From root cause → to downstream effect
Cycles:    Forbidden (validated at startup)
Scope:     Covers entire Kubernetes + cloud-native stack
```

### Graph Topology

```
                    ┌─ DATABASE ISSUES
                    │
ROOT CAUSES ────────┼─ NETWORKING ISSUES
(21 nodes)          │
                    └─ CONFIGURATION ISSUES

                         ↓
                  
INTERMEDIATE           DNS_FAILURE
(11 nodes)        ↙     ↓     ↘
            CONFIG    NETWORK   DB
            ERROR     TIMEOUT   CONN
               ↓         ↓        ↓
            
SYMPTOMS ────────────────┼────────┴─→ CRASH_LOOP_BACKOFF
(6 nodes)                └──────────→ POD_EVICTION
```

### Node Classifications (Topology-Based)

| Classification | Count | Incoming Edges | Outgoing Edges | Meaning |
|---|---|---|---|---|
| **Root Causes** | 21 | 0 | 1+ | Underlying failures that cause downstream effects |
| **Intermediates** | 11 | 1+ | 1+ | Both result from other issues and cause others |
| **Symptoms** | 6 | 1+ | 0 | Terminal effects (e.g., CrashLoopBackOff) |

---

## 3. Cascade Detection

### Algorithm

For every pair of detected incidents (A, B) where A declares that it causes B:

```
1. Check: Is B also detected in the results?
2. Check: Are evidence lines within 200-line proximity?
3. If both true: Apply +20 bonus to A's score
4. If false: Ignore the relationship
```

### Code Example

```python
def detect_cascades(
    detected_incidents: dict[str, IncidentResult],
    blueprints: dict[str, Blueprint]
) -> dict[str, list[CascadeBonus]]:
    """
    Identifies validated cause-effect chains.
    Returns bonuses to apply to incident scores.
    """
    cascades = {}
    
    for cause_id, cause_incident in detected_incidents.items():
        cause_blueprint = blueprints[cause_id]
        
        for effect_id in cause_blueprint.causes_incidents:
            # Is the effect also detected?
            if effect_id not in detected_incidents:
                continue
            
            effect_incident = detected_incidents[effect_id]
            
            # Check proximity
            cause_lines = {e.line_number for e in cause_incident.evidence}
            effect_lines = {e.line_number for e in effect_incident.evidence}
            
            min_dist = min_line_distance(cause_lines, effect_lines)
            
            if min_dist <= 200:
                cascades[cause_id] = CascadeBonus(
                    source=cause_id,
                    target=effect_id,
                    distance=min_dist,
                    bonus=20.0,
                    applied=True
                )
                
                # Audit trail entry
                audit.append(AuditTrailEntry(
                    stage="RELATIONSHIP_BONUS",
                    description=f"{cause_id} → {effect_id}: {min_dist} lines ≤ 200. +20",
                    score_change=20.0
                ))
    
    return cascades
```

### Multi-Hop Chains

Relationships are transitive in display but not in scoring:

```
DNS_FAILURE (score=250) → +20 for detecting DB_CONNECTION_FAILURE
                              ↓
                          DB_CONNECTION_FAILURE (score=180) → +20 for detecting CRASH_LOOP_BACKOFF
                                                                  ↓
                                                              CRASH_LOOP_BACKOFF (score=100)

Final scores:
  DNS_FAILURE:         250 + 20 = 270
  DB_CONNECTION:       180 + 20 = 200
  CRASH_LOOP_BACKOFF:  100 + 0  = 100 (no outgoing edges)

Ranking: DNS_FAILURE > DB_CONNECTION > CRASH_LOOP_BACKOFF
```

Each incident gets a bonus only for its direct cause-effect relationship, not indirect ones.

---

## 4. Root Cause Identification

### The Problem: Root vs. Symptom

Without relationship analysis:

```
Detected incidents (by score):
1. CRASH_LOOP_BACKOFF (score=280)
2. DB_CONNECTION_FAILURE (score=150)

Which is the root cause? CRASH_LOOP_BACKOFF sounds more urgent.
Actually, DB_CONNECTION_FAILURE is the root cause.
```

### The Solution: Role Classification + Penalty

Each blueprint is classified as either `root_cause` or `symptom`:

```json
// Root cause: underlying failure
{"id": "DB_CONNECTION_FAILURE", "incident_role": "root_cause", ...}

// Symptom: downstream effect
{"id": "CRASH_LOOP_BACKOFF", "incident_role": "symptom", ...}
```

When both are detected, the scoring algorithm:

```
1. Calculate base scores for both
2. Apply -20 penalty to symptoms
3. Re-rank

DB_CONNECTION_FAILURE:  score=150, role=root_cause   → 150 - 0 = 150
CRASH_LOOP_BACKOFF:     score=280, role=symptom      → 280 - 20 = 260

After penalty, DB_CONNECTION_FAILURE ranks first ✓
```

### Why This Works

Symptoms tend to be detected with higher scores (more patterns, more occurrences in logs). The penalty ensures that true root causes rank first, while still showing symptoms as contributing incidents.

---

## 5. Proximity Validation

### The 200-Line Window

Relationships are validated only if evidence appears within **200 log lines**:

```
Lines 1-50:     Application starts
Lines 51-100:   DNS resolution begins
Line 87:        "DNS resolution failed" ← evidence for DNS_FAILURE
Lines 101-150:  Application retries
Lines 151-200:  Database connection attempts
Line 175:       "Connection refused" ← evidence for DB_CONNECTION_FAILURE

Distance: 175 - 87 = 88 lines ≤ 200 ✓ Relationship bonus applied
```

### Why This Matters

Without proximity validation:

```
Lines 1-50:     First deployment attempt fails (DNS issue)
Lines 1000-1050: Later, a different service fails (DB issue)

False cascade: "DNS failure caused this DB failure"
Cost: Incorrect diagnosis, wasted debugging time
```

With proximity validation:

```
Lines 1-50:     DNS issue detected
Lines 1000-1050: DB issue detected (1000 - 50 = 950 lines away)

Distance > 200: No relationship bonus
Result: Treated as independent incidents ✓
```

### Efficient Calculation

Using two-pointer algorithm for O(n log n):

```python
def min_line_distance(lines_a: list[int], lines_b: list[int]) -> int:
    """
    O(n log n) where n = total lines across both arrays
    """
    a, b = sorted(lines_a), sorted(lines_b)
    min_dist, i, j = float('inf'), 0, 0
    
    while i < len(a) and j < len(b):
        dist = abs(a[i] - b[j])
        min_dist = min(min_dist, dist)
        if a[i] < b[j]:
            i += 1
        else:
            j += 1
    
    return min_dist
```

---

## 6. Graph Visualization

### API Response

Each analysis includes a `relationship_graph` object:

```json
{
  "nodes": [
    {"id": "DNS_FAILURE", "severity": "CRITICAL", "detected": true, "is_primary": true},
    {"id": "DB_CONNECTION_FAILURE", "severity": "CRITICAL", "detected": true, "is_primary": false},
    {"id": "CRASH_LOOP_BACKOFF", "severity": "CRITICAL", "detected": true, "is_primary": false}
  ],
  "edges": [
    {
      "source": "DNS_FAILURE",
      "target": "DB_CONNECTION_FAILURE",
      "bonus_applied": true,
      "proximity_validated": true,
      "distance": 87
    },
    {
      "source": "DB_CONNECTION_FAILURE",
      "target": "CRASH_LOOP_BACKOFF",
      "bonus_applied": true,
      "proximity_validated": true,
      "distance": 45
    }
  ],
  "bonuses_applied": [
    "DNS_FAILURE → DB_CONNECTION_FAILURE (+20)",
    "DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF (+20)"
  ]
}
```

### Frontend Rendering

The React Cascade Explorer visualizes this as:

```
┌──────────────────────────────┐
│  DNS_FAILURE                 │
│  CRITICAL ★ PRIMARY          │
│  score: 270, confidence: 100 │
└────────────┬─────────────────┘
             │ causes (87 lines)
             ↓
┌──────────────────────────────┐
│  DB_CONNECTION_FAILURE       │
│  CRITICAL                    │
│  score: 200, confidence: 100 │
└────────────┬─────────────────┘
             │ causes (45 lines)
             ↓
┌──────────────────────────────┐
│  CRASH_LOOP_BACKOFF          │
│  CRITICAL (symptom)          │
│  score: 100, confidence: 100 │
└──────────────────────────────┘
```

---

## 7. Real-World Examples

### Example 1: DNS Failure Cascade

**Scenario**: Production deployment fails with CrashLoopBackOff

**Log excerpt**:

```
[10:15:23] Starting service initialization
[10:15:24] ERROR: Failed to resolve database.prod.svc.cluster.local
[10:15:24] ERROR: nslookup: command not found / DNS resolution failed
[10:15:25] ERROR: Cannot connect to database
[10:15:26] ERROR: FATAL: connection refused (10.0.0.5:5432)
[10:15:27] CRASH: Container exited with code 1
[10:15:28] CrashLoopBackOff: restarting container
```

**Detection**:

1. Pattern matching identifies:
   - "DNS resolution failed" → DNS_FAILURE (score: 85)
   - "connection refused" → DB_CONNECTION_FAILURE (score: 120)
   - "CrashLoopBackOff" → CRASH_LOOP_BACKOFF (score: 140)

2. Relationship analysis:
   - DNS_FAILURE causes DB_CONNECTION_FAILURE (distance: 1 line) → +20 bonus
   - DB_CONNECTION_FAILURE causes CRASH_LOOP_BACKOFF (distance: 2 lines) → +20 bonus

3. Symptom penalty:
   - CRASH_LOOP_BACKOFF is a symptom → -20 penalty

4. Final scores:
   - DNS_FAILURE: 85 + 20 = 105
   - DB_CONNECTION_FAILURE: 120 + 20 - 0 = 140
   - CRASH_LOOP_BACKOFF: 140 - 20 = 120

5. Ranking: DB_CONNECTION_FAILURE (root cause) > CRASH_LOOP_BACKOFF > DNS_FAILURE

**SRE Action**: "Check DNS configuration and database connectivity"

---

### Example 2: Configuration Cascade

**Scenario**: New deployment fails with authentication errors

**Log excerpt**:

```
[10:22:00] Loading configuration from secrets
[10:22:01] ERROR: Secret 'db-password' not found in namespace
[10:22:02] ERROR: Authentication failed: invalid credentials
[10:22:03] ERROR: PERMISSION DENIED: Cannot access API
[10:22:04] Application failed to start
```

**Detection**:

1. Incidents:
   - MISSING_CONFIGURATION (score: 110)
   - AUTHENTICATION_FAILURE (score: 95)
   - PERMISSION_DENIED (score: 85)

2. Relationships:
   - MISSING_CONFIGURATION causes AUTHENTICATION_FAILURE (+20)
   - AUTHENTICATION_FAILURE causes PERMISSION_DENIED (+20)

3. Final scores:
   - MISSING_CONFIGURATION: 110 + 20 = 130
   - AUTHENTICATION_FAILURE: 95 + 20 = 115
   - PERMISSION_DENIED: 85 + 0 = 85

**Primary Incident**: MISSING_CONFIGURATION

**SRE Action**: "Verify Kubernetes secrets are present in the deployment namespace"

---

### Example 3: Resource Exhaustion

**Scenario**: Service becomes unresponsive

**Log excerpt**:

```
[14:30:00] Memory usage: 512MB / 1GB
[14:31:15] Memory usage: 890MB / 1GB
[14:31:30] WARNING: Memory pressure detected
[14:32:00] ERROR: OOMKilled: Out of memory
[14:32:01] Container restarting
[14:32:02] Pod evicted from node
```

**Detection**:

1. Incidents:
   - MEMORY_PRESSURE (score: 60)
   - OOM_KILLED (score: 140)
   - POD_EVICTION (score: 100)

2. Relationships:
   - MEMORY_PRESSURE causes OOM_KILLED (+20)
   - OOM_KILLED causes POD_EVICTION (+20)

3. Final scores:
   - MEMORY_PRESSURE: 60 + 20 = 80
   - OOM_KILLED: 140 + 20 = 160
   - POD_EVICTION: 100 - 20 (symptom) = 80

**Primary Incident**: OOM_KILLED

**SRE Action**: "Increase container memory limits or investigate memory leaks"

---

## Key Insights

### Cascade Detection Prevents False Positives

Without cascades, every downstream symptom looks like a separate root cause:
- CrashLoopBackOff appears critical (high pattern match frequency)
- DNS failure buried in logs (fewer matches)

With cascades, true root causes surface through relationship bonuses.

### Proximity Validation Prevents False Chains

Without proximity, any two incidents in the same log are linked:
- First deployment (hour 1): DNS issue
- Later service (hour 2): Database issue
- Incorrectly linked as cascade

With proximity, only genuinely related incidents (same timeframe, same log section) are connected.

### Multi-Hop Chains Guide Remediation

Single cascade: "Fix the immediate cause"  
Multi-hop chain: "Fix the root cause to resolve all downstream effects"

```
DNS_FAILURE → DB_CONNECTION_FAILURE → CRASH_LOOP_BACKOFF

SRE knows: Fix DNS, everything else resolves automatically
```

---

**Last Updated**: June 2026  
**Relationship Edges**: 53  
**Proximity Window**: 200 lines  
**Root Cause Blueprints**: 21  
**Symptom Blueprints**: 6
