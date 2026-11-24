"""Validação e máscara da chave Pix em que o vendedor recebe o valor das vendas."""
from __future__ import annotations

import re

from app.models.enums import TipoChavePix

_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def cpf_valido(numeros: str) -> bool:
    if len(numeros) != 11 or not numeros.isdigit() or numeros == numeros[0] * 11:
        return False
    for tamanho in (9, 10):
        soma = sum(int(numeros[i]) * (tamanho + 1 - i) for i in range(tamanho))
        digito = (soma * 10) % 11 % 10
        if digito != int(numeros[tamanho]):
            return False
    return True


def normalizar_chave_pix(tipo: TipoChavePix, valor: str) -> str:
    """Devolve a chave no formato armazenado: e-mail minúsculo ou CPF só com dígitos."""
    if tipo == TipoChavePix.EMAIL:
        email = valor.strip().lower()
        if len(email) > 77 or not _EMAIL.match(email):
            # O Banco Central limita chaves de e-mail a 77 caracteres.
            raise ValueError("informe um e-mail válido para a chave Pix")
        return email

    numeros = re.sub(r"\D", "", valor)
    if not cpf_valido(numeros):
        raise ValueError("informe um CPF válido para a chave Pix")
    return numeros


def mascarar_chave_pix(tipo: str | None, valor: str | None) -> str | None:
    """Oculta a chave nas respostas da API, que também são lidas por outros usuários."""
    if not tipo or not valor:
        return None
    if tipo == TipoChavePix.CPF:
        return f"***.{valor[3:6]}.{valor[6:9]}-**"
    usuario, _, dominio = valor.partition("@")
    return f"{usuario[:2]}{'*' * max(len(usuario) - 2, 3)}@{dominio}"
