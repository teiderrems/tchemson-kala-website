from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    admin_username: str = ""
    admin_password: str = ""
    admin_token_secret: str = ""
    admin_token_expire_minutes: int = 120
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        if not url.startswith("postgresql+asyncpg://"):
            return url

        parsed = urlsplit(url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        sslmode = query.pop("sslmode", "")
        query.pop("channel_binding", None)
        if sslmode and "ssl" not in query:
            query["ssl"] = "require" if sslmode == "require" else sslmode

        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))

    @property
    def admin_signing_secret(self) -> str:
        return self.admin_token_secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
