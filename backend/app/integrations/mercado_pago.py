"""Cliente mínimo da API de pagamentos do Mercado Pago usado no Pix."""
from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx


class MercadoPagoErro(Exception):
    def __init__(self, mensagem: str, *, status_code: int | None = None, payload: Any = None) -> None:
        super().__init__(mensagem)
        self.status_code = status_code
        self.payload = payload


class MercadoPagoGateway:
    def __init__(self, access_token: str, *, api_url: str = "https://api.mercadopago.com", timeout: float = 15.0) -> None:
        self.access_token = access_token
        self.api_url = api_url.rstrip("/")
        self.timeout = timeout

    def criar_pagamento(self, payload: dict[str, Any], *, idempotency_key: str) -> dict[str, Any]:
        """POST /v1/payments: com payment_method_id=pix, devolve o QR code e o copia e cola."""
        return self._requisitar(
            "POST",
            "/v1/payments",
            json=payload,
            headers={"X-Idempotency-Key": idempotency_key},
        )

    def obter_pagamento(self, pagamento_id: str) -> dict[str, Any]:
        return self._requisitar("GET", f"/v1/payments/{pagamento_id}")

    def reembolsar_pagamento(self, pagamento_id: str, *, idempotency_key: str) -> dict[str, Any]:
        return self._requisitar(
            "POST",
            f"/v1/payments/{pagamento_id}/refunds",
            json={},
            headers={"X-Idempotency-Key": idempotency_key},
        )

    def buscar_pagamentos(self, external_reference: str) -> list[dict[str, Any]]:
        resposta = self._requisitar(
            "GET",
            "/v1/payments/search",
            params={
                "external_reference": external_reference,
                "sort": "date_created",
                "criteria": "desc",
            },
        )
        resultados = resposta.get("results")
        return [item for item in resultados if isinstance(item, dict)] if isinstance(resultados, list) else []

    def _requisitar(
        self,
        metodo: str,
        caminho: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        cabecalhos = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            **(headers or {}),
        }
        try:
            with httpx.Client(timeout=self.timeout) as cliente:
                resposta = cliente.request(
                    metodo, f"{self.api_url}{caminho}", json=json, params=params, headers=cabecalhos
                )
        except httpx.RequestError as exc:
            raise MercadoPagoErro("Falha de comunicação com o Mercado Pago.") from exc

        try:
            payload = resposta.json()
        except ValueError:
            payload = None
        if resposta.is_error:
            raise MercadoPagoErro(
                "O Mercado Pago recusou a operação.",
                status_code=resposta.status_code,
                payload=payload,
            )
        if not isinstance(payload, dict):
            raise MercadoPagoErro("Resposta inválida do Mercado Pago.")
        return payload


def validar_assinatura_webhook(*, x_signature: str, x_request_id: str, data_id: str, secret: str) -> bool:
    """Valida o cabeçalho x-signature (HMAC-SHA256) enviado pelo Mercado Pago."""
    partes: dict[str, str] = {}
    for item in x_signature.split(","):
        chave, separador, valor = item.strip().partition("=")
        if separador:
            partes[chave.strip()] = valor.strip()
    timestamp = partes.get("ts")
    assinatura = partes.get("v1")
    if not timestamp or not assinatura or not x_request_id or not data_id:
        return False

    # A documentação manda usar o id em minúsculas quando alfanumérico; algumas
    # notificações assinam o id como recebido. Aceitamos as duas formas.
    for identificador in dict.fromkeys((data_id, data_id.lower())):
        manifesto = f"id:{identificador};request-id:{x_request_id};ts:{timestamp};"
        esperada = hmac.new(secret.encode("utf-8"), manifesto.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(esperada, assinatura):
            return True
    return False
