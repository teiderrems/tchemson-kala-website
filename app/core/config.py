from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    admin_username: str = ""
    admin_password: str = ""
    admin_token_secret: str = ""
    admin_token_expire_minutes: int = 120
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def validate_required_environment(self) -> "Settings":
        missing = [
            name
            for name, value in {
                "DATABASE_URL": self.database_url,
                "ADMIN_USERNAME": self.admin_username,
                "ADMIN_PASSWORD": self.admin_password,
                "ADMIN_TOKEN_SECRET": self.admin_token_secret,
                "CORS_ORIGINS": self.cors_origins,
            }.items()
            if not value.strip()
        ]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def admin_signing_secret(self) -> str:
        return self.admin_token_secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
