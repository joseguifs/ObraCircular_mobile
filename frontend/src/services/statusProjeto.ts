import { apiEstaSaudavel } from "@/features/status/statusProjeto";
import { requisicaoApi } from "@/services/api";

export async function consultarStatusProjeto(signal?: AbortSignal) {
  const controller = new AbortController();
  const interromper = () => controller.abort();
  const timeout = setTimeout(interromper, 5000);
  signal?.addEventListener("abort", interromper, { once: true });

  try {
    const resposta = await requisicaoApi<unknown>("/health", { signal: controller.signal });
    return apiEstaSaudavel(resposta);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", interromper);
  }
}
