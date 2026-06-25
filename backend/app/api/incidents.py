"""
Incidents API — Incident Knowledge Base
Returns blueprint definitions for the frontend knowledge base view.
"""
from fastapi import APIRouter, HTTPException
from app.services.blueprint_validator import load_blueprints

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("")
async def list_incidents():
    """Return all incident blueprints for the knowledge base."""
    blueprints = load_blueprints()
    return [bp.model_dump() for bp in blueprints.values()]


@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    """Return a single incident blueprint by ID."""
    blueprints = load_blueprints()
    if incident_id not in blueprints:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return blueprints[incident_id].model_dump()
