"""
Samples API — Demo Center
Serves sample log files and scenario metadata for the Demo Center.
"""
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/samples", tags=["samples"])

SAMPLE_LOGS_DIR = Path(__file__).parent.parent.parent / "sample-logs"

SCENARIOS = [
    {
        "id": "db-connection-failure",
        "title": "Database Connection Failure",
        "description": "Application pods unable to reach the PostgreSQL service — connection refused on port 5432.",
        "filename": "01-db-connection-failure.log",
        "expected_incident": "DB_CONNECTION_FAILURE",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "DATABASE",
    },
    {
        "id": "dns-failure",
        "title": "DNS Resolution Failure",
        "description": "CoreDNS unavailable — services cannot resolve internal hostnames.",
        "filename": "02-dns-failure.log",
        "expected_incident": "DNS_FAILURE",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "NETWORKING",
    },
    {
        "id": "port-conflict",
        "title": "Port Conflict — Address Already In Use",
        "description": "Application fails to bind to port 8080 — another process is already using it.",
        "filename": "03-port-conflict.log",
        "expected_incident": "PORT_CONFLICT",
        "severity": "ERROR",
        "expected_status": "CONFIDENT",
        "category": "NETWORKING",
    },
    {
        "id": "crashloopbackoff",
        "title": "CrashLoopBackOff",
        "description": "Pod enters a restart loop — container failing immediately on start.",
        "filename": "04-crashloopbackoff.log",
        "expected_incident": "CRASH_LOOP_BACKOFF",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "KUBERNETES",
    },
    {
        "id": "oomkilled",
        "title": "OOMKilled — Container Out of Memory",
        "description": "Container killed by the Linux OOM killer — memory limit exceeded.",
        "filename": "05-oomkilled.log",
        "expected_incident": "OOM_KILLED",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "RESOURCES",
    },
    {
        "id": "imagepullfailure",
        "title": "Image Pull Failure",
        "description": "Kubernetes cannot pull the container image — tag missing or registry auth failed.",
        "filename": "06-imagepullfailure.log",
        "expected_incident": "IMAGE_PULL_FAILURE",
        "severity": "ERROR",
        "expected_status": "CONFIDENT",
        "category": "KUBERNETES",
    },
    {
        "id": "authentication-failure",
        "title": "Authentication Failure",
        "description": "Service authentication rejected — invalid credentials or expired token.",
        "filename": "07-authentication-failure.log",
        "expected_incident": "AUTHENTICATION_FAILURE",
        "severity": "ERROR",
        "expected_status": "CONFIDENT",
        "category": "SECURITY",
    },
    {
        "id": "missing-configuration",
        "title": "Missing Configuration",
        "description": "Required environment variables missing — application cannot start.",
        "filename": "08-missing-configuration.log",
        "expected_incident": "MISSING_CONFIGURATION",
        "severity": "ERROR",
        "expected_status": "CONFIDENT",
        "category": "CONFIGURATION",
    },
    {
        "id": "disk-full",
        "title": "Disk / Volume Full",
        "description": "PersistentVolume has no space left — write operations failing.",
        "filename": "09-disk-full.log",
        "expected_incident": "DISK_FULL",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "STORAGE",
    },
    {
        "id": "permission-denied",
        "title": "Permission Denied",
        "description": "Container lacks file system permissions — operation not permitted.",
        "filename": "10-permission-denied.log",
        "expected_incident": "PERMISSION_DENIED",
        "severity": "ERROR",
        "expected_status": "CONFIDENT",
        "category": "SECURITY",
    },
    {
        "id": "root-cause-demo",
        "title": "Root Cause Demo — DB Failure Causing CrashLoop",
        "description": "DB connection failure propagates to CrashLoopBackOff. Demonstrates relationship bonus and root cause ranking.",
        "filename": "11-root-cause-demo.log",
        "expected_incident": "DB_CONNECTION_FAILURE",
        "severity": "CRITICAL",
        "expected_status": "CONFIDENT",
        "category": "DATABASE",
    },
]


@router.get("")
async def list_scenarios():
    """Return all sample scenarios for the Demo Center."""
    return SCENARIOS


@router.get("/{filename}/content")
async def get_sample_log(filename: str):
    """Return the raw content of a sample log file."""
    # Security: only allow known filenames
    known = {s["filename"] for s in SCENARIOS}
    if filename not in known:
        raise HTTPException(status_code=404, detail=f"Sample '{filename}' not found")

    log_path = SAMPLE_LOGS_DIR / filename
    if not log_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Sample log file '{filename}' not found on disk"
        )

    return {"filename": filename, "content": log_path.read_text()}
