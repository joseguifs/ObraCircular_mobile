export type SituacaoApi = "verificando" | "online" | "offline";

export function apiEstaSaudavel(resposta: unknown) {
  if (!resposta || typeof resposta !== "object" || !("status" in resposta)) return false;
  return resposta.status === "ok";
}

export function descreverSituacaoApi(situacao: SituacaoApi) {
  if (situacao === "online") {
    return {
      titulo: "Serviços online",
      descricao: "O aplicativo e a API estão operacionais.",
      icone: "checkmark-circle" as const,
      tom: "sucesso" as const,
    };
  }

  if (situacao === "offline") {
    return {
      titulo: "API indisponível",
      descricao: "O projeto segue ativo. Inicie o backend e tente novamente.",
      icone: "cloud-offline" as const,
      tom: "alerta" as const,
    };
  }

  return {
    titulo: "Verificando serviços",
    descricao: "Consultando a disponibilidade da API...",
    icone: "sync" as const,
    tom: "neutro" as const,
  };
}
