import { Anuncio, listarAnunciosDoVendedor } from "./anuncios";
import { ErroApi } from "./api";
import { Endereco, listarEnderecosDoUsuario } from "./enderecos";
import { obterUsuario, Usuario } from "./usuarios";

export type PerfilUsuario = {
  usuario: Usuario;
  enderecos: Endereco[];
  anuncios: Anuncio[];
};

// Retorna null quando o usuário não existe ou foi excluído (404 da API).
export async function obterPerfilUsuario(usuarioId: string): Promise<PerfilUsuario | null> {
  try {
    const [usuario, enderecos, anuncios] = await Promise.all([
      obterUsuario(usuarioId),
      listarEnderecosDoUsuario(usuarioId),
      listarAnunciosDoVendedor(usuarioId),
    ]);
    return { usuario, enderecos, anuncios };
  } catch (error) {
    if (error instanceof ErroApi && error.status === 404) return null;
    throw error;
  }
}
