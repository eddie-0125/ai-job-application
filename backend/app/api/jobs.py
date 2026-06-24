import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.job_agent import JobUnderstandingAgent
from agents.match_scoring_agent import MatchScoringAgent
from app.db.models import Job, Resume
from app.db.session import get_db
from app.schemas.job import (
    JobAnalyzeRequest,
    JobAnalyzeResponse,
    JobCreateRequest,
    JobImportFromUrlRequest,
    JobImportFromUrlResponse,
    JobProfile,
)
from app.schemas.match import MatchScoreResponse
from app.services.job_errors import JobImportError
from app.services.job_import import import_job_from_url

router = APIRouter()


@router.post("/import-from-url", response_model=JobImportFromUrlResponse)
async def import_from_url(body: JobImportFromUrlRequest):
    try:
        fields = await import_job_from_url(body.url)
    except JobImportError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Job import failed. ({exc})",
        ) from exc

    return JobImportFromUrlResponse(
        company=fields.company,
        title=fields.title,
        description=fields.description,
        source_url=body.url.strip(),
    )


@router.post("/analyze", response_model=JobAnalyzeResponse)
async def analyze_job(
    body: JobAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    agent = JobUnderstandingAgent()
    try:
        profile = await agent.analyze(
            body.description,
            company=body.company,
            title=body.title,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Job analysis failed. Ensure OPENAI_API_KEY is set. ({exc})",
        ) from exc

    job = Job(
        company=body.company or "Unknown",
        title=body.title or profile.role,
        description=body.description,
        source_url=body.source_url,
        extracted_profile=profile.model_dump(),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return JobAnalyzeResponse(
        job_id=job.id,
        profile=profile,
        company=job.company,
        title=job.title,
    )


@router.post("", response_model=JobAnalyzeResponse)
async def create_job(
    body: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    company = body.company.strip()
    title = body.title.strip()
    description = body.description.strip()
    if not (company or title or description):
        raise HTTPException(
            status_code=400,
            detail="Provide at least company, title, or job description",
        )

    job = Job(
        company=company or "Unknown",
        title=title or "Untitled",
        description=description,
        source_url=body.source_url,
        extracted_profile=None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return JobAnalyzeResponse(
        job_id=job.id,
        profile=JobProfile(role="", seniority=""),
        company=job.company,
        title=job.title,
    )


@router.get("/{job_id}", response_model=JobAnalyzeResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    profile = JobProfile.model_validate(job.extracted_profile or {})
    return JobAnalyzeResponse(
        job_id=job.id,
        profile=profile,
        company=job.company,
        title=job.title,
    )


@router.post("/{job_id}/match/{resume_id}", response_model=MatchScoreResponse)
async def score_match(
    job_id: uuid.UUID,
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job or not job.extracted_profile:
        raise HTTPException(status_code=404, detail="Job not found or not analyzed")

    resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    profile = JobProfile.model_validate(job.extracted_profile)
    agent = MatchScoringAgent()
    try:
        return await agent.score(resume.content, profile)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Match scoring failed. ({exc})",
        ) from exc
