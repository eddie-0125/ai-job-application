from uuid import UUID

from pydantic import BaseModel, Field


class JobProfile(BaseModel):
    role: str
    seniority: str
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    industry: str = ""
    ats_keywords: list[str] = Field(default_factory=list)
    hidden_requirements: list[str] = Field(default_factory=list)
    domain_requirements: list[str] = Field(default_factory=list)


class JobExtractedFields(BaseModel):
    company: str = ""
    title: str = ""
    description: str = Field(..., min_length=1)


class JobImportFromUrlRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2048)


class JobImportFromUrlResponse(BaseModel):
    company: str
    title: str
    description: str
    source_url: str


class JobAnalyzeRequest(BaseModel):
    description: str = Field(..., min_length=50)
    company: str = ""
    title: str = ""
    source_url: str | None = None


class JobAnalyzeResponse(BaseModel):
    job_id: UUID
    profile: JobProfile
    company: str
    title: str
