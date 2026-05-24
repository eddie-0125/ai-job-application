"""LangGraph workflow for resume tailoring (Phase 3).

Pipeline:
  analyze_job → tailor_resume → evaluate_hallucinations → human_approval
"""

from typing import TypedDict

from app.schemas.job import JobProfile
from app.schemas.resume import ResumeTailorResponse


class TailoringState(TypedDict, total=False):
    job_description: str
    resume_content: str
    job_profile: JobProfile
    tailored: ResumeTailorResponse
    approved: bool


# TODO(Phase 3): Implement with LangGraph StateGraph
# from langgraph.graph import StateGraph
