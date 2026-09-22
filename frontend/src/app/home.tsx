import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ehIdentificadorValido } from "@/features/usuarios/perfil";
import { obterUsuario } from "@/services/usuarios";

export default function HomeScreen() {
  const { nome, usuarioId } = useLocalSearchParams<{ nome?: string; usuarioId?: string }>();
  const [nomeAtualizado, setNomeAtualizado] = useState<string | null>(null);
  const idValido = typeof usuarioId === "string" && ehIdentificadorValido(usuarioId);
  const nomeExibido = nomeAtualizado ?? nome;
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    if (!idValido) return;
    let ativo = true;
    obterUsuario(usuarioId)
      .then((usuario) => { if (ativo) setNomeAtualizado(usuario.nome); })
      .catch(() => { /* A saudação inicial continua disponível quando a API está fora do ar. */ });
    return () => { ativo = false; };
  }, [idValido, usuarioId]));

  function sair() {
    router.replace("/login");
  }

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>C</Text>
        </View>
        <Text style={styles.title}>
          {nomeExibido ? `Bem-vindo(a), ${nomeExibido}!` : "Bem-vindo(a)!"}
        </Text>
        <Text style={styles.subtitle}>Você entrou na ObraCircular.</Text>

        {idValido ? (
          <Link href={{ pathname: "/usuarios/[id]", params: { id: usuarioId } }} asChild>
            <Pressable accessibilityRole="link" style={styles.profileLink}>
              <Ionicons color="#176FD0" name="person-outline" size={19} />
              <Text style={styles.logoutButtonText}>Meu perfil</Text>
            </Pressable>
          </Link>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={sair}
          style={({ pressed }) => [styles.logoutButton, pressed ? styles.logoutButtonPressed : null]}
        >
          <Ionicons color="#176FD0" name="log-out-outline" size={19} />
          <Text style={styles.logoutButtonText}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1E2E",
    marginBottom: 12,
  },
  logoLetter: { color: "#2382DC", fontSize: 38, lineHeight: 43, fontWeight: "500" },
  title: { color: "#071E2F", fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#718078", fontSize: 16, textAlign: "center" },
  profileLink: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  logoutButton: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DEDA",
  },
  logoutButtonPressed: { backgroundColor: "#F7FBF8" },
  logoutButtonText: { color: "#176FD0", fontSize: 16, fontWeight: "700" },
});
