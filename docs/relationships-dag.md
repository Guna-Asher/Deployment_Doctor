# Relationships (DAG + Proximity)

## Relationship model

Each incident blueprint may declare causal relationships in:
- `causes_incidents: List[str]`

The engine represents these relationships as a directed graph:
- Edge `A -> B` means A’s failure can cause B’s incident.

## DAG validation at startup

Implemented in `app/services/blueprint_validator.py`.

It uses DFS cycle detection:
- Colors (WHITE/GRAY/BLACK)
- If a neighbor is `GRAY`, a cycle exists → startup fails with a descriptive error.

## Proximity validation for relationship bonus

Implemented in `app/services/relationship_engine.py`.

For each declared edge `A -> B`:
1. Both `A` and `B` must be detected.
2. Compute minimum line distance between evidence line numbers.
3. If `min_dist <= PROXIMITY_WINDOW` (200):
   - apply `RELATIONSHIP_BONUS` (+20) to incident A

Otherwise:
- skip the relationship bonus.

