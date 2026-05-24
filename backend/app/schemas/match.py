from pydantic import BaseModel, Field


class MatchScoreResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    technical_match: int = Field(ge=0, le=100)
    domain_match: int = Field(ge=0, le=100)
    ats_score: int = Field(ge=0, le=100)
    experience_match: int = Field(ge=0, le=100)
    resume_quality: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)
    summary: str = ""
