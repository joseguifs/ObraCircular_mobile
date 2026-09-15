export const categorias = [
  { id: "madeira", nome: "Madeira", icon: "leaf-outline" },
  { id: "metais", nome: "Metais", icon: "construct-outline" },
  { id: "pisos", nome: "Pisos e revestimentos", icon: "grid-outline" },
  { id: "telhas", nome: "Telhas", icon: "home-outline" },
  { id: "hidraulica", nome: "Louças e hidráulica", icon: "water-outline" },
  { id: "outros", nome: "Outros", icon: "ellipsis-horizontal-outline" },
] as const;

export type CategoriaId = (typeof categorias)[number]["id"];
