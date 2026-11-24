import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BotaoAcao,
  CampoBusca,
  Carregando,
  CartaoAdmin,
  EstadoTela,
  estilosAdmin,
  FiltroOpcoes,
  MensagemErro,
} from "@/components/admin/ComponentesAdmin";
import { EtiquetaStatus } from "@/components/EtiquetaStatus";
import { AcaoPergunta, listarAcoesPergunta, rotulosAcaoPergunta } from "@/features/admin/acoes";
import { confirmar } from "@/features/admin/confirmar";
import { useAoMudarFiltros, useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import { formatarData } from "@/features/usuarios/perfil";
import {
  excluirPerguntaAdmin,
  listarPerguntasAdmin,
  PerguntaAdmin,
  removerRespostaAdmin,
} from "@/services/admin";
import { cores, raios } from "@/theme/tokens";

type FiltroResposta = "PENDENTES" | "RESPONDIDAS";

const filtrosResposta: { valor: FiltroResposta | null; rotulo: string }[] = [
  { valor: null, rotulo: "Todas" },
  { valor: "PENDENTES", rotulo: "Sem resposta" },
  { valor: "RESPONDIDAS", rotulo: "Respondidas" },
];

const mensagensConfirmacao: Record<AcaoPergunta, string> = {
  removerResposta: "A resposta será apagada e o vendedor poderá responder novamente.",
  excluir: "A pergunta e a resposta serão apagadas definitivamente do anúncio.",
};

export default function PerguntasAdminScreen() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroResposta | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { estado, atualizando, atualizar, recarregar, tentarNovamente, definirDados, tratarErro } =
    useCarregamentoAdmin(() =>
      listarPerguntasAdmin({
        busca: busca.trim(),
        respondidas: filtro === null ? null : filtro === "RESPONDIDAS",
      }),
    );
  useAoMudarFiltros(recarregar, [busca, filtro]);

  async function aoEscolherAcao(pergunta: PerguntaAdmin, acao: AcaoPergunta) {
    const rotulo = rotulosAcaoPergunta[acao];
    if (!(await confirmar(`${rotulo}?`, mensagensConfirmacao[acao], rotulo))) return;

    setProcessando(pergunta.id);
    setMensagem(null);
    try {
      if (acao === "excluir") {
        await excluirPerguntaAdmin(pergunta.id);
        definirDados((perguntas) => perguntas.filter((item) => item.id !== pergunta.id));
      } else {
        const atualizada = await removerRespostaAdmin(pergunta.id);
        definirDados((perguntas) =>
          perguntas.flatMap((item) => {
            if (item.id !== pergunta.id) return [item];
            return filtro === "RESPONDIDAS" ? [] : [atualizada];
          }),
        );
      }
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível concluir a ação."));
    } finally {
      setProcessando(null);
    }
  }

  const cabecalho = (
    <View style={estilosAdmin.cabecalhoLista}>
      <CampoBusca onChange={setBusca} placeholder="Buscar por texto, anúncio ou autor" valor={busca} />
      <FiltroOpcoes onChange={setFiltro} opcoes={filtrosResposta} selecionado={filtro} />
      <MensagemErro mensagem={mensagem} />
      {estado.situacao === "pronto" ? (
        <Text style={estilosAdmin.contagem}>
          {estado.dados.length} {estado.dados.length === 1 ? "pergunta" : "perguntas"}
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
        keyExtractor={(pergunta) => pergunta.id}
        ListEmptyComponent={
          estado.situacao === "carregando" ? (
            <Carregando />
          ) : estado.situacao === "falha" ? (
            <EstadoTela
              acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
              erro
              icone="cloud-offline-outline"
              texto={estado.mensagem}
              titulo="Não foi possível carregar as perguntas"
            />
          ) : (
            <EstadoTela icone="chatbubbles-outline" titulo="Nenhuma pergunta encontrada" />
          )
        }
        ListHeaderComponent={cabecalho}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
        renderItem={({ item: pergunta }) => (
          <CartaoAdmin>
            <View style={estilosAdmin.linhaTopo}>
              <Text numberOfLines={1} style={estilosAdmin.titulo}>
                {pergunta.anuncio_titulo}
              </Text>
              {pergunta.resposta === null ? (
                <EtiquetaStatus rotulo="Sem resposta" tom="alerta" />
              ) : (
                <EtiquetaStatus rotulo="Respondida" tom="sucesso" />
              )}
            </View>
            <Text style={styles.pergunta}>{pergunta.pergunta}</Text>
            <Text style={estilosAdmin.detalhe}>
              {pergunta.autor_nome} · {formatarData(pergunta.criado_em) ?? "-"}
            </Text>
            {pergunta.resposta !== null ? (
              <View style={styles.resposta}>
                <Text style={styles.respostaTexto}>{pergunta.resposta}</Text>
                <Text style={estilosAdmin.detalhe}>
                  {pergunta.vendedor_nome} (vendedor)
                  {pergunta.respondido_em ? ` · ${formatarData(pergunta.respondido_em) ?? "-"}` : ""}
                </Text>
              </View>
            ) : null}
            <View style={estilosAdmin.acoes}>
              {listarAcoesPergunta(pergunta).map((acao) => (
                <BotaoAcao
                  desabilitado={processando === pergunta.id}
                  key={acao}
                  onPress={() => aoEscolherAcao(pergunta, acao)}
                  perigo
                  rotulo={rotulosAcaoPergunta[acao]}
                />
              ))}
            </View>
          </CartaoAdmin>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pergunta: { color: cores.texto, fontSize: 15, lineHeight: 21 },
  resposta: {
    gap: 4,
    padding: 12,
    borderRadius: raios.medio,
    backgroundColor: cores.superficieSuave,
  },
  respostaTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
});
