export type AcaoUsuario = "ativar" | "inativar" | "bloquear" | "promover" | "rebaixar" | "excluir" | "restaurar";
export type AcaoAnuncio = "encerrar" | "reativar" | "excluir" | "restaurar";

type UsuarioGerenciavel = {
  id: string;
  status: string;
  papel: string;
  deletado_em: string | null;
};

type AnuncioModeravel = {
  status: string;
  deletado_em: string | null;
};

export const rotulosAcaoUsuario: Record<AcaoUsuario, string> = {
  ativar: "Ativar",
  inativar: "Inativar",
  bloquear: "Bloquear",
  promover: "Tornar admin",
  rebaixar: "Remover admin",
  excluir: "Excluir",
  restaurar: "Restaurar",
};

export const rotulosAcaoAnuncio: Record<AcaoAnuncio, string> = {
  encerrar: "Encerrar",
  reativar: "Reativar",
  excluir: "Excluir",
  restaurar: "Restaurar",
};

// Ações que alteram o acesso de alguém ou removem conteúdo pedem confirmação.
export const acoesQueExigemConfirmacao = new Set<AcaoUsuario | AcaoAnuncio>([
  "bloquear",
  "inativar",
  "promover",
  "rebaixar",
  "excluir",
  "encerrar",
]);

export function listarAcoesUsuario(usuario: UsuarioGerenciavel, adminId: string | null): AcaoUsuario[] {
  // A API recusa alterações na própria conta; o painel nem oferece a opção.
  if (usuario.id === adminId) return [];
  if (usuario.deletado_em) return ["restaurar"];

  const acoes: AcaoUsuario[] = [];
  if (usuario.status !== "ATIVO") acoes.push("ativar");
  if (usuario.status === "ATIVO") acoes.push("inativar");
  if (usuario.status !== "BLOQUEADO") acoes.push("bloquear");
  acoes.push(usuario.papel === "ADMIN" ? "rebaixar" : "promover");
  acoes.push("excluir");
  return acoes;
}

export function listarAcoesAnuncio(anuncio: AnuncioModeravel): AcaoAnuncio[] {
  if (anuncio.deletado_em) return ["restaurar"];
  return [anuncio.status === "ENCERRADO" ? "reativar" : "encerrar", "excluir"];
}

export type DadosCategoria = { nome: string; descricao: string };
export type ErrosCategoria = Partial<Record<keyof DadosCategoria, string>>;

export function normalizarCategoria(dados: DadosCategoria) {
  const descricao = dados.descricao.trim().replace(/\s+/g, " ");
  return { nome: dados.nome.trim().replace(/\s+/g, " "), descricao: descricao || null };
}

export function validarCategoria(dados: DadosCategoria): ErrosCategoria {
  const { nome, descricao } = normalizarCategoria(dados);
  const erros: ErrosCategoria = {};
  if (nome.length === 0) erros.nome = "Informe o nome da categoria.";
  else if (nome.length > 100) erros.nome = "Use no máximo 100 caracteres.";
  if (descricao && descricao.length > 255) erros.descricao = "Use no máximo 255 caracteres.";
  return erros;
}
