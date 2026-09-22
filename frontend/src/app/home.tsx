import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarraAbas } from "@/components/BarraAbas";
import { CabecalhoTopo } from "@/components/CabecalhoTopo";
import { CartaoAnuncio } from "@/components/CartaoAnuncio";
import { ehIdentificadorValido } from "@/features/usuarios/perfil";
import { Anuncio, listarAnuncios } from "@/services/anuncios";
import { Categoria, listarCategorias } from "@/services/categorias";
import { obterUsuario } from "@/services/usuarios";
import { cores, raios } from "@/theme/tokens";

export default function HomeScreen() {
  const { nome, usuarioId } = useLocalSearchParams<{ nome?: string; usuarioId?: string }>();
  const [nomeAtualizado, setNomeAtualizado] = useState<string | null>(null);
  const idValido = typeof usuarioId === "string" && ehIdentificadorValido(usuarioId);
  const nomeExibido = nomeAtualizado ?? nome ?? "";
  const router = useRouter();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useFocusEffect(useCallback(() => {
    if (!idValido) return;
    let ativo = true;
    obterUsuario(usuarioId)
      .then((usuario) => { if (ativo) setNomeAtualizado(usuario.nome); })
      .catch(() => { /* A saudação inicial continua disponível quando a API está fora do ar. */ });
    return () => { ativo = false; };
  }, [idValido, usuarioId]));

  const carregarVitrine = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [categoriasDaApi, anunciosDaApi] = await Promise.all([listarCategorias(), listarAnuncios()]);
      setCategorias(categoriasDaApi);
      setAnuncios(anunciosDaApi);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar os anúncios.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void carregarVitrine();
  }, [carregarVitrine]));

  function limparFiltros() {
    setCategoriaSelecionada(null);
    setBusca("");
  }

  function abrirAnuncio(anuncio: Anuncio) {
    router.push({
      pathname: "/anuncios/[id]",
      params: { id: anuncio.id, nome: nomeExibido, usuarioId: usuarioId ?? "" },
    });
  }

  const categoriaPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const listaFiltrada = anuncios.filter((anuncio) => {
    if (anuncio.status !== "ATIVO") return false;
    if (categoriaSelecionada && anuncio.categoria_id !== categoriaSelecionada) return false;
    if (!termo) return true;
    const nomeCategoria = categoriaPorId.get(anuncio.categoria_id)?.nome ?? "";
    return `${anuncio.titulo} ${nomeCategoria}`.toLocaleLowerCase("pt-BR").includes(termo);
  });

  const nomeCategoriaSelecionada = categoriaSelecionada ? categoriaPorId.get(categoriaSelecionada)?.nome : null;
  const resumoBusca = listaFiltrada.length
    ? `${listaFiltrada.length} ${listaFiltrada.length === 1 ? "anúncio disponível" : "anúncios disponíveis"}${
        nomeCategoriaSelecionada ? ` em ${nomeCategoriaSelecionada}` : " na sua região"
      }`
    : "Nada encontrado com esses filtros";

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <CabecalhoTopo nomeUsuario={nomeExibido} titulo="Obra Circular" usuarioId={usuarioId}>
          <View style={styles.saudacaoBloco}>
            <Text style={styles.eyebrow}>Bom te ver de novo</Text>
            <Text style={styles.saudacao}>{nomeExibido ? `Olá, ${nomeExibido.split(" ")[0]}` : "Olá"}</Text>
            <View style={styles.buscaContainer}>
              <Ionicons color="#9FB2C9" name="search" size={17} />
              <TextInput
                accessibilityLabel="Buscar anúncios"
                onChangeText={setBusca}
                placeholder="Buscar materiais, categorias…"
                placeholderTextColor="#9FB2C9"
                returnKeyType="search"
                style={styles.buscaInput}
                value={busca}
              />
            </View>
          </View>
        </CabecalhoTopo>
      </SafeAreaView>

      <View style={styles.corpo}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScrollView
            contentContainerStyle={styles.categorias}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Chip
              ativo={categoriaSelecionada === null}
              nome="Todos"
              onPress={() => setCategoriaSelecionada(null)}
            />
            {categorias.map((categoria) => (
              <Chip
                ativo={categoriaSelecionada === categoria.id}
                key={categoria.id}
                nome={categoria.nome}
                onPress={() => setCategoriaSelecionada(categoria.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.secaoCabecalho}>
            <Text accessibilityRole="header" style={styles.secaoTitulo}>Perto de você</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={limparFiltros}>
              <Text style={styles.verTodos}>Ver todos</Text>
            </Pressable>
          </View>
          <Text style={styles.resumo}>{resumoBusca}</Text>

          {carregando ? (
            <View style={styles.aviso}>
              <ActivityIndicator color={cores.acao} size="large" />
              <Text style={styles.avisoTexto}>Carregando anúncios...</Text>
            </View>
          ) : erro ? (
            <View style={styles.aviso}>
              <Ionicons color={cores.erro} name="cloud-offline-outline" size={30} />
              <Text style={styles.avisoTexto}>{erro}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={carregarVitrine}
                style={({ pressed }) => [styles.botaoTentar, pressed ? styles.botaoTentarPressionado : null]}
              >
                <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : listaFiltrada.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>Nenhum anúncio encontrado</Text>
              <Text style={styles.vazioTexto}>Ajuste a busca ou escolha outra categoria.</Text>
            </View>
          ) : (
            <View style={styles.lista}>
              {listaFiltrada.map((anuncio) => (
                <CartaoAnuncio
                  anuncio={anuncio}
                  categoria={categoriaPorId.get(anuncio.categoria_id)}
                  key={anuncio.id}
                  onPress={() => abrirAnuncio(anuncio)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.tabBarSafe}>
          <BarraAbas usuarioId={usuarioId} />
        </SafeAreaView>
      </View>
    </View>
  );
}

function Chip({ nome, ativo, onPress }: { nome: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Categoria ${nome}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[styles.chip, ativo ? styles.chipAtivo : null]}
    >
      <Text style={[styles.chipTexto, ativo ? styles.chipTextoAtivo : null]}>{nome}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#0C1E36" },
  headerSafe: { backgroundColor: "#0C1E36" },
  saudacaoBloco: { paddingHorizontal: 18, paddingBottom: 18 },
  eyebrow: { marginBottom: 4, color: "#7FB3EA", fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" },
  saudacao: { marginBottom: 14, color: "#FFFFFF", fontSize: 26, fontWeight: "400", letterSpacing: -0.5 },
  buscaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  buscaInput: { flex: 1, color: "#FFFFFF", fontSize: 14.5, fontWeight: "500" },
  corpo: { flex: 1, backgroundColor: cores.fundo },
  scrollContent: { paddingVertical: 16, paddingBottom: 28 },
  categorias: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingBottom: 4 },
  chip: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.superficie,
  },
  chipAtivo: { borderColor: "#0C1E36", backgroundColor: "#0C1E36" },
  chipTexto: { color: "#25415F", fontSize: 13, fontWeight: "700" },
  chipTextoAtivo: { color: "#FFFFFF" },
  secaoCabecalho: {
    marginTop: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  secaoTitulo: { color: cores.texto, fontSize: 21, fontWeight: "600", letterSpacing: -0.5 },
  verTodos: { color: cores.acao, fontSize: 13, fontWeight: "800" },
  resumo: { marginTop: 4, marginBottom: 14, paddingHorizontal: 18, color: cores.textoSecundario, fontSize: 12.5, fontWeight: "600" },
  lista: { paddingHorizontal: 18, gap: 12 },
  aviso: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 34 },
  avisoTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
  botaoTentar: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 12, borderRadius: raios.medio, backgroundColor: cores.acao },
  botaoTentarPressionado: { backgroundColor: cores.acaoPressionada },
  botaoTentarTexto: { color: cores.superficie, fontSize: 14, fontWeight: "800" },
  vazio: {
    marginHorizontal: 18,
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.borda,
    borderRadius: raios.grande,
    alignItems: "center",
    gap: 6,
    backgroundColor: cores.superficie,
  },
  vazioTitulo: { color: cores.texto, fontSize: 15, fontWeight: "800" },
  vazioTexto: { color: cores.textoSecundario, fontSize: 13, textAlign: "center" },
  tabBarSafe: { backgroundColor: cores.superficie },
});
