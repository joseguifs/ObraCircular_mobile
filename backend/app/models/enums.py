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


class StatusPedido(StrEnum):
    AGUARDANDO_PAGAMENTO = "AGUARDANDO_PAGAMENTO"
    PAGO = "PAGO"
    CANCELADO = "CANCELADO"
    EXPIRADO = "EXPIRADO"
    REEMBOLSADO = "REEMBOLSADO"


class StatusPagamento(StrEnum):
    CRIADO = "CRIADO"
    PENDENTE = "PENDENTE"
    EM_PROCESSAMENTO = "EM_PROCESSAMENTO"
    APROVADO = "APROVADO"
    RECUSADO = "RECUSADO"
    CANCELADO = "CANCELADO"
    REEMBOLSADO = "REEMBOLSADO"


class MetodoPagamento(StrEnum):
    PIX = "PIX"
    CARTAO_CREDITO = "CARTAO_CREDITO"
    CARTAO_DEBITO = "CARTAO_DEBITO"
    BOLETO = "BOLETO"
    SALDO_MERCADO_PAGO = "SALDO_MERCADO_PAGO"
    OUTRO = "OUTRO"


class TipoChavePix(StrEnum):
    EMAIL = "EMAIL"
    CPF = "CPF"
