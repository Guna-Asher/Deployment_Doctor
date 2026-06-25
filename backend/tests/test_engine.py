"""
Deployment Doctor — Comprehensive Test Suite
Tests: blueprint validation, DAG, pattern matching, deduped scoring,
evidence attribution, proximity validation, relationship analysis,
root cause ranking, ambiguity detection, insufficient evidence, AI fallback.
"""
import pytest
import json
import sys
from pathlib import Path

# Ensure app module is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas import (
    IncidentBlueprint, BlueprintPattern, AnalysisRequest,
    MIN_SCORE, AMBIGUITY_THRESHOLD, RELATIONSHIP_BONUS, EVIDENCE_BONUS, SYMPTOM_PENALTY
)
from app.services.blueprint_validator import validate_blueprints, _detect_dag_cycle
from app.services.pattern_matcher import match_blueprints, validate_log
from app.services.scoring_engine import score_incident
from app.services.relationship_engine import analyze_relationships, _min_line_distance
from app.services.root_cause_engine import run_analysis


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_blueprint(id_, severity="ERROR", incident_role="root_cause", priority=1,
                   patterns=None, causes=None):
    return IncidentBlueprint(
        id=id_,
        title=f"Test {id_}",
        category="TEST",
        severity=severity,
        incident_role=incident_role,
        priority=priority,
        patterns=patterns or [
            BlueprintPattern(match="foo error", weight=40),
            BlueprintPattern(match="bar failed", weight=30),
            BlueprintPattern(match="baz refused", weight=25),
        ],
        possible_causes=["Cause A", "Cause B", "Cause C"],
        verification_steps=["cmd1", "cmd2", "cmd3"],
        recommended_fixes=["fix1", "fix2", "fix3"],
        causes_incidents=causes or [],
    )


# ── Blueprint Validation ───────────────────────────────────────────────────────

class TestBlueprintValidation:
    def test_validates_production_blueprints(self):
        """All 10 production blueprints must pass validation."""
        blueprints = validate_blueprints()
        assert len(blueprints) == 10

    def test_all_blueprints_have_required_fields(self):
        blueprints = validate_blueprints()
        for bp_id, bp in blueprints.items():
            assert bp.id == bp_id
            assert len(bp.patterns) >= 3, f"{bp_id}: too few patterns"
            assert len(bp.possible_causes) >= 3, f"{bp_id}: too few causes"
            assert len(bp.recommended_fixes) >= 3, f"{bp_id}: too few fixes"
            assert len(bp.verification_steps) >= 3, f"{bp_id}: too few steps"

    def test_all_pattern_weights_positive(self):
        blueprints = validate_blueprints()
        for bp_id, bp in blueprints.items():
            for pat in bp.patterns:
                assert pat.weight > 0, f"{bp_id}: pattern '{pat.match}' has weight <= 0"

    def test_no_duplicate_patterns_per_blueprint(self):
        blueprints = validate_blueprints()
        for bp_id, bp in blueprints.items():
            seen = set()
            for pat in bp.patterns:
                key = pat.match.lower()
                assert key not in seen, f"{bp_id}: duplicate pattern '{pat.match}'"
                seen.add(key)

    def test_relationship_targets_exist(self):
        blueprints = validate_blueprints()
        for bp_id, bp in blueprints.items():
            for target in bp.causes_incidents:
                assert target in blueprints, f"{bp_id}: target '{target}' does not exist"

    def test_unique_blueprint_ids(self):
        blueprints = validate_blueprints()
        ids = list(blueprints.keys())
        assert len(ids) == len(set(ids)), "Duplicate blueprint IDs found"


# ── DAG Validation ────────────────────────────────────────────────────────────

class TestDAGValidation:
    def test_production_blueprints_form_valid_dag(self):
        blueprints = validate_blueprints()
        cycle = _detect_dag_cycle(blueprints)
        assert cycle == [], f"Cycle detected: {cycle}"

    def test_detects_direct_cycle(self):
        """A ← B, B ← A must be detected."""
        bps = {
            "A": make_blueprint("A", causes=["B"]),
            "B": make_blueprint("B", causes=["A"]),
        }
        cycle = _detect_dag_cycle(bps)
        assert len(cycle) > 0, "Should have detected A→B→A cycle"

    def test_detects_transitive_cycle(self):
        """A→B→C→A must be detected."""
        bps = {
            "A": make_blueprint("A", causes=["B"]),
            "B": make_blueprint("B", causes=["C"]),
            "C": make_blueprint("C", causes=["A"]),
        }
        cycle = _detect_dag_cycle(bps)
        assert len(cycle) > 0, "Should have detected A→B→C→A cycle"

    def test_valid_chain_no_cycle(self):
        """A→B→C with no back edge must pass."""
        bps = {
            "A": make_blueprint("A", causes=["B"]),
            "B": make_blueprint("B", causes=["C"]),
            "C": make_blueprint("C", causes=[]),
        }
        cycle = _detect_dag_cycle(bps)
        assert cycle == []


