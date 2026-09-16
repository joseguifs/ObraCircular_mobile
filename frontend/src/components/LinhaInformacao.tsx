import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { cores, raios } from "@/theme/tokens";

type LinhaInformacaoProps = {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: string;
  ausente?: boolean;
};

export function LinhaInformacao({ icone, rotulo, valor, ausente = false }: LinhaInformacaoProps) {
  return (
    <View accessibilityLabel={`${rotulo}: ${valor}`} accessible style={styles.linha}>
      <View style={styles.icone}>
        <Ionicons color={cores.acao} name={icone} size={20} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.rotulo}>{rotulo}</Text>
        <Text selectable style={[styles.valor, ausente ? styles.valorAusente : null]}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 14 },
  icone: {
    width: 42,
    height: 42,
    borderRadius: raios.medio,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FC",
  },
  textos: { flex: 1 },
  rotulo: { color: cores.textoSecundario, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  valor: { marginTop: 2, color: cores.texto, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  valorAusente: { color: cores.textoSecundario, fontStyle: "italic", fontWeight: "400" },
});
