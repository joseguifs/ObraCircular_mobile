import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LinhaInformacao } from "@/components/LinhaInformacao";
import { formatarQuantidade } from "@/features/anuncios/materiais";
import type { UnidadeMaterial } from "@/features/anuncios/materiais";
import {
  descreverStatusPedido,
  formatarTempoRestante,
  lerParametro,
  pedidoEmAndamento,
  uriImagemQrCode,
} from "@/features/pagamentos/pagamento";
import { coresStatusPedido } from "@/features/pagamentos/coresStatus";
import { formatarPreco } from "@/features/usuarios/perfil";
import { CobrancaPix, obterPedido, Pedido, sincronizarPedido } from "@/services/pedidos";
import { cores, raios } from "@/theme/tokens";

// Enquanto o Pix não é confirmado, consulta o backend periodicamente.
const INTERVALO_CONSULTA_MS = 5000;
// A cada N consultas, pergunta direto ao Mercado Pago (caso o webhook atrase ou não esteja configurado).
const CONSULTAS_POR_SINCRONIZACAO = 4;

function formatarHorario(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function PedidoScreen() {
  const params = useLocalSearchParams<{ id: string; usuarioId?: string; nome?: string }>();
  const router = useRouter();
  const pedidoId = lerParametro(params.id) ?? "";
  const usuarioId = lerParametro(params.usuarioId) ?? "";
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const consultas = useRef(0);

  const atualizar = useCallback(
    async (consultarMercadoPago: boolean) => {
      if (!pedidoId || !usuarioId) {
        setErro("Pedido inválido. Volte ao anúncio e tente novamente.");
        return;
      }
      setAtualizando(true);
      try {
        const resposta = consultarMercadoPago
          ? await sincronizarPedido(pedidoId, usuarioId)
          : await obterPedido(pedidoId, usuarioId);
        setPedido(resposta);
        setErro(null);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível consultar o pedido.");
      } finally {
        setAtualizando(false);
      }
    },
    [pedidoId, usuarioId],
  );

  useEffect(() => {
    atualizar(false);
  }, [atualizar]);

  const emAndamento = pedido ? pedidoEmAndamento(pedido.status) : false;
  useEffect(() => {
    if (!emAndamento) return;
    consultas.current = 0;
    const intervalo = setInterval(() => {
      consultas.current += 1;
      atualizar(consultas.current % CONSULTAS_POR_SINCRONIZACAO === 0);
    }, INTERVALO_CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [emAndamento, atualizar]);

  if (!pedido) {
    return (
      <View style={styles.centro}>
        {erro ? (
          <>
            <Ionicons color={cores.erro} name="cloud-offline-outline" size={34} />
            <Text accessibilityLiveRegion="polite" style={styles.avisoTexto}>{erro}</Text>
            <Pressable accessibilityRole="button" onPress={() => atualizar(false)} style={styles.botaoPrimario}>
              <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={cores.acao} size="large" />
            <Text style={styles.avisoTexto}>Carregando pagamento…</Text>
          </>
        )}
      </View>
    );
  }

  const status = descreverStatusPedido(pedido.status);
  const tom = coresStatusPedido[status.tom];
  const pagoEm = pedido.pago_em ? formatarHorario(pedido.pago_em) : null;

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <View accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: tom.fundo }]}>
        <Ionicons color={tom.texto} name={tom.icone} size={40} />
        <Text accessibilityRole="header" style={[styles.statusTitulo, { color: tom.texto }]}>{status.rotulo}</Text>
        <Text style={styles.statusDescricao}>{status.descricao}</Text>
      </View>

      {emAndamento && pedido.pix ? (
        <PainelPix pix={pedido.pix} valor={pedido.valor_total} aoVencer={() => atualizar(true)} />
      ) : null}

      <View style={styles.cartao}>
        <Text style={styles.titulo}>{pedido.titulo}</Text>
        <Text style={styles.valor}>{formatarPreco(pedido.valor_total)}</Text>
        <View style={styles.linhas}>
          <LinhaInformacao
            icone="cube-outline"
            rotulo="Quantidade"
            valor={formatarQuantidade(pedido.quantidade, pedido.unidade as UnidadeMaterial)}
          />
          <LinhaInformacao icone="qr-code-outline" rotulo="Forma de pagamento" valor="Pix" />
          {pagoEm ? <LinhaInformacao icone="checkmark-done-outline" rotulo="Pago em" valor={pagoEm} /> : null}
          <LinhaInformacao icone="receipt-outline" rotulo="Código do pedido" valor={pedido.id} />
        </View>
      </View>

      {erro ? <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: atualizando }}
        disabled={atualizando}
        onPress={() => atualizar(true)}
        style={({ pressed }) => [styles.botaoSecundario, pressed ? styles.botaoSecundarioPressionado : null]}
      >
        {atualizando ? <ActivityIndicator color={cores.acao} /> : <Ionicons color={cores.acao} name="refresh" size={18} />}
        <Text style={styles.botaoSecundarioTexto}>{emAndamento ? "Já paguei, atualizar" : "Atualizar"}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        onPress={() =>
          router.replace({
            pathname: "/anuncios/[id]",
            params: { id: pedido.anuncio_id, usuarioId, nome: lerParametro(params.nome) ?? "" },
          })
        }
        style={styles.link}
      >
        <Text style={styles.linkTexto}>Voltar ao anúncio</Text>
      </Pressable>
    </ScrollView>
  );
}

