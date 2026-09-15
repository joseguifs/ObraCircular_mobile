import { requisicaoApi } from "./api";

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

export async function cadastrarUsuario(dados: CadastroUsuario): Promise<Usuario> {
  return requisicaoApi<Usuario>("/api/v1/usuarios", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function listarUsuarios(): Promise<Usuario[]> {
  return requisicaoApi<Usuario[]>("/api/v1/usuarios");
}

export function obterUsuario(usuarioId: string): Promise<Usuario> {
  return requisicaoApi<Usuario>(`/api/v1/usuarios/${encodeURIComponent(usuarioId)}`);
}
