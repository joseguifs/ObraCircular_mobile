import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Alternador,
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
import {
  AcaoAnuncio,
  acoesQueExigemConfirmacao,
  listarAcoesAnuncio,
  rotulosAcaoAnuncio,
} from "@/features/admin/acoes";
import { confirmar } from "@/features/admin/confirmar";
import { useAoMudarFiltros, useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import { descreverStatusAnuncio, formatarData, formatarPreco } from "@/features/usuarios/perfil";
import {
  AnuncioAdmin,
  excluirAnuncioAdmin,
  listarAnunciosAdmin,
  moderarAnuncio,
  restaurarAnuncioAdmin,
} from "@/services/admin";
import { StatusAnuncio } from "@/services/anuncios";
import { cores, raios } from "@/theme/tokens";

const filtrosStatus: { valor: StatusAnuncio | null; rotulo: string }[] = [
  { valor: null, rotulo: "Todos" },
  { valor: "ATIVO", rotulo: "Ativos" },
  { valor: "ESGOTADO", rotulo: "Esgotados" },
  { valor: "ENCERRADO", rotulo: "Encerrados" },
];

const mensagensConfirmacao: Partial<Record<AcaoAnuncio, string>> = {
  encerrar: "O anúncio deixará de receber interessados.",
  excluir: "O anúncio sairá das listagens do aplicativo. É possível restaurá-lo depois.",
};

function executarAcao(anuncioId: string, acao: AcaoAnuncio): Promise<AnuncioAdmin | null> {
  switch (acao) {
    case "encerrar":
      return moderarAnuncio(anuncioId, "ENCERRADO");
    case "reativar":
      return moderarAnuncio(anuncioId, "ATIVO");
    case "excluir":
      return excluirAnuncioAdmin(anuncioId);
    case "restaurar":
      return restaurarAnuncioAdmin(anuncioId);
  }
}

export default function AnunciosAdminScreen() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusAnuncio | null>(null);
  const [incluirExcluidos, setIncluirExcluidos] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { estado, atualizando, atualizar, recarregar, tentarNovamente, definirDados, tratarErro } =
    useCarregamentoAdmin(() =>
      listarAnunciosAdmin({ busca: busca.trim(), status, incluir_excluidos: incluirExcluidos }),
    );
  useAoMudarFiltros(recarregar, [busca, status, incluirExcluidos]);

  async function aoEscolherAcao(anuncio: AnuncioAdmin, acao: AcaoAnuncio) {
    const rotulo = rotulosAcaoAnuncio[acao];
    if (
      acoesQueExigemConfirmacao.has(acao) &&
      !(await confirmar(`${rotulo}: ${anuncio.titulo}?`, mensagensConfirmacao[acao] ?? "", rotulo))
    ) {
      return;
    }

    setProcessando(anuncio.id);
    setMensagem(null);
    try {
      const atualizado = await executarAcao(anuncio.id, acao);
      definirDados((anuncios) =>
        anuncios.flatMap((item) => {
          if (item.id !== anuncio.id) return [item];
          if (atualizado) return status && atualizado.status !== status ? [] : [atualizado];
          return incluirExcluidos ? [{ ...item, deletado_em: new Date().toISOString() }] : [];
        }),
      );
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível concluir a ação."));
    } finally {
      setProcessando(null);
    }
  }

  const cabecalho = (
    <View style={estilosAdmin.cabecalhoLista}>
      <CampoBusca onChange={setBusca} placeholder="Buscar por título ou vendedor" valor={busca} />
      <FiltroOpcoes onChange={setStatus} opcoes={filtrosStatus} selecionado={status} />
      <Alternador ativo={incluirExcluidos} onChange={setIncluirExcluidos} rotulo="Mostrar anúncios excluídos" />
      <MensagemErro mensagem={mensagem} />
      {estado.situacao === "pronto" ? (
        <Text style={estilosAdmin.contagem}>
          {estado.dados.length} {estado.dados.length === 1 ? "anúncio" : "anúncios"}
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
        keyExtractor={(anuncio) => anuncio.id}
        ListEmptyComponent={
          estado.situacao === "carregando" ? (
            <Carregando />
          ) : estado.situacao === "falha" ? (
            <EstadoTela
              acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
              erro
              icone="cloud-offline-outline"
              texto={estado.mensagem}
              titulo="Não foi possível carregar os anúncios"
            />
          ) : (
            <EstadoTela icone="pricetags-outline" titulo="Nenhum anúncio encontrado" />
          )
        }
        ListHeaderComponent={cabecalho}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
        renderItem={({ item: anuncio }) => {
          const situacao = descreverStatusAnuncio(anuncio.status);
          return (
            <CartaoAdmin apagado={Boolean(anuncio.deletado_em)}>
              <View style={styles.linha}>
                {anuncio.imagem_url ? (
                  <Image contentFit="cover" source={{ uri: anuncio.imagem_url }} style={styles.imagem} />
                ) : null}
                <View style={styles.textos}>
                  <Text numberOfLines={2} style={estilosAdmin.titulo}>
                    {anuncio.titulo}
                  </Text>
                  <Text style={styles.preco}>{formatarPreco(anuncio.preco)}</Text>
                  <Text style={estilosAdmin.subtitulo}>
                    {anuncio.vendedor_nome} · {anuncio.categoria_nome}
                  </Text>
                  <Text style={estilosAdmin.detalhe}>
                    {anuncio.quantidade} un. · postado em {formatarData(anuncio.postado_em) ?? "-"}
                  </Text>
                </View>
              </View>
              <View style={estilosAdmin.acoes}>
                {anuncio.deletado_em ? (
                  <EtiquetaStatus rotulo="Excluído" tom="erro" />
                ) : (
                  <EtiquetaStatus rotulo={situacao.rotulo} tom={situacao.tom} />
                )}
              </View>
              <View style={estilosAdmin.acoes}>
                {listarAcoesAnuncio(anuncio).map((acao) => (
                  <BotaoAcao
                    desabilitado={processando === anuncio.id}
                    key={acao}
                    onPress={() => aoEscolherAcao(anuncio, acao)}
                    perigo={acao === "excluir"}
                    rotulo={rotulosAcaoAnuncio[acao]}
                  />
                ))}
              </View>
            </CartaoAdmin>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 12 },
  imagem: { width: 72, height: 72, borderRadius: raios.medio, backgroundColor: cores.superficieSuave },
  textos: { flex: 1, gap: 3 },
  preco: { color: cores.destaque, fontSize: 16, fontWeight: "800" },
});
