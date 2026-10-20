import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ehIdentificadorValido, obterIniciais } from "@/features/usuarios/perfil";

type CabecalhoTopoProps = {
  titulo: string;
  mostrarVoltar?: boolean;
  aoVoltar?: () => void;
  usuarioId?: string;
  nomeUsuario?: string;
  children?: ReactNode;
};

export function CabecalhoTopo({
  titulo,
  mostrarVoltar = false,
  aoVoltar,
  usuarioId,
  nomeUsuario,
  children,
}: CabecalhoTopoProps) {
  const idValido = typeof usuarioId === "string" && ehIdentificadorValido(usuarioId);

  return (
    <View style={styles.container}>
      <View style={styles.circuloDecorativo} />

      <View style={styles.linha}>
        {mostrarVoltar ? (
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={6}
            onPress={aoVoltar}
            style={({ pressed }) => [styles.botaoIcone, pressed ? styles.botaoIconePressionado : null]}
          >
            <Ionicons color="#FFFFFF" name="arrow-back" size={19} />
          </Pressable>
        ) : null}

        <View style={styles.tituloBloco}>
          <View style={styles.logo}>
            <Ionicons color="#6FA8E8" name="git-network-outline" size={17} />
          </View>
          <Text numberOfLines={1} style={styles.titulo}>
            {titulo}
          </Text>
        </View>

        <View accessibilityElementsHidden style={styles.botaoIcone} importantForAccessibility="no-hide-descendants">
          <Ionicons color="#DCE6F2" name="notifications-outline" size={18} />
          <View style={styles.pontoNotificacao} />
        </View>

        {idValido ? (
          <Link asChild href={{ pathname: "/usuarios/[id]", params: { id: usuarioId } }}>
            <Pressable
              accessibilityLabel="Ver meu perfil"
              accessibilityRole="button"
              style={({ pressed }) => [styles.avatar, pressed ? styles.avatarPressionado : null]}
            >
              <Text style={styles.avatarTexto}>{obterIniciais(nomeUsuario ?? "?")}</Text>
            </Pressable>
          </Link>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{obterIniciais(nomeUsuario ?? "?")}</Text>
          </View>
        )}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden", backgroundColor: "#0C1E36" },
  circuloDecorativo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    right: -90,
    top: -80,
  },
  linha: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  tituloBloco: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9 },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(111,168,232,0.16)",
  },
  titulo: { flexShrink: 1, color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
  botaoIcone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoIconePressionado: { backgroundColor: "rgba(255,255,255,0.14)" },
  pontoNotificacao: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4E9BE8",
    borderWidth: 1.5,
    borderColor: "#0C1E36",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#2F7FD4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPressionado: { backgroundColor: "#1B5FA8" },
  avatarTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
