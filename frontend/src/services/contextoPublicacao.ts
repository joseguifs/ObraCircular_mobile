import { Endereco, listarEnderecosDoUsuario } from "./enderecos";
import { listarUsuarios, Usuario } from "./usuarios";

export type ContextoPublicacao = {
  vendedor: Usuario;
  endereco: Endereco | null;
};

export async function obterContextoPublicacao(): Promise<ContextoPublicacao> {
  const usuarios = await listarUsuarios();
  const usuarioConfigurado = process.env.EXPO_PUBLIC_DEV_USUARIO_ID;
  const vendedor = usuarioConfigurado
    ? usuarios.find((usuario) => usuario.id === usuarioConfigurado && usuario.status === "ATIVO")
    : usuarios.find((usuario) => usuario.status === "ATIVO");

  if (!vendedor) {
    throw new Error("Cadastre um usuário ativo antes de publicar o primeiro anúncio.");
  }

  const enderecos = await listarEnderecosDoUsuario(vendedor.id);
  const enderecoConfigurado = process.env.EXPO_PUBLIC_DEV_ENDERECO_ID;
  const endereco = enderecoConfigurado
    ? enderecos.find((item) => item.id === enderecoConfigurado)
    : enderecos[0];

  return { vendedor, endereco: endereco ?? null };
}
