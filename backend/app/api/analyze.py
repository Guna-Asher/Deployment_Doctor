"""
Analysis API
Handles log upload (multipart/form-data and JSON), validation, analysis,
storage in PostgreSQL, and result retrieval.
"""
import hashlib
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import AnalysisResult
from app.schemas import AnalysisRequest, EngineResult, StoredAnalysisSummary
from app.services.pattern_matcher import validate_log
from app.services.root_cause_engine import run_analysis
from app.services.ai_summary import generate_ai_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze")
async def analyze_log(
    file: UploadFile = File(None),
    log_content: str = Form(None),
    filename: str = Form("uploaded.log"),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a log file. Accepts either:
    - multipart file upload (file=)
    - raw text via form field (log_content=)
    """
    # Read content
    if file is not None:
        raw = await file.read()
        try:
            content = raw.decode("utf-8", errors="replace")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode file as UTF-8")
        filename = file.filename or filename
    elif log_content is not None:
        content = log_content
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or log_content")

    # Validate size and line count
    is_valid, errors, line_count, size_bytes = validate_log(content, filename)
    if not is_valid:
        raise HTTPException(status_code=413, detail={"errors": errors})

    # Run analysis (deterministic, no I/O)
    request = AnalysisRequest(log_content=content, filename=filename)
    result: EngineResult = run_analysis(request)

    # Optional AI summary (never blocks on failure)
    ai_summary, ai_available = await generate_ai_summary(result)
    result.ai_summary = ai_summary
    result.ai_summary_available = ai_available

    # Persist to PostgreSQL
    log_hash = hashlib.sha256(content.encode()).hexdigest()
    db_record = AnalysisResult(
        id=result.analysis_id,
        filename=filename,
        log_hash=log_hash,
        detection_status=result.detection_status,
        primary_incident_id=(
            result.primary_incident.blueprint_id if result.primary_incident else None
        ),
        confidence=result.confidence,
        result_json=result.model_dump(),
        log_lines_count=line_count,
        log_size_bytes=size_bytes,
        analysis_duration_ms=result.engine_metadata.analysis_duration_ms,
    )
    db.add(db_record)
    await db.commit()

    return result.model_dump()


@router.post("/analyze/json")
async def analyze_log_json(
    request: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
):
    """Analyze log from JSON body (for programmatic use)."""
    is_valid, errors, line_count, size_bytes = validate_log(
        request.log_content, request.filename
    )
    if not is_valid:
        raise HTTPException(status_code=413, detail={"errors": errors})

    result: EngineResult = run_analysis(request)
    ai_summary, ai_available = await generate_ai_summary(result)
    result.ai_summary = ai_summary
    result.ai_summary_available = ai_available

    log_hash = hashlib.sha256(request.log_content.encode()).hexdigest()
    db_record = AnalysisResult(
        id=result.analysis_id,
        filename=request.filename,
        log_hash=log_hash,
        detection_status=result.detection_status,
        primary_incident_id=(
            result.primary_incident.blueprint_id if result.primary_incident else None
        ),
        confidence=result.confidence,
        result_json=result.model_dump(),
        log_lines_count=line_count,
        log_size_bytes=size_bytes,
        analysis_duration_ms=result.engine_metadata.analysis_duration_ms,
    )
    db.add(db_record)
    await db.commit()

    return result.model_dump()


@router.get("/results/{analysis_id}")
async def get_result(analysis_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a stored analysis result by ID."""
    stmt = select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    row = await db.execute(stmt)
    record = row.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return record.result_json


@router.get("/results")
async def list_results(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """List recent analysis results."""
    stmt = (
        select(AnalysisResult)
        .order_by(desc(AnalysisResult.created_at))
        .limit(min(limit, 100))
    )
    rows = await db.execute(stmt)
    records = rows.scalars().all()
    return [
        StoredAnalysisSummary(
            analysis_id=r.id,
            filename=r.filename,
            created_at=r.created_at.isoformat() if r.created_at else "",
            detection_status=r.detection_status,
            primary_incident_id=r.primary_incident_id,
            confidence=r.confidence,
            log_lines_count=r.log_lines_count,
        ).model_dump()
        for r in records
    ]