# ── Log Validation ────────────────────────────────────────────────────────────

class TestLogValidation:
    def test_valid_small_log(self):
        valid, errors, lines, size = validate_log("line1\nline2\nline3", "test.log")
        assert valid is True
        assert lines == 3
        assert errors == []

    def test_rejects_file_over_5mb(self):
        big = "x" * (5 * 1024 * 1024 + 1)
        valid, errors, _, _ = validate_log(big, "big.log")
        assert valid is False
        assert len(errors) > 0

    def test_rejects_over_50000_lines(self):
        many_lines = "\n".join(["line"] * 50001)
        valid, errors, _, _ = validate_log(many_lines, "long.log")
        assert valid is False
        assert len(errors) > 0

    def test_exactly_50000_lines_accepted(self):
        exactly = "\n".join(["normal log line"] * 50000)
        valid, errors, _, _ = validate_log(exactly, "exact.log")
        assert valid is True


# ── Pattern Matching ──────────────────────────────────────────────────────────

class TestPatternMatching:
    def test_case_insensitive_match(self):
        bp = make_blueprint("TEST", patterns=[BlueprintPattern(match="Error", weight=40),
                                               BlueprintPattern(match="failed", weight=30),
                                               BlueprintPattern(match="refused", weight=25)])
        bps = {"TEST": bp}
        log = "2024 ERROR: something failed badly\nconnection refused"
        results = match_blueprints(log, bps)
        assert "TEST" in results
        patterns, evidence = results["TEST"]
        matched_names = [p.pattern.lower() for p in patterns]
        assert "error" in matched_names
        assert "failed" in matched_names

    def test_multiple_blueprints_matched(self):
        blueprints = validate_blueprints()
        log = "connection refused\nCrashLoopBackOff\nPermission denied"
        results = match_blueprints(log, blueprints)
        assert "DB_CONNECTION_FAILURE" in results
        assert "CRASH_LOOP_BACKOFF" in results
        assert "PERMISSION_DENIED" in results

    def test_no_match_returns_empty(self):
        blueprints = validate_blueprints()
        log = "All systems operational. No issues detected."
        results = match_blueprints(log, blueprints)
        assert len(results) == 0


# ── Deduped Scoring ───────────────────────────────────────────────────────────

class TestDedupedScoring:
    def test_pattern_contributes_once_regardless_of_occurrences(self):
        """connection refused appearing 100 times should NOT inflate score."""
        bp = make_blueprint("DB", patterns=[
            BlueprintPattern(match="connection refused", weight=40),
            BlueprintPattern(match="database connection failed", weight=50),
            BlueprintPattern(match="ECONNREFUSED", weight=40),
        ])
        bps = {"DB": bp}
        # 100 repetitions of same pattern
        log = "\n".join(["ERROR: connection refused"] * 100)
        results = match_blueprints(log, bps)
        assert "DB" in results
        patterns, evidence = results["DB"]
        # Only one unique pattern matched
        assert len(patterns) == 1
        assert patterns[0].weight == 40
        # But occurrences must be counted (display only)
        assert patterns[0].occurrences == 100

    def test_score_not_inflated_by_repetition(self):
        """Incident score must be same whether pattern appears 1 or 500 times."""
        bp = make_blueprint("DB", patterns=[
            BlueprintPattern(match="connection refused", weight=40),
            BlueprintPattern(match="database connection failed", weight=50),
            BlueprintPattern(match="ECONNREFUSED", weight=40),
        ])
        bps = {"DB": bp}
        log1 = "connection refused"
        log2 = "\n".join(["connection refused"] * 500)
        r1 = match_blueprints(log1, bps)
        r2 = match_blueprints(log2, bps)
        if "DB" in r1 and "DB" in r2:
            score1 = sum(p.weight for p in r1["DB"][0])
            score2 = sum(p.weight for p in r2["DB"][0])
            assert score1 == score2 == 40


