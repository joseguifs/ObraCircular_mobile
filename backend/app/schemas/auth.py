from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginCredenciais(BaseModel):
    email: EmailStr = Field(description="E-mail cadastrado na plataforma")
    senha: str = Field(min_length=1, max_length=72, description="Senha da conta")

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, email: object) -> object:
        if isinstance(email, str):
            return email.strip().lower()

        return email
