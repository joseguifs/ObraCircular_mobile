from functools import lru_cache

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _env(nome: str) -> AliasChoices:
    """Aceita o nome do mobile e o nome com prefixo usado no backend web."""
    return AliasChoices(nome, f"OBRA_CIRCULAR_{nome}")


class Settings(BaseSettings):
    app_name: str = "Obra Circular API"
    debug: bool = False
    database_url: str
    cors_origins: str = "http://localhost:8081,http://127.0.0.1:8081"
    admin_sessao_horas: int = 8

    # Mercado Pago / Checkout Pro com Pix.
    # Os nomes também são aceitos com o prefixo OBRA_CIRCULAR_ para reaproveitar o .env da web.
    mp_access_token: SecretStr | None = Field(default=None, validation_alias=_env("MP_ACCESS_TOKEN"))
    mp_webhook_secret: SecretStr | None = Field(default=None, validation_alias=_env("MP_WEBHOOK_SECRET"))
    mp_webhook_secret_test: SecretStr | None = Field(
        default=None, validation_alias=_env("MP_WEBHOOK_SECRET_TEST")
    )
    mp_webhook_secret_production: SecretStr | None = Field(
        default=None, validation_alias=_env("MP_WEBHOOK_SECRET_PRODUCTION")
    )
    mp_live_mode: bool = Field(default=False, validation_alias=_env("MP_LIVE_MODE"))
    # URL pública HTTPS do backend, usada para o Mercado Pago enviar os webhooks.
    # Sem ela o Pix funciona, mas a confirmação depende da sincronização feita pelo app.
    mp_public_base_url: str | None = Field(default=None, validation_alias=_env("MP_PUBLIC_BASE_URL"))
    mp_webhook_url: str | None = Field(default=None, validation_alias=_env("MP_WEBHOOK_URL"))
    # Em testes, o pagador precisa ser diferente da conta recebedora (ex.: test@testuser.com).
    mp_test_payer_email: str | None = Field(default=None, validation_alias=_env("MP_TEST_PAYER_EMAIL"))
    # Tempo em que o anúncio fica reservado aguardando o Pix (o QR code vence junto).
    mp_checkout_minutes: int = Field(
        default=30,
        ge=5,
        le=1440,
        validation_alias=AliasChoices(
            "MP_CHECKOUT_MINUTES",
            "OBRA_CIRCULAR_MP_CHECKOUT_MINUTES",
            "OBRA_CIRCULAR_STOCK_RESERVATION_MINUTES",
        ),
    )
    mercado_pago_api_url: str = Field(
        default="https://api.mercadopago.com", validation_alias=_env("MERCADO_PAGO_API_URL")
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]

    @property
    def mp_webhook_secrets(self) -> list[str]:
        segredos = (self.mp_webhook_secret_test, self.mp_webhook_secret_production, self.mp_webhook_secret)
        return list(dict.fromkeys(s.get_secret_value() for s in segredos if s and s.get_secret_value()))

    @field_validator("debug", mode="before")
    @classmethod
    def normalizar_ambiente_debug(cls, valor: object) -> object:
        if isinstance(valor, str):
            if valor.lower() in {"release", "production", "prod"}:
                return False
            if valor.lower() in {"development", "dev"}:
                return True
        return valor

    @field_validator(
        "mp_access_token",
        "mp_webhook_secret",
        "mp_webhook_secret_test",
        "mp_webhook_secret_production",
        "mp_public_base_url",
        "mp_webhook_url",
        "mp_test_payer_email",
        mode="before",
    )
    @classmethod
    def vazio_como_nulo(cls, valor: object) -> object:
        if isinstance(valor, str) and not valor.strip():
            return None
        return valor

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
