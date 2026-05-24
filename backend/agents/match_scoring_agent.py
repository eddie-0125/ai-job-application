from prompts.match_scoring import MATCH_SCORING_SYSTEM, MATCH_SCORING_USER

from agents.base import BaseAgent
from app.schemas.job import JobProfile
from app.schemas.match import MatchScoreResponse


class MatchScoringAgent(BaseAgent):
    agent_type = "match_scoring"

    async def score(self, resume_content: str, job_profile: JobProfile) -> MatchScoreResponse:
        user_prompt = MATCH_SCORING_USER.format(
            job_profile=job_profile.model_dump_json(indent=2),
            resume_content=resume_content,
        )
        return await self.structured_completion(
            MatchScoreResponse,
            MATCH_SCORING_SYSTEM,
            user_prompt,
        )
