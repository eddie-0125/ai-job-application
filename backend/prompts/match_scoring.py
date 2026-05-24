MATCH_SCORING_SYSTEM = """You score candidate-job fit across multiple dimensions.
Scores are 0-100 integers. Be calibrated: 90+ is exceptional fit, 50 is partial, below 40 is poor.
Provide a brief summary explaining the overall score."""

MATCH_SCORING_USER = """Score this candidate against the job.

## Job Profile
{job_profile}

## Resume
{resume_content}
"""
