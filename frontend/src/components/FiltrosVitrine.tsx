import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { FiltrosVitrine as Filtros, OrdenacaoVitrine } from "@/features/anuncios/vitrine";
import { cores, raios } from "@/theme/tokens";

const ORDENACOES: { valor: OrdenacaoVitrine; rotulo: string }[] = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
];

type Props = {
  filtros: Filtros;
  erroPreco: string | null;
  onChange: (alteracoes: Partial<Filtros>) => void;
};

export function FiltrosVitrine({ filtros, erroPreco, onChange }: Props) {
  return (
    <View style={styles.painel}>
      <View style={styles.linha}>
        {(["precoMinimo", "precoMaximo"] as const).map((campo) => {
          const rotulo = campo === "precoMinimo" ? "Preço mínimo (R$)" : "Preço máximo (R$)";
          return (
            <View key={campo} style={styles.campo}>
              <Text style={styles.rotulo}>{rotulo}</Text>
              <TextInput
                accessibilityLabel={rotulo}
                accessibilityHint="Opcional. Use vírgula para os centavos."
                accessibilityState={{ disabled: filtros.somenteDoacoes }}
                editable={!filtros.somenteDoacoes}
                keyboardType="decimal-pad"
                maxLength={20}
                onChangeText={(valor) => onChange({ [campo]: valor })}
                placeholder={campo === "precoMinimo" ? "Ex.: 10,00" : "Sem limite"}
                placeholderTextColor={cores.textoSuave}
                style={[styles.input, erroPreco ? styles.inputErro : null, filtros.somenteDoacoes ? styles.desabilitado : null]}
                value={filtros[campo]}
              />
            </View>
          );
        })}
      </View>
      {erroPreco ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.erro}>{erroPreco}</Text> : null}
      <View style={styles.doacoes}>
        <Text style={styles.rotulo}>Somente doações</Text>
        <Switch
          accessibilityLabel="Somente doações"
          onValueChange={(somenteDoacoes) => onChange({ somenteDoacoes })}
          trackColor={{ true: cores.acao }}
          value={filtros.somenteDoacoes}
        />
      </View>
      <Text style={styles.rotulo}>Ordenar por</Text>
      <View style={styles.ordenacoes}>
        {ORDENACOES.map(({ valor, rotulo }) => (
          <Pressable
            accessibilityLabel={`Ordenar por ${rotulo.toLocaleLowerCase("pt-BR")}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: filtros.ordenacao === valor }}
            key={valor}
            onPress={() => onChange({ ordenacao: valor })}
            style={[styles.opcao, filtros.ordenacao === valor ? styles.opcaoAtiva : null]}
          >
            <Text style={[styles.opcaoTexto, filtros.ordenacao === valor ? styles.textoAtivo : null]}>{rotulo}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  painel: { marginHorizontal: 18, marginTop: 16, gap: 8 },
  linha: { flexDirection: "row", gap: 12 },
  campo: { flex: 1, minWidth: 0, gap: 6 },
  rotulo: { color: cores.texto, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 44, borderWidth: 1, borderColor: cores.borda, borderRadius: raios.pequeno, paddingHorizontal: 12, backgroundColor: cores.superficie, color: cores.texto, fontSize: 14 },
  inputErro: { borderColor: cores.erro },
  desabilitado: { opacity: 0.45 },
  erro: { color: cores.erro, fontSize: 12, lineHeight: 18 },
  doacoes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  ordenacoes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opcao: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: raios.pequeno, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie },
  opcaoAtiva: { borderColor: cores.acao, backgroundColor: cores.acao },
  opcaoTexto: { color: cores.textoSecundario, fontSize: 12, fontWeight: "700" },
  textoAtivo: { color: cores.superficie },
});
