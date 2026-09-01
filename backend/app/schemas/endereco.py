from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_NAO_DIGITO = re.compile(r"\D")


_UFS_VALIDAS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}


class EnderecoBase(BaseModel):
    

    cep: str = Field(
        ...,
        description="CEP com 8 dígitos. Pode ser enviado com máscara (ex: '74000-000').",
        examples=["74000-000"],
    )
    logradouro: str = Field(..., min_length=1, max_length=150)
    numero: str = Field(..., min_length=1, max_length=20)
    complemento: str | None = Field(default=None, max_length=100)
    bairro: str = Field(..., min_length=1, max_length=100)
    cidade: str = Field(..., min_length=1, max_length=100)
    estado: str = Field(..., min_length=2, max_length=2, description="UF, ex: 'TO'")

    @field_validator("cep")
    @classmethod
    def validar_cep(cls, valor: str) -> str:
        digitos = _NAO_DIGITO.sub("", valor)
        if len(digitos) != 8:
            raise ValueError("CEP deve conter exatamente 8 dígitos")
        return digitos

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor: str) -> str:
        uf = valor.strip().upper()
        if uf not in _UFS_VALIDAS:
            raise ValueError(f"UF inválida: '{valor}'")
        return uf

    @field_validator("logradouro", "numero", "bairro", "cidade")
    @classmethod
    def validar_texto_obrigatorio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Campo não pode ser vazio ou conter apenas espaços")
        return valor

    @field_validator("complemento")
    @classmethod
    def normalizar_complemento(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        return valor or None


class EnderecoCreate(EnderecoBase):

    usuario_id: uuid.UUID


class EnderecoRead(EnderecoBase):

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    usuario_id: uuid.UUID
    criado_em: datetime
    atualizado_em: datetime
