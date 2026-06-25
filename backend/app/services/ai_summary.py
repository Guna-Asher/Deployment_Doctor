"""
AI Summary Service
Optional presentation layer only. Never performs detection or reasoning.
Input: pre-computed engine findings (never raw log content).

Priority:
  1. OpenRouter API (set OPENROUTER_API_KEY)
  2. Deterministic fallback template (always available, no key required)

Uses only standard httpx for HTTP. No proprietary SDKs.
"""
import os
import json
import logging
from typing import Optional, Tuple

import httpx
from app.schemas import EngineResult

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-4o-mini"

SYSTEM_PROMPT = """You are an incident report writer for a DevOps/SRE team.
You will receive structured JSON data about a detected incident.
Your task is to write a concise, factual 3-5 sentence summary.

Rules:
- Use ONLY the information provided in the JSON.
- Do NOT invent causes, commands, fixes, or infrastructure details.
- Do NOT speculate about technologies not mentioned in the data.
- Do NOT infer anything beyond what is explicitly provided.
- Write in past tense, professional technical English.
- Focus on: what was detected, confidence level, and the top recommended action."""


def _build_ai_input(result: EngineResult) -> dict:
    """Build structured input for AI summary. Never includes raw log content."""
    primary = result.primary_incident
    if not primary:
        return {}

    return {
        "incident": primary.title,
        "blueprint_id": primary.blueprint_id,
        "confidence": round(primary.confidence, 1),
        "severity": primary.severity,
        "detection_status": result.detection_status,
        "evidence_count": len(primary.evidence),
        "matched_patterns": [p.pattern for p in primary.matched_patterns],
        "possible_causes": primary.possible_causes[:3],
        "verification_steps": primary.verification_steps[:3],
        "recommended_fixes": primary.recommended_fixes[:3],
        "contributing_incidents": [
            {"id": c.blueprint_id, "title": c.title, "confidence": round(c.confidence, 1)}
            for c in result.contributing_incidents[:3]
        ],
    }


async def generate_ai_summary(result: EngineResult) -> Tuple[Optional[str], bool]:
    """
    Attempt to generate AI summary via OpenRouter.
    Returns (summary_text, is_ai_generated).
    Never crashes — all exceptions are caught.
    Falls back to deterministic template when key is absent or call fails.
    """
    if not result.primary_incident:
        return None, False

    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if openrouter_key:
        summary = await _call_openrouter(openrouter_key, _build_ai_input(result))
        if summary:
            return summary, True

    return _deterministic_summary(result), False


async def _call_openrouter(api_key: str, ai_input: dict) -> Optional[str]:
    """
    Call OpenRouter API using standard httpx.
    OpenRouter is OpenAI-API-compatible — standard REST, no proprietary SDK required.
    Returns None on any failure (timeout, rate limit, auth error, network error).
    """
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Incident data:\n{json.dumps(ai_input, indent=2)}"},
        ],
        "max_tokens": 300,
        "temperature": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deployment-doctor.io",
                    "X-Title": "Deployment Doctor",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        logger.warning("OpenRouter: request timed out")
    except httpx.HTTPStatusError as e:
        logger.warning(f"OpenRouter: HTTP {e.response.status_code}")
    except Exception as e:
        logger.warning(f"OpenRouter: unexpected error — {e}")
    return None


def _deterministic_summary(result: EngineResult) -> str:
    """
    Deterministic fallback summary template.
    Always produces the same output for the same input. No external calls.
    """
    primary = result.primary_incident
    if not primary:
        return "No incident detected above confidence threshold."

    contributing_text = ""
    if result.contributing_incidents:
        names = [c.title for c in result.contributing_incidents[:2]]
        contributing_text = f" Contributing factors detected: {', '.join(names)}."

    top_fix = primary.recommended_fixes[0] if primary.recommended_fixes else "Review configuration."
    top_cause = primary.possible_causes[0] if primary.possible_causes else "Unknown cause."

    return (
        f"Detection Engine identified '{primary.title}' as the primary incident with "
        f"{primary.confidence:.0f}% confidence (status: {result.detection_status}). "
        f"{len(primary.evidence)} evidence records were collected from the log. "
        f"Most likely cause: {top_cause}{contributing_text} "
        f"Recommended first action: {top_fix}"
    )
