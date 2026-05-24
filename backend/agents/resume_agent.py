from pydantic import BaseModel, Field

from prompts.resume_tailor import RESUME_TAILOR_SYSTEM, RESUME_TAILOR_USER

from agents.base import BaseAgent
from app.schemas.job import JobProfile
from app.schemas.resume import ResumeChange, ResumeTailorResponse


class _TailorResult(BaseModel):
    tailored_content: str
    changes: list[ResumeChange]
    ats_score_estimate: int = Field(ge=0, le=100)
    explanation: str
    warnings: list[str] = Field(default_factory=list)


class ResumeOptimizationAgent(BaseAgent):
    agent_type = "resume_optimization"

    async def tailor(self, resume_content: str, job_profile: JobProfile) -> ResumeTailorResponse:
        user_prompt = RESUME_TAILOR_USER.format(
            job_profile=job_profile.model_dump_json(indent=2),
            resume_content=resume_content,
        )
        result = await self.structured_completion(
            _TailorResult,
            RESUME_TAILOR_SYSTEM,
            user_prompt,
        )
        return ResumeTailorResponse(**result.model_dump())
