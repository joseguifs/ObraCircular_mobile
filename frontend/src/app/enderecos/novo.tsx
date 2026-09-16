import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CampoFormulario } from "@/components/CampoFormulario";
import { Marca } from "@/components/Marca";
import {
  DadosEndereco,
  ErrosEndereco,
  formatarCep,
  normalizarEndereco,
  validarEndereco,
} from "@/features/anuncios/validacaoEndereco";
import { cadastrarEndereco } from "@/services/enderecos";
import { cores, raios } from "@/theme/tokens";

const enderecoInicial: DadosEndereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};


export default function NovoEnderecoScreen() {
  const { width } = useWindowDimensions();
  const { usuario_id: usuarioId } = useLocalSearchParams<{ usuario_id?: string }>();

  const [dados, setDados] = useState(enderecoInicial);
  const [erros, setErros] = useState<ErrosEndereco>({});
  const [enviando, setEnviando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const idValido = typeof usuarioId === "string" && usuarioId.length > 0;

  function atualizar<K extends keyof DadosEndereco>(campo: K, valor: DadosEndereco[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) {
      setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    }
  }

  async function enviar() {
    Keyboard.dismiss();

    if (typeof usuarioId !== "string" || usuarioId.length === 0) {
      setErroApi("Nenhum usuário informado. Volte e selecione um usuário cadastrado.");
      return;
    }

    const novosErros = validarEndereco(dados);
    setErros(novosErros);
    setErroApi(null);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const endereco = await cadastrarEndereco({
        ...normalizarEndereco(dados),
        usuario_id: usuarioId,
      });
      router.replace({
        pathname: "/usuarios/[id]",
        params: { id: endereco.usuario_id },
      });
    } catch (error) {
      setErroApi(error instanceof Error ? error.message : "Não foi possível cadastrar o endereço.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: Math.min(width - 40, 680) }]}>
            <Marca />

            <View style={styles.headingBlock}>
              <View style={styles.eyebrow}>
                <Ionicons color={cores.destaque} name="location-outline" size={15} />
                <Text style={styles.eyebrowText}>NOVO ENDEREÇO</Text>
              </View>
              <Text style={styles.title}>Cadastre um endereço</Text>
              <Text style={styles.subtitle}>
                Esses dados ficam vinculados ao usuário e podem ser usados como local de retirada.
              </Text>
            </View>

            {!idValido ? (
              <View style={[styles.dependencyCard, styles.dependencyCardError]}>
                <Ionicons color={cores.erro} name="alert-circle-outline" size={22} />
                <Text accessibilityLiveRegion="polite" style={[styles.dependencyText, styles.dependencyTextError]}>
                  Nenhum usuário informado. Abra esta tela a partir do perfil de um usuário já cadastrado.
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.inlineFields}>
                <View style={styles.flexField}>
                  <CampoFormulario error={erros.cep} icon="navigate-outline" label="CEP">
                    <TextInput
                      accessibilityLabel="CEP do endereço"
                      inputMode="numeric"
                      keyboardType="number-pad"
                      maxLength={9}
                      onChangeText={(valor) => atualizar("cep", formatarCep(valor))}
                      placeholder="00000-000"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.cep}
                    />
                  </CampoFormulario>
                </View>
                <View style={styles.smallField}>
                  <CampoFormulario error={erros.estado} icon="map-outline" label="UF">
                    <TextInput
                      accessibilityLabel="Estado do endereço"
                      autoCapitalize="characters"
                      maxLength={2}
                      onChangeText={(valor) => atualizar("estado", valor.replace(/[^A-Za-z]/g, "").toUpperCase())}
                      placeholder="TO"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.estado}
                    />
                  </CampoFormulario>
                </View>
              </View>

              <CampoFormulario error={erros.logradouro} icon="trail-sign-outline" label="Logradouro">
                <TextInput
                  accessibilityLabel="Logradouro do endereço"
                  autoCapitalize="words"
                  maxLength={150}
                  onChangeText={(valor) => atualizar("logradouro", valor)}
                  placeholder="Ex.: Avenida Central"
                  placeholderTextColor={cores.textoSuave}
                  returnKeyType="next"
                  style={styles.input}
                  value={dados.logradouro}
                />
              </CampoFormulario>

              <View style={styles.inlineFields}>
                <View style={styles.smallField}>
                  <CampoFormulario error={erros.numero} icon="home-outline" label="Número">
                    <TextInput
                      accessibilityLabel="Número do endereço"
                      maxLength={20}
                      onChangeText={(valor) => atualizar("numero", valor)}
                      placeholder="10"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.numero}
                    />
                  </CampoFormulario>
                </View>
                <View style={styles.flexField}>
                  <CampoFormulario icon="business-outline" label="Complemento" optional>
                    <TextInput
                      accessibilityLabel="Complemento do endereço"
                      maxLength={100}
                      onChangeText={(valor) => atualizar("complemento", valor)}
                      placeholder="Galpão, lote..."
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.complemento}
                    />
                  </CampoFormulario>
                </View>
              </View>

              <View style={styles.inlineFields}>
                <View style={styles.flexField}>
                  <CampoFormulario error={erros.bairro} icon="location-outline" label="Bairro">
                    <TextInput
                      accessibilityLabel="Bairro do endereço"
                      autoCapitalize="words"
                      maxLength={100}
                      onChangeText={(valor) => atualizar("bairro", valor)}
                      placeholder="Centro"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.bairro}
                    />
                  </CampoFormulario>
                </View>
                <View style={styles.flexField}>
                  <CampoFormulario error={erros.cidade} icon="map-outline" label="Cidade">
                    <TextInput
                      accessibilityLabel="Cidade do endereço"
                      autoCapitalize="words"
                      maxLength={100}
                      onChangeText={(valor) => atualizar("cidade", valor)}
                      onSubmitEditing={enviar}
                      placeholder="Palmas"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="done"
                      style={styles.input}
                      value={dados.cidade}
                    />
                  </CampoFormulario>
                </View>
              </View>
            </View>

            {erroApi ? (
              <View accessibilityLiveRegion="polite" style={styles.apiError}>
                <Ionicons color={cores.erro} name="alert-circle-outline" size={20} />
                <Text style={styles.apiErrorText}>{erroApi}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel="Cadastrar endereço"
              accessibilityRole="button"
              disabled={!idValido || enviando}
              onPress={enviar}
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.submitButtonPressed : null,
                !idValido || enviando ? styles.submitButtonDisabled : null,
              ]}
            >
              {enviando ? (
                <ActivityIndicator color={cores.superficie} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Cadastrar endereço</Text>
                  <Ionicons color={cores.superficie} name="arrow-forward" size={21} />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.fundo },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 28 },
  content: { alignSelf: "center" },
  headingBlock: { marginTop: 28, marginBottom: 26 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  eyebrowText: { color: cores.destaque, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: cores.texto, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -1 },
  subtitle: { marginTop: 8, maxWidth: 560, color: cores.textoSecundario, fontSize: 17, lineHeight: 25 },
  dependencyCard: {
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: cores.superficie,
  },
  dependencyCardError: { borderColor: "#E7B6B6", backgroundColor: cores.erroFundo },
  dependencyText: { flex: 1, color: cores.textoSecundario, fontSize: 13, lineHeight: 19 },
  dependencyTextError: { color: cores.erro },
  section: {
    marginBottom: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    backgroundColor: cores.superficie,
  },
  input: { flex: 1, paddingVertical: 16, color: cores.texto, fontSize: 16, lineHeight: 22 },
  inlineFields: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flexField: { flex: 1 },
  smallField: { width: "34%" },
  apiError: {
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: cores.erroFundo,
  },
  apiErrorText: { flex: 1, color: cores.erro, fontSize: 13, lineHeight: 18 },
  submitButton: {
    height: 58,
    marginTop: 8,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: cores.acao,
    shadowColor: cores.acao,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  submitButtonPressed: { backgroundColor: cores.acaoPressionada, transform: [{ scale: 0.995 }] },
  submitButtonDisabled: { opacity: 0.55, shadowOpacity: 0 },
  submitButtonText: { color: cores.superficie, fontSize: 17, fontWeight: "800" },
});