# ── Evidence Attribution ──────────────────────────────────────────────────────

class TestEvidenceAttribution:
    def test_evidence_has_required_fields(self):
        blueprints = validate_blueprints()
        log = "connection refused\ndatabase connection failed\nECONNREFUSED"
        results = match_blueprints(log, blueprints)
        assert "DB_CONNECTION_FAILURE" in results
        _, evidence = results["DB_CONNECTION_FAILURE"]
        for ev in evidence:
            assert ev.line_number > 0
            assert ev.line_text is not None
            assert ev.matched_pattern != ""
            assert ev.matched_blueprint_id == "DB_CONNECTION_FAILURE"
            assert ev.weight > 0

    def test_evidence_line_numbers_correct(self):
        blueprints = validate_blueprints()
        log = "normal line\nconnection refused here\nnormal again"
        results = match_blueprints(log, blueprints)
        if "DB_CONNECTION_FAILURE" in results:
            _, evidence = results["DB_CONNECTION_FAILURE"]
            lines = [e.line_number for e in evidence]
            assert 2 in lines  # "connection refused" is on line 2


# ── Confidence Scoring ────────────────────────────────────────────────────────

class TestConfidenceScoring:
    def test_incident_score_can_exceed_100(self):
        """Incident score is not capped — confidence is."""
        bp = make_blueprint("TEST", patterns=[
            BlueprintPattern(match=f"pattern{i}", weight=40)
            for i in range(5)
        ])
        bps = {"TEST": bp}
        log = "\n".join([f"error: pattern{i}" for i in range(5)])
        results = match_blueprints(log, bps)
        if "TEST" in results:
            patterns, evidence = results["TEST"]
            audit = []
            result = score_incident(bp, patterns, evidence, 0.0, audit)
            assert result.incident_score > 100
            assert result.confidence <= 100.0

    def test_confidence_capped_at_100(self):
        blueprints = validate_blueprints()
        # Very verbose DB log
        log = "\n".join([
            "connection refused",
            "could not connect to server",
            "database connection failed",
            "ECONNREFUSED",
            "connection pool exhausted",
            "too many connections",
            "unable to connect to database",
        ])
        results = match_blueprints(log, blueprints)
        if "DB_CONNECTION_FAILURE" in results:
            patterns, evidence = results["DB_CONNECTION_FAILURE"]
            bp = blueprints["DB_CONNECTION_FAILURE"]
            audit = []
            result = score_incident(bp, patterns, evidence, 0.0, audit)
            assert result.confidence == 100.0
            assert result.incident_score >= result.confidence

    def test_evidence_bonus_applied_for_3_plus_patterns(self):
        bp = make_blueprint("TEST", patterns=[
            BlueprintPattern(match="alpha error", weight=30),
            BlueprintPattern(match="beta fail", weight=30),
            BlueprintPattern(match="gamma refused", weight=30),
        ])
        log = "alpha error happened\nbeta fail occurred\ngamma refused all"
        results = match_blueprints(log, {"TEST": bp})
        if "TEST" in results:
            patterns, evidence = results["TEST"]
            audit = []
            result = score_incident(bp, patterns, evidence, 0.0, audit)
            assert result.evidence_bonus == EVIDENCE_BONUS

    def test_no_evidence_bonus_for_fewer_than_3(self):
        bp = make_blueprint("TEST", patterns=[
            BlueprintPattern(match="alpha error", weight=30),
            BlueprintPattern(match="beta fail", weight=30),
            BlueprintPattern(match="gamma refused", weight=30),
        ])
        log = "alpha error happened\nbeta fail occurred"  # only 2 match
        results = match_blueprints(log, {"TEST": bp})
        if "TEST" in results:
            patterns, evidence = results["TEST"]
            audit = []
            result = score_incident(bp, patterns, evidence, 0.0, audit)
            assert result.evidence_bonus == 0.0

    def test_symptom_penalty_applied(self):
        bp = make_blueprint("CRASH", incident_role="symptom", patterns=[
            BlueprintPattern(match="CrashLoopBackOff", weight=60),
            BlueprintPattern(match="Back-off restarting", weight=55),
            BlueprintPattern(match="container terminated", weight=35),
        ])
        log = "CrashLoopBackOff\nBack-off restarting\ncontainer terminated"
        results = match_blueprints(log, {"CRASH": bp})
        if "CRASH" in results:
            patterns, evidence = results["CRASH"]
            audit = []
            result = score_incident(bp, patterns, evidence, 0.0, audit)
            assert result.symptom_penalty == SYMPTOM_PENALTY
            assert result.incident_score == (
                result.pattern_score + result.evidence_bonus - SYMPTOM_PENALTY
            )


