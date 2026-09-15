import { Platform } from "react-native";

type CadastroUsuario = {
  nome: string;
  email: string;
  senha: string;
  telefone: string | null;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: "ATIVO" | "INATIVO" | "BLOQUEADO";
  criado_em: string;
  atualizado_em: string;
};

const enderecoLocal = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || enderecoLocal).replace(/\/$/, "");

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

export async function cadastrarUsuario(dados: CadastroUsuario): Promise<Usuario> {
  let resposta: Response;

  try {
    resposta = await fetch(`${apiUrl}/api/v1/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está em execução.");
  }

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem = extrairMensagem(corpo?.detail);
    throw new Error(mensagem || "Não foi possível criar sua conta. Tente novamente.");
  }

  return corpo as Usuario;
}
