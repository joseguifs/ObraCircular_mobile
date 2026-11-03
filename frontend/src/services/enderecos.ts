import { requisicaoApi } from "./api";

export type Endereco = {
  id: string;
  usuario_id: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  criado_em: string;
  atualizado_em: string;
};

export type CriarEndereco = {
  usuario_id: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
};

export function cadastrarEndereco(dados: CriarEndereco): Promise<Endereco> {
  return requisicaoApi<Endereco>("/api/v1/enderecos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function listarEnderecosDoUsuario(usuarioId: string): Promise<Endereco[]> {
  return requisicaoApi<Endereco[]>(`/api/v1/enderecos/usuario/${encodeURIComponent(usuarioId)}`);
}
