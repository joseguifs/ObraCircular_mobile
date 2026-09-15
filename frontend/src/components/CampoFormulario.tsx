import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { cores, raios } from "@/theme/tokens";

type CampoFormularioProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export function CampoFormulario({
  label,
  icon,
  error,
  optional = false,
  children,
}: CampoFormularioProps) {
  return (
    <View style={styles.grupo}>
      <Text style={styles.label}>
        {label} {optional ? <Text style={styles.opcional}>(opcional)</Text> : null}
      </Text>
      <View style={[styles.container, error ? styles.containerErro : null]}>
        <Ionicons color={error ? cores.erro : cores.textoSuave} name={icon} size={21} />
        {children}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.erro}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { marginBottom: 20 },
  label: { marginBottom: 8, color: cores.texto, fontSize: 16, lineHeight: 20, fontWeight: "700" },
  opcional: { color: cores.textoSuave, fontWeight: "400" },
  container: {
    minHeight: 62,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: cores.superficieSuave,
  },
  containerErro: { borderColor: cores.erro, backgroundColor: cores.erroFundo },
  erro: { marginTop: 6, color: cores.erro, fontSize: 12, lineHeight: 16 },
});
