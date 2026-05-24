from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://copilot:copilot@localhost:5432/job_copilot"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-in-production"
    cors_origins: str = "http://localhost:3000"

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"

    upload_dir: str = "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
