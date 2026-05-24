from pydantic import BaseModel, Field

from prompts.cover_letter import COVER_LETTER_SYSTEM, COVER_LETTER_USER

from agents.base import BaseAgent
from app.schemas.cover_letter import CoverLetterLength, CoverLetterResponse
from app.schemas.job import JobProfile


class _CoverLetterResult(BaseModel):
    content: str
    key_alignments: list[str] = Field(default_factory=list)


class CoverLetterAgent(BaseAgent):
    agent_type = "cover_letter"

    async def generate(
        self,
        resume_content: str,
        job_profile: JobProfile,
        *,
        company: str,
        title: str,
        length: CoverLetterLength = CoverLetterLength.medium,
        hiring_manager: str | None = None,
        tone_notes: str | None = None,
    ) -> CoverLetterResponse:
        user_prompt = COVER_LETTER_USER.format(
            length=length.value,
            company=company,
            title=title,
            hiring_manager=hiring_manager or "Hiring Team",
            tone_notes=tone_notes or "Professional, confident, technically precise",
            job_profile=job_profile.model_dump_json(indent=2),
            resume_content=resume_content,
        )
        result = await self.structured_completion(
            _CoverLetterResult,
            COVER_LETTER_SYSTEM,
            user_prompt,
        )
        return CoverLetterResponse(
            content=result.content,
            length=length,
            key_alignments=result.key_alignments,
        )
