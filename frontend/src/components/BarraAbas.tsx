import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ehIdentificadorValido } from "@/features/usuarios/perfil";
import { cores } from "@/theme/tokens";

const ATIVO = cores.texto;
const INATIVO = cores.textoSuave;

type BarraAbasProps = {
  usuarioId?: string;
};

export function BarraAbas({ usuarioId }: BarraAbasProps) {
  const idValido = typeof usuarioId === "string" && ehIdentificadorValido(usuarioId);

  return (
    <View style={styles.barra}>
      <View style={styles.aba}>
        <Ionicons color={ATIVO} name="search" size={21} />
        <Text style={[styles.rotulo, { color: ATIVO }]}>Explorar</Text>
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.aba}>
        <Ionicons color={INATIVO} name="pricetags-outline" size={21} />
        <Text style={[styles.rotulo, { color: INATIVO }]}>Anúncios</Text>
      </View>

      <Link asChild href="/anuncios/novo">
        <Pressable accessibilityLabel="Anunciar" accessibilityRole="button" style={styles.abaCentral}>
          <View style={styles.botaoAnunciar}>
            <Ionicons color="#FFFFFF" name="add" size={22} />
          </View>
        </Pressable>
      </Link>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.aba}>
        <Ionicons color={INATIVO} name="chatbubble-outline" size={21} />
        <Text style={[styles.rotulo, { color: INATIVO }]}>Mensagens</Text>
      </View>

      {idValido ? (
        <Link asChild href={{ pathname: "/usuarios/[id]", params: { id: usuarioId } }}>
          <Pressable accessibilityLabel="Meu perfil" accessibilityRole="button" style={styles.aba}>
            <Ionicons color={INATIVO} name="person-outline" size={21} />
            <Text style={[styles.rotulo, { color: INATIVO }]}>Perfil</Text>
          </Pressable>
        </Link>
      ) : (
        <View style={styles.aba}>
          <Ionicons color={INATIVO} name="person-outline" size={21} />
          <Text style={[styles.rotulo, { color: INATIVO }]}>Perfil</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingHorizontal: 8,
    backgroundColor: cores.superficie,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  aba: { flex: 1, height: 54, alignItems: "center", justifyContent: "center", gap: 4 },
  rotulo: { fontSize: 10.5, fontWeight: "700" },
  abaCentral: { flex: 1, height: 54, alignItems: "center", justifyContent: "center" },
  botaoAnunciar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.acao,
    shadowColor: cores.acao,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
});
