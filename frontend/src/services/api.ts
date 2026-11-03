import { Platform } from "react-native";

const enderecoLocal = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || enderecoLocal).replace(/\/$/, "");

// Mantém o status HTTP para que a tela diferencie recurso inexistente de falha técnica.
export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

function extrairMensagem(detail: unknown) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
          return item.msg.replace(/^Value error,\s*/i, "");
        }
        return null;
      })
      .filter(Boolean)
      .join(" ");
  }
  return null;
}

export async function requisicaoApi<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(`${apiUrl}${caminho}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está em execução.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroApi(
      extrairMensagem(corpo?.detail) || "A API não conseguiu concluir a solicitação.",
      resposta.status,
    );
  }

  return corpo as T;
}
