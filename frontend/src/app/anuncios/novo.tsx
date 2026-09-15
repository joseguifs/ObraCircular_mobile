import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { obterIconeCategoria } from "@/features/anuncios/categorias";
import {
  DadosFormularioAnuncio,
  ErrosFormularioAnuncio,
  formatarMoeda,
  normalizarAnuncio,
  validarAnuncio,
} from "@/features/anuncios/validacao";
import {
  DadosEndereco,
  ErrosEndereco,
  formatarCep,
  normalizarEndereco,
  validarEndereco,
} from "@/features/anuncios/validacaoEndereco";
import { cadastrarAnuncio } from "@/services/anuncios";
import { Categoria, listarCategorias } from "@/services/categorias";
import { ContextoPublicacao, obterContextoPublicacao } from "@/services/contextoPublicacao";
import { cadastrarEndereco } from "@/services/enderecos";
import { cores, raios } from "@/theme/tokens";

const estadoInicial: DadosFormularioAnuncio = {
  titulo: "",
  descricao: "",
  categoriaId: "",
  preco: "",
  quantidade: "1",
  imagemUrl: "",
};

const enderecoInicial: DadosEndereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function NovoAnuncioScreen() {
  const { width } = useWindowDimensions();
  const [dados, setDados] = useState(estadoInicial);
  const [erros, setErros] = useState<ErrosFormularioAnuncio>({});
  const [dadosEndereco, setDadosEndereco] = useState(enderecoInicial);
  const [errosEndereco, setErrosEndereco] = useState<ErrosEndereco>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contexto, setContexto] = useState<ContextoPublicacao | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroDependencias, setErroDependencias] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const conteudoEstreito = width < 560;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === dados.categoriaId);

  const carregarDependencias = useCallback(async () => {
    setCarregandoDados(true);
    setErroDependencias(null);
    try {
      const [categoriasDaApi, contextoDaApi] = await Promise.all([
        listarCategorias(),
        obterContextoPublicacao(),
      ]);
      if (categoriasDaApi.length === 0) {
        throw new Error("Nenhuma categoria ativa foi encontrada.");
      }
      setCategorias(categoriasDaApi);
      setContexto(contextoDaApi);
    } catch (error) {
      setErroDependencias(error instanceof Error ? error.message : "Não foi possível preparar o formulário.");
    } finally {
      setCarregandoDados(false);
    }
  }, []);

  useEffect(() => {
    void carregarDependencias();
  }, [carregarDependencias]);

  function atualizar<K extends keyof DadosFormularioAnuncio>(campo: K, valor: DadosFormularioAnuncio[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) {
      setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    }
  }

  function atualizarEndereco<K extends keyof DadosEndereco>(campo: K, valor: DadosEndereco[K]) {
    setDadosEndereco((atual) => ({ ...atual, [campo]: valor }));
    if (errosEndereco[campo]) {
      setErrosEndereco((atuais) => ({ ...atuais, [campo]: undefined }));
    }
  }

  async function enviar() {
    Keyboard.dismiss();
    const novosErros = validarAnuncio(dados);
    const novosErrosEndereco = contexto?.endereco ? {} : validarEndereco(dadosEndereco);
    setErros(novosErros);
    setErrosEndereco(novosErrosEndereco);
    setErroApi(null);

    if (
      Object.keys(novosErros).length > 0 ||
      Object.keys(novosErrosEndereco).length > 0 ||
      !contexto
    ) return;

    setEnviando(true);
    try {
      const endereco = contexto.endereco ?? await cadastrarEndereco({
        ...normalizarEndereco(dadosEndereco),
        usuario_id: contexto.vendedor.id,
      });
      if (!contexto.endereco) {
        setContexto({ ...contexto, endereco });
      }

      const anuncio = await cadastrarAnuncio({
        ...normalizarAnuncio(dados),
        vendedor_id: contexto.vendedor.id,
        endereco_id: endereco.id,
      });
      router.replace({
        pathname: "/anuncios/sucesso",
        params: { id: anuncio.id, titulo: anuncio.titulo },
      });
    } catch (error) {
      setErroApi(error instanceof Error ? error.message : "Não foi possível cadastrar o anúncio.");
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
                <Ionicons color={cores.destaque} name="leaf-outline" size={15} />
                <Text style={styles.eyebrowText}>DÊ UM NOVO CICLO</Text>
              </View>
              <Text style={styles.title}>Cadastre seu anúncio</Text>
              <Text style={styles.subtitle}>
                Conte o que sobrou da obra para que outra pessoa possa reaproveitar.
              </Text>
            </View>

            {carregandoDados ? (
              <View style={styles.dependencyCard}>
                <ActivityIndicator color={cores.acao} />
                <Text style={styles.dependencyText}>Carregando categorias e dados de publicação...</Text>
              </View>
            ) : erroDependencias ? (
              <View style={[styles.dependencyCard, styles.dependencyCardError]}>
                <Ionicons color={cores.erro} name="alert-circle-outline" size={22} />
                <Text accessibilityLiveRegion="polite" style={[styles.dependencyText, styles.dependencyTextError]}>
                  {erroDependencias}
                </Text>
                <Pressable accessibilityRole="button" onPress={carregarDependencias}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : contexto ? (
              <View style={styles.dependencyCard}>
                <Ionicons color={cores.destaque} name="location-outline" size={22} />
                <Text style={styles.dependencyText}>
                  Publicando como <Text style={styles.dependencyStrong}>{contexto.vendedor.nome}</Text>
                  {contexto.endereco
                    ? ` em ${contexto.endereco.cidade}/${contexto.endereco.estado}.`
                    : ". Informe abaixo o primeiro endereço de retirada."}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>1</Text>
                </View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>Sobre o material</Text>
                  <Text style={styles.sectionSubtitle}>As informações que aparecerão no anúncio.</Text>
                </View>
              </View>

              <CampoFormulario error={erros.titulo} icon="pricetag-outline" label="Título">
                <TextInput
                  accessibilityLabel="Título do anúncio"
                  autoCapitalize="sentences"
                  maxLength={150}
                  onChangeText={(valor) => atualizar("titulo", valor)}
                  placeholder="Ex.: Sobras de piso cerâmico"
                  placeholderTextColor={cores.textoSuave}
                  returnKeyType="next"
                  style={styles.input}
                  value={dados.titulo}
                />
              </CampoFormulario>

              <Text style={styles.fieldLabel}>Categoria</Text>
              <View accessibilityRole="radiogroup" style={styles.categories}>
                {categorias.map((categoria) => {
                  const selecionada = dados.categoriaId === categoria.id;
                  return (
                    <Pressable
                      accessibilityLabel={`Categoria ${categoria.nome}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selecionada }}
                      key={categoria.id}
                      onPress={() => atualizar("categoriaId", categoria.id)}
                      style={({ pressed }) => [
                        styles.category,
                        conteudoEstreito ? styles.categoryNarrow : styles.categoryWide,
                        selecionada ? styles.categorySelected : null,
                        pressed ? styles.categoryPressed : null,
                      ]}
                    >
                      <Ionicons
                        color={selecionada ? cores.acao : cores.textoSecundario}
                        name={obterIconeCategoria(categoria.nome)}
                        size={20}
                      />
                      <Text style={[styles.categoryText, selecionada ? styles.categoryTextSelected : null]}>
                        {categoria.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {erros.categoriaId ? (
                <Text accessibilityLiveRegion="polite" style={styles.categoryError}>
                  {erros.categoriaId}
                </Text>
              ) : null}

              <CampoFormulario error={erros.descricao} icon="document-text-outline" label="Descrição">
                <TextInput
                  accessibilityLabel="Descrição do anúncio"
                  maxLength={5000}
                  multiline
                  onChangeText={(valor) => atualizar("descricao", valor)}
                  placeholder="Informe medidas, estado de conservação e detalhes para retirada."
                  placeholderTextColor={cores.textoSuave}
                  style={[styles.input, styles.textArea]}
                  textAlignVertical="top"
                  value={dados.descricao}
                />
              </CampoFormulario>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>2</Text>
                </View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>Preço e disponibilidade</Text>
                  <Text style={styles.sectionSubtitle}>Use R$ 0,00 quando o material for doação.</Text>
                </View>
              </View>

              <View style={styles.inlineFields}>
                <View style={styles.flexField}>
                  <CampoFormulario error={erros.preco} icon="cash-outline" label="Preço">
                    <TextInput
                      accessibilityLabel="Preço do anúncio"
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(valor) => atualizar("preco", formatarMoeda(valor))}
                      placeholder="R$ 0,00"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.preco}
                    />
                  </CampoFormulario>
                </View>
                <View style={styles.flexField}>
                  <CampoFormulario error={erros.quantidade} icon="cube-outline" label="Quantidade">
                    <TextInput
                      accessibilityLabel="Quantidade disponível"
                      inputMode="numeric"
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(valor) => atualizar("quantidade", valor.replace(/\D/g, ""))}
                      placeholder="1"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.quantidade}
                    />
                  </CampoFormulario>
                </View>
              </View>

              <CampoFormulario error={erros.imagemUrl} icon="image-outline" label="URL da imagem" optional>
                <TextInput
                  accessibilityLabel="Endereço da imagem do anúncio"
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="url"
                  keyboardType="url"
                  maxLength={2048}
                  onChangeText={(valor) => atualizar("imagemUrl", valor)}
                  onSubmitEditing={enviar}
                  placeholder="https://exemplo.com/material.jpg"
                  placeholderTextColor={cores.textoSuave}
                  returnKeyType="done"
                  style={styles.input}
                  value={dados.imagemUrl}
                />
              </CampoFormulario>
            </View>

            {contexto && !contexto.endereco ? (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepText}>3</Text>
                  </View>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>Local de retirada</Text>
                    <Text style={styles.sectionSubtitle}>Este endereço ficará vinculado ao vendedor.</Text>
                  </View>
                </View>

                <View style={styles.inlineFields}>
                  <View style={styles.flexField}>
                    <CampoFormulario error={errosEndereco.cep} icon="navigate-outline" label="CEP">
                      <TextInput
                        accessibilityLabel="CEP do endereço de retirada"
                        inputMode="numeric"
                        keyboardType="number-pad"
                        maxLength={9}
                        onChangeText={(valor) => atualizarEndereco("cep", formatarCep(valor))}
                        placeholder="00000-000"
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="next"
                        style={styles.input}
                        value={dadosEndereco.cep}
                      />
                    </CampoFormulario>
                  </View>
                  <View style={styles.smallField}>
                    <CampoFormulario error={errosEndereco.estado} icon="map-outline" label="UF">
                      <TextInput
                        accessibilityLabel="Estado do endereço de retirada"
                        autoCapitalize="characters"
                        maxLength={2}
                        onChangeText={(valor) => atualizarEndereco("estado", valor.replace(/[^A-Za-z]/g, "").toUpperCase())}
                        placeholder="TO"
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="next"
                        style={styles.input}
                        value={dadosEndereco.estado}
                      />
                    </CampoFormulario>
                  </View>
                </View>

                <CampoFormulario error={errosEndereco.logradouro} icon="trail-sign-outline" label="Logradouro">
                  <TextInput
                    accessibilityLabel="Logradouro do endereço de retirada"
                    autoCapitalize="words"
                    maxLength={150}
                    onChangeText={(valor) => atualizarEndereco("logradouro", valor)}
                    placeholder="Ex.: Avenida Central"
                    placeholderTextColor={cores.textoSuave}
                    returnKeyType="next"
                    style={styles.input}
                    value={dadosEndereco.logradouro}
                  />
                </CampoFormulario>

                <View style={styles.inlineFields}>
                  <View style={styles.smallField}>
                    <CampoFormulario error={errosEndereco.numero} icon="home-outline" label="Número">
                      <TextInput
                        accessibilityLabel="Número do endereço de retirada"
                        maxLength={20}
                        onChangeText={(valor) => atualizarEndereco("numero", valor)}
                        placeholder="10"
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="next"
                        style={styles.input}
                        value={dadosEndereco.numero}
                      />
                    </CampoFormulario>
                  </View>
                  <View style={styles.flexField}>
                    <CampoFormulario icon="business-outline" label="Complemento" optional>
                      <TextInput
                        accessibilityLabel="Complemento do endereço de retirada"
                        maxLength={100}
                        onChangeText={(valor) => atualizarEndereco("complemento", valor)}
                        placeholder="Galpão, lote..."
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="next"
                        style={styles.input}
                        value={dadosEndereco.complemento}
                      />
                    </CampoFormulario>
                  </View>
                </View>

                <View style={styles.inlineFields}>
                  <View style={styles.flexField}>
                    <CampoFormulario error={errosEndereco.bairro} icon="location-outline" label="Bairro">
                      <TextInput
                        accessibilityLabel="Bairro do endereço de retirada"
                        autoCapitalize="words"
                        maxLength={100}
                        onChangeText={(valor) => atualizarEndereco("bairro", valor)}
                        placeholder="Centro"
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="next"
                        style={styles.input}
                        value={dadosEndereco.bairro}
                      />
                    </CampoFormulario>
                  </View>
                  <View style={styles.flexField}>
                    <CampoFormulario error={errosEndereco.cidade} icon="map-outline" label="Cidade">
                      <TextInput
                        accessibilityLabel="Cidade do endereço de retirada"
                        autoCapitalize="words"
                        maxLength={100}
                        onChangeText={(valor) => atualizarEndereco("cidade", valor)}
                        onSubmitEditing={enviar}
                        placeholder="Palmas"
                        placeholderTextColor={cores.textoSuave}
                        returnKeyType="done"
                        style={styles.input}
                        value={dadosEndereco.cidade}
                      />
                    </CampoFormulario>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.preview}>
              <View style={styles.previewIcon}>
                <Ionicons color={cores.acao} name="eye-outline" size={22} />
              </View>
              <View style={styles.previewBody}>
                <Text style={styles.previewCaption}>PRÉVIA DO ANÚNCIO</Text>
                <Text numberOfLines={2} style={styles.previewTitle}>
                  {dados.titulo.trim() || "Seu material aparecerá aqui"}
                </Text>
                <Text style={styles.previewMeta}>
                  {categoriaSelecionada?.nome ?? "Sem categoria"} · {dados.preco || "Preço não informado"} · {dados.quantidade || "0"} un.
                </Text>
              </View>
            </View>

            <View style={styles.localNotice}>
              <Ionicons color={cores.textoSecundario} name="information-circle-outline" size={20} />
              <Text style={styles.localNoticeText}>
                O usuário acima é um contexto temporário de desenvolvimento. Quando a autenticação entrar, ele será substituído pela sessão atual.
              </Text>
            </View>

            {erroApi ? (
              <View accessibilityLiveRegion="polite" style={styles.apiError}>
                <Ionicons color={cores.erro} name="alert-circle-outline" size={20} />
                <Text style={styles.apiErrorText}>{erroApi}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel="Publicar anúncio"
              accessibilityRole="button"
              disabled={carregandoDados || !contexto || enviando}
              onPress={enviar}
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.submitButtonPressed : null,
                carregandoDados || !contexto || enviando ? styles.submitButtonDisabled : null,
              ]}
            >
              {enviando ? (
                <ActivityIndicator color={cores.superficie} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Publicar anúncio</Text>
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
  dependencyStrong: { color: cores.texto, fontWeight: "800" },
  retryText: { padding: 5, color: cores.acao, fontSize: 13, fontWeight: "800" },
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
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FD",
  },
  stepText: { color: cores.acao, fontSize: 15, fontWeight: "800" },
  sectionHeadingText: { flex: 1 },
  sectionTitle: { color: cores.texto, fontSize: 18, lineHeight: 23, fontWeight: "800" },
  sectionSubtitle: { marginTop: 2, color: cores.textoSecundario, fontSize: 13, lineHeight: 18 },
  fieldLabel: { marginBottom: 8, color: cores.texto, fontSize: 16, lineHeight: 20, fontWeight: "700" },
  input: { flex: 1, paddingVertical: 16, color: cores.texto, fontSize: 16, lineHeight: 22 },
  textArea: { minHeight: 112, paddingTop: 17 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  category: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: cores.superficieSuave,
  },
  categoryNarrow: { width: "48%", flexGrow: 1 },
  categoryWide: { minWidth: "31%", flexGrow: 1 },
  categorySelected: { borderColor: cores.acao, backgroundColor: "#EDF6FF" },
  categoryPressed: { opacity: 0.72 },
  categoryText: { flexShrink: 1, color: cores.textoSecundario, fontSize: 13, lineHeight: 17, fontWeight: "600" },
  categoryTextSelected: { color: cores.acao },
  categoryError: { marginTop: -14, marginBottom: 18, color: cores.erro, fontSize: 12, lineHeight: 16 },
  inlineFields: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flexField: { flex: 1 },
  smallField: { width: "34%" },
  preview: {
    marginBottom: 14,
    padding: 18,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#EAF3FC",
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.superficie,
  },
  previewBody: { flex: 1 },
  previewCaption: { color: cores.acao, fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1 },
  previewTitle: { marginTop: 2, color: cores.texto, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  previewMeta: { marginTop: 3, color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },
  localNotice: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingHorizontal: 6 },
  localNoticeText: { flex: 1, color: cores.textoSecundario, fontSize: 12, lineHeight: 18 },
  apiError: {
    marginTop: 14,
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
    marginTop: 22,
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
