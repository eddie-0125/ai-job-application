import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.resume_agent import ResumeOptimizationAgent
from app.config import settings
from app.db.models import Job, Resume
from app.db.session import get_db
from app.schemas.job import JobProfile
from app.schemas.resume import ResumeTailorRequest, ResumeTailorResponse, ResumeUploadResponse
from app.services.pdf import extract_text_from_pdf

router = APIRouter()


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    title: str = Form("My Resume"),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    content = ""

    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            content = extract_text_from_pdf(data)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {exc}") from exc
    else:
        content = data.decode("utf-8", errors="replace")

    if len(content.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume content too short or unreadable")

    file_path: str | None = None
    if file.filename:
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid.uuid4()}_{file.filename}"
        dest = upload_dir / safe_name
        dest.write_bytes(data)
        file_path = str(dest)

    resume = Resume(title=title, content=content, file_path=file_path)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    preview = content[:500] + ("..." if len(content) > 500 else "")
    return ResumeUploadResponse(resume_id=resume.id, title=resume.title, content_preview=preview)


@router.post("/text", response_model=ResumeUploadResponse)
async def create_resume_from_text(
    content: str = Form(...),
    title: str = Form("My Resume"),
    db: AsyncSession = Depends(get_db),
):
    if len(content.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume content too short")

    resume = Resume(title=title, content=content)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    preview = content[:500] + ("..." if len(content) > 500 else "")
    return ResumeUploadResponse(resume_id=resume.id, title=resume.title, content_preview=preview)


@router.get("/{resume_id}")
async def get_resume(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "resume_id": resume.id,
        "title": resume.title,
        "content": resume.content,
        "version": resume.resume_version,
    }


@router.post("/tailor", response_model=ResumeTailorResponse)
async def tailor_resume(
    body: ResumeTailorRequest,
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
    agent = ResumeOptimizationAgent()
    try:
        return await agent.tailor(resume.content, profile)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Resume tailoring failed. ({exc})",
        ) from exc
