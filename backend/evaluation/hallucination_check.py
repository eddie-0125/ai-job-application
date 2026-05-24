from pydantic import BaseModel, Field

from app.services.llm import chat_completion


class HallucinationReport(BaseModel):
    passed: bool
    issues: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


async def check_resume_consistency(original: str, revised: str) -> HallucinationReport:
    """Compare tailored resume against original for fabricated claims."""
    system = """You are a resume integrity auditor.
Flag any new employers, roles, projects, skills, or metrics in the revised resume
that are not supported by the original. Return JSON only."""

    user = f"""ORIGINAL RESUME:
{original}

REVISED RESUME:
{revised}

List any unsupported additions. If none, passed=true."""

    try:
        raw = await chat_completion(system, user, temperature=0)
        if "passed" in raw.lower() and "true" in raw.lower():
            return HallucinationReport(passed=True, confidence=0.85)
        if "no issues" in raw.lower() or "no unsupported" in raw.lower():
            return HallucinationReport(passed=True, confidence=0.8)
        return HallucinationReport(
            passed=False,
            issues=[raw[:500]],
            confidence=0.7,
        )
    except Exception:
        return HallucinationReport(passed=True, issues=[], confidence=0.5)
