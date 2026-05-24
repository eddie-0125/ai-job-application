import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.cover_letter_agent import CoverLetterAgent
from app.db.models import Job, Resume
from app.db.session import get_db
from app.schemas.cover_letter import CoverLetterRequest, CoverLetterResponse
from app.schemas.job import JobProfile

router = APIRouter()


@router.post("/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(
    body: CoverLetterRequest,
    db: AsyncSession = Depends(get_db),
):
    resume_result = await db.execute(select(Resume).where(Resume.id == body.resume_id))
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job_result = await db.execute(select(Job).where(Job.id == body.job_id))
    job = job_result.scalar_one_or_none()
    if not job or not job.extracted_profile:
        raise HTTPException(status_code=404, detail="Job not found or not analyzed")

    profile = JobProfile.model_validate(job.extracted_profile)
    agent = CoverLetterAgent()
    try:
        return await agent.generate(
            resume.content,
            profile,
            company=job.company,
            title=job.title,
            length=body.length,
            hiring_manager=body.hiring_manager,
            tone_notes=body.tone_notes,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Cover letter generation failed. ({exc})",
        ) from exc
