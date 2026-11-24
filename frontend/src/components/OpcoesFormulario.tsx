import { Pressable, StyleSheet, Text, View } from "react-native";

import { cores, raios } from "@/theme/tokens";

type Props = {
  rotulo: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  valor: string;
  erro?: string;
  disabled?: boolean;
  onChange: (valor: string) => void;
};

export function OpcoesFormulario({ rotulo, opcoes, valor, erro, disabled = false, onChange }: Props) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View accessibilityLabel={rotulo} accessibilityRole="radiogroup" style={styles.opcoes}>
        {opcoes.map((opcao) => (
          <Pressable
            accessibilityLabel={`${rotulo}: ${opcao.rotulo}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: valor === opcao.valor, disabled }}
            disabled={disabled}
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            style={[styles.opcao, valor === opcao.valor ? styles.selecionada : null]}
          >
            <Text style={[styles.texto, valor === opcao.valor ? styles.textoSelecionado : null]}>{opcao.rotulo}</Text>
          </Pressable>
        ))}
      </View>
      {erro ? <Text accessibilityLiveRegion="polite" style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 8, marginBottom: 20 },
  rotulo: { color: cores.texto, fontSize: 16, fontWeight: "700" },
  opcoes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opcao: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: cores.borda, borderRadius: raios.pequeno, paddingHorizontal: 12, paddingVertical: 10 },
  selecionada: { backgroundColor: cores.acao, borderColor: cores.acao },
  texto: { color: cores.textoSecundario, fontSize: 13, fontWeight: "600" },
  textoSelecionado: { color: cores.superficie },
  erro: { color: cores.erro, fontSize: 12 },
});
