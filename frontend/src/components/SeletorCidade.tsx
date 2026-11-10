import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CidadeVitrine } from "@/features/anuncios/vitrine";
import { cores, raios } from "@/theme/tokens";

type Props = {
  cidades: CidadeVitrine[];
  cidade: string | null;
  onChange: (cidade: string | null) => void;
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function SeletorCidade({ cidades, cidade, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const rotulo = cidades.find((item) => item.valor === cidade)?.rotulo ?? (cidade ?? "Todas as cidades");

  function fechar() {
    setAberto(false);
    setBusca("");
  }

  function selecionar(valor: string | null) {
    onChange(valor);
    fechar();
  }

  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>Cidade dos materiais</Text>
      <Pressable accessibilityLabel={`Selecionar cidade: ${rotulo}`} accessibilityRole="button" accessibilityState={{ expanded: aberto }} onPress={() => setAberto(true)} style={styles.seletor}>
        <Ionicons color={cores.acao} name="location-outline" size={20} />
        <Text style={styles.valor}>{rotulo}</Text>
        <Ionicons color={cores.textoSecundario} name="chevron-down" size={18} />
      </Pressable>
      <Modal animationType="slide" onRequestClose={fechar} transparent visible={aberto}>
        <SafeAreaView style={styles.fundo}>
          <View accessibilityViewIsModal style={styles.painel}>
            <View style={styles.cabecalho}>
              <Text accessibilityRole="header" style={styles.titulo}>Selecionar cidade</Text>
              <Pressable accessibilityLabel="Fechar seleção de cidade" accessibilityRole="button" onPress={fechar} style={styles.fechar}>
                <Ionicons color={cores.texto} name="close" size={24} />
              </Pressable>
            </View>
            <TextInput accessibilityLabel="Buscar cidade ou UF" autoCorrect={false} onChangeText={setBusca} placeholder="Buscar cidade ou UF" placeholderTextColor={cores.textoSuave} style={styles.busca} value={busca} />
            <FlatList
              data={cidades.filter((item) => normalizar(item.rotulo).includes(normalizar(busca)))}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.valor}
              ListHeaderComponent={
                <Pressable accessibilityRole="radio" accessibilityState={{ selected: cidade === null }} onPress={() => selecionar(null)} style={styles.opcao}>
                  <Text style={styles.valor}>Todas as cidades</Text>
                  {cidade === null ? <Ionicons color={cores.acao} name="checkmark" size={22} /> : null}
                </Pressable>
              }
              ListEmptyComponent={<Text style={styles.vazio}>{busca.trim() ? "Nenhuma cidade encontrada." : "Ainda não há cidades com anúncios disponíveis."}</Text>}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="radio" accessibilityState={{ selected: cidade === item.valor }} onPress={() => selecionar(item.valor)} style={styles.opcao}>
                  <Text style={styles.valor}>{item.rotulo}</Text>
                  {cidade === item.valor ? <Ionicons color={cores.acao} name="checkmark" size={22} /> : null}
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { color: cores.texto, fontSize: 12, fontWeight: "700" },
  seletor: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 48, borderWidth: 1, borderColor: cores.borda, borderRadius: raios.pequeno, paddingHorizontal: 12, backgroundColor: cores.superficie },
  valor: { flex: 1, color: cores.texto, fontSize: 14 },
  fundo: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.45)" },
  painel: { width: "100%", maxWidth: 480, maxHeight: "85%", flexShrink: 1, backgroundColor: cores.superficie, borderRadius: raios.grande, padding: 16 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  titulo: { flex: 1, color: cores.texto, fontSize: 18, fontWeight: "700" },
  fechar: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  busca: { minHeight: 48, borderWidth: 1, borderColor: cores.borda, borderRadius: raios.pequeno, paddingHorizontal: 12, color: cores.texto, marginBottom: 8 },
  opcao: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 48, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: cores.borda },
  vazio: { padding: 16, color: cores.textoSecundario },
});
