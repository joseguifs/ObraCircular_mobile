import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { coresStatusPedido } from "@/features/pagamentos/coresStatus";
import { descreverStatusPedido, lerParametro, pedidoEmAndamento } from "@/features/pagamentos/pagamento";
import { formatarPreco } from "@/features/usuarios/perfil";
import { listarPedidos, Pedido } from "@/services/pedidos";
import { cores, raios } from "@/theme/tokens";

type Estado =
  | { situacao: "carregando" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; pedidos: Pedido[] };

function formatarDataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function MeusPedidosScreen() {
  const params = useLocalSearchParams<{ usuarioId?: string; nome?: string }>();
  const router = useRouter();
  const usuarioId = lerParametro(params.usuarioId) ?? "";
  const [estado, setEstado] = useState<Estado>({ situacao: "carregando" });
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!usuarioId) {
      setEstado({ situacao: "falha", mensagem: "Entre na sua conta para ver seus pedidos." });
      return;
    }
    try {
      setEstado({ situacao: "pronto", pedidos: await listarPedidos(usuarioId) });
    } catch (error) {
      setEstado({
        situacao: "falha",
        mensagem: error instanceof Error ? error.message : "Não foi possível carregar seus pedidos.",
      });
    }
  }, [usuarioId]);

  // Recarrega ao voltar da tela de pagamento, para refletir o status mais recente.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  function abrir(pedido: Pedido) {
    router.push({
      pathname: "/pedidos/[id]",
      params: { id: pedido.id, usuarioId, nome: lerParametro(params.nome) ?? "" },
    });
  }

  if (estado.situacao === "carregando") {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.acao} size="large" />
        <Text style={styles.avisoTexto}>Carregando pedidos…</Text>
      </View>
    );
  }

  if (estado.situacao === "falha") {
    return (
      <View style={styles.centro}>
        <Ionicons color={cores.erro} name="cloud-offline-outline" size={34} />
        <Text accessibilityLiveRegion="polite" style={styles.avisoTexto}>{estado.mensagem}</Text>
        {usuarioId ? (
          <Pressable accessibilityRole="button" onPress={carregar} style={styles.botao}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={estado.pedidos.length ? styles.lista : styles.listaVazia}
      data={estado.pedidos}
      keyExtractor={(pedido) => pedido.id}
      refreshControl={<RefreshControl onRefresh={puxarParaAtualizar} refreshing={atualizando} />}
      ListEmptyComponent={
        <View style={styles.centro}>
          <Ionicons color={cores.textoSuave} name="bag-handle-outline" size={40} />
          <Text accessibilityRole="header" style={styles.vazioTitulo}>Nenhum pedido ainda</Text>
          <Text style={styles.avisoTexto}>Suas compras com Pix aparecem aqui.</Text>
        </View>
      }
      renderItem={({ item }) => <ItemPedido aoAbrir={() => abrir(item)} pedido={item} />}
    />
  );
}

function ItemPedido({ pedido, aoAbrir }: { pedido: Pedido; aoAbrir: () => void }) {
  const status = descreverStatusPedido(pedido.status);
  const tom = coresStatusPedido[status.tom];
  const detalhe = pedidoEmAndamento(pedido.status)
    ? `Pague até ${formatarDataHora(pedido.expira_em)}`
    : `Pedido em ${formatarDataHora(pedido.criado_em)}`;

  return (
    <Pressable
      accessibilityHint="Abre os detalhes do pagamento."
      accessibilityLabel={`${pedido.titulo}, ${formatarPreco(pedido.valor_total)}, ${status.rotulo}`}
      accessibilityRole="button"
      onPress={aoAbrir}
      style={({ pressed }) => [styles.cartao, pressed ? styles.cartaoPressionado : null]}
    >
      <View style={styles.cartaoTextos}>
        <Text numberOfLines={2} style={styles.titulo}>{pedido.titulo}</Text>
        <Text style={styles.valor}>{formatarPreco(pedido.valor_total)}</Text>
        <Text style={styles.detalhe}>{detalhe}</Text>
        <View style={[styles.etiqueta, { backgroundColor: tom.fundo }]}>
          <Ionicons color={tom.texto} name={tom.icone} size={14} />
          <Text style={[styles.etiquetaTexto, { color: tom.texto }]}>{status.rotulo}</Text>
        </View>
      </View>
      <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  avisoTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
  vazioTitulo: { color: cores.texto, fontSize: 18, fontWeight: "800" },
  botao: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: raios.medio, backgroundColor: cores.acao },
  botaoTexto: { color: cores.superficie, fontSize: 14, fontWeight: "800" },
  lista: { padding: 16, gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" },
  listaVazia: { flexGrow: 1 },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    backgroundColor: cores.superficie,
  },
  cartaoPressionado: { backgroundColor: cores.superficieSuave },
  cartaoTextos: { flex: 1, minWidth: 0, gap: 4 },
  titulo: { color: cores.texto, fontSize: 15, fontWeight: "700" },
  valor: { color: cores.texto, fontSize: 18, fontWeight: "800" },
  detalhe: { color: cores.textoSecundario, fontSize: 12.5, fontWeight: "600" },
  etiqueta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: raios.pill,
  },
  etiquetaTexto: { fontSize: 12, fontWeight: "800" },
});
