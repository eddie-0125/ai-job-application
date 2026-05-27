from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
