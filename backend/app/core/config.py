from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Obra Circular API"
    debug: bool = False
    database_url: str
    cors_origins: str = "http://localhost:8081,http://127.0.0.1:8081"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]

    @field_validator("debug", mode="before")
    @classmethod
    def normalizar_ambiente_debug(cls, valor: object) -> object:
        if isinstance(valor, str):
            if valor.lower() in {"release", "production", "prod"}:
                return False
            if valor.lower() in {"development", "dev"}:
                return True
        return valor

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
