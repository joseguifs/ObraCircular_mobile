import { requisicaoApi } from "./api";

export type StatusAnuncio = "ATIVO" | "ESGOTADO" | "ENCERRADO";

export type Anuncio = {
  id: string;
  titulo: string;
  descricao: string;
  categoria_id: string;
  vendedor_id: string;
  endereco_id: string;
  preco: string;
  imagem_url: string | null;
  quantidade: number;
  status: StatusAnuncio;
  postado_em: string;
  atualizado_em: string;
  encerrado_em: string | null;
};

export type CriarAnuncio = {
  titulo: string;
  descricao: string;
  categoria_id: string;
  vendedor_id: string;
  endereco_id: string;
  preco: number;
  imagem_url: string | null;
  quantidade: number;
};

export type AtualizarAnuncio = Partial<
  Omit<CriarAnuncio, "vendedor_id"> & { status: StatusAnuncio }
>;

export function cadastrarAnuncio(dados: CriarAnuncio): Promise<Anuncio> {
  return requisicaoApi<Anuncio>("/api/v1/anuncios", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function listarAnuncios(): Promise<Anuncio[]> {
  return requisicaoApi<Anuncio[]>("/api/v1/anuncios");
}

export function listarAnunciosDoVendedor(vendedorId: string): Promise<Anuncio[]> {
  return requisicaoApi<Anuncio[]>(`/api/v1/anuncios?vendedor_id=${encodeURIComponent(vendedorId)}`);
}

export function obterAnuncio(anuncioId: string): Promise<Anuncio> {
  return requisicaoApi<Anuncio>(`/api/v1/anuncios/${encodeURIComponent(anuncioId)}`);
}

export function editarAnuncio(anuncioId: string, dados: AtualizarAnuncio): Promise<Anuncio> {
  return requisicaoApi<Anuncio>(`/api/v1/anuncios/${encodeURIComponent(anuncioId)}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function excluirAnuncio(anuncioId: string): Promise<null> {
  return requisicaoApi<null>(`/api/v1/anuncios/${encodeURIComponent(anuncioId)}`, {
    method: "DELETE",
  });
}
