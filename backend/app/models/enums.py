from enum import StrEnum


class StatusUsuario(StrEnum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"
    BLOQUEADO = "BLOQUEADO"


class StatusCategoria(StrEnum):
    ATIVA = "ATIVA"
    INATIVA = "INATIVA"


class StatusAnuncio(StrEnum):
    ATIVO = "ATIVO"
    ESGOTADO = "ESGOTADO"
    ENCERRADO = "ENCERRADO"
