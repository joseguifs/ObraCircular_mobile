export type DadosEdicaoUsuario = {
  nome: string;
  email: string;
  telefone: string;
};

export type ErrosEdicaoUsuario = Partial<Record<keyof DadosEdicaoUsuario, string>>;

export type DadosBasicosUsuario = {
  nome: string;
  email: string;
  telefone: string | null;
};

function numerosTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, "");
  return numeros.replace(/^55(?=\d{10,11}$)/, "");
}

export function normalizarEdicaoUsuario(dados: DadosEdicaoUsuario): DadosBasicosUsuario {
  const telefone = numerosTelefone(dados.telefone);
  return {
    nome: dados.nome.trim().replace(/\s+/g, " "),
    email: dados.email.trim().toLowerCase(),
    telefone: telefone ? `+55${telefone}` : null,
  };
}

export function validarEdicaoUsuario(dados: DadosEdicaoUsuario): ErrosEdicaoUsuario {
  const erros: ErrosEdicaoUsuario = {};
  const normalizados = normalizarEdicaoUsuario(dados);

  if (normalizados.nome.length < 3) {
    erros.nome = "Informe seu nome completo, com pelo menos 3 caracteres.";
  } else if (normalizados.nome.length > 150) {
    erros.nome = "O nome deve ter no máximo 150 caracteres.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizados.email)) {
    erros.email = "Informe um e-mail válido.";
  } else if (normalizados.email.length > 255) {
    erros.email = "O e-mail deve ter no máximo 255 caracteres.";
  }

  // Segue o contrato do backend: telefone brasileiro opcional, com ou sem +55.
  if (dados.telefone.trim() && ![10, 11].includes(numerosTelefone(dados.telefone).length)) {
    erros.telefone = "Informe um telefone brasileiro com DDD, com 10 ou 11 dígitos.";
  } else if (dados.telefone.length > 20) {
    erros.telefone = "O telefone deve ter no máximo 20 caracteres.";
  }

  return erros;
}

export function obterAlteracoesUsuario(
  dados: DadosEdicaoUsuario,
  usuario: DadosBasicosUsuario,
): Partial<DadosBasicosUsuario> {
  const normalizados = normalizarEdicaoUsuario(dados);
  const anteriores = normalizarEdicaoUsuario({ ...usuario, telefone: usuario.telefone ?? "" });
  const alteracoes: Partial<DadosBasicosUsuario> = {};
  if (normalizados.nome !== anteriores.nome) alteracoes.nome = normalizados.nome;
  if (normalizados.email !== anteriores.email) alteracoes.email = normalizados.email;
  if (normalizados.telefone !== anteriores.telefone) alteracoes.telefone = normalizados.telefone;
  return alteracoes;
}