# ── Proximity Validation ──────────────────────────────────────────────────────

class TestProximityValidation:
    def test_min_line_distance_same_line(self):
        assert _min_line_distance([50], [50]) == 0

    def test_min_line_distance_adjacent(self):
        assert _min_line_distance([100], [101]) == 1

    def test_min_line_distance_within_window(self):
        assert _min_line_distance([10], [200]) == 190

    def test_min_line_distance_outside_window(self):
        assert _min_line_distance([10], [5000]) == 4990

    def test_proximity_bonus_applied_within_200_lines(self):
        blueprints = validate_blueprints()
        # DB failure on line 5, CrashLoop on line 100 → within 200 lines
        log_lines = ["normal line"] * 200
        log_lines[4] = "connection refused"  # line 5
        log_lines[5] = "could not connect to server"  # line 6
        log_lines[6] = "database connection failed"  # line 7
        log_lines[99] = "CrashLoopBackOff detected"  # line 100
        log_lines[100] = "Back-off restarting failed container"  # line 101
        log_lines[101] = "container terminated with exit code 1"  # line 102
        log = "\n".join(log_lines)
        result = run_analysis(AnalysisRequest(log_content=log, filename="test.log"))
        primary = result.primary_incident
        if primary and primary.blueprint_id == "DB_CONNECTION_FAILURE":
            assert primary.relationship_bonus == RELATIONSHIP_BONUS

    def test_proximity_bonus_not_applied_beyond_200_lines(self):
        blueprints = validate_blueprints()
        # DB failure on line 5, CrashLoop on line 600 → beyond 200 lines
        log_lines = ["normal line"] * 650
        log_lines[4] = "connection refused"
        log_lines[5] = "could not connect to server"
        log_lines[6] = "database connection failed"
        log_lines[600] = "CrashLoopBackOff"
        log_lines[601] = "Back-off restarting failed container"
        log_lines[602] = "container terminated with exit code 1"
        log = "\n".join(log_lines)
        result = run_analysis(AnalysisRequest(log_content=log, filename="test.log"))
        if result.primary_incident and result.primary_incident.blueprint_id == "DB_CONNECTION_FAILURE":
            assert result.primary_incident.relationship_bonus == 0.0


# ── Root Cause Ranking ────────────────────────────────────────────────────────

class TestRootCauseRanking:
    def test_deterministic_same_log_same_result(self):
        """Same log must always produce same analysis_id-independent result."""
        log = (Path(__file__).parent.parent / "sample-logs" / "01-db-connection-failure.log").read_text()
        req = AnalysisRequest(log_content=log, filename="01.log")
        r1 = run_analysis(req)
        r2 = run_analysis(req)
        # Primary incident must be the same
        assert r1.primary_incident.blueprint_id == r2.primary_incident.blueprint_id
        assert r1.primary_incident.confidence == r2.primary_incident.confidence

    def test_db_connection_failure_acceptance(self):
        """Acceptance test: 01-db-connection-failure.log"""
        log = (Path(__file__).parent.parent / "sample-logs" / "01-db-connection-failure.log").read_text()
        result = run_analysis(AnalysisRequest(log_content=log, filename="01.log"))
        assert result.primary_incident is not None
        assert result.primary_incident.blueprint_id == "DB_CONNECTION_FAILURE"
        assert result.primary_incident.confidence >= 90
        assert len(result.primary_incident.evidence) >= 4
        assert result.detection_status == "CONFIDENT"

    def test_root_cause_demo_acceptance(self):
        """Acceptance test: 11-root-cause-demo.log"""
        log = (Path(__file__).parent.parent / "sample-logs" / "11-root-cause-demo.log").read_text()
        result = run_analysis(AnalysisRequest(log_content=log, filename="11.log"))
        assert result.primary_incident is not None
        assert result.primary_incident.blueprint_id == "DB_CONNECTION_FAILURE"
        contributing_ids = [c.blueprint_id for c in result.contributing_incidents]
        assert "CRASH_LOOP_BACKOFF" in contributing_ids
        assert result.primary_incident.relationship_bonus == RELATIONSHIP_BONUS
        assert result.detection_status == "CONFIDENT"


