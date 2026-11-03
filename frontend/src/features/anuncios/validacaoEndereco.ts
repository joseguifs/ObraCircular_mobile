export type DadosEndereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export type ErrosEndereco = Partial<Record<keyof DadosEndereco, string>>;

const ufsValidas = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export function formatarCep(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function validarEndereco(dados: DadosEndereco): ErrosEndereco {
  const erros: ErrosEndereco = {};
  if (dados.cep.replace(/\D/g, "").length !== 8) erros.cep = "Informe um CEP com 8 dígitos.";
  if (!dados.logradouro.trim()) erros.logradouro = "Informe o logradouro.";
  if (!dados.numero.trim()) erros.numero = "Informe o número.";
  if (!dados.bairro.trim()) erros.bairro = "Informe o bairro.";
  if (!dados.cidade.trim()) erros.cidade = "Informe a cidade.";
  if (!ufsValidas.has(dados.estado.trim().toUpperCase())) erros.estado = "Informe uma UF válida.";
  return erros;
}

export function normalizarEndereco(dados: DadosEndereco) {
  return {
    cep: dados.cep.replace(/\D/g, ""),
    logradouro: dados.logradouro.trim(),
    numero: dados.numero.trim(),
    complemento: dados.complemento.trim() || null,
    bairro: dados.bairro.trim(),
    cidade: dados.cidade.trim(),
    estado: dados.estado.trim().toUpperCase(),
  };
}
