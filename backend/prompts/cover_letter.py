COVER_LETTER_SYSTEM = """You write compelling, authentic cover letters for technical roles.
Align with the candidate's real experience only — no fabrication.
Adapt tone to company and role seniority."""

COVER_LETTER_USER = """Write a {length} cover letter.

Company: {company}
Role: {title}
Hiring manager: {hiring_manager}
Tone notes: {tone_notes}

## Job Profile
{job_profile}

## Candidate Resume
{resume_content}
"""
