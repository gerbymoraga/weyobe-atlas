from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api/app/config.py → repo root is parents[3]
_API_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_REPO_ROOT / ".env", _API_DIR / ".env", Path(".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://atlas:atlas@localhost:5432/atlas"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    cors_origins: str = "http://localhost:5173"
    app_public_url: str = "http://localhost:5173"
    api_public_url: str = "http://localhost:8000"

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_navigator_monthly: str = ""
    stripe_price_expedition_annual: str = ""

    resend_api_key: str = ""
    email_from: str = "ATLAS <noreply@youratlashq.com>"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