function PainelPix({ pix, valor, aoVencer }: { pix: CobrancaPix; valor: string; aoVencer: () => void }) {
  const [agora, setAgora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState<string | null>(null);
  const vencidoRef = useRef(false);
  const restante = formatarTempoRestante(pix.expira_em, agora);
  const imagem = uriImagemQrCode(pix.qr_code_base64);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    // Ao vencer, consulta o backend uma vez para mostrar a reserva expirada.
    if (restante === null && !vencidoRef.current) {
      vencidoRef.current = true;
      aoVencer();
    }
  }, [restante, aoVencer]);

  useEffect(() => {
    if (!copiado) return;
    const tempo = setTimeout(() => setCopiado(false), 3000);
    return () => clearTimeout(tempo);
  }, [copiado]);

  async function copiar() {
    try {
      await Clipboard.setStringAsync(pix.qr_code);
      setErroCopia(null);
      setCopiado(true);
    } catch {
      setErroCopia("Não foi possível copiar. Selecione o código abaixo e copie manualmente.");
    }
  }

  return (
    <View style={styles.pix}>
      <Text accessibilityRole="header" style={styles.pixTitulo}>Pague {formatarPreco(valor)} com Pix</Text>
      <Text style={styles.pixTexto}>
        Escaneie o QR code ou copie o código e cole na área Pix do app do seu banco.
      </Text>

      {imagem ? (
        <Image
          accessibilityLabel="QR code do Pix"
          contentFit="contain"
          source={{ uri: imagem }}
          style={styles.qrCode}
        />
      ) : null}

      <View style={[styles.tempo, restante === null ? styles.tempoVencido : null]}>
        <Ionicons color={restante ? "#8A5A00" : cores.erro} name="hourglass-outline" size={16} />
        <Text style={[styles.tempoTexto, restante === null ? styles.tempoTextoVencido : null]}>
          {restante ? `Expira em ${restante}` : "Pix expirado"}
        </Text>
      </View>

      <Pressable
        accessibilityHint="Copia o código Pix copia e cola para a área de transferência."
        accessibilityRole="button"
        disabled={restante === null}
        onPress={copiar}
        style={({ pressed }) => [
          styles.botaoPix,
          pressed ? styles.botaoPixPressionado : null,
          restante === null ? styles.desabilitado : null,
        ]}
      >
        <Ionicons color={cores.superficie} name={copiado ? "checkmark" : "copy-outline"} size={20} />
        <Text style={styles.botaoPrimarioTexto}>{copiado ? "Código copiado!" : "Copiar código Pix"}</Text>
      </Pressable>
      {erroCopia ? <Text accessibilityRole="alert" style={styles.erro}>{erroCopia}</Text> : null}

      <Text numberOfLines={3} selectable style={styles.codigo}>{pix.qr_code}</Text>

      {pix.ticket_url ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(pix.ticket_url as string)} style={styles.link}>
          <Text style={styles.linkTexto}>Abrir Pix no Mercado Pago</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  avisoTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
  conteudo: { padding: 18, gap: 14, width: "100%", maxWidth: 560, alignSelf: "center" },
  status: { alignItems: "center", gap: 8, padding: 22, borderRadius: raios.grande },
  statusTitulo: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  statusDescricao: { color: "#3F4E5F", fontSize: 14, lineHeight: 21, textAlign: "center" },
  pix: {
    alignItems: "stretch",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    backgroundColor: cores.superficie,
  },
  pixTitulo: { color: cores.texto, fontSize: 17, fontWeight: "800", textAlign: "center" },
  pixTexto: { color: cores.textoSecundario, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  qrCode: { width: 220, height: 220, alignSelf: "center" },
  tempo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: raios.pill,
    backgroundColor: "#FFF7E6",
  },
  tempoVencido: { backgroundColor: cores.erroFundo },
  tempoTexto: { color: "#8A5A00", fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  tempoTextoVencido: { color: cores.erro },
  codigo: {
    padding: 10,
    borderRadius: raios.pequeno,
    backgroundColor: cores.superficieSuave,
    borderWidth: 1,
    borderColor: cores.borda,
    color: cores.textoSecundario,
    fontSize: 12,
    lineHeight: 17,
  },
  cartao: { padding: 16, borderWidth: 1, borderColor: cores.borda, borderRadius: raios.grande, backgroundColor: cores.superficie },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: "700" },
  valor: { marginTop: 4, color: cores.texto, fontSize: 24, fontWeight: "800" },
  linhas: { gap: 12, marginTop: 14 },
  erro: { color: cores.erro, fontSize: 13, lineHeight: 19 },
  botaoPrimario: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: raios.medio, backgroundColor: cores.acao },
  botaoPrimarioTexto: { color: cores.superficie, fontSize: 14, fontWeight: "800" },
  botaoPix: {
    minHeight: 52,
    borderRadius: raios.grande,
    backgroundColor: cores.destaque,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  botaoPixPressionado: { backgroundColor: cores.sucesso },
  desabilitado: { opacity: 0.5 },
  botaoSecundario: {
    minHeight: 48,
    borderRadius: raios.grande,
    borderWidth: 1,
    borderColor: cores.acao,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoSecundarioPressionado: { backgroundColor: cores.superficieSuave },
  botaoSecundarioTexto: { color: cores.acao, fontSize: 14, fontWeight: "800" },
  link: { alignItems: "center", padding: 8 },
  linkTexto: { color: cores.acao, fontSize: 14, fontWeight: "700" },
});
