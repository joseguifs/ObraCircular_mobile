import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { cores, raios } from "@/theme/tokens";

type Icone = keyof typeof Ionicons.glyphMap;

export function CartaoAdmin({ children, apagado = false }: { children: ReactNode; apagado?: boolean }) {
  return <View style={[styles.cartao, apagado ? styles.cartaoApagado : null]}>{children}</View>;
}

type BotaoAcaoProps = {
  rotulo: string;
  onPress: () => void;
  icone?: Icone;
  perigo?: boolean;
  principal?: boolean;
  desabilitado?: boolean;
};

export function BotaoAcao({ rotulo, onPress, icone, perigo, principal, desabilitado }: BotaoAcaoProps) {
  const corTexto = principal ? cores.superficie : perigo ? cores.erro : cores.acao;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        perigo ? styles.botaoPerigo : null,
        principal ? styles.botaoPrincipal : null,
        pressed ? styles.pressionado : null,
        desabilitado ? styles.desabilitado : null,
      ]}
    >
      {icone ? <Ionicons color={corTexto} name={icone} size={16} /> : null}
      <Text style={[styles.botaoTexto, { color: corTexto }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function CampoBusca({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.busca}>
      <Ionicons color={cores.textoSuave} name="search-outline" size={19} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={cores.textoSuave}
        returnKeyType="search"
        style={styles.buscaInput}
        value={valor}
      />
      {valor ? (
        <Pressable accessibilityLabel="Limpar busca" hitSlop={10} onPress={() => onChange("")}>
          <Ionicons color={cores.textoSuave} name="close-circle" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

type Opcao<T extends string> = { valor: T | null; rotulo: string };

export function FiltroOpcoes<T extends string>({
  opcoes,
  selecionado,
  onChange,
}: {
  opcoes: Opcao<T>[];
  selecionado: T | null;
  onChange: (valor: T | null) => void;
}) {
  return (
    <View style={styles.filtros}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            key={opcao.rotulo}
            onPress={() => onChange(opcao.valor)}
            style={[styles.filtro, ativo ? styles.filtroAtivo : null]}
          >
            <Text style={[styles.filtroTexto, ativo ? styles.filtroTextoAtivo : null]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Alternador({ rotulo, ativo, onChange }: { rotulo: string; ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ativo }}
      onPress={() => onChange(!ativo)}
      style={styles.alternador}
    >
      <Ionicons color={ativo ? cores.acao : cores.textoSuave} name={ativo ? "checkbox" : "square-outline"} size={20} />
      <Text style={styles.alternadorTexto}>{rotulo}</Text>
    </Pressable>
  );
}

type EstadoTelaProps = {
  icone: Icone;
  titulo: string;
  texto?: string;
  erro?: boolean;
  acao?: { rotulo: string; onPress: () => void };
};

export function EstadoTela({ icone, titulo, texto, erro, acao }: EstadoTelaProps) {
  return (
    <View style={styles.estado}>
      <View style={[styles.estadoIcone, erro ? styles.estadoIconeErro : null]}>
        <Ionicons color={erro ? cores.erro : cores.acao} name={icone} size={30} />
      </View>
      <Text style={styles.estadoTitulo}>{titulo}</Text>
      {texto ? <Text style={styles.estadoTexto}>{texto}</Text> : null}
      {acao ? <BotaoAcao onPress={acao.onPress} principal rotulo={acao.rotulo} /> : null}
    </View>
  );
}

export function Carregando() {
  return (
    <View style={styles.estado}>
      <ActivityIndicator color={cores.acao} size="large" />
    </View>
  );
}

export function MensagemErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.mensagemErro}>
      <Ionicons color={cores.erro} name="alert-circle-outline" size={19} />
      <Text style={styles.mensagemErroTexto}>{mensagem}</Text>
    </View>
  );
}

export const estilosAdmin = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.fundo },
  lista: { width: "100%", maxWidth: 820, alignSelf: "center", padding: 16, paddingBottom: 40, gap: 12 },
  cabecalhoLista: { gap: 12, marginBottom: 4 },
  linhaTopo: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titulo: { flex: 1, color: cores.texto, fontSize: 17, lineHeight: 22, fontWeight: "800" },
  subtitulo: { color: cores.textoSecundario, fontSize: 14, lineHeight: 19 },
  detalhe: { color: cores.textoSuave, fontSize: 13, lineHeight: 18 },
  acoes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  contagem: { color: cores.textoSecundario, fontSize: 13, fontWeight: "700" },
});

const styles = StyleSheet.create({
  cartao: {
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    gap: 8,
    backgroundColor: cores.superficie,
  },
  cartaoApagado: { backgroundColor: cores.superficieSuave, borderStyle: "dashed" },
  botao: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#C9DDF3",
    borderRadius: raios.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F2F8FE",
  },
  botaoPerigo: { borderColor: "#F0CACA", backgroundColor: cores.erroFundo },
  botaoPrincipal: { borderColor: cores.acao, backgroundColor: cores.acao },
  botaoTexto: { fontSize: 14, fontWeight: "700" },
  pressionado: { opacity: 0.7 },
  desabilitado: { opacity: 0.5 },
  busca: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: cores.superficie,
  },
  buscaInput: { flex: 1, paddingVertical: 12, color: cores.texto, fontSize: 16 },
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.pill,
    backgroundColor: cores.superficie,
  },
  filtroAtivo: { borderColor: cores.acao, backgroundColor: cores.acao },
  filtroTexto: { color: cores.textoSecundario, fontSize: 14, fontWeight: "700" },
  filtroTextoAtivo: { color: cores.superficie },
  alternador: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 4 },
  alternadorTexto: { color: cores.textoSecundario, fontSize: 14 },
  estado: { paddingVertical: 48, paddingHorizontal: 24, alignItems: "center", gap: 12 },
  estadoIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FC",
  },
  estadoIconeErro: { backgroundColor: cores.erroFundo },
  estadoTitulo: { color: cores.texto, fontSize: 19, fontWeight: "800", textAlign: "center" },
  estadoTexto: { maxWidth: 380, color: cores.textoSecundario, fontSize: 15, lineHeight: 21, textAlign: "center" },
  mensagemErro: {
    padding: 12,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: cores.erroFundo,
  },
  mensagemErroTexto: { flex: 1, color: cores.erro, fontSize: 14, lineHeight: 19 },
});
