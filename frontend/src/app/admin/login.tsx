import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MensagemErro } from "@/components/admin/ComponentesAdmin";
import { CampoFormulario } from "@/components/CampoFormulario";
import { Marca } from "@/components/Marca";
import { entrarComoAdmin } from "@/services/admin";
import { cores, raios } from "@/theme/tokens";

export default function LoginAdminScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [mensagemApi, setMensagemApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    const novosErros = {
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : "Informe um e-mail válido.",
      senha: senha.length > 0 ? undefined : "Informe sua senha.",
    };
    setErros(novosErros);
    setMensagemApi(null);
    if (novosErros.email || novosErros.senha) return;

    setEnviando(true);
    try {
      await entrarComoAdmin(email.trim().toLowerCase(), senha);
      router.replace("/admin");
    } catch (erro) {
      setMensagemApi(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Marca />
            <View style={styles.selo}>
              <Ionicons color={cores.acao} name="shield-checkmark-outline" size={16} />
              <Text style={styles.seloTexto}>Área administrativa</Text>
            </View>
            <Text style={styles.titulo}>Painel de gestão</Text>
            <Text style={styles.subtitulo}>Entre com uma conta de administrador para gerenciar usuários, anúncios e categorias.</Text>

            <CampoFormulario error={erros.email} icon="mail-outline" label="E-mail">
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                inputMode="email"
                keyboardType="email-address"
                maxLength={255}
                onChangeText={setEmail}
                placeholder="admin@email.com"
                placeholderTextColor={cores.textoSuave}
                style={styles.input}
                value={email}
              />
            </CampoFormulario>

            <CampoFormulario error={erros.senha} icon="lock-closed-outline" label="Senha">
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                maxLength={72}
                onChangeText={setSenha}
                onSubmitEditing={entrar}
                placeholder="Sua senha"
                placeholderTextColor={cores.textoSuave}
                secureTextEntry
                style={styles.input}
                value={senha}
              />
            </CampoFormulario>

            <MensagemErro mensagem={mensagemApi} />

            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              onPress={entrar}
              style={({ pressed }) => [
                styles.botao,
                pressed ? styles.botaoPressionado : null,
                enviando ? styles.botaoDesabilitado : null,
              ]}
            >
              {enviando ? <ActivityIndicator color={cores.superficie} /> : <Text style={styles.botaoTexto}>Entrar no painel</Text>}
            </Pressable>

            <Pressable accessibilityRole="link" onPress={() => router.replace("/login")} style={styles.voltar}>
              <Text style={styles.voltarTexto}>Voltar ao login do app</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.superficie },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 28 },
  content: { width: "100%", maxWidth: 464, alignSelf: "center", paddingHorizontal: 24, paddingTop: 27 },
  selo: {
    marginTop: 34,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: raios.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF3FC",
  },
  seloTexto: { color: cores.acao, fontSize: 13, fontWeight: "800" },
  titulo: { marginTop: 14, color: cores.texto, fontSize: 32, lineHeight: 39, fontWeight: "800", letterSpacing: -1 },
  subtitulo: { marginTop: 7, marginBottom: 28, color: cores.textoSecundario, fontSize: 16, lineHeight: 23 },
  input: { flex: 1, paddingVertical: 16, color: cores.texto, fontSize: 17 },
  botao: {
    height: 56,
    marginTop: 12,
    borderRadius: raios.grande,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.acao,
  },
  botaoPressionado: { backgroundColor: cores.acaoPressionada },
  botaoDesabilitado: { opacity: 0.58 },
  botaoTexto: { color: cores.superficie, fontSize: 17, fontWeight: "800" },
  voltar: { marginTop: 22, alignSelf: "center", padding: 6 },
  voltarTexto: { color: cores.acao, fontSize: 15, fontWeight: "700" },
});
