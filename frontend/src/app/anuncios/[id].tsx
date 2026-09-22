import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CabecalhoTopo } from "@/components/CabecalhoTopo";
import { obterCorFundoAnuncio } from "@/features/anuncios/categorias";
import {
  descreverStatusAnuncio,
  ehIdentificadorValido,
  formatarData,
  formatarMembroDesde,
  formatarPreco,
  obterIniciais,
} from "@/features/usuarios/perfil";
import { Anuncio, obterAnuncio } from "@/services/anuncios";
import { ErroApi } from "@/services/api";
import { Categoria, listarCategorias } from "@/services/categorias";
import { listarEnderecosDoUsuario } from "@/services/enderecos";
import { obterUsuario, Usuario } from "@/services/usuarios";
import { cores, raios } from "@/theme/tokens";

type DetalheAnuncio = {
  anuncio: Anuncio;
  categoria: Categoria | null;
  vendedor: Usuario;
  localizacao: string | null;
};

type EstadoDetalhe =
  | { situacao: "carregando" }
  | { situacao: "naoEncontrado" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; detalhe: DetalheAnuncio };

async function carregarDetalheAnuncio(anuncioId: string): Promise<DetalheAnuncio | null> {
  let anuncio: Anuncio;
  try {
    anuncio = await obterAnuncio(anuncioId);
  } catch (error) {
    if (error instanceof ErroApi && error.status === 404) return null;
    throw error;
  }

  const [categorias, vendedor, enderecos] = await Promise.all([
    listarCategorias(),
    obterUsuario(anuncio.vendedor_id),
    listarEnderecosDoUsuario(anuncio.vendedor_id),
  ]);

  const categoria = categorias.find((item) => item.id === anuncio.categoria_id) ?? null;
  const endereco = enderecos.find((item) => item.id === anuncio.endereco_id);

  return {
    anuncio,
    categoria,
    vendedor,
    localizacao: endereco ? `${endereco.cidade}/${endereco.estado}` : null,
  };
}

export default function AnuncioDetalheScreen() {
  const { id, nome, usuarioId } = useLocalSearchParams<{ id: string; nome?: string; usuarioId?: string }>();
  const router = useRouter();
  const anuncioId = typeof id === "string" ? id : "";
  const idValido = ehIdentificadorValido(anuncioId);
  const [estado, setEstado] = useState<EstadoDetalhe>({ situacao: "carregando" });
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;

    carregarDetalheAnuncio(anuncioId)
      .then((detalhe) => {
        if (ativo) setEstado(detalhe ? { situacao: "pronto", detalhe } : { situacao: "naoEncontrado" });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setEstado({
          situacao: "falha",
          mensagem: error instanceof Error ? error.message : "Não foi possível carregar o anúncio.",
        });
      });

    return () => {
      ativo = false;
    };
  }, [anuncioId, idValido, recargas]);

  function tentarNovamente() {
    setEstado({ situacao: "carregando" });
    setRecargas((total) => total + 1);
  }

  function voltar() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({ pathname: "/home", params: { nome: nome ?? "", usuarioId: usuarioId ?? "" } });
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <CabecalhoTopo
          aoVoltar={voltar}
          mostrarVoltar
          nomeUsuario={nome}
          titulo="Anúncio"
          usuarioId={usuarioId}
        />
      </SafeAreaView>

      <View style={styles.corpo}>
        {estado.situacao === "carregando" ? (
          <View accessibilityLiveRegion="polite" style={styles.aviso}>
            <ActivityIndicator color={cores.acao} size="large" />
            <Text style={styles.avisoTexto}>Carregando anúncio...</Text>
          </View>
        ) : !idValido || estado.situacao === "naoEncontrado" ? (
          <View style={styles.aviso}>
            <Ionicons color={cores.acao} name="pricetag-outline" size={34} />
            <Text accessibilityRole="header" style={styles.avisoTitulo}>Anúncio não encontrado</Text>
            <Text style={styles.avisoTexto}>Este anúncio não existe ou foi removido.</Text>
          </View>
        ) : estado.situacao === "falha" ? (
          <View style={styles.aviso}>
            <Ionicons color={cores.erro} name="cloud-offline-outline" size={34} />
            <Text accessibilityRole="header" style={styles.avisoTitulo}>Não foi possível carregar</Text>
            <Text accessibilityLiveRegion="polite" style={styles.avisoTexto}>{estado.mensagem}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={tentarNovamente}
              style={({ pressed }) => [styles.botaoTentar, pressed ? styles.botaoTentarPressionado : null]}
            >
              <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <ConteudoDetalhe detalhe={estado.detalhe} />
        )}
      </View>
    </View>
  );
}

