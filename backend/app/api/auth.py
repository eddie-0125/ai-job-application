from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import User
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.schemas.auth import AuthTokenResponse, UserResponse
from app.services.google_oauth import (
    exchange_code_for_user,
    get_google_login_url,
    verify_oauth_state,
)

router = APIRouter()


@router.get("/google/login")
async def google_login():
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    url, _state = get_google_login_url()
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not verify_oauth_state(state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        _user, token = await exchange_code_for_user(db, code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google login failed: {exc}") from exc

    redirect_url = f"{settings.frontend_url}/auth/callback?token={token}"
    return RedirectResponse(redirect_url)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
    )


@router.post("/logout")
async def logout():
    # JWT is stateless; client clears the token
    return {"ok": True}
