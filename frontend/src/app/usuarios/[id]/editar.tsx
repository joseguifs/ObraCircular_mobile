import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Marca } from "@/components/Marca";
import {
  DadosEdicaoUsuario,
  ErrosEdicaoUsuario,
  obterAlteracoesUsuario,
  validarEdicaoUsuario,
} from "@/features/usuarios/edicao";
import { ehIdentificadorValido, formatarTelefone } from "@/features/usuarios/perfil";
import { ErroApi } from "@/services/api";
import { atualizarUsuario, obterUsuario, Usuario } from "@/services/usuarios";
import { cores, raios } from "@/theme/tokens";

type EstadoEdicao =
  | { situacao: "carregando" }
  | { situacao: "naoEncontrado" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; usuario: Usuario };

export default function EditarUsuarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const usuarioId = typeof id === "string" ? id : "";
  return <EdicaoUsuario key={usuarioId} usuarioId={usuarioId} />;
}

function EdicaoUsuario({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const idValido = ehIdentificadorValido(usuarioId);
  const [estado, setEstado] = useState<EstadoEdicao>({ situacao: "carregando" });
  const [dados, setDados] = useState<DadosEdicaoUsuario>({ nome: "", email: "", telefone: "" });
  const [erros, setErros] = useState<ErrosEdicaoUsuario>({});
  const [mensagemApi, setMensagemApi] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [imagem, setImagem] = useState<string | null | undefined>(undefined);
  const [selecionando, setSelecionando] = useState(false);
  const [recargas, setRecargas] = useState(0);
  const emEnvio = useRef(false);
  const montado = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const telefoneRef = useRef<TextInput>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    obterUsuario(usuarioId)
      .then((usuario) => {
        if (!ativo) return;
        setEstado({ situacao: "pronto", usuario });
        setDados({
          nome: usuario.nome,
          email: usuario.email,
          telefone: formatarTelefone(usuario.telefone) ?? "",
        });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setEstado(
          error instanceof ErroApi && error.status === 404
            ? { situacao: "naoEncontrado" }
            : {
                situacao: "falha",
                mensagem:
                  error instanceof Error ? error.message : "Não foi possível carregar seus dados.",
              },
        );
      });
    return () => {
      ativo = false;
    };
  }, [idValido, usuarioId, recargas]);

  function atualizar(campo: keyof DadosEdicaoUsuario, valor: string) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
    setMensagemApi(null);
    setSucesso(false);
  }

  function voltarAoPerfil() {
    if (emEnvio.current) return;
    if (idValido) {
      router.dismissTo({ pathname: "/usuarios/[id]", params: { id: usuarioId } });
    } else {
      router.replace("/");
    }
  }

  async function escolherImagem() {
    if (emEnvio.current || selecionando) return;
    setSelecionando(true);
    setMensagemApi(null);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1],
        quality: 0.8, base64: true,
      });
      if (!montado.current || resultado.canceled) return;
      const foto = resultado.assets[0];
      if (!foto.base64 || foto.base64.length > 6_990_508) {
        setMensagemApi("Selecione uma imagem de até 5 MB.");
        return;
      }
      // A opção base64 do seletor fornece a imagem em JPEG no aplicativo nativo.
      const tipo = Platform.OS === "web" ? (foto.mimeType ?? "image/jpeg") : "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(tipo)) {
        setMensagemApi("Selecione uma imagem JPG, PNG ou WebP.");
        return;
      }
      setImagem(`data:${tipo};base64,${foto.base64}`);
      setSucesso(false);
    } catch {
      if (montado.current) setMensagemApi("Não foi possível abrir a galeria. Verifique a permissão de fotos e tente novamente.");
    } finally {
      if (montado.current) setSelecionando(false);
    }
  }

  async function salvar() {
    if (emEnvio.current || selecionando || estado.situacao !== "pronto") return;
    Keyboard.dismiss();
    const novosErros = validarEdicaoUsuario(dados);
    setErros(novosErros);
    setMensagemApi(null);
    setSucesso(false);
    if (Object.keys(novosErros).length > 0) return;

    const alteracoes = { ...obterAlteracoesUsuario(dados, estado.usuario),
      ...(imagem !== undefined ? { imagem_url: imagem } : {}),
    };
    if (Object.keys(alteracoes).length === 0) {
      setMensagemApi("Nenhuma alteração para salvar.");
      return;
    }

    emEnvio.current = true;
    setEnviando(true);
    try {
      const usuario = await atualizarUsuario(usuarioId, alteracoes);
      if (!montado.current) return;
      setEstado({ situacao: "pronto", usuario });
      setDados({
        nome: usuario.nome,
        email: usuario.email,
        telefone: formatarTelefone(usuario.telefone) ?? "",
      });
      setImagem(undefined);
      setSucesso(true);
    } catch (error) {
      if (!montado.current) return;
      if (error instanceof ErroApi && error.status === 409) {
        setErros({ email: error.message });
      } else if (error instanceof ErroApi && error.status === 404) {
        setEstado({ situacao: "naoEncontrado" });
      } else {
        setMensagemApi(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar suas alterações. Tente novamente.",
        );
      }
    } finally {
      emEnvio.current = false;
      if (montado.current) setEnviando(false);
    }
  }

  const naoEncontrado = !idValido || estado.situacao === "naoEncontrado";

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Editar dados",
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Voltar ao perfil"
              accessibilityRole="button"
              accessibilityState={{ disabled: enviando }}
              disabled={enviando}
              hitSlop={10}
              onPress={voltarAoPerfil}
              style={styles.voltar}
            >
              <Ionicons color={cores.acao} name="arrow-back" size={24} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Marca />
            {naoEncontrado ? (
              <View style={styles.aviso}>
                <Ionicons color={cores.acao} name="person-remove-outline" size={38} />
                <Text accessibilityRole="header" style={styles.avisoTitulo}>
                  Usuário não encontrado
                </Text>
                <Text style={styles.avisoTexto}>
                  Este usuário não existe ou foi removido do ObraCircular.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace("/")}
                  style={styles.botao}
                >
                  <Text style={styles.botaoTexto}>Voltar ao início</Text>
                </Pressable>
              </View>
            ) : estado.situacao === "carregando" ? (
              <View accessibilityLiveRegion="polite" style={styles.aviso}>
                <ActivityIndicator color={cores.acao} size="large" />
                <Text style={styles.avisoTexto}>Carregando seus dados...</Text>
              </View>
            ) : estado.situacao === "falha" ? (
              <View style={styles.aviso}>
                <Ionicons color={cores.erro} name="cloud-offline-outline" size={38} />
                <Text accessibilityRole="header" style={styles.avisoTitulo}>
                  Não foi possível carregar seus dados
                </Text>
                <Text accessibilityLiveRegion="polite" style={styles.avisoTexto}>
                  {estado.mensagem}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEstado({ situacao: "carregando" });
                    setRecargas((total) => total + 1);
                  }}
                  style={({ pressed }) => [styles.botao, pressed ? styles.botaoPressionado : null]}
                >
                  <Ionicons color={cores.superficie} name="refresh" size={19} />
                  <Text style={styles.botaoTexto}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : estado.situacao === "pronto" ? (
              <>
                <View style={styles.cartaoPrincipal}>
                  <AvatarUsuario nome={estado.usuario.nome} imagemUrl={imagem === undefined ? estado.usuario.imagem_url : imagem} />
                  <View style={styles.identificacao}>
                    <Text accessibilityRole="header" style={styles.titulo}>
                      Editar dados básicos
                    </Text>
                    <Text style={styles.subtitulo}>
                      Mantenha seu nome e seus dados de contato atualizados.
                    </Text>
                  </View>
                </View>
                <View style={styles.formulario}>
                  <Text accessibilityRole="header" style={styles.secaoTitulo}>
                    Foto de perfil
                  </Text>
                  <Pressable accessibilityRole="button" disabled={enviando || selecionando}
                    onPress={escolherImagem} style={styles.botaoSecundario}>
                    <Text style={styles.botaoSecundarioTexto}>{selecionando ? "Abrindo galeria..." : "Escolher foto"}</Text>
                  </Pressable>
                  {(imagem === undefined ? estado.usuario.imagem_url : imagem) ? (
                    <Pressable accessibilityRole="button" disabled={enviando || selecionando}
                      onPress={() => { setImagem(null); setSucesso(false); setMensagemApi(null); }}
                      style={styles.botaoSecundario}>
                      <Text style={styles.botaoSecundarioTexto}>Remover foto</Text>
                    </Pressable>
                  ) : null}
                  <Text style={styles.dicaFoto}>JPG, PNG ou WebP, até 5 MB. A foto só será atualizada ao salvar as alterações.</Text>
                  <Text accessibilityRole="header" style={styles.secaoTitulo}>Dados pessoais</Text>
                  {sucesso ? (
                    <View
                      accessibilityLiveRegion="polite"
                      style={[styles.feedback, styles.feedbackSucesso]}
                    >
                      <Ionicons color={cores.sucesso} name="checkmark-circle-outline" size={22} />
                      <Text style={[styles.feedbackTexto, { color: cores.sucesso }]}>
                        Dados atualizados com sucesso!
                      </Text>
                    </View>
                  ) : null}
                  <CampoFormulario error={erros.nome} icon="person-outline" label="Nome completo">
                    <TextInput
                      accessibilityLabel="Nome completo"
                      accessibilityHint={erros.nome}
                      autoCapitalize="words"
                      autoComplete="name"
                      editable={!enviando}
                      maxLength={150}
                      onChangeText={(valor) => atualizar("nome", valor)}
                      onSubmitEditing={() => emailRef.current?.focus()}
                      placeholder="Ex.: Ana Souza"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.nome}
                    />
                  </CampoFormulario>
                  <CampoFormulario error={erros.email} icon="mail-outline" label="E-mail">
                    <TextInput
                      ref={emailRef}
                      accessibilityLabel="E-mail"
                      accessibilityHint={erros.email}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      editable={!enviando}
                      inputMode="email"
                      keyboardType="email-address"
                      maxLength={255}
                      onChangeText={(valor) => atualizar("email", valor)}
                      onSubmitEditing={() => telefoneRef.current?.focus()}
                      placeholder="voce@email.com"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="next"
                      style={styles.input}
                      value={dados.email}
                    />
                  </CampoFormulario>
                  <CampoFormulario
                    error={erros.telefone}
                    icon="call-outline"
                    label="Telefone"
                    optional
                  >
                    <TextInput
                      ref={telefoneRef}
                      accessibilityLabel="Telefone (opcional)"
                      accessibilityHint={
                        erros.telefone ?? "Apague o número para remover o telefone."
                      }
                      autoComplete="tel"
                      editable={!enviando}
                      inputMode="tel"
                      keyboardType="phone-pad"
                      maxLength={20}
                      onChangeText={(valor) => atualizar("telefone", valor)}
                      onSubmitEditing={salvar}
                      placeholder="(63) 99999-9999"
                      placeholderTextColor={cores.textoSuave}
                      returnKeyType="done"
                      style={styles.input}
                      value={dados.telefone}
                    />
                  </CampoFormulario>
                  <Text style={styles.dica}>
                    O telefone é opcional. Deixe o campo vazio para removê-lo.
                  </Text>
                  {mensagemApi ? (
                    <View
                      accessibilityLiveRegion="polite"
                      style={[styles.feedback, styles.feedbackErro]}
                    >
                      <Ionicons color={cores.erro} name="alert-circle-outline" size={22} />
                      <Text style={[styles.feedbackTexto, { color: cores.erro }]}>
                        {mensagemApi}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: enviando, busy: enviando }}
                    disabled={enviando}
                    onPress={salvar}
                    style={({ pressed }) => [
                      styles.botao,
                      pressed ? styles.botaoPressionado : null,
                      enviando ? styles.desabilitado : null,
                    ]}
                  >
                    {enviando ? (
                      <ActivityIndicator color={cores.superficie} />
                    ) : (
                      <Ionicons color={cores.superficie} name="checkmark-outline" size={21} />
                    )}
                    <Text style={styles.botaoTexto}>
                      {enviando ? "Salvando..." : "Salvar alterações"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: enviando }}
                    disabled={enviando}
                    onPress={voltarAoPerfil}
                    style={({ pressed }) => [
                      styles.botaoSecundario,
                      pressed ? styles.pressionado : null,
                      enviando ? styles.desabilitado : null,
                    ]}
                  >
                    <Text style={styles.botaoSecundarioTexto}>
                      {sucesso ? "Voltar ao perfil" : "Cancelar"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
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
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 18 },
  voltar: { marginLeft: 8, padding: 8, borderRadius: raios.pill },
  cartaoPrincipal: {
    padding: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: cores.superficie,
  },
  identificacao: { flex: 1, gap: 6 },
  titulo: {
    color: cores.texto,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitulo: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  formulario: {
    padding: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    backgroundColor: cores.superficie,
  },
  secaoTitulo: {
    marginBottom: 22,
    color: cores.texto,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    color: cores.texto,
    fontSize: 16,
    lineHeight: 22,
  },
  dicaFoto: { marginVertical: 16, color: cores.textoSecundario, fontSize: 13, lineHeight: 19 },
  dica: {
    marginTop: -8,
    marginBottom: 22,
    color: cores.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
  },
  feedback: {
    marginBottom: 20,
    padding: 14,
    borderRadius: raios.medio,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feedbackTexto: { flex: 1, fontSize: 14, lineHeight: 20 },
  feedbackErro: { backgroundColor: cores.erroFundo },
  feedbackSucesso: { backgroundColor: cores.sucessoFundo },
  botao: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: cores.acao,
  },
  botaoTexto: { color: cores.superficie, fontSize: 16, fontWeight: "800" },
  botaoPressionado: { backgroundColor: cores.acaoPressionada },
  botaoSecundario: {
    marginTop: 12,
    minHeight: 52,
    padding: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoSecundarioTexto: { color: cores.acao, fontSize: 16, fontWeight: "700" },
  pressionado: { opacity: 0.65 },
  desabilitado: { opacity: 0.58 },
  aviso: {
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 24,
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.superficie,
  },
  avisoTitulo: {
    color: cores.texto,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  avisoTexto: {
    maxWidth: 420,
    color: cores.textoSecundario,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
