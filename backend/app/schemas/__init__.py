from app.schemas.cover_letter import CoverLetterRequest, CoverLetterResponse
from app.schemas.job import JobAnalyzeRequest, JobAnalyzeResponse, JobProfile
from app.schemas.match import MatchScoreResponse
from app.schemas.resume import (
    ResumeTailorRequest,
    ResumeTailorResponse,
    ResumeUploadResponse,
)

__all__ = [
    "JobAnalyzeRequest",
    "JobAnalyzeResponse",
    "JobProfile",
    "ResumeTailorRequest",
    "ResumeTailorResponse",
    "ResumeUploadResponse",
    "CoverLetterRequest",
    "CoverLetterResponse",
    "MatchScoreResponse",
]
