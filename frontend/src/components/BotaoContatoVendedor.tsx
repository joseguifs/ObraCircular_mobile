import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { obterContatoVendedor } from "@/features/anuncios/contato";
import { Anuncio } from "@/services/anuncios";
import { Usuario } from "@/services/usuarios";
import { cores, raios } from "@/theme/tokens";

type Props = { anuncio: Anuncio; vendedor: Usuario };

export function BotaoContatoVendedor({ anuncio, vendedor }: Props) {
  const { url, indisponibilidade } = obterContatoVendedor(anuncio, vendedor);
  const abrindoRef = useRef(false);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const desabilitado = !url || abrindo;

  async function conversar() {
    if (!url || abrindoRef.current) return;
    abrindoRef.current = true;
    setAbrindo(true);
    setErro(null);
    try {
      await Linking.openURL(url);
    } catch {
      setErro("Não foi possível abrir o WhatsApp. Tente novamente ou consulte o contato no perfil do vendedor.");
    } finally {
      abrindoRef.current = false;
      setAbrindo(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Conversar com o vendedor pelo WhatsApp"
        accessibilityHint={indisponibilidade ?? "Abre o WhatsApp com uma mensagem sobre este anúncio. Você pode editá-la antes de enviar."}
        accessibilityRole="button"
        accessibilityState={{ disabled: desabilitado, busy: abrindo }}
        disabled={desabilitado}
        onPress={conversar}
        style={({ pressed }) => [styles.botao, pressed ? styles.pressionado : null, desabilitado ? styles.desabilitado : null]}
      >
        {abrindo ? <ActivityIndicator color={cores.superficie} /> : <Ionicons color={cores.superficie} name="logo-whatsapp" size={20} />}
        <Text style={styles.texto}>{abrindo ? "Abrindo WhatsApp…" : "Conversar pelo WhatsApp"}</Text>
      </Pressable>
      {indisponibilidade ? <Text style={styles.aviso}>{indisponibilidade}</Text> : null}
      {erro ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.aviso, styles.erro]}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  botao: { minHeight: 52, padding: 12, borderRadius: raios.grande, backgroundColor: "#0C1E36", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  pressionado: { backgroundColor: cores.acaoPressionada },
  desabilitado: { opacity: 0.5 },
  texto: { flexShrink: 1, color: cores.superficie, fontSize: 14, fontWeight: "800", textAlign: "center" },
  aviso: { color: cores.textoSecundario, fontSize: 12, lineHeight: 18 },
  erro: { color: cores.erro },
});