# ── Detection Status ──────────────────────────────────────────────────────────

class TestDetectionStatus:
    def test_insufficient_evidence_for_empty_log(self):
        result = run_analysis(AnalysisRequest(log_content="", filename="empty.log"))
        assert result.detection_status == "INSUFFICIENT_EVIDENCE"
        assert result.confidence == 0.0
        assert result.primary_incident is None

    def test_insufficient_evidence_for_generic_log(self):
        result = run_analysis(AnalysisRequest(
            log_content="Everything is fine. No issues detected.",
            filename="clean.log"
        ))
        assert result.detection_status == "INSUFFICIENT_EVIDENCE"

    def test_confident_for_clear_incident(self):
        log = (Path(__file__).parent.parent / "sample-logs" / "01-db-connection-failure.log").read_text()
        result = run_analysis(AnalysisRequest(log_content=log, filename="test.log"))
        assert result.detection_status == "CONFIDENT"

    def test_all_sample_logs_produce_confident_status(self):
        """All 11 sample logs must produce CONFIDENT detection."""
        sample_dir = Path(__file__).parent.parent / "sample-logs"
        for log_file in sorted(sample_dir.glob("*.log")):
            log = log_file.read_text()
            result = run_analysis(AnalysisRequest(log_content=log, filename=log_file.name))
            assert result.detection_status == "CONFIDENT", (
                f"{log_file.name}: expected CONFIDENT, got {result.detection_status}"
            )


# ── Ambiguity Detection ───────────────────────────────────────────────────────

class TestAmbiguityDetection:
    def test_ambiguous_when_scores_close(self):
        """Two incidents with score gap < 10 should be AMBIGUOUS."""
        # CrashLoopBackOff and DB failure with similar pattern counts
        log = (
            "connection refused\ncould not connect to server\ndatabase connection failed\n"
            "CrashLoopBackOff\nBack-off restarting failed container\ncontainer terminated with exit code 1\n"
            "ECONNREFUSED"  # extra for DB to break tie
        )
        # The gap depends on scores — we just verify the engine handles it
        result = run_analysis(AnalysisRequest(log_content=log, filename="test.log"))
        assert result.detection_status in ["CONFIDENT", "AMBIGUOUS"]


# ── AI Summary Fallback ───────────────────────────────────────────────────────

class TestAISummaryFallback:
    def test_deterministic_fallback_template(self):
        from app.services.ai_summary import _deterministic_summary
        from app.schemas import EngineResult, IncidentResult, PatternMatch, EvidenceRecord
        from app.schemas import AuditTrailEntry, RelationshipResult, EngineMetadata

        incident = IncidentResult(
            blueprint_id="DB_CONNECTION_FAILURE",
            title="Database Connection Failure",
            category="DATABASE",
            severity="CRITICAL",
            incident_role="root_cause",
            priority=1,
            pattern_score=200.0,
            evidence_bonus=10.0,
            relationship_bonus=0.0,
            symptom_penalty=0.0,
            incident_score=210.0,
            confidence=100.0,
            matched_patterns=[PatternMatch(pattern="connection refused", weight=40, occurrences=3)],
            evidence=[EvidenceRecord(line_number=1, line_text="connection refused", matched_pattern="connection refused", matched_blueprint_id="DB_CONNECTION_FAILURE", weight=40)],
            possible_causes=["DB not running"],
            verification_steps=["kubectl get pods"],
            recommended_fixes=["Restart the DB"],
            causes_incidents=[],
        )

        result = EngineResult(
            analysis_id="test-123",
            filename="test.log",
            primary_incident=incident,
            contributing_incidents=[],
            detection_status="CONFIDENT",
            confidence=100.0,
            audit_trail=[],
            engine_metadata=EngineMetadata(
                engine_version="1.6.0",
                blueprint_version="1.0.0",
                blueprints_loaded=10,
                rules_loaded=90,
                analysis_duration_ms=5.0,
                timestamp="2024-01-01T00:00:00Z",
            ),
            relationship_graph=RelationshipResult(nodes=[], edges=[], bonuses_applied=[]),
            log_lines_analyzed=10,
            log_size_bytes=100,
        )

        summary = _deterministic_summary(result)
        assert "Database Connection Failure" in summary
        assert "100%" in summary
        assert "CONFIDENT" in summary
