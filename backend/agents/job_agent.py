from prompts.job_analysis import JOB_ANALYSIS_SYSTEM, JOB_ANALYSIS_USER

from agents.base import BaseAgent
from app.schemas.job import JobProfile


class JobUnderstandingAgent(BaseAgent):
    agent_type = "job_understanding"

    async def analyze(
        self,
        description: str,
        *,
        company: str = "",
        title: str = "",
    ) -> JobProfile:
        user_prompt = JOB_ANALYSIS_USER.format(
            company=company or "Unknown",
            title=title or "Unknown",
            description=description,
        )
        return await self.structured_completion(
            JobProfile,
            JOB_ANALYSIS_SYSTEM,
            user_prompt,
        )
