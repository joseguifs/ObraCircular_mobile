import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { obterDisponibilidadeCompra } from "@/features/pagamentos/pagamento";
import { formatarPreco } from "@/features/usuarios/perfil";
import { Anuncio } from "@/services/anuncios";
import { iniciarCheckoutPix } from "@/services/pedidos";
import { cores, raios } from "@/theme/tokens";

type Props = { anuncio: Anuncio; usuarioId?: string; nome?: string };

export function BotaoComprarPix({ anuncio, usuarioId, nome }: Props) {
  const router = useRouter();
  const disponibilidade = obterDisponibilidadeCompra(anuncio, usuarioId);
  const processandoRef = useRef(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!disponibilidade.disponivel && disponibilidade.motivo === "Este anúncio é seu.") return null;
  const desabilitado = !disponibilidade.disponivel || processando;

  async function comprar() {
    if (!disponibilidade.disponivel || !usuarioId || processandoRef.current) return;
    processandoRef.current = true;
    setProcessando(true);
    setErro(null);
    try {
      const pedido = await iniciarCheckoutPix({ anuncio_id: anuncio.id, comprador_id: usuarioId });
      router.push({ pathname: "/pedidos/[id]", params: { id: pedido.id, usuarioId, nome: nome ?? "" } });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível iniciar o pagamento com Pix.");
    } finally {
      processandoRef.current = false;
      setProcessando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`Comprar com Pix por ${formatarPreco(anuncio.preco)}`}
        accessibilityHint={disponibilidade.motivo ?? "Gera um QR code Pix para pagar no app do seu banco."}
        accessibilityRole="button"
        accessibilityState={{ disabled: desabilitado, busy: processando }}
        disabled={desabilitado}
        onPress={comprar}
        style={({ pressed }) => [styles.botao, pressed ? styles.pressionado : null, desabilitado ? styles.desabilitado : null]}
      >
        {processando ? (
          <ActivityIndicator color={cores.superficie} />
        ) : (
          <Ionicons color={cores.superficie} name="qr-code-outline" size={20} />
        )}
        <Text style={styles.texto}>
          {processando ? "Gerando Pix…" : `Comprar com Pix · ${formatarPreco(anuncio.preco)}`}
        </Text>
      </Pressable>
      {disponibilidade.motivo ? <Text style={styles.aviso}>{disponibilidade.motivo}</Text> : null}
      {erro ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.aviso, styles.erro]}>
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  botao: {
    minHeight: 52,
    padding: 12,
    borderRadius: raios.grande,
    backgroundColor: cores.destaque,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  pressionado: { backgroundColor: cores.sucesso },
  desabilitado: { opacity: 0.5 },
  texto: { flexShrink: 1, color: cores.superficie, fontSize: 14, fontWeight: "800", textAlign: "center" },
  aviso: { color: cores.textoSecundario, fontSize: 12, lineHeight: 18 },
  erro: { color: cores.erro },
});
