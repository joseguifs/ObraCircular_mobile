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


class UnidadeMaterial(StrEnum):
    UNIDADE = "UNIDADE"
    M2 = "M2"
    M3 = "M3"
    METRO = "METRO"
    KG = "KG"
    LITRO = "LITRO"
    CAIXA = "CAIXA"
    SACO = "SACO"
    LOTE = "LOTE"


class EstadoConservacao(StrEnum):
    NAO_INFORMADO = "NAO_INFORMADO"
    NOVO = "NOVO"
    USADO = "USADO"


class ModalidadeEntrega(StrEnum):
    A_COMBINAR = "A_COMBINAR"
    RETIRADA = "RETIRADA"
    ENTREGA = "ENTREGA"
    RETIRADA_ENTREGA = "RETIRADA_ENTREGA"


class PapelUsuario(StrEnum):
    USUARIO = "USUARIO"
    ADMIN = "ADMIN"
