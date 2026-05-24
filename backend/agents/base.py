from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

from app.services.llm import get_instructor_client

T = TypeVar("T", bound=BaseModel)


class BaseAgent(ABC):
    agent_type: str = "base"

    async def structured_completion(
        self,
        response_model: type[T],
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
    ) -> T:
        client = get_instructor_client()
        return await client.chat.completions.create(
            model=self.model,
            response_model=response_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )

    @property
    def model(self) -> str:
        from app.config import settings

        return settings.openai_model
