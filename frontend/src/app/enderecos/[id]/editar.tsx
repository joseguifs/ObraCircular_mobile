import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { ehIdentificadorValido } from "@/features/usuarios/perfil";
import { ErroApi } from "@/services/api";
import { atualizarEndereco, obterEndereco } from "@/services/enderecos";
import { cores, raios } from "@/theme/tokens";

type EstadoTela =
  | { situacao: "carregando" }
  | { situacao: "naoEncontrado" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; dados: DadosEndereco; usuarioId: string };

export default function EditarEnderecoScreen() {
  const { width } = useWindowDimensions();
  const layoutCompacto = width < 520;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const enderecoId = typeof id === "string" ? id : "";
  const idValido = ehIdentificadorValido(enderecoId);
  const [estado, setEstado] = useState<EstadoTela>({ situacao: "carregando" });
  const [dados, setDados] = useState<DadosEndereco | null>(null);
  const [usuarioId, setUsuarioId] = useState("");
  const [erros, setErros] = useState<ErrosEndereco>({});
  const [enviando, setEnviando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    if (!idValido) {
      setEstado({ situacao: "naoEncontrado" });
      return;
    }

    let ativo = true;
    setEstado({ situacao: "carregando" });
    obterEndereco(enderecoId)
      .then((endereco) => {
        if (!ativo) return;
        const dadosCarregados: DadosEndereco = {
          cep: formatarCep(endereco.cep),
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento ?? "",
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
        };
        setDados(dadosCarregados);
        setUsuarioId(endereco.usuario_id);
        setEstado({ situacao: "pronto", dados: dadosCarregados, usuarioId: endereco.usuario_id });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        if (error instanceof ErroApi && error.status === 404) {
          setEstado({ situacao: "naoEncontrado" });
          return;
        }
        setEstado({
          situacao: "falha",
          mensagem: error instanceof Error ? error.message : "Não foi possível carregar o endereço.",
        });
      });

    return () => {
      ativo = false;
    };
  }, [enderecoId, idValido, tentativas]);

  function atualizar<K extends keyof DadosEndereco>(campo: K, valor: DadosEndereco[K]) {
    setDados((atuais) => (atuais ? { ...atuais, [campo]: valor } : atuais));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  async function salvar() {
    Keyboard.dismiss();
    if (!dados || !idValido) return;

    const novosErros = validarEndereco(dados);
    setErros(novosErros);
    setErroApi(null);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const endereco = await atualizarEndereco(enderecoId, normalizarEndereco(dados));
      router.replace({ pathname: "/usuarios/[id]", params: { id: endereco.usuario_id } });
    } catch (error) {
      setErroApi(error instanceof Error ? error.message : "Não foi possível atualizar o endereço.");
    } finally {
      setEnviando(false);
    }
  }

  function voltarAoPerfil() {
    if (usuarioId) {
      router.replace({ pathname: "/usuarios/[id]", params: { id: usuarioId } });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  const conteudo = estado.situacao === "pronto" ? dados ?? estado.dados : null;

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.safeArea}>
      <Stack.Screen options={{ title: "Editar endereço" }} />
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
          <View style={styles.content}>
            <Marca />

            {estado.situacao === "carregando" ? (
              <EstadoCentral icone="location-outline" texto="Carregando endereço..." carregando />
            ) : estado.situacao === "naoEncontrado" ? (
              <EstadoCentral
                acao="Voltar"
                icone="location-outline"
                onPress={voltarAoPerfil}
                texto="Este endereço não existe ou não está mais disponível."
                titulo="Endereço não encontrado"
              />
            ) : estado.situacao === "falha" ? (
              <EstadoCentral
                acao="Tentar novamente"
                icone="cloud-offline-outline"
                onPress={() => setTentativas((total) => total + 1)}
                texto={estado.mensagem}
                titulo="Não foi possível carregar"
              />
            ) : conteudo ? (
              <>
                <View style={styles.headingBlock}>
                  <View style={styles.eyebrow}>
                    <Ionicons color={cores.destaque} name="create-outline" size={15} />
                    <Text style={styles.eyebrowText}>EDITAR ENDEREÇO</Text>
                  </View>
                  <Text style={styles.title}>Atualize o endereço</Text>
                  <Text style={styles.subtitle}>Revise os dados abaixo antes de salvar as alterações.</Text>
                </View>

                <View style={styles.section}>
                  <View style={[styles.inlineFields, layoutCompacto ? styles.inlineFieldsCompacto : null]}>
                    <View style={[styles.flexField, layoutCompacto ? styles.fullField : null]}>
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
                          value={conteudo.cep}
                        />
                      </CampoFormulario>
                    </View>
                    <View style={[styles.smallField, layoutCompacto ? styles.fullField : null]}>
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
                          value={conteudo.estado}
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
                      value={conteudo.logradouro}
                    />
                  </CampoFormulario>

                  <View style={[styles.inlineFields, layoutCompacto ? styles.inlineFieldsCompacto : null]}>
                    <View style={[styles.smallField, layoutCompacto ? styles.fullField : null]}>
                      <CampoFormulario error={erros.numero} icon="home-outline" label="Número">
                        <TextInput
                          accessibilityLabel="Número do endereço"
                          maxLength={20}
                          onChangeText={(valor) => atualizar("numero", valor)}
                          placeholder="10"
                          placeholderTextColor={cores.textoSuave}
                          returnKeyType="next"
                          style={styles.input}
                          value={conteudo.numero}
                        />
                      </CampoFormulario>
                    </View>
                    <View style={[styles.flexField, layoutCompacto ? styles.fullField : null]}>
                      <CampoFormulario icon="business-outline" label="Complemento" optional>
                        <TextInput
                          accessibilityLabel="Complemento do endereço"
                          maxLength={100}
                          onChangeText={(valor) => atualizar("complemento", valor)}
                          placeholder="Galpão, lote..."
                          placeholderTextColor={cores.textoSuave}
                          returnKeyType="next"
                          style={styles.input}
                          value={conteudo.complemento}
                        />
                      </CampoFormulario>
                    </View>
                  </View>

                  <View style={[styles.inlineFields, layoutCompacto ? styles.inlineFieldsCompacto : null]}>
                    <View style={[styles.flexField, layoutCompacto ? styles.fullField : null]}>
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
                          value={conteudo.bairro}
                        />
                      </CampoFormulario>
                    </View>
                    <View style={[styles.flexField, layoutCompacto ? styles.fullField : null]}>
                      <CampoFormulario error={erros.cidade} icon="map-outline" label="Cidade">
                        <TextInput
                          accessibilityLabel="Cidade do endereço"
                          autoCapitalize="words"
                          maxLength={100}
                          onChangeText={(valor) => atualizar("cidade", valor)}
                          onSubmitEditing={salvar}
                          placeholder="Palmas"
                          placeholderTextColor={cores.textoSuave}
                          returnKeyType="done"
                          style={styles.input}
                          value={conteudo.cidade}
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
                  accessibilityLabel="Salvar alterações do endereço"
                  accessibilityRole="button"
                  disabled={enviando}
                  onPress={salvar}
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed ? styles.submitButtonPressed : null,
                    enviando ? styles.submitButtonDisabled : null,
                  ]}
                >
                  {enviando ? (
                    <ActivityIndicator color={cores.superficie} />
                  ) : (
                    <>
                      <Ionicons color={cores.superficie} name="checkmark" size={22} />
                      <Text style={styles.submitButtonText}>Salvar alterações</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type EstadoCentralProps = {
  titulo?: string;
  texto: string;
  icone: keyof typeof Ionicons.glyphMap;
  acao?: string;
  onPress?: () => void;
  carregando?: boolean;
};

function EstadoCentral({ titulo, texto, icone, acao, onPress, carregando }: EstadoCentralProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.estadoCentral}>
      {carregando ? (
        <ActivityIndicator color={cores.acao} size="large" />
      ) : (
        <View style={styles.estadoIcone}>
          <Ionicons color={cores.acao} name={icone} size={32} />
        </View>
      )}
      {titulo ? <Text style={styles.estadoTitulo}>{titulo}</Text> : null}
      <Text style={styles.estadoTexto}>{texto}</Text>
      {acao && onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.estadoBotao, pressed ? styles.submitButtonPressed : null]}
        >
          <Text style={styles.submitButtonText}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.fundo },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 28 },
  content: {
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 20,
    alignSelf: "center",
    boxSizing: "border-box",
  },
  headingBlock: { marginTop: 28, marginBottom: 26 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  eyebrowText: { color: cores.destaque, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: cores.texto, fontSize: 34, lineHeight: 40, fontWeight: "800" },
  subtitle: {
    width: "100%",
    marginTop: 8,
    maxWidth: 560,
    color: cores.textoSecundario,
    fontSize: 17,
    lineHeight: 25,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    backgroundColor: cores.superficie,
    boxSizing: "border-box",
  },
  input: { minWidth: 0, flex: 1, paddingVertical: 16, color: cores.texto, fontSize: 16, lineHeight: 22 },
  inlineFields: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  inlineFieldsCompacto: { flexDirection: "column", gap: 0 },
  flexField: { minWidth: 0, flex: 1 },
  smallField: { minWidth: 0, width: "34%" },
  fullField: {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
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
  submitButtonText: { color: cores.superficie, fontSize: 16, fontWeight: "800" },
  estadoCentral: {
    minHeight: 280,
    marginTop: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  estadoIcone: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FC",
  },
  estadoTitulo: { color: cores.texto, fontSize: 21, lineHeight: 27, fontWeight: "800", textAlign: "center" },
  estadoTexto: {
    width: "100%",
    maxWidth: 420,
    color: cores.textoSecundario,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  estadoBotao: {
    minHeight: 50,
    marginTop: 6,
    paddingHorizontal: 22,
    borderRadius: raios.grande,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.acao,
  },
});
