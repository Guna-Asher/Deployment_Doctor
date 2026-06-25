"""
Deployment Doctor — FastAPI Application Entry Point
Starts PostgreSQL, validates blueprints, mounts API routers.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.services.blueprint_validator import validate_blueprints
from app.api.analyze import router as analyze_router
from app.api.incidents import router as incidents_router
from app.api.samples import router as samples_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== Deployment Doctor starting up ===")

    # Blueprint validation — hard fail if invalid
    try:
        blueprints = validate_blueprints()
        logger.info(f"Blueprint validation PASSED: {len(blueprints)} blueprints loaded")
    except (ValueError, FileNotFoundError) as e:
        logger.critical(f"STARTUP FAILED — Blueprint validation error:\n{e}")
        raise

    # PostgreSQL table creation
    try:
        await init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.critical(f"STARTUP FAILED — Database error: {e}")
        raise

    logger.info("=== Deployment Doctor ready ===")
    yield
    logger.info("=== Deployment Doctor shutdown ===")


app = FastAPI(
    title="Deployment Doctor",
    description="Explainable Incident Detection Engine",
    version=os.environ.get("ENGINE_VERSION", "1.6.0"),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(incidents_router)
app.include_router(samples_router)


@app.get("/api/health")
async def health():
    from app.services.blueprint_validator import get_blueprint_count, get_total_rules_count
    return {
        "status": "ok",
        "engine_version": os.environ.get("ENGINE_VERSION", "1.6.0"),
        "blueprint_version": os.environ.get("BLUEPRINT_VERSION", "1.0.0"),
        "blueprints_loaded": get_blueprint_count(),
        "rules_loaded": get_total_rules_count(),
    }
