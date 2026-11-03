import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { cores, raios } from "@/theme/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Este endereço não existe.</Text>
        <Text style={styles.subtitle}>Confira o link ou volte para o início do ObraCircular.</Text>
        <Link accessibilityLabel="Voltar para a tela inicial" href="/" style={styles.link}>
          Voltar ao início
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: cores.fundo },
  code: { color: cores.acao, fontSize: 54, fontWeight: "800" },
  title: { marginTop: 8, color: cores.texto, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 8, color: cores.textoSecundario, fontSize: 15, lineHeight: 22, textAlign: "center" },
  link: {
    marginTop: 24,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: raios.medio,
    color: cores.superficie,
    backgroundColor: cores.acao,
    fontWeight: "800",
  },
});
