import { Ionicons } from "@expo/vector-icons";
import { Href, Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Carregando, EstadoTela, estilosAdmin } from "@/components/admin/ComponentesAdmin";
import { useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import { obterAdminAtual, obterResumo, sairDoAdmin } from "@/services/admin";
import { cores, raios } from "@/theme/tokens";

type Secao = {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  rota: Href;
  principal: { valor: number; rotulo: string };
  detalhes: { valor: number; rotulo: string }[];
};

export default function PainelAdminScreen() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const { estado, atualizando, atualizar, tentarNovamente } = useCarregamentoAdmin(async () => {
    const [admin, resumo] = await Promise.all([obterAdminAtual(), obterResumo()]);
    return { admin, resumo };
  });

  async function sair() {
    setSaindo(true);
    await sairDoAdmin().catch(() => undefined);
    router.replace("/admin/login");
  }

  const botaoSair = () => (
    <Pressable accessibilityLabel="Sair do painel" disabled={saindo} hitSlop={8} onPress={sair} style={styles.sair}>
      <Ionicons color={cores.acao} name="log-out-outline" size={22} />
    </Pressable>
  );

  if (estado.situacao === "carregando") return <Carregando />;
  if (estado.situacao === "falha") {
    return (
      <EstadoTela
        acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
        erro
        icone="cloud-offline-outline"
        texto={estado.mensagem}
        titulo="Não foi possível carregar o painel"
      />
    );
  }

  const { admin, resumo } = estado.dados;
  const secoes: Secao[] = [
    {
      titulo: "Usuários",
      icone: "people-outline",
      rota: "/admin/usuarios",
      principal: { valor: resumo.usuarios.total, rotulo: "cadastrados" },
      detalhes: [
        { valor: resumo.usuarios.ativos, rotulo: "ativos" },
        { valor: resumo.usuarios.bloqueados, rotulo: "bloqueados" },
        { valor: resumo.usuarios.administradores, rotulo: "admins" },
      ],
    },
    {
      titulo: "Anúncios",
      icone: "pricetags-outline",
      rota: "/admin/anuncios",
      principal: { valor: resumo.anuncios.total, rotulo: "publicados" },
      detalhes: [
        { valor: resumo.anuncios.ativos, rotulo: "ativos" },
        { valor: resumo.anuncios.encerrados, rotulo: "encerrados" },
        { valor: resumo.anuncios.excluidos, rotulo: "excluídos" },
      ],
    },
    {
      titulo: "Categorias",
      icone: "grid-outline",
      rota: "/admin/categorias",
      principal: { valor: resumo.categorias.total, rotulo: "cadastradas" },
      detalhes: [
        { valor: resumo.categorias.ativas, rotulo: "ativas" },
        { valor: resumo.categorias.inativas, rotulo: "inativas" },
      ],
    },
  ];

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={estilosAdmin.safeArea}>
      <Stack.Screen options={{ headerRight: botaoSair }} />
      <ScrollView
        contentContainerStyle={estilosAdmin.lista}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
      >
        <View style={styles.saudacao}>
          <Text style={styles.ola}>Olá, {admin.nome.split(" ")[0]}</Text>
          <Text style={estilosAdmin.subtitulo}>Acompanhe e gerencie o ObraCircular.</Text>
        </View>

        {secoes.map((secao) => (
          <Pressable
            accessibilityRole="link"
            key={secao.titulo}
            onPress={() => router.push(secao.rota)}
            style={({ pressed }) => [styles.cartao, pressed ? styles.cartaoPressionado : null]}
          >
            <View style={styles.cartaoTopo}>
              <View style={styles.icone}>
                <Ionicons color={cores.acao} name={secao.icone} size={22} />
              </View>
              <Text style={styles.cartaoTitulo}>{secao.titulo}</Text>
              <Ionicons color={cores.textoSuave} name="chevron-forward" size={20} />
            </View>
            <Text style={styles.numero}>
              {secao.principal.valor} <Text style={styles.numeroRotulo}>{secao.principal.rotulo}</Text>
            </Text>
            <View style={styles.detalhes}>
              {secao.detalhes.map((detalhe) => (
                <Text key={detalhe.rotulo} style={styles.detalhe}>
                  <Text style={styles.detalheValor}>{detalhe.valor}</Text> {detalhe.rotulo}
                </Text>
              ))}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sair: { padding: 8, marginRight: 4 },
  saudacao: { marginBottom: 6, gap: 4 },
  ola: { color: cores.texto, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  cartao: {
    padding: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 22,
    gap: 10,
    backgroundColor: cores.superficie,
  },
  cartaoPressionado: { backgroundColor: cores.superficieSuave },
  cartaoTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: {
    width: 42,
    height: 42,
    borderRadius: raios.medio,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FC",
  },
  cartaoTitulo: { flex: 1, color: cores.texto, fontSize: 18, fontWeight: "800" },
  numero: { color: cores.texto, fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
  numeroRotulo: { color: cores.textoSecundario, fontSize: 15, fontWeight: "600", letterSpacing: 0 },
  detalhes: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4 },
  detalhe: { color: cores.textoSecundario, fontSize: 14 },
  detalheValor: { color: cores.texto, fontWeight: "800" },
});
