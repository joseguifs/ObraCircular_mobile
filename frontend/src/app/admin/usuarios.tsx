import { useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
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
  AcaoUsuario,
  acoesQueExigemConfirmacao,
  listarAcoesUsuario,
  rotulosAcaoUsuario,
} from "@/features/admin/acoes";
import { confirmar } from "@/features/admin/confirmar";
import { useAoMudarFiltros, useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import { descreverStatusUsuario, formatarData, formatarTelefone } from "@/features/usuarios/perfil";
import {
  atualizarUsuarioAdmin,
  excluirUsuarioAdmin,
  listarUsuariosAdmin,
  obterIdAdminAtual,
  restaurarUsuarioAdmin,
  StatusUsuario,
  UsuarioAdmin,
} from "@/services/admin";

const filtrosStatus: { valor: StatusUsuario | null; rotulo: string }[] = [
  { valor: null, rotulo: "Todos" },
  { valor: "ATIVO", rotulo: "Ativos" },
  { valor: "INATIVO", rotulo: "Inativos" },
  { valor: "BLOQUEADO", rotulo: "Bloqueados" },
];

const mensagensConfirmacao: Partial<Record<AcaoUsuario, string>> = {
  bloquear: "O usuário não conseguirá mais entrar no aplicativo.",
  inativar: "O usuário não conseguirá entrar até ser reativado.",
  promover: "O usuário passará a ter acesso total a este painel.",
  rebaixar: "O usuário perderá o acesso a este painel imediatamente.",
  excluir: "O usuário deixará de aparecer no aplicativo. É possível restaurá-lo depois.",
};

function executarAcao(usuarioId: string, acao: AcaoUsuario): Promise<UsuarioAdmin | null> {
  switch (acao) {
    case "ativar":
      return atualizarUsuarioAdmin(usuarioId, { status: "ATIVO" });
    case "inativar":
      return atualizarUsuarioAdmin(usuarioId, { status: "INATIVO" });
    case "bloquear":
      return atualizarUsuarioAdmin(usuarioId, { status: "BLOQUEADO" });
    case "promover":
      return atualizarUsuarioAdmin(usuarioId, { papel: "ADMIN" });
    case "rebaixar":
      return atualizarUsuarioAdmin(usuarioId, { papel: "USUARIO" });
    case "excluir":
      return excluirUsuarioAdmin(usuarioId);
    case "restaurar":
      return restaurarUsuarioAdmin(usuarioId);
  }
}

export default function UsuariosAdminScreen() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusUsuario | null>(null);
  const [incluirExcluidos, setIncluirExcluidos] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { estado, atualizando, atualizar, recarregar, tentarNovamente, definirDados, tratarErro } =
    useCarregamentoAdmin(async () => {
      const [usuarios, adminId] = await Promise.all([
        listarUsuariosAdmin({ busca: busca.trim(), status, incluir_excluidos: incluirExcluidos }),
        obterIdAdminAtual(),
      ]);
      return { usuarios, adminId };
    });
  useAoMudarFiltros(recarregar, [busca, status, incluirExcluidos]);

  async function aoEscolherAcao(usuario: UsuarioAdmin, acao: AcaoUsuario) {
    const rotulo = rotulosAcaoUsuario[acao];
    if (
      acoesQueExigemConfirmacao.has(acao) &&
      !(await confirmar(`${rotulo}: ${usuario.nome}?`, mensagensConfirmacao[acao] ?? "", rotulo))
    ) {
      return;
    }

    setProcessando(usuario.id);
    setMensagem(null);
    try {
      const atualizado = await executarAcao(usuario.id, acao);
      definirDados((dados) => ({
        ...dados,
        usuarios: dados.usuarios.flatMap((item) => {
          if (item.id !== usuario.id) return [item];
          if (atualizado) return status && atualizado.status !== status ? [] : [atualizado];
          // Exclusão: some da lista, a menos que os excluídos estejam visíveis.
          return incluirExcluidos ? [{ ...item, deletado_em: new Date().toISOString() }] : [];
        }),
      }));
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível concluir a ação."));
    } finally {
      setProcessando(null);
    }
  }

  const cabecalho = (
    <View style={estilosAdmin.cabecalhoLista}>
      <CampoBusca onChange={setBusca} placeholder="Buscar por nome ou e-mail" valor={busca} />
      <FiltroOpcoes onChange={setStatus} opcoes={filtrosStatus} selecionado={status} />
      <Alternador ativo={incluirExcluidos} onChange={setIncluirExcluidos} rotulo="Mostrar usuários excluídos" />
      <MensagemErro mensagem={mensagem} />
      {estado.situacao === "pronto" ? (
        <Text style={estilosAdmin.contagem}>
          {estado.dados.usuarios.length} {estado.dados.usuarios.length === 1 ? "usuário" : "usuários"}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={estilosAdmin.safeArea}>
      <FlatList
        contentContainerStyle={estilosAdmin.lista}
        data={estado.situacao === "pronto" ? estado.dados.usuarios : []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(usuario) => usuario.id}
        ListEmptyComponent={
          estado.situacao === "carregando" ? (
            <Carregando />
          ) : estado.situacao === "falha" ? (
            <EstadoTela
              acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
              erro
              icone="cloud-offline-outline"
              texto={estado.mensagem}
              titulo="Não foi possível carregar os usuários"
            />
          ) : (
            <EstadoTela icone="people-outline" titulo="Nenhum usuário encontrado" />
          )
        }
        ListHeaderComponent={cabecalho}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
        renderItem={({ item: usuario }) => {
          const adminId = estado.situacao === "pronto" ? estado.dados.adminId : null;
          const situacao = descreverStatusUsuario(usuario.status);
          const telefone = formatarTelefone(usuario.telefone);
          return (
            <CartaoAdmin apagado={Boolean(usuario.deletado_em)}>
              <View style={estilosAdmin.linhaTopo}>
                <Text numberOfLines={1} style={estilosAdmin.titulo}>
                  {usuario.nome}
                  {usuario.id === adminId ? " (você)" : ""}
                </Text>
                {usuario.papel === "ADMIN" ? <EtiquetaStatus rotulo="Admin" tom="alerta" /> : null}
              </View>
              <Text style={estilosAdmin.subtitulo}>{usuario.email}</Text>
              <Text style={estilosAdmin.detalhe}>
                {[telefone, `${usuario.total_anuncios} anúncio(s)`, `desde ${formatarData(usuario.criado_em) ?? "-"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <View style={estilosAdmin.acoes}>
                {usuario.deletado_em ? (
                  <EtiquetaStatus rotulo="Excluído" tom="erro" />
                ) : (
                  <EtiquetaStatus rotulo={situacao.rotulo} tom={situacao.tom} />
                )}
              </View>
              <View style={estilosAdmin.acoes}>
                {listarAcoesUsuario(usuario, adminId).map((acao) => (
                  <BotaoAcao
                    desabilitado={processando === usuario.id}
                    key={acao}
                    onPress={() => aoEscolherAcao(usuario, acao)}
                    perigo={acao === "bloquear" || acao === "excluir"}
                    rotulo={rotulosAcaoUsuario[acao]}
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
