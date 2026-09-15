import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
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
import { categorias, CategoriaId } from "@/features/anuncios/categorias";
import {
  DadosFormularioAnuncio,
  ErrosFormularioAnuncio,
  formatarMoeda,
  normalizarAnuncio,
  validarAnuncio,
} from "@/features/anuncios/validacao";
import { cores, raios } from "@/theme/tokens";

const estadoInicial: DadosFormularioAnuncio = {
  titulo: "",
  descricao: "",
  categoriaId: "",
  preco: "",
  quantidade: "1",
  imagemUrl: "",
};

export default function NovoAnuncioScreen() {
  const { width } = useWindowDimensions();
  const [dados, setDados] = useState(estadoInicial);
  const [erros, setErros] = useState<ErrosFormularioAnuncio>({});

  const conteudoEstreito = width < 560;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === dados.categoriaId);

  function atualizar<K extends keyof DadosFormularioAnuncio>(campo: K, valor: DadosFormularioAnuncio[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) {
      setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    }
  }

  function enviar() {
    Keyboard.dismiss();
    const novosErros = validarAnuncio(dados);
    setErros(novosErros);

    if (Object.keys(novosErros).length > 0) return;

    const anuncio = normalizarAnuncio(dados);
    router.replace({
      pathname: "/anuncios/sucesso",
      params: { titulo: anuncio.titulo },
    });
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
                      onPress={() => atualizar("categoriaId", categoria.id as CategoriaId)}
                      style={({ pressed }) => [
                        styles.category,
                        conteudoEstreito ? styles.categoryNarrow : styles.categoryWide,
                        selecionada ? styles.categorySelected : null,
                        pressed ? styles.categoryPressed : null,
                      ]}
                    >
                      <Ionicons
                        color={selecionada ? cores.acao : cores.textoSecundario}
                        name={categoria.icon}
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
                  maxLength={1200}
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
                Nesta etapa, o cadastro é validado no aplicativo. O envio à API será conectado com autenticação e endereço em uma próxima branch.
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Concluir cadastro do anúncio"
              accessibilityRole="button"
              onPress={enviar}
              style={({ pressed }) => [styles.submitButton, pressed ? styles.submitButtonPressed : null]}
            >
              <Text style={styles.submitButtonText}>Concluir cadastro</Text>
              <Ionicons color={cores.superficie} name="arrow-forward" size={21} />
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
  submitButtonText: { color: cores.superficie, fontSize: 17, fontWeight: "800" },
});
