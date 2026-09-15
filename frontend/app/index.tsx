import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
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

import { cadastrarUsuario } from "../services/usuarios";

type FormErrors = Partial<
  Record<"nome" | "email" | "senha" | "confirmarSenha" | "telefone" | "termos", string>
>;

function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);

  if (numeros.length <= 2) return numeros ? `(${numeros}` : "";
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function validarFormulario(
  nome: string,
  email: string,
  senha: string,
  confirmarSenha: string,
  telefone: string,
  aceitouTermos: boolean,
) {
  const erros: FormErrors = {};
  const nomeNormalizado = nome.trim().replace(/\s+/g, " ");
  const emailNormalizado = email.trim();
  const numerosTelefone = telefone.replace(/\D/g, "");

  if (nomeNormalizado.length < 3) erros.nome = "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(emailNormalizado)) erros.email = "Informe um e-mail válido.";
  if (senha !== senha.trim()) {
    erros.senha = "A senha não pode começar ou terminar com espaços.";
  } else if (senha.length < 8 || !/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) {
    erros.senha = "Use ao menos 8 caracteres, com uma letra e um número.";
  } else if (senha.length > 72) {
    erros.senha = "A senha deve ter no máximo 72 caracteres.";
  }
  if (confirmarSenha !== senha) erros.confirmarSenha = "As senhas não coincidem.";
  if (telefone && ![10, 11].includes(numerosTelefone.length)) {
    erros.telefone = "Informe um telefone com DDD.";
  }
  if (!aceitouTermos) erros.termos = "Você precisa aceitar os termos para continuar.";

  return erros;
}

type CampoProps = {
  label: string;
  optional?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  children: React.ReactNode;
};

