from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import StatusUsuario


class UsuarioCriacao(BaseModel):
    nome: str = Field(
        min_length=3,
        max_length=150,
        description="Nome completo do usuário",
    )
    email: EmailStr = Field(
        max_length=255,
        description="E-mail utilizado para acessar a plataforma",
    )
    senha: str = Field(
        min_length=8,
        max_length=72,
        description="Senha com pelo menos uma letra e um número",
    )
    telefone: str | None = Field(
        default=None,
        max_length=20,
        description="Telefone brasileiro com DDD",
    )

    @field_validator("nome", mode="before")
    @classmethod
    def validar_nome(cls, nome: object) -> object:
        if not isinstance(nome, str):
            return nome

        # Remove espaços no início, no final e espaços duplicados.
        nome = " ".join(nome.split())

        if len(nome) < 3:
            raise ValueError("o nome deve possuir pelo menos 3 caracteres")

        return nome

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, email: object) -> object:
        if isinstance(email, str):
            return email.strip().lower()

        return email

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, senha: str) -> str:
        if senha != senha.strip():
            raise ValueError(
                "a senha não pode começar ou terminar com espaços"
            )

        if not any(caractere.isalpha() for caractere in senha):
            raise ValueError(
                "a senha deve possuir pelo menos uma letra"
            )

        if not any(caractere.isdigit() for caractere in senha):
            raise ValueError(
                "a senha deve possuir pelo menos um número"
            )

        return senha

    @field_validator("telefone", mode="before")
    @classmethod
    def validar_telefone(cls, telefone: object) -> object:
        if telefone is None or telefone == "":
            return None

        if not isinstance(telefone, str):
            raise ValueError("o telefone deve ser informado como texto")

        # Remove parênteses, espaços e hífens.
        numeros = re.sub(r"\D", "", telefone)

        # Se receber o código do Brasil, remove para validar.
        if len(numeros) in (12, 13) and numeros.startswith("55"):
            numeros = numeros[2:]

        # 10 dígitos para telefone fixo e 11 para celular.
        if len(numeros) not in (10, 11):
            raise ValueError(
                "informe um telefone brasileiro válido com DDD"
            )

        # Armazena em formato semelhante ao padrão internacional.
        return f"+55{numeros}"


class UsuarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    email: EmailStr
    telefone: str | None
    status: StatusUsuario
    criado_em: datetime
    atualizado_em: datetime
