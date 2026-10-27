import { requisicaoApi } from "./api";

export type PerguntaAnuncio = {
  id: string;
  anuncio_id: string;
  autor_id: string;
  pergunta: string;
  resposta: string | null;
  criado_em: string;
  respondido_em: string | null;
};

export type ListaPerguntas = {
  items: PerguntaAnuncio[];
  total: number;
  offset: number;
  limit: number;
};

function caminhoPerguntas(anuncioId: string) {
  return `/api/v1/anuncios/${encodeURIComponent(anuncioId)}/perguntas`;
}

export function listarPerguntas(
  anuncioId: string,
  paginacao: { offset?: number; limit?: number } = {},
): Promise<ListaPerguntas> {
  const parametros = new URLSearchParams({
    offset: String(paginacao.offset ?? 0),
    limit: String(paginacao.limit ?? 10),
  });
  return requisicaoApi<ListaPerguntas>(`${caminhoPerguntas(anuncioId)}?${parametros}`);
}

export function criarPergunta(anuncioId: string, autorId: string, pergunta: string): Promise<PerguntaAnuncio> {
  return requisicaoApi<PerguntaAnuncio>(caminhoPerguntas(anuncioId), {
    method: "POST",
    body: JSON.stringify({ autor_id: autorId, pergunta }),
  });
}

export function responderPergunta(
  anuncioId: string,
  perguntaId: string,
  vendedorId: string,
  resposta: string,
): Promise<PerguntaAnuncio> {
  return requisicaoApi<PerguntaAnuncio>(
    `${caminhoPerguntas(anuncioId)}/${encodeURIComponent(perguntaId)}/resposta`,
    {
      method: "POST",
      body: JSON.stringify({ vendedor_id: vendedorId, resposta }),
    },
  );
}
