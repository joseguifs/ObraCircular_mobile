import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
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

import { autenticarUsuario } from "../services/usuarios";

type FormErrors = Partial<Record<"email" | "senha", string>>;

function validarFormulario(email: string, senha: string) {
  const erros: FormErrors = {};

  if (!/^\S+@\S+\.\S+$/.test(email.trim())) erros.email = "Informe um e-mail válido.";
  if (senha.length === 0) erros.senha = "Informe sua senha.";

  return erros;
}

type CampoProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  children: React.ReactNode;
};

function Campo({ label, icon, error, children }: CampoProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
        <Ionicons color="#839089" name={icon} size={21} />
        {children}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function LoginScreen() {
  const { width: larguraTela } = useWindowDimensions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<FormErrors>({});
  const [mensagemApi, setMensagemApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    const novosErros = validarFormulario(email, senha);

    setErros(novosErros);
    setMensagemApi(null);

    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const usuario = await autenticarUsuario({
        email: email.trim().toLowerCase(),
        senha,
      });
      router.replace({ pathname: "/home", params: { nome: usuario.nome } });
    } catch (error) {
      setMensagemApi(error instanceof Error ? error.message : "Não foi possível entrar.");
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
              <Text style={styles.title}>Bem-vindo de volta</Text>
              <Text style={styles.subtitle}>Entre para comprar, vender e{"\n"}reaproveitar materiais.</Text>
            </View>

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
                autoComplete="current-password"
                maxLength={72}
                onChangeText={setSenha}
                onSubmitEditing={entrar}
                placeholder="Sua senha"
                placeholderTextColor="#A1AAA5"
                returnKeyType="done"
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

            {mensagemApi ? (
              <View style={[styles.feedback, styles.feedbackError]}>
                <Ionicons color="#A83A3A" name="alert-circle-outline" size={20} />
                <Text style={[styles.feedbackText, styles.apiErrorText]}>{mensagemApi}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              onPress={entrar}
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.submitButtonPressed : null,
                enviando ? styles.submitButtonDisabled : null,
              ]}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Entrar</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Não tem conta?</Text>
              <Link href="/" style={styles.link}>
                Criar conta
              </Link>
            </View>
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
  feedback: {
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  feedbackError: { backgroundColor: "#FFF0F0" },
  feedbackText: { flex: 1, fontSize: 14, lineHeight: 19 },
  apiErrorText: { color: "#A83A3A" },
  submitButton: {
    height: 58,
    marginTop: 8,
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
  footerRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { color: "#64736C", fontSize: 15, lineHeight: 22 },
  link: { color: "#1A77D1", fontSize: 15, lineHeight: 22, fontWeight: "700" },
});
