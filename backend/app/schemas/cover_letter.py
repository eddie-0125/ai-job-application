from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class CoverLetterLength(str, Enum):
    short = "short"
    medium = "medium"
    long = "long"


class CoverLetterRequest(BaseModel):
    resume_id: UUID
    job_id: UUID
    length: CoverLetterLength = CoverLetterLength.medium
    hiring_manager: str | None = None
    tone_notes: str | None = None


class CoverLetterResponse(BaseModel):
    content: str
    length: CoverLetterLength
    key_alignments: list[str] = Field(default_factory=list)
