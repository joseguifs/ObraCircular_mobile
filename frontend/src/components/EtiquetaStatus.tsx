import { StyleSheet, Text, View } from "react-native";

import { TomStatus } from "@/features/usuarios/perfil";
import { cores, raios } from "@/theme/tokens";

const paleta: Record<TomStatus, { texto: string; fundo: string }> = {
  sucesso: { texto: cores.sucesso, fundo: cores.sucessoFundo },
  alerta: { texto: "#8A5A00", fundo: "#FFF4DE" },
  erro: { texto: cores.erro, fundo: cores.erroFundo },
  neutro: { texto: "#55635C", fundo: "#EEF2EF" },
};

type EtiquetaStatusProps = {
  rotulo: string;
  tom: TomStatus;
};

export function EtiquetaStatus({ rotulo, tom }: EtiquetaStatusProps) {
  const { texto, fundo } = paleta[tom];

  return (
    <View style={[styles.etiqueta, { backgroundColor: fundo }]}>
      <View style={[styles.ponto, { backgroundColor: texto }]} />
      <Text style={[styles.texto, { color: texto }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: raios.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ponto: { width: 7, height: 7, borderRadius: 4 },
  texto: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
});
