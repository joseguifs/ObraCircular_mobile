// Remove acentos e caixa para que "ceramica" encontre "Cerâmica".
export function normalizarTextoBusca(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export function correspondeBusca(campos: (string | null | undefined)[], busca: string) {
  const termo = normalizarTextoBusca(busca);
  if (!termo) return true;

  return normalizarTextoBusca(campos.filter(Boolean).join(" ")).includes(termo);
}
