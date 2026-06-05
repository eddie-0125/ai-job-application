import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agents.match_scoring_agent import MatchScoringAgent
from app.db.models import Application, Job, User
from app.db.session import get_db
from app.deps.auth import get_current_user, get_user_resume
from app.schemas.job import JobProfile
from app.schemas.match import MatchScoreResponse

router = APIRouter()


class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    resume_id: uuid.UUID | None = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: uuid.UUID | None
    status: str
    score: float | None
    match_details: MatchScoreResponse | None


class ApplicationSummary(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: uuid.UUID | None
    company: str
    job_title: str
    status: str
    score: float | None
    created_at: str | None
    applied_at: str | None


@router.post("", response_model=ApplicationResponse)
async def create_application(
    body: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_result = await db.execute(select(Job).where(Job.id == body.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    match_details: MatchScoreResponse | None = None
    score: float | None = None

    if body.resume_id:
        resume = await get_user_resume(body.resume_id, current_user, db)
        if not resume.user_id:
            resume.user_id = current_user.id

        if job.extracted_profile:
            profile = JobProfile.model_validate(job.extracted_profile)
            try:
                agent = MatchScoringAgent()
                match_details = await agent.score(resume.content, profile)
                score = float(match_details.overall_score)
            except Exception:
                pass

    application = Application(
        user_id=current_user.id,
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


@router.get("", response_model=list[ApplicationSummary])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.job))
        .where(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()
    return [
        ApplicationSummary(
            id=a.id,
            job_id=a.job_id,
            resume_id=a.resume_id,
            company=a.job.company if a.job else "Unknown",
            job_title=a.job.title if a.job else "Unknown",
            status=a.status,
            score=a.score,
            created_at=a.created_at.isoformat() if a.created_at else None,
            applied_at=a.applied_at.isoformat() if a.applied_at else None,
        )
        for a in apps
    ]


@router.patch("/{application_id}/status")
async def update_status(
    application_id: uuid.UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = status
    if status == "applied":
        application.applied_at = datetime.now(timezone.utc)

    await db.commit()
    return {"id": application.id, "status": application.status}
