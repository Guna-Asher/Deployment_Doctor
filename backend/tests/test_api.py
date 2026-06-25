"""API endpoint tests for Deployment Doctor"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# DB failure log content for testing
DB_FAILURE_LOG = """
2024-01-15 10:23:45 ERROR Failed to connect to database: Connection refused
2024-01-15 10:23:45 ERROR FATAL: database connection failed after 5 retries
2024-01-15 10:23:46 ERROR PostgreSQL connection error: could not connect to server
2024-01-15 10:23:46 ERROR Database pool exhausted, connection timeout
2024-01-15 10:23:47 ERROR psycopg2.OperationalError: FATAL: connection refused
"""

UNKNOWN_LOG = "INFO: everything is fine, no errors here, system running normally"


class TestHealthEndpoint:
    """Health check tests"""

    def test_health_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"

    def test_health_blueprints_loaded_10(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        data = resp.json()
        assert data.get("blueprints_loaded") == 10, f"Expected 10 blueprints, got {data}"

    def test_health_rules_loaded_90(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        data = resp.json()
        assert data.get("rules_loaded") == 90, f"Expected 90 rules, got {data}"


class TestSamplesEndpoint:
    """Sample scenarios tests"""

    def test_samples_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/samples")
        assert resp.status_code == 200

    def test_samples_returns_11_scenarios(self):
        resp = requests.get(f"{BASE_URL}/api/samples")
        data = resp.json()
        # Could be list or dict with 'scenarios' key
        if isinstance(data, list):
            count = len(data)
        else:
            count = len(data.get("scenarios", data.get("samples", [])))
        assert count == 11, f"Expected 11 scenarios, got {count}: {data}"


class TestIncidentsEndpoint:
    """Incident blueprints tests"""

    def test_incidents_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/incidents")
        assert resp.status_code == 200

    def test_incidents_returns_10_blueprints(self):
        resp = requests.get(f"{BASE_URL}/api/incidents")
        data = resp.json()
        if isinstance(data, list):
            count = len(data)
        else:
            count = len(data.get("incidents", data.get("blueprints", [])))
        assert count == 10, f"Expected 10 blueprints, got {count}"


class TestAnalyzeEndpoint:
    """Analyze endpoint tests"""

    def test_analyze_db_failure_log_returns_200(self):
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": DB_FAILURE_LOG,
            "filename": "test-db-failure.log"
        })
        assert resp.status_code == 200, f"Analyze failed: {resp.text}"

    def test_analyze_db_failure_returns_db_connection_failure(self):
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": DB_FAILURE_LOG,
            "filename": "test-db-failure.log"
        })
        data = resp.json()
        primary = data.get("primary_incident", {})
        incident_type = primary.get("blueprint_id", primary.get("incident_type", primary.get("type", "")))
        assert "DB_CONNECTION_FAILURE" in incident_type.upper(), f"Expected DB_CONNECTION_FAILURE, got primary keys: {list(primary.keys())}"

    def test_analyze_db_failure_confidence_ge_90(self):
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": DB_FAILURE_LOG,
            "filename": "test-db-failure.log"
        })
        data = resp.json()
        primary = data.get("primary_incident", {})
        confidence = primary.get("confidence", 0)
        assert confidence >= 90, f"Expected confidence >= 90, got {confidence}"

    def test_analyze_db_failure_status_confident(self):
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": DB_FAILURE_LOG,
            "filename": "test-db-failure.log"
        })
        data = resp.json()
        status = data.get("detection_status", "")
        assert "CONFIDENT" in status.upper(), f"Expected CONFIDENT status, got: {status}"

    def test_analyze_unknown_log_insufficient_evidence(self):
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": UNKNOWN_LOG,
            "filename": "unknown.log"
        })
        assert resp.status_code == 200
        data = resp.json()
        status = data.get("detection_status", "")
        assert "INSUFFICIENT" in status.upper(), f"Expected INSUFFICIENT_EVIDENCE, got: {status}"

    def test_analyze_root_cause_demo_scenario(self):
        """Root cause demo should show DB_CONNECTION_FAILURE as primary with CRASH_LOOP_BACKOFF contributing"""
        with open("/app/backend/sample-logs/11-root-cause-demo.log", "r") as f:
            log_content = f.read()
        resp = requests.post(f"{BASE_URL}/api/analyze", data={
            "log_content": log_content,
            "filename": "11-root-cause-demo.log"
        })
        assert resp.status_code == 200
        data = resp.json()
        primary = data.get("primary_incident", {})
        incident_type = primary.get("blueprint_id", primary.get("incident_type", primary.get("type", "")))
        assert "DB_CONNECTION_FAILURE" in incident_type.upper(), f"Primary should be DB_CONNECTION_FAILURE: got {incident_type}"
        # Check contributing incidents
        contributing = data.get("contributing_incidents", data.get("related_incidents", []))
        types = [i.get("blueprint_id", i.get("incident_type", i.get("type", ""))) for i in contributing]
        has_crash_loop = any("CRASH_LOOP" in t.upper() for t in types)
        assert has_crash_loop, f"Expected CRASH_LOOP_BACKOFF in contributing: {types}"
