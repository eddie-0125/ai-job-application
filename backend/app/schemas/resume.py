from uuid import UUID

from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    resume_id: UUID
    title: str
    content_preview: str


class ResumeTailorRequest(BaseModel):
    resume_id: UUID
    job_id: UUID


class ResumeChange(BaseModel):
    section: str
    original: str
    revised: str
    rationale: str


class ResumeTailorResponse(BaseModel):
    tailored_content: str
    changes: list[ResumeChange]
    ats_score_estimate: int = Field(ge=0, le=100)
    explanation: str
    warnings: list[str] = Field(default_factory=list)
