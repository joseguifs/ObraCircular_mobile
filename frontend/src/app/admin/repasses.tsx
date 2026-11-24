import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BotaoAcao,
  Carregando,
  CartaoAdmin,
  EstadoTela,
  estilosAdmin,
  FiltroOpcoes,
  MensagemErro,
} from "@/components/admin/ComponentesAdmin";
import { EtiquetaStatus } from "@/components/EtiquetaStatus";
import { confirmar } from "@/features/admin/confirmar";
import {
  formatarPercentualTaxa,
  formatarValor,
  obterEtiquetaRepasse,
  podeMarcarComoRepassado,
  somarValorPendente,
} from "@/features/admin/repasses";
import { useAoMudarFiltros, useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import { formatarData, formatarTelefone } from "@/features/usuarios/perfil";
import { listarRepassesAdmin, marcarRepasseComoPago, RepasseAdmin, StatusRepasse } from "@/services/admin";
import { cores, raios } from "@/theme/tokens";

const filtrosStatus: { valor: StatusRepasse | null; rotulo: string }[] = [
  { valor: "PENDENTE", rotulo: "A repassar" },
  { valor: "PAGO", rotulo: "Repassados" },
  { valor: null, rotulo: "Todos" },
];

export default function RepassesAdminScreen() {
  // A fila do que ainda precisa ser transferido é a visão mais usada.
  const [filtro, setFiltro] = useState<StatusRepasse | null>("PENDENTE");
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { estado, atualizando, atualizar, recarregar, tentarNovamente, definirDados, tratarErro } =
    useCarregamentoAdmin(() => listarRepassesAdmin({ status: filtro }));
  useAoMudarFiltros(recarregar, [filtro], 0);

  async function marcarComoRepassado(repasse: RepasseAdmin) {
    const valor = formatarValor(repasse.valor_liquido);
    const confirmado = await confirmar(
      "Marcar como repassado?",
      `Confirme que você já transferiu ${valor} para a chave Pix ${repasse.chave_pix} de ${repasse.vendedor_nome}.`,
      "Marcar como repassado",
    );
    if (!confirmado) return;

    setProcessando(repasse.pedido_id);
    setMensagem(null);
    try {
      const observacao = observacoes[repasse.pedido_id]?.trim() || null;
      const atualizado = await marcarRepasseComoPago(repasse.pedido_id, observacao);
      definirDados((repasses) =>
        repasses.flatMap((item) => {
          if (item.pedido_id !== repasse.pedido_id) return [item];
          // Na fila "A repassar" o item sai da lista depois de pago.
          return filtro === "PENDENTE" ? [] : [atualizado];
        }),
      );
      setObservacoes(({ [repasse.pedido_id]: _, ...restantes }) => restantes);
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível registrar o repasse."));
    } finally {
      setProcessando(null);
    }
  }

  const cabecalho = (
    <View style={estilosAdmin.cabecalhoLista}>
      <Text style={estilosAdmin.subtitulo}>
        Transfira o valor líquido pela conta do Mercado Pago da Obra Circular e depois registre o repasse aqui.
      </Text>
      <FiltroOpcoes onChange={setFiltro} opcoes={filtrosStatus} selecionado={filtro} />
      <MensagemErro mensagem={mensagem} />
      {estado.situacao === "pronto" ? (
        <Text style={estilosAdmin.contagem}>
          {estado.dados.length} {estado.dados.length === 1 ? "venda" : "vendas"}
          {filtro !== "PAGO" ? ` · ${formatarValor(somarValorPendente(estado.dados))} a repassar` : ""}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={estilosAdmin.safeArea}>
      <FlatList
        contentContainerStyle={estilosAdmin.lista}
        data={estado.situacao === "pronto" ? estado.dados : []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(repasse) => repasse.pedido_id}
        ListEmptyComponent={
          estado.situacao === "carregando" ? (
            <Carregando />
          ) : estado.situacao === "falha" ? (
            <EstadoTela
              acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
              erro
              icone="cloud-offline-outline"
              texto={estado.mensagem}
              titulo="Não foi possível carregar os repasses"
            />
          ) : (
            <EstadoTela
              icone="wallet-outline"
              texto={filtro === "PENDENTE" ? "Todas as vendas pagas já foram repassadas." : undefined}
              titulo="Nenhum repasse encontrado"
            />
          )
        }
        ListHeaderComponent={cabecalho}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
        renderItem={({ item: repasse }) => {
          const etiqueta = obterEtiquetaRepasse(repasse);
          const percentual = formatarPercentualTaxa(repasse.valor_bruto, repasse.taxa_marketplace);
          const telefone = formatarTelefone(repasse.vendedor_telefone);
          return (
            <CartaoAdmin>
              <View style={estilosAdmin.linhaTopo}>
                <Text numberOfLines={2} style={estilosAdmin.titulo}>
                  {repasse.titulo}
                </Text>
                <EtiquetaStatus rotulo={etiqueta.rotulo} tom={etiqueta.tom} />
              </View>

              {repasse.alerta_reembolso ? (
                <View style={styles.alerta}>
                  <Ionicons color={cores.erro} name="warning-outline" size={18} />
                  <Text style={styles.alertaTexto}>
                    O pedido foi reembolsado ao comprador depois do repasse. O valor já saiu da conta: combine a
                    devolução com o vendedor.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.valorLiquido}>{formatarValor(repasse.valor_liquido)}</Text>
              <Text style={estilosAdmin.detalhe}>
                Venda de {formatarValor(repasse.valor_bruto)} − taxa de {formatarValor(repasse.taxa_marketplace)}
                {percentual ? ` (${percentual})` : ""}
              </Text>

              <View style={styles.vendedor}>
                <Text style={styles.vendedorNome}>{repasse.vendedor_nome}</Text>
                <Text style={estilosAdmin.detalhe}>
                  {repasse.vendedor_email}
                  {telefone ? ` · ${telefone}` : ""}
                </Text>
                <View style={styles.chavePix}>
                  <Ionicons color={repasse.chave_pix ? cores.acao : cores.textoSuave} name="key-outline" size={16} />
                  {repasse.chave_pix ? (
                    <Text selectable style={styles.chavePixTexto}>
                      {repasse.chave_pix}
                    </Text>
                  ) : (
                    <Text style={estilosAdmin.detalhe}>
                      Chave Pix não cadastrada. Peça ao vendedor para informá-la em “Editar dados” no perfil.
                    </Text>
                  )}
                </View>
              </View>

              <Text style={estilosAdmin.detalhe}>
                Pago em {repasse.pedido_pago_em ? (formatarData(repasse.pedido_pago_em) ?? "-") : "-"}
                {repasse.pagamento_externo_id ? ` · Mercado Pago nº ${repasse.pagamento_externo_id}` : ""}
              </Text>
              {repasse.repassado_em ? (
                <Text style={estilosAdmin.detalhe}>
                  Repassado em {formatarData(repasse.repassado_em) ?? "-"}
                  {repasse.observacao ? ` · ${repasse.observacao}` : ""}
                </Text>
              ) : null}

              {podeMarcarComoRepassado(repasse) ? (
                <>
                  <TextInput
                    accessibilityLabel="Comprovante da transferência (opcional)"
                    editable={processando !== repasse.pedido_id}
                    maxLength={255}
                    onChangeText={(valor) =>
                      setObservacoes((atuais) => ({ ...atuais, [repasse.pedido_id]: valor }))
                    }
                    placeholder="Comprovante da transferência (opcional)"
                    placeholderTextColor={cores.textoSuave}
                    style={styles.observacao}
                    value={observacoes[repasse.pedido_id] ?? ""}
                  />
                  <View style={estilosAdmin.acoes}>
                    <BotaoAcao
                      desabilitado={processando === repasse.pedido_id}
                      icone="checkmark-circle-outline"
                      onPress={() => marcarComoRepassado(repasse)}
                      principal
                      rotulo="Marcar como repassado"
                    />
                  </View>
                </>
              ) : null}
            </CartaoAdmin>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  alerta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: raios.medio,
    backgroundColor: cores.erroFundo,
  },
  alertaTexto: { flex: 1, color: cores.erro, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  valorLiquido: { color: cores.texto, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  vendedor: {
    gap: 4,
    padding: 12,
    borderRadius: raios.medio,
    backgroundColor: cores.superficieSuave,
  },
  vendedorNome: { color: cores.texto, fontSize: 15, fontWeight: "700" },
  chavePix: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  chavePixTexto: { flex: 1, color: cores.acao, fontSize: 14, fontWeight: "700" },
  observacao: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.medio,
    color: cores.texto,
    fontSize: 14,
    backgroundColor: cores.superficie,
  },
});
