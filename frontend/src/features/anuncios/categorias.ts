import { Ionicons } from "@expo/vector-icons";

const iconesPorNome: Record<string, keyof typeof Ionicons.glyphMap> = {
  madeira: "leaf-outline",
  metais: "construct-outline",
  "pisos e revestimentos": "grid-outline",
  telhas: "home-outline",
  "louças e hidráulica": "water-outline",
  outros: "ellipsis-horizontal-outline",
};

export function obterIconeCategoria(nome: string): keyof typeof Ionicons.glyphMap {
  return iconesPorNome[nome.toLocaleLowerCase("pt-BR")] ?? "cube-outline";
}

const paletaFundo = ["#33526F", "#4A3B34", "#3E4A57", "#5A4531", "#42566B", "#4C5358"];

// Sem foto cadastrada, cada anúncio recebe um tom estável derivado do próprio id.
export function obterCorFundoAnuncio(id: string): string {
  let soma = 0;
  for (let indice = 0; indice < id.length; indice += 1) soma += id.charCodeAt(indice);
  return paletaFundo[soma % paletaFundo.length];
}
