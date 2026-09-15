import { requisicaoApi } from "./api";

export type Categoria = {
  id: string;
  nome: string;
  descricao: string | null;
  status: "ATIVA" | "INATIVA";
  criado_em: string;
  atualizado_em: string;
};

export function listarCategorias(): Promise<Categoria[]> {
  return requisicaoApi<Categoria[]>("/api/v1/categorias");
}
