import secrets
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import User
from app.services.jwt import create_access_token

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
OAUTH_SCOPES = "openid email profile"

# In-memory CSRF state store (fine for single-instance dev; use Redis in production)
_oauth_states: dict[str, bool] = {}


def create_oauth_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True
    return state


def verify_oauth_state(state: str) -> bool:
    return _oauth_states.pop(state, False)


def get_google_login_url() -> tuple[str, str]:
    state = create_oauth_state()
    params = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": OAUTH_SCOPES,
            "access_type": "offline",
            "prompt": "select_account",
            "state": state,
        }
    )
    return f"{GOOGLE_AUTH_URL}?{params}", state


async def exchange_code_for_user(db: AsyncSession, code: str) -> tuple[User, str]:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_resp.raise_for_status()
        profile = user_resp.json()

    google_sub = profile["sub"]
    email = profile["email"]
    name = profile.get("name") or email.split("@")[0]
    avatar_url = profile.get("picture")

    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if not user:
        email_result = await db.execute(select(User).where(User.email == email))
        user = email_result.scalar_one_or_none()

    if user:
        user.google_sub = google_sub
        user.name = name
        user.email = email
        user.avatar_url = avatar_url
    else:
        user = User(
            email=email,
            name=name,
            google_sub=google_sub,
            avatar_url=avatar_url,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(user_id=user.id, email=user.email)
    return user, jwt_token
