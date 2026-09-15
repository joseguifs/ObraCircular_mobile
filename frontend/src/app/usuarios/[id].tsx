import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { EtiquetaStatus } from "@/components/EtiquetaStatus";
import { ItemAnuncioPerfil } from "@/components/ItemAnuncioPerfil";
import { LinhaInformacao } from "@/components/LinhaInformacao";
import { Marca } from "@/components/Marca";
import {
  descreverStatusUsuario,
  ehIdentificadorValido,
  formatarMembroDesde,
  formatarTelefone,
  resumirAnuncios,
  resumirLocalizacao,
} from "@/features/usuarios/perfil";
import { obterPerfilUsuario, PerfilUsuario } from "@/services/perfilUsuario";
import { cores, raios } from "@/theme/tokens";

type EstadoPerfil =
  | { situacao: "carregando" }
  | { situacao: "naoEncontrado" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; perfil: PerfilUsuario };

export default function PerfilUsuarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const usuarioId = typeof id === "string" ? id : "";
  const idValido = ehIdentificadorValido(usuarioId);
  const [estado, setEstado] = useState<EstadoPerfil>({ situacao: "carregando" });
  const [recargas, setRecargas] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    // Um identificador fora do formato UUID não corresponde a nenhum usuário.
    if (!idValido) return;
    let ativo = true;

    obterPerfilUsuario(usuarioId)
      .then((perfil) => {
        if (!ativo) return;
        setEstado(perfil ? { situacao: "pronto", perfil } : { situacao: "naoEncontrado" });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setEstado({
          situacao: "falha",
          mensagem: error instanceof Error ? error.message : "Não foi possível carregar o perfil.",
        });
      })
      .finally(() => {
        if (ativo) setAtualizando(false);
      });

    return () => {
      ativo = false;
    };
  }, [idValido, usuarioId, recargas]);

  function tentarNovamente() {
    setEstado({ situacao: "carregando" });
    setRecargas((total) => total + 1);
  }

  function atualizar() {
    setAtualizando(true);
    setRecargas((total) => total + 1);
  }

  const naoEncontrado = !idValido || estado.situacao === "naoEncontrado";

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: naoEncontrado ? "Perfil não encontrado" : "Perfil",
          // Quem chega por link direto não tem tela anterior na pilha.
          ...(router.canGoBack() ? {} : { headerLeft: () => <BotaoInicio /> }),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          !naoEncontrado && estado.situacao === "pronto" ? (
            <RefreshControl
              colors={[cores.acao]}
              onRefresh={atualizar}
              refreshing={atualizando}
              tintColor={cores.acao}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Marca />

          {naoEncontrado ? (
            <View style={styles.aviso}>
              <View style={styles.avisoIcone}>
                <Ionicons color={cores.acao} name="person-remove-outline" size={34} />
              </View>
              <Text accessibilityRole="header" style={styles.avisoTitulo}>
                Perfil não encontrado
              </Text>
              <Text style={styles.avisoTexto}>
                Este usuário não existe ou foi removido do ObraCircular. Confira o link recebido.
              </Text>
              <Link href="/" asChild>
                <Pressable accessibilityRole="link" style={styles.link}>
                  {({ pressed }) => (
                    <View style={[styles.botao, pressed ? styles.botaoPressionado : null]}>
                      <Ionicons color={cores.superficie} name="home-outline" size={19} />
                      <Text style={styles.botaoTexto}>Voltar ao início</Text>
                    </View>
                  )}
                </Pressable>
              </Link>
            </View>
          ) : estado.situacao === "carregando" ? (
            <View accessibilityLiveRegion="polite" style={styles.aviso}>
              <ActivityIndicator color={cores.acao} size="large" />
              <Text style={styles.avisoTexto}>Carregando perfil...</Text>
            </View>
          ) : estado.situacao === "falha" ? (
            <View style={styles.aviso}>
              <View style={[styles.avisoIcone, styles.avisoIconeErro]}>
                <Ionicons color={cores.erro} name="cloud-offline-outline" size={34} />
              </View>
              <Text accessibilityRole="header" style={styles.avisoTitulo}>
                Não foi possível carregar o perfil
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.avisoTexto}>
                {estado.mensagem}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={tentarNovamente}
                style={({ pressed }) => [styles.botao, pressed ? styles.botaoPressionado : null]}
              >
                <Ionicons color={cores.superficie} name="refresh" size={19} />
                <Text style={styles.botaoTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : estado.situacao === "pronto" ? (
            <ConteudoPerfil perfil={estado.perfil} />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Com asChild, o Link mescla o style do filho como objeto: estilo em função ou em
// array é descartado. Por isso o estado pressionado é aplicado nos filhos.
function BotaoInicio() {
  return (
    <Link href="/" asChild>
      <Pressable
        accessibilityLabel="Ir para a tela inicial"
        accessibilityRole="link"
        hitSlop={10}
        style={styles.botaoInicio}
      >
        {({ pressed }) => (
          <Ionicons
            color={cores.acao}
            name="home-outline"
            size={22}
            style={pressed ? styles.pressionado : null}
          />
        )}
      </Pressable>
    </Link>
  );
}

function ConteudoPerfil({ perfil }: { perfil: PerfilUsuario }) {
  const { usuario, enderecos, anuncios } = perfil;
  const status = descreverStatusUsuario(usuario.status);
  const membroDesde = formatarMembroDesde(usuario.criado_em);
  const telefone = formatarTelefone(usuario.telefone);
  const localizacao = resumirLocalizacao(enderecos);
  const resumo = resumirAnuncios(anuncios);

  return (
    <>
      <View style={styles.cartaoPrincipal}>
        <AvatarUsuario nome={usuario.nome} />
        <View style={styles.identificacao}>
          <Text accessibilityRole="header" style={styles.nome}>
            {usuario.nome}
          </Text>
          {membroDesde ? <Text style={styles.membroDesde}>Membro desde {membroDesde}</Text> : null}
          <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
        </View>
      </View>

      <View style={styles.estatisticas}>
        <Estatistica rotulo="Anúncios" valor={resumo.total} />
        <Estatistica rotulo="Ativos" valor={resumo.ativos} />
        <Estatistica rotulo="Finalizados" valor={resumo.finalizados} />
      </View>

      <View style={styles.secao}>
        <Text accessibilityRole="header" style={styles.secaoTitulo}>
          Contato e localização
        </Text>
        <LinhaInformacao icone="mail-outline" rotulo="E-mail" valor={usuario.email} />
        <LinhaInformacao
          ausente={!telefone}
          icone="call-outline"
          rotulo="Telefone"
          valor={telefone ?? "Não informado"}
        />
        <LinhaInformacao
          ausente={!localizacao}
          icone="location-outline"
          rotulo="Localização"
          valor={localizacao ?? "Nenhum endereço cadastrado"}
        />
      </View>

      <View style={styles.secao}>
        <View style={styles.secaoCabecalho}>
          <Text accessibilityRole="header" style={styles.secaoTitulo}>
            Anúncios publicados
          </Text>
          <Text style={styles.secaoContador}>{resumo.total}</Text>
        </View>

        {anuncios.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons color={cores.textoSuave} name="pricetags-outline" size={30} />
            <Text style={styles.vazioTitulo}>Nenhum anúncio publicado</Text>
            <Text style={styles.vazioTexto}>
              Quando este usuário anunciar materiais, eles aparecerão aqui.
            </Text>
          </View>
        ) : (
          anuncios.map((anuncio) => <ItemAnuncioPerfil anuncio={anuncio} key={anuncio.id} />)
        )}
      </View>
    </>
  );
}

function Estatistica({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View accessibilityLabel={`${rotulo}: ${valor}`} accessible style={styles.estatistica}>
      <Text style={styles.estatisticaValor}>{valor}</Text>
      <Text numberOfLines={1} style={styles.estatisticaRotulo}>
        {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.fundo },
  scrollContent: { flexGrow: 1, paddingVertical: 28 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 18 },
  botaoInicio: { marginLeft: 8, padding: 8, borderRadius: raios.pill },
  pressionado: { opacity: 0.65 },
  link: { marginTop: 8 },
  aviso: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.superficie,
  },
  avisoIcone: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FC",
  },
  avisoIconeErro: { backgroundColor: cores.erroFundo },
  avisoTitulo: { color: cores.texto, fontSize: 22, lineHeight: 28, fontWeight: "800", textAlign: "center" },
  avisoTexto: {
    maxWidth: 420,
    color: cores.textoSecundario,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  botao: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: cores.acao,
  },
  botaoPressionado: { backgroundColor: cores.acaoPressionada },
  botaoTexto: { color: cores.superficie, fontSize: 16, fontWeight: "800" },
  cartaoPrincipal: {
    padding: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: cores.superficie,
  },
  identificacao: { flex: 1, alignItems: "flex-start", gap: 6 },
  nome: { color: cores.texto, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.5 },
  membroDesde: { color: cores.textoSecundario, fontSize: 14, lineHeight: 19 },
  estatisticas: { flexDirection: "row", gap: 10 },
  estatistica: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    alignItems: "center",
    backgroundColor: cores.superficie,
  },
  estatisticaValor: { color: cores.acao, fontSize: 24, lineHeight: 30, fontWeight: "800" },
  estatisticaRotulo: { marginTop: 2, color: cores.textoSecundario, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  secao: {
    padding: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    gap: 16,
    backgroundColor: cores.superficie,
  },
  secaoCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  secaoTitulo: { flexShrink: 1, color: cores.texto, fontSize: 18, lineHeight: 23, fontWeight: "800" },
  secaoContador: {
    minWidth: 30,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: raios.pill,
    color: cores.acao,
    backgroundColor: "#EAF3FC",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  vazio: {
    paddingHorizontal: 16,
    paddingVertical: 22,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.borda,
    borderRadius: raios.grande,
    alignItems: "center",
    gap: 6,
    backgroundColor: cores.superficieSuave,
  },
  vazioTitulo: { color: cores.texto, fontSize: 15, lineHeight: 20, fontWeight: "800", textAlign: "center" },
  vazioTexto: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19, textAlign: "center" },
});
