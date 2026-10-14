import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  descreverSituacaoApi,
  type SituacaoApi,
} from "@/features/status/statusProjeto";
import { consultarStatusProjeto } from "@/services/statusProjeto";

const coresPorTom = {
  neutro: { fundo: "#F1F4F2", icone: "#66766E" },
  sucesso: { fundo: "#EAF7EF", icone: "#287A4B" },
  alerta: { fundo: "#FFF5E5", icone: "#9A6415" },
} as const;

export function StatusProjeto() {
  const [situacao, setSituacao] = useState<SituacaoApi>("verificando");

  const verificar = useCallback(async (signal?: AbortSignal) => {
    setSituacao("verificando");

    try {
      const estaOnline = await consultarStatusProjeto(signal);
      if (!signal?.aborted) setSituacao(estaOnline ? "online" : "offline");
    } catch {
      if (!signal?.aborted) setSituacao("offline");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void verificar(controller.signal);
    return () => controller.abort();
  }, [verificar]);

  const conteudo = descreverSituacaoApi(situacao);
  const cores = coresPorTom[conteudo.tom];
  const verificando = situacao === "verificando";

  return (
    <View
      accessibilityLabel={`Status do projeto: ${conteudo.titulo}. ${conteudo.descricao}`}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.projectStatus}>
          <View style={styles.projectStatusDot} />
          <Text style={styles.projectStatusText}>Projeto ativo</Text>
        </View>
        <Text style={styles.phase}>Em desenvolvimento</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        <View style={[styles.iconBox, { backgroundColor: cores.fundo }]}>
          <Ionicons color={cores.icone} name={conteudo.icone} size={22} />
        </View>
        <View style={styles.serviceText}>
          <Text style={styles.serviceTitle}>{conteudo.titulo}</Text>
          <Text style={styles.serviceDescription}>{conteudo.descricao}</Text>
        </View>
        <Pressable
          accessibilityLabel="Atualizar status da API"
          accessibilityRole="button"
          disabled={verificando}
          hitSlop={8}
          onPress={() => void verificar()}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed ? styles.refreshButtonPressed : null,
            verificando ? styles.refreshButtonDisabled : null,
          ]}
        >
          <Ionicons color="#176FD0" name="refresh" size={21} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    marginTop: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D7DEDA",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  projectStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EAF7EF",
  },
  projectStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#287A4B" },
  projectStatusText: { color: "#287A4B", fontSize: 14, fontWeight: "700" },
  phase: { flexShrink: 1, color: "#718078", fontSize: 13, fontWeight: "600", textAlign: "right" },
  divider: { height: 1, marginVertical: 14, backgroundColor: "#E7ECE9" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  serviceText: { flex: 1, gap: 3 },
  serviceTitle: { color: "#0B2030", fontSize: 15, fontWeight: "700" },
  serviceDescription: { color: "#66766E", fontSize: 13, lineHeight: 18 },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EEF6FD",
  },
  refreshButtonPressed: { backgroundColor: "#DDEDFC" },
  refreshButtonDisabled: { opacity: 0.45 },
});
