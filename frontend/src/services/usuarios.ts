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

type LoginCredenciais = {
  email: string;
  senha: string;
};

export async function autenticarUsuario(dados: LoginCredenciais): Promise<Usuario> {
  return requisicaoApi<Usuario>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}
