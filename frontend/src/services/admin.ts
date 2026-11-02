import { Platform } from "react-native";

import { ErroApi, requisicaoApi } from "./api";
import { Anuncio, StatusAnuncio } from "./anuncios";
import { Categoria } from "./categorias";
import { PapelUsuario, StatusUsuario, Usuario } from "./usuarios";

const CHAVE_TOKEN = "obracircular.admin.token";

// O token fica em memória; na web também é guardado na aba para sobreviver ao recarregamento.
let tokenAtual: string | null = lerTokenSalvo();
let adminAtual: Usuario | null = null;

function lerTokenSalvo(): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return globalThis.sessionStorage?.getItem(CHAVE_TOKEN) ?? null;
  } catch {
    return null;
  }
}

function definirToken(token: string | null, admin: Usuario | null = null) {
  tokenAtual = token;
  adminAtual = admin;
  if (Platform.OS !== "web") return;
  try {
    if (token) globalThis.sessionStorage?.setItem(CHAVE_TOKEN, token);
    else globalThis.sessionStorage?.removeItem(CHAVE_TOKEN);
  } catch {
    // Armazenamento indisponível: a sessão continua válida apenas em memória.
  }
}

export function possuiSessaoAdmin() {
  return tokenAtual !== null;
}

export function ehErroDeSessao(erro: unknown) {
  return erro instanceof ErroApi && (erro.status === 401 || erro.status === 403);
}

async function requisicaoAdmin<T>(caminho: string, init?: RequestInit): Promise<T> {
  try {
    return await requisicaoApi<T>(`/api/v1/admin${caminho}`, {
      ...init,
      headers: { ...init?.headers, ...(tokenAtual ? { Authorization: `Bearer ${tokenAtual}` } : {}) },
    });
  } catch (erro) {
    if (ehErroDeSessao(erro)) definirToken(null);
    throw erro;
  }
}

function montarConsulta(filtros: Record<string, string | boolean | undefined | null>) {
  const params = Object.entries(filtros)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "" && valor !== false)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return params.length ? `?${params.join("&")}` : "";
}

export type { PapelUsuario, StatusUsuario } from "./usuarios";

export type ResumoAdmin = {
  usuarios: { total: number; ativos: number; inativos: number; bloqueados: number; administradores: number };
  anuncios: { total: number; ativos: number; esgotados: number; encerrados: number; excluidos: number };
  categorias: { total: number; ativas: number; inativas: number };
};

export type UsuarioAdmin = Usuario & { deletado_em: string | null; total_anuncios: number };
export type AnuncioAdmin = Anuncio & {
  deletado_em: string | null;
  vendedor_nome: string;
  categoria_nome: string;
};
export type CategoriaAdmin = Categoria & { total_anuncios: number };

export async function entrarComoAdmin(email: string, senha: string): Promise<Usuario> {
  const sessao = await requisicaoApi<{ token: string; expira_em: string; usuario: Usuario }>(
    "/api/v1/admin/login",
    { method: "POST", body: JSON.stringify({ email, senha }) },
  );
  definirToken(sessao.token, sessao.usuario);
  return sessao.usuario;
}

export async function sairDoAdmin() {
  try {
    await requisicaoAdmin<null>("/logout", { method: "POST" });
  } finally {
    definirToken(null);
  }
}

export async function obterAdminAtual(): Promise<Usuario> {
  adminAtual = await requisicaoAdmin<Usuario>("/me");
  return adminAtual;
}

/** Identificador do admin logado, sem nova requisição quando já é conhecido. */
export async function obterIdAdminAtual(): Promise<string> {
  return (adminAtual ?? (await obterAdminAtual())).id;
}

export function obterResumo() {
  return requisicaoAdmin<ResumoAdmin>("/resumo");
}

export function listarUsuariosAdmin(filtros: {
  busca?: string;
  status?: StatusUsuario | null;
  incluir_excluidos?: boolean;
}) {
  return requisicaoAdmin<UsuarioAdmin[]>(`/usuarios${montarConsulta(filtros)}`);
}

export function atualizarUsuarioAdmin(
  usuarioId: string,
  dados: { status?: StatusUsuario; papel?: PapelUsuario },
) {
  return requisicaoAdmin<UsuarioAdmin>(`/usuarios/${encodeURIComponent(usuarioId)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function excluirUsuarioAdmin(usuarioId: string) {
  return requisicaoAdmin<null>(`/usuarios/${encodeURIComponent(usuarioId)}`, { method: "DELETE" });
}

export function restaurarUsuarioAdmin(usuarioId: string) {
  return requisicaoAdmin<UsuarioAdmin>(`/usuarios/${encodeURIComponent(usuarioId)}/restaurar`, {
    method: "POST",
  });
}

export function listarAnunciosAdmin(filtros: {
  busca?: string;
  status?: StatusAnuncio | null;
  incluir_excluidos?: boolean;
}) {
  return requisicaoAdmin<AnuncioAdmin[]>(`/anuncios${montarConsulta(filtros)}`);
}

export function moderarAnuncio(anuncioId: string, status: StatusAnuncio) {
  return requisicaoAdmin<AnuncioAdmin>(`/anuncios/${encodeURIComponent(anuncioId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function excluirAnuncioAdmin(anuncioId: string) {
  return requisicaoAdmin<null>(`/anuncios/${encodeURIComponent(anuncioId)}`, { method: "DELETE" });
}

export function restaurarAnuncioAdmin(anuncioId: string) {
  return requisicaoAdmin<AnuncioAdmin>(`/anuncios/${encodeURIComponent(anuncioId)}/restaurar`, {
    method: "POST",
  });
}

export function listarCategoriasAdmin() {
  return requisicaoAdmin<CategoriaAdmin[]>("/categorias");
}

export function criarCategoriaAdmin(dados: { nome: string; descricao: string | null }) {
  return requisicaoAdmin<CategoriaAdmin>("/categorias", { method: "POST", body: JSON.stringify(dados) });
}

export function editarCategoriaAdmin(
  categoriaId: string,
  dados: Partial<Pick<Categoria, "nome" | "descricao" | "status">>,
) {
  return requisicaoAdmin<CategoriaAdmin>(`/categorias/${encodeURIComponent(categoriaId)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function excluirCategoriaAdmin(categoriaId: string) {
  return requisicaoAdmin<null>(`/categorias/${encodeURIComponent(categoriaId)}`, { method: "DELETE" });
}
