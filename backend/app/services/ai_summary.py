"""
AI Summary Service
Optional presentation layer. Never performs detection or reasoning.
Input: pre-computed engine findings (never raw log content).
Falls back to deterministic template when no AI key is available.

Priority:
  1. OpenRouter API (OPENROUTER_API_KEY)
  2. emergentintegrations / EMERGENT_LLM_KEY
  3. Deterministic fallback template
"""
import os
import json
import logging
import asyncio
from typing import Optional

import httpx
from app.schemas import IncidentResult, EngineResult

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


async def generate_ai_summary(result: EngineResult) -> tuple[Optional[str], bool]:
    """
    Attempt to generate AI summary.
    Returns (summary_text, is_ai_generated).
    Never crashes — all exceptions are caught.
    """
    if not result.primary_incident:
        return None, False

    ai_input = _build_ai_input(result)

    # Attempt 1: OpenRouter
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if openrouter_key:
        summary = await _call_openrouter(openrouter_key, ai_input)
        if summary:
            return summary, True

    # Attempt 2: emergentintegrations (EMERGENT_LLM_KEY)
    emergent_key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if emergent_key:
        summary = await _call_emergent(emergent_key, ai_input)
        if summary:
            return summary, True

    # Fallback: deterministic template
    return _deterministic_summary(result), False


async def _call_openrouter(api_key: str, ai_input: dict) -> Optional[str]:
    """Call OpenRouter API. Returns None on any failure."""
    try:
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Incident data:\n{json.dumps(ai_input, indent=2)}"},
            ],
            "max_tokens": 300,
            "temperature": 0,
        }
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
    except Exception as e:
        logger.warning(f"OpenRouter summary failed: {e}")
        return None


async def _call_emergent(api_key: str, ai_input: dict) -> Optional[str]:
    """Call emergentintegrations. Returns None on any failure."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=api_key,
            session_id=f"dd-summary-{id(ai_input)}",
            system_message=SYSTEM_PROMPT,
        ).with_model("openai", "gpt-4o-mini")

        msg = UserMessage(text=f"Incident data:\n{json.dumps(ai_input, indent=2)}")
        response = await chat.send_message(msg)
        if response and hasattr(response, "text"):
            return response.text.strip()
        return None
    except Exception as e:
        logger.warning(f"emergentintegrations summary failed: {e}")
        return None


def _deterministic_summary(result: EngineResult) -> str:
    """
    Deterministic fallback summary template.
    Always produces the same output for the same input.
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
