import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.match_scoring_agent import MatchScoringAgent
from app.db.models import Application, Job, Resume
from app.db.session import get_db
from app.schemas.job import JobProfile
from app.schemas.match import MatchScoreResponse

router = APIRouter()


class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    resume_id: uuid.UUID


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: uuid.UUID | None
    status: str
    score: float | None
    match_details: MatchScoreResponse | None


@router.post("", response_model=ApplicationResponse)
async def create_application(
    body: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(Job).where(Job.id == body.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume_result = await db.execute(select(Resume).where(Resume.id == body.resume_id))
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    match_details: MatchScoreResponse | None = None
    score: float | None = None

    if job.extracted_profile:
        profile = JobProfile.model_validate(job.extracted_profile)
        try:
            agent = MatchScoringAgent()
            match_details = await agent.score(resume.content, profile)
            score = float(match_details.overall_score)
        except Exception:
            pass

    application = Application(
        job_id=body.job_id,
        resume_id=body.resume_id,
        status="draft",
        score=score,
        match_details=match_details.model_dump() if match_details else None,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        resume_id=application.resume_id,
        status=application.status,
        score=application.score,
        match_details=match_details,
    )


@router.get("")
async def list_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).order_by(Application.created_at.desc()))
    apps = result.scalars().all()
    return [
        {
            "id": a.id,
            "job_id": a.job_id,
            "resume_id": a.resume_id,
            "status": a.status,
            "score": a.score,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in apps
    ]


@router.patch("/{application_id}/status")
async def update_status(
    application_id: uuid.UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Application).where(Application.id == application_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = status
    if status == "applied":
        application.applied_at = datetime.now(timezone.utc)

    await db.commit()
    return {"id": application.id, "status": application.status}
