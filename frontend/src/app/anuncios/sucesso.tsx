import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Marca } from "@/components/Marca";
import { cores, raios } from "@/theme/tokens";

export default function AnuncioValidadoScreen() {
  const { titulo } = useLocalSearchParams<{ titulo?: string }>();
  const tituloSeguro = typeof titulo === "string" && titulo.trim() ? titulo : "Seu anúncio";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Marca />
        <View style={styles.card}>
          <View style={styles.successIcon}>
            <Ionicons color={cores.sucesso} name="checkmark-circle" size={72} />
          </View>
          <Text style={styles.eyebrow}>FORMULÁRIO VALIDADO</Text>
          <Text style={styles.title}>Tudo certo com o cadastro!</Text>
          <Text style={styles.subtitle}>
            “{tituloSeguro}” passou pelas validações do frontend. A publicação na API será ativada junto da autenticação.
          </Text>

          <Link href="/anuncios/novo" asChild>
            <Text accessibilityRole="link" style={styles.primaryLink}>
              Cadastrar outro anúncio
            </Text>
          </Link>
          <Link href="/" asChild>
            <Text accessibilityRole="link" style={styles.secondaryLink}>
              Voltar ao início
            </Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.fundo },
  content: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", justifyContent: "center", padding: 24 },
  card: {
    marginTop: 30,
    padding: 30,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: cores.superficie,
  },
  successIcon: {
    width: 104,
    height: 104,
    marginBottom: 20,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.sucessoFundo,
  },
  eyebrow: { color: cores.sucesso, fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  title: { marginTop: 8, color: cores.texto, fontSize: 27, lineHeight: 34, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 10, marginBottom: 26, color: cores.textoSecundario, fontSize: 15, lineHeight: 23, textAlign: "center" },
  primaryLink: {
    width: "100%",
    overflow: "hidden",
    paddingVertical: 17,
    borderRadius: raios.grande,
    color: cores.superficie,
    backgroundColor: cores.acao,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryLink: { marginTop: 18, padding: 8, color: cores.acao, fontSize: 15, fontWeight: "700" },
});
