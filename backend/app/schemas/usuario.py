from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import PapelUsuario, StatusUsuario, TipoChavePix
from app.schemas.chave_pix import mascarar_chave_pix, normalizar_chave_pix
from app.schemas.imagem import normalizar_imagem


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
    # Opcional no cadastro: o app pede a chave depois, antes da primeira venda.
    chave_pix_tipo: TipoChavePix | None = Field(
        default=None,
        description="Tipo da chave Pix para receber o valor das vendas",
    )
    chave_pix: str | None = Field(
        default=None,
        max_length=100,
        description="Chave Pix (e-mail ou CPF) para receber o valor das vendas",
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

    @model_validator(mode="after")
    def validar_chave_pix(self):
        if (self.chave_pix_tipo is None) != (self.chave_pix is None):
            raise ValueError("informe o tipo e a chave Pix juntos")
        if self.chave_pix_tipo is not None and self.chave_pix is not None:
            self.chave_pix = normalizar_chave_pix(self.chave_pix_tipo, self.chave_pix)
        return self


class UsuarioAtualizacao(UsuarioCriacao):
    model_config = ConfigDict(extra="forbid")

    nome: str | None = Field(default=None, min_length=3, max_length=150)
    email: EmailStr | None = Field(default=None, max_length=255)
    senha: str | None = Field(default=None, min_length=8, max_length=72)
    status: StatusUsuario | None = None
    imagem_url: str | None = Field(default=None, max_length=7_000_000)
    chave_pix_tipo: TipoChavePix | None = None
    chave_pix: str | None = Field(default=None, max_length=100)

    @field_validator("imagem_url")
    @classmethod
    def validar_imagem(cls, imagem: str | None) -> str | None:
        return normalizar_imagem(imagem)

    @model_validator(mode="before")
    @classmethod
    def rejeitar_nulos(cls, dados: object) -> object:
        if isinstance(dados, dict):
            # A chave Pix pode ser trocada, mas não removida: é usada nos repasses.
            for campo in ("nome", "email", "senha", "status", "chave_pix_tipo", "chave_pix"):
                if campo in dados and dados[campo] is None:
                    raise ValueError(f"o campo {campo} não pode ser nulo")
        return dados


class UsuarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    email: EmailStr
    telefone: str | None
    imagem_url: str | None = None
    status: StatusUsuario
    papel: PapelUsuario = PapelUsuario.USUARIO
    # A chave completa nunca sai da API: estas rotas não exigem autenticação.
    chave_pix_tipo: TipoChavePix | None = None
    chave_pix_mascarada: str | None = None
    criado_em: datetime
    atualizado_em: datetime

    @model_validator(mode="before")
    @classmethod
    def mascarar_chave(cls, dados: object) -> object:
        if isinstance(dados, dict) or not hasattr(dados, "chave_pix"):
            return dados
        valores = {campo: getattr(dados, campo) for campo in cls.model_fields if hasattr(dados, campo)}
        valores["chave_pix_mascarada"] = mascarar_chave_pix(
            getattr(dados, "chave_pix_tipo", None), getattr(dados, "chave_pix", None)
        )
        return valores
