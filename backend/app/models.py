from sqlalchemy import Column, String, Float, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base
import uuid


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    log_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    detection_status = Column(String(50), nullable=False)
    primary_incident_id = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    result_json = Column(JSONB, nullable=False)
    log_lines_count = Column(Integer, nullable=False, default=0)
    log_size_bytes = Column(Integer, nullable=False, default=0)
    analysis_duration_ms = Column(Float, nullable=False, default=0.0)
