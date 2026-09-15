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
