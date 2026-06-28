# Interview Q&A (moved from README)

*(Content preserved from the original README section “Interview Questions & Answers”.)*

## Q: Why is determinism so important for a debugging tool?

**A:** In incident response, trust is everything. If an engineer runs the same log through a tool twice and gets different results, they cannot trust either result. Determinism means:

1. **Reproducibility** — paste the same log into a post-mortem ticket and get the same analysis
2. **Auditability** — "why did you say DB failure?" has an exact, traceable answer
3. **Testability** — acceptance tests can assert exact outputs without mocking
4. **Operator trust** — SREs can build playbooks around predictable tool behavior

An LLM-based approach fails all four criteria.

## Q: How does deduplication prevent score inflation?

**A:** Without deduplication, a chatty application that prints "connection refused" 500 times per second would receive `500 × weight` score — completely drowning out the actual diagnostic value of _diversity_ of matched patterns.

The correct signal is: "This log matches 7 distinct patterns of DB_CONNECTION_FAILURE" — not "this log contains the word 'refused' 500 times."

I track `occurrences` separately for display (showing the user that the error repeated 500 times), but only add the weight once to `pattern_score`.

## Q: Walk me through the relationship bonus system.

**A:** The DAG defines causal relationships between blueprints (e.g., DNS_FAILURE causes DB_CONNECTION_FAILURE causes CRASH_LOOP_BACKOFF).

During analysis:
1. Traverse each detected blueprint's `causes_incidents` list
2. Check if the caused blueprint is also detected
3. If yes, compute minimum line distance between their evidence records using an O(n log n) two-pointer algorithm on sorted line arrays
4. If distance ≤ 200 lines → apply +20 relationship bonus to the root cause blueprint

The proximity window prevents false positives: two unrelated incidents that happen to share a log file shouldn't be linked just because they both appear in the same 10,000-line file.

## Q: What happens if two incidents have the same score?

**A:** The ranking uses a 4-key deterministic sort:

1. **Incident score** (descending) — primary sort key
2. **Severity** (CRITICAL > ERROR > WARNING > INFO) — same score, higher severity wins
3. **Blueprint priority** (ascending) — lower number = higher architectural importance
4. **Blueprint ID** (alphabetical) — absolute final tiebreaker, always produces same result

This ensures the ranking is **total** (every incident has a unique rank) and **stable** across all environments.

## Q: Why did you use PostgreSQL JSONB instead of separate tables for evidence records?

**A:** Trade-off analysis:

**Normalized approach** (separate tables for evidence, patterns, audit trail):
- Pro: Queryable fields, better for analytics
- Con: Complex joins to reconstruct a full report; schema migrations needed for every result structure change; slower single-report retrieval

**JSONB approach** (full result as one JSONB column):
- Pro: Single-row fetch returns complete report; no joins; schema-flexible as engine evolves
- Con: Can't query inside JSONB without indexes

I chose JSONB for `result_json` but **also** extracted `detection_status`, `confidence`, and `primary_incident_id` as real columns. This gives the best of both: efficient filtering/aggregation on extracted columns, atomic retrieval for full reports.

## Q: Why not just use MongoDB for this?

**A:** MongoDB would work fine. I chose PostgreSQL to demonstrate:

1. **Schema enforcement** — `analysis_results` has typed columns + JSONB, not "anything goes"
2. **JSONB is best of both worlds** — structured columns for indexes + flexible JSONB for the payload
3. **Production relevance** — most serious data infrastructure runs on PostgreSQL
4. **SQLAlchemy async** — shows understanding of async ORM patterns with proper connection pooling

The architecture would translate to MongoDB trivially — JSONB maps to a nested document.

## Q: What would you change about this architecture at 10× scale?

**A:**

1. **Async analysis queue** — move analysis off the HTTP request path using Celery + Redis. Client polls for result via polling endpoint or WebSocket
2. **Blueprint hot-reload** — watch `incidents.json` with `inotify` and reload without restart
3. **Pattern index** — pre-compile lowercase pattern strings into an Aho-Corasick automaton for O(n + m) multi-pattern matching instead of O(n × m)
4. **Partitioned PostgreSQL table** — partition `analysis_results` by month for query efficiency at millions of rows
5. **Metrics export** — emit analysis duration, detection status distribution, blueprint hit rates to Prometheus
6. **Blueprint version control** — store `blueprint_version` per analysis result so old reports can be re-interpreted with new blueprints