function ConteudoDetalhe({ detalhe }: { detalhe: DetalheAnuncio }) {
  const { anuncio, categoria, vendedor, localizacao } = detalhe;
  const status = descreverStatusAnuncio(anuncio.status);
  const publicadoEm = formatarData(anuncio.postado_em);
  const membroDesde = formatarMembroDesde(vendedor.criado_em);

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: obterCorFundoAnuncio(anuncio.id) }]}>
          {categoria ? (
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeTexto}>{categoria.nome}</Text>
            </View>
          ) : <View />}
          <View style={[styles.bannerBadge, styles.bannerBadgeStatus]}>
            <Text style={styles.bannerBadgeTexto}>{status.rotulo}</Text>
          </View>
        </View>

        <View style={styles.conteudo}>
          <Text accessibilityRole="header" style={styles.titulo}>{anuncio.titulo}</Text>
          <Text style={styles.subtitulo}>
            {[localizacao, publicadoEm ? `publicado em ${publicadoEm}` : null].filter(Boolean).join(" · ")}
          </Text>
          <Text style={styles.preco}>{formatarPreco(anuncio.preco)}</Text>

          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipTexto}>{anuncio.quantidade} unidades</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipTexto}>{localizacao ? `Retirada em ${localizacao}` : "Retirada combinada com o vendedor"}</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.secaoTitulo}>Descrição</Text>
          <Text style={styles.descricao}>{anuncio.descricao}</Text>

          <Link asChild href={{ pathname: "/usuarios/[id]", params: { id: vendedor.id } }}>
            <Pressable
              accessibilityLabel={`Ver perfil de ${vendedor.nome}`}
              accessibilityRole="button"
              style={({ pressed }) => [styles.vendedorCartao, pressed ? styles.vendedorCartaoPressionado : null]}
            >
              <View style={styles.vendedorAvatar}>
                <Text style={styles.vendedorIniciais}>{obterIniciais(vendedor.nome)}</Text>
              </View>
              <View style={styles.vendedorTextos}>
                <Text style={styles.vendedorNome}>{vendedor.nome}</Text>
                <Text style={styles.vendedorMeta}>{membroDesde ? `No ObraCircular desde ${membroDesde}` : "Vendedor ObraCircular"}</Text>
              </View>
              <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.rodapeSafe}>
        <View style={styles.rodape}>
          <View style={styles.rodapeSalvar}>
            <Ionicons color="#25415F" name="bookmark-outline" size={19} />
          </View>
          <View style={styles.rodapeConversar}>
            <Text style={styles.rodapeConversarTexto}>Conversar com o vendedor</Text>
            <Ionicons color="#FFFFFF" name="arrow-forward" size={16} />
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#0C1E36" },
  headerSafe: { backgroundColor: "#0C1E36" },
  corpo: { flex: 1, backgroundColor: cores.fundo },
  scrollContent: { paddingBottom: 24 },
  aviso: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  avisoTitulo: { color: cores.texto, fontSize: 20, fontWeight: "800", textAlign: "center" },
  avisoTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
  botaoTentar: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 12, borderRadius: raios.medio, backgroundColor: cores.acao },
  botaoTentarPressionado: { backgroundColor: cores.acaoPressionada },
  botaoTentarTexto: { color: cores.superficie, fontSize: 14, fontWeight: "800" },
  banner: { height: 220, padding: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  bannerBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: raios.pill, backgroundColor: "rgba(12,30,54,0.82)" },
  bannerBadgeStatus: { backgroundColor: "rgba(12,30,54,0.55)" },
  bannerBadgeTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  conteudo: { padding: 18 },
  titulo: { color: cores.texto, fontSize: 24, lineHeight: 29, fontWeight: "600", letterSpacing: -0.5, marginBottom: 6 },
  subtitulo: { color: cores.textoSecundario, fontSize: 12.5, fontWeight: "600", marginBottom: 12 },
  preco: { color: cores.texto, fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginBottom: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#EEF3FA", borderWidth: 1, borderColor: "#DCE7F5" },
  chipTexto: { color: "#25415F", fontSize: 12, fontWeight: "700" },
  secaoTitulo: { color: cores.texto, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  descricao: { color: "#3F4E5F", fontSize: 14.5, lineHeight: 23, marginBottom: 20 },
  vendedorCartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    backgroundColor: cores.superficie,
  },
  vendedorCartaoPressionado: { backgroundColor: cores.superficieSuave },
  vendedorAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E7EFFA" },
  vendedorIniciais: { color: "#1B5FA8", fontSize: 14, fontWeight: "800" },
  vendedorTextos: { flex: 1, minWidth: 0 },
  vendedorNome: { color: cores.texto, fontSize: 14, fontWeight: "800" },
  vendedorMeta: { marginTop: 2, color: cores.textoSecundario, fontSize: 12, fontWeight: "600" },
  rodapeSafe: { backgroundColor: cores.superficie, borderTopWidth: 1, borderTopColor: cores.borda },
  rodape: { flexDirection: "row", gap: 10, padding: 12 },
  rodapeSalvar: {
    width: 52,
    height: 52,
    borderRadius: raios.grande,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeConversar: {
    flex: 1,
    height: 52,
    borderRadius: raios.grande,
    backgroundColor: "#0C1E36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  rodapeConversarTexto: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
});