function Campo({ label, optional, icon, error, children }: CampoProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label} {optional && <Text style={styles.optional}>(opcional)</Text>}
      </Text>
      <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
        <Ionicons color="#839089" name={icon} size={21} />
        {children}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function CadastroScreen() {
  const { width: larguraTela } = useWindowDimensions();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [erros, setErros] = useState<FormErrors>({});
  const [mensagemApi, setMensagemApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function enviarCadastro() {
    const novosErros = validarFormulario(
      nome,
      email,
      senha,
      confirmarSenha,
      telefone,
      aceitouTermos,
    );

    setErros(novosErros);
    setMensagemApi(null);
    setSucesso(false);

    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await cadastrarUsuario({
        nome: nome.trim().replace(/\s+/g, " "),
        email: email.trim().toLowerCase(),
        senha,
        telefone: telefone || null,
      });
      setSucesso(true);
      setMensagemApi("Conta criada com sucesso!");
      setSenha("");
      setConfirmarSenha("");
    } catch (error) {
      setMensagemApi(error instanceof Error ? error.message : "Não foi possível criar sua conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: Math.min(larguraTela - 56, 464) }]}>
            <View accessibilityLabel="ObraCircular" style={styles.brand}>
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>C</Text>
              </View>
              <Text style={styles.brandName}>
                Obra<Text style={styles.brandAccent}>Circular</Text>
              </Text>
            </View>

            <View style={styles.headingBlock}>
              <Text style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>Comece a comprar, vender e{"\n"}reaproveitar materiais.</Text>
            </View>

            <Campo error={erros.nome} icon="person-outline" label="Nome completo">
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                maxLength={150}
                onChangeText={setNome}
                placeholder="Ex.: Ana Souza"
                placeholderTextColor="#A1AAA5"
                returnKeyType="next"
                style={styles.input}
                value={nome}
              />
            </Campo>

            <Campo error={erros.email} icon="mail-outline" label="E-mail">
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                inputMode="email"
                keyboardType="email-address"
                maxLength={255}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor="#A1AAA5"
                returnKeyType="next"
                style={styles.input}
                value={email}
              />
            </Campo>

            <Campo error={erros.senha} icon="lock-closed-outline" label="Senha">
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={72}
                onChangeText={setSenha}
                placeholder="Mínimo de 8 caracteres"
                placeholderTextColor="#A1AAA5"
                returnKeyType="next"
                secureTextEntry={!mostrarSenha}
                style={styles.input}
                value={senha}
              />
              <Pressable
                accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                hitSlop={10}
                onPress={() => setMostrarSenha((valor) => !valor)}
              >
                <Text style={styles.showPassword}>{mostrarSenha ? "Ocultar" : "Mostrar"}</Text>
              </Pressable>
            </Campo>

            <Campo error={erros.confirmarSenha} icon="lock-closed-outline" label="Confirmar senha">
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={72}
                onChangeText={setConfirmarSenha}
                placeholder="Repita a senha"
                placeholderTextColor="#A1AAA5"
                returnKeyType="next"
                secureTextEntry={!mostrarConfirmacao}
                style={styles.input}
                value={confirmarSenha}
              />
              <Pressable
                accessibilityLabel={mostrarConfirmacao ? "Ocultar confirmação" : "Mostrar confirmação"}
                hitSlop={10}
                onPress={() => setMostrarConfirmacao((valor) => !valor)}
              >
                <Text style={styles.showPassword}>{mostrarConfirmacao ? "Ocultar" : "Mostrar"}</Text>
              </Pressable>
            </Campo>

            <Campo error={erros.telefone} icon="phone-portrait-outline" label="Telefone" optional>
              <TextInput
                autoComplete="tel"
                inputMode="tel"
                keyboardType="phone-pad"
                maxLength={15}
                onChangeText={(valor) => setTelefone(formatarTelefone(valor))}
                onSubmitEditing={enviarCadastro}
                placeholder="(11) 90000-0000"
                placeholderTextColor="#A1AAA5"
                returnKeyType="done"
                style={styles.input}
                value={telefone}
              />
            </Campo>

            <Pressable
              accessibilityLabel="Aceitar Termos de Uso e Política de Privacidade"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: aceitouTermos }}
              onPress={() => setAceitouTermos((valor) => !valor)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, aceitouTermos ? styles.checkboxChecked : null]}>
                {aceitouTermos ? <Ionicons color="#FFFFFF" name="checkmark" size={17} /> : null}
              </View>
              <Text style={styles.termsText}>
                Li e aceito os <Text style={styles.link}>Termos de Uso</Text> e a{" "}
                <Text style={styles.link}>Política de Privacidade</Text>.
              </Text>
            </Pressable>
            {erros.termos ? <Text style={[styles.errorText, styles.termsError]}>{erros.termos}</Text> : null}

            {mensagemApi ? (
              <View style={[styles.feedback, sucesso ? styles.feedbackSuccess : styles.feedbackError]}>
                <Ionicons
                  color={sucesso ? "#287A4B" : "#A83A3A"}
                  name={sucesso ? "checkmark-circle-outline" : "alert-circle-outline"}
                  size={20}
                />
                <Text style={[styles.feedbackText, sucesso ? styles.successText : styles.apiErrorText]}>
                  {mensagemApi}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              onPress={enviarCadastro}
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.submitButtonPressed : null,
                enviando ? styles.submitButtonDisabled : null,
              ]}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Criar conta</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  content: { alignSelf: "center", paddingTop: 27 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  logoBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1E2E",
  },
  logoLetter: { color: "#2382DC", fontSize: 30, lineHeight: 34, fontWeight: "500" },
  brandName: { color: "#0B2030", fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  brandAccent: { color: "#2578CF" },
  headingBlock: { marginTop: 34, marginBottom: 30 },
  title: { color: "#071E2F", fontSize: 34, lineHeight: 41, fontWeight: "800", letterSpacing: -1.1 },
  subtitle: { marginTop: 7, color: "#718078", fontSize: 18, lineHeight: 26 },
  fieldGroup: { marginBottom: 20 },
  label: { marginBottom: 8, color: "#0D2333", fontSize: 16, lineHeight: 20, fontWeight: "700" },
  optional: { color: "#8A9690", fontWeight: "400" },
  inputContainer: {
    minHeight: 68,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#D7DEDA",
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F7FBF8",
  },
  inputContainerError: { borderColor: "#CF6767", backgroundColor: "#FFF9F9" },
  input: { flex: 1, paddingVertical: 17, color: "#102534", fontSize: 17, lineHeight: 22 },
  showPassword: { color: "#1474D4", fontSize: 14, fontWeight: "700" },
  errorText: { marginTop: 5, color: "#A83A3A", fontSize: 12, lineHeight: 16 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 13, marginTop: 3 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEDB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: { borderColor: "#1C74D1", backgroundColor: "#1C74D1" },
  termsText: { flex: 1, color: "#64736C", fontSize: 15, lineHeight: 22 },
  link: { color: "#1A77D1" },
  termsError: { marginLeft: 41 },
  feedback: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  feedbackSuccess: { backgroundColor: "#EAF7EF" },
  feedbackError: { backgroundColor: "#FFF0F0" },
  feedbackText: { flex: 1, fontSize: 14, lineHeight: 19 },
  successText: { color: "#287A4B" },
  apiErrorText: { color: "#A83A3A" },
  submitButton: {
    height: 58,
    marginTop: 28,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#176FD0",
    shadowColor: "#176FD0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  submitButtonPressed: { backgroundColor: "#0F5DB2", transform: [{ scale: 0.995 }] },
  submitButtonDisabled: { opacity: 0.58, shadowOpacity: 0 },
  submitButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
});
