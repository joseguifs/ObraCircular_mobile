import { requisicaoApi } from "./api";

type CadastroUsuario = {
  nome: string;
  email: string;
  senha: string;
  telefone: string | null;
};

export type TipoChavePix = "EMAIL" | "CPF";
export type StatusUsuario = "ATIVO" | "INATIVO" | "BLOQUEADO";
export type PapelUsuario = "USUARIO" | "ADMIN";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  imagem_url: string | null;
  status: StatusUsuario;
  papel: PapelUsuario;
  // A API devolve só a chave mascarada; null em contas anteriores à exigência.
  chave_pix_tipo: TipoChavePix | null;
  chave_pix_mascarada: string | null;
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

export type AtualizacaoUsuario = Partial<Pick<Usuario, "nome" | "email" | "telefone" | "imagem_url">> & {
  chave_pix_tipo?: TipoChavePix;
  chave_pix?: string;
};

export function atualizarUsuario(usuarioId: string, dados: AtualizacaoUsuario): Promise<Usuario> {
  return requisicaoApi<Usuario>(`/api/v1/usuarios/${encodeURIComponent(usuarioId)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}
