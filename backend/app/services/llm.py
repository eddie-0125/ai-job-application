from functools import lru_cache

import instructor
from openai import AsyncOpenAI

from app.config import settings


@lru_cache
def get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key or None)


@lru_cache
def get_instructor_client():
    return instructor.from_openai(get_openai_client())


async def chat_completion(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = 0.2,
) -> str:
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=model or settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content or ""
