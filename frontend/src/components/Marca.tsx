import { StyleSheet, Text, View } from "react-native";

import { cores } from "@/theme/tokens";

export function Marca() {
  return (
    <View accessibilityLabel="ObraCircular" accessible style={styles.container}>
      <View style={styles.simbolo}>
        <Text style={styles.letra}>C</Text>
      </View>
      <Text style={styles.nome}>
        Obra<Text style={styles.destaque}>Circular</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 11 },
  simbolo: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.texto,
  },
  letra: { color: cores.acao, fontSize: 30, lineHeight: 34, fontWeight: "500" },
  nome: { color: cores.texto, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  destaque: { color: cores.acao },
});
