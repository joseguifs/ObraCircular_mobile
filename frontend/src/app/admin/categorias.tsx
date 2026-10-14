import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BotaoAcao,
  Carregando,
  CartaoAdmin,
  EstadoTela,
  estilosAdmin,
  MensagemErro,
} from "@/components/admin/ComponentesAdmin";
import { CampoFormulario } from "@/components/CampoFormulario";
import { EtiquetaStatus } from "@/components/EtiquetaStatus";
import { ErrosCategoria, normalizarCategoria, validarCategoria } from "@/features/admin/acoes";
import { confirmar } from "@/features/admin/confirmar";
import { useCarregamentoAdmin } from "@/features/admin/useCarregamentoAdmin";
import {
  CategoriaAdmin,
  criarCategoriaAdmin,
  editarCategoriaAdmin,
  excluirCategoriaAdmin,
  listarCategoriasAdmin,
} from "@/services/admin";
import { cores } from "@/theme/tokens";

function ordenarPorNome(categorias: CategoriaAdmin[]) {
  return [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export default function CategoriasAdminScreen() {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [emEdicao, setEmEdicao] = useState<CategoriaAdmin | null>(null);
  const [erros, setErros] = useState<ErrosCategoria>({});
  const [salvando, setSalvando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { estado, atualizando, atualizar, tentarNovamente, definirDados, tratarErro } =
    useCarregamentoAdmin(listarCategoriasAdmin);

  function limparFormulario() {
    setEmEdicao(null);
    setNome("");
    setDescricao("");
    setErros({});
  }

  function iniciarEdicao(categoria: CategoriaAdmin) {
    setEmEdicao(categoria);
    setNome(categoria.nome);
    setDescricao(categoria.descricao ?? "");
    setErros({});
    setMensagem(null);
  }

  function substituir(categoria: CategoriaAdmin) {
    definirDados((categorias) =>
      ordenarPorNome([...categorias.filter((item) => item.id !== categoria.id), categoria]),
    );
  }

  async function salvar() {
    const novosErros = validarCategoria({ nome, descricao });
    setErros(novosErros);
    setMensagem(null);
    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    try {
      const dados = normalizarCategoria({ nome, descricao });
      substituir(emEdicao ? await editarCategoriaAdmin(emEdicao.id, dados) : await criarCategoriaAdmin(dados));
      limparFormulario();
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível salvar a categoria."));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(categoria: CategoriaAdmin) {
    const inativar = categoria.status === "ATIVA";
    if (
      inativar &&
      !(await confirmar(
        `Inativar ${categoria.nome}?`,
        "A categoria deixará de ser oferecida para novos anúncios. Os anúncios existentes continuam publicados.",
        "Inativar",
      ))
    ) {
      return;
    }
    await executar(categoria.id, async () =>
      substituir(await editarCategoriaAdmin(categoria.id, { status: inativar ? "INATIVA" : "ATIVA" })),
    );
  }

  async function excluir(categoria: CategoriaAdmin) {
    if (!(await confirmar(`Excluir ${categoria.nome}?`, "Esta ação não pode ser desfeita.", "Excluir"))) return;
    await executar(categoria.id, async () => {
      await excluirCategoriaAdmin(categoria.id);
      definirDados((categorias) => categorias.filter((item) => item.id !== categoria.id));
      if (emEdicao?.id === categoria.id) limparFormulario();
    });
  }

  async function executar(categoriaId: string, acao: () => Promise<void>) {
    setProcessando(categoriaId);
    setMensagem(null);
    try {
      await acao();
    } catch (erro) {
      setMensagem(tratarErro(erro, "Não foi possível concluir a ação."));
    } finally {
      setProcessando(null);
    }
  }

  const cabecalho = (
    <View style={estilosAdmin.cabecalhoLista}>
      <CartaoAdmin>
        <Text style={styles.formTitulo}>{emEdicao ? `Editar "${emEdicao.nome}"` : "Nova categoria"}</Text>
        <CampoFormulario error={erros.nome} icon="pricetag-outline" label="Nome">
          <TextInput
            maxLength={100}
            onChangeText={setNome}
            placeholder="Ex.: Vidros e espelhos"
            placeholderTextColor={cores.textoSuave}
            style={styles.input}
            value={nome}
          />
        </CampoFormulario>
        <CampoFormulario error={erros.descricao} icon="document-text-outline" label="Descrição" optional>
          <TextInput
            maxLength={255}
            onChangeText={setDescricao}
            placeholder="Que materiais entram nesta categoria?"
            placeholderTextColor={cores.textoSuave}
            style={styles.input}
            value={descricao}
          />
        </CampoFormulario>
        <View style={estilosAdmin.acoes}>
          <BotaoAcao
            desabilitado={salvando}
            icone={emEdicao ? "checkmark" : "add"}
            onPress={salvar}
            principal
            rotulo={salvando ? "Salvando..." : emEdicao ? "Salvar alterações" : "Adicionar categoria"}
          />
          {emEdicao ? <BotaoAcao onPress={limparFormulario} rotulo="Cancelar" /> : null}
        </View>
      </CartaoAdmin>
      <MensagemErro mensagem={mensagem} />
    </View>
  );

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={estilosAdmin.safeArea}>
      <FlatList
        contentContainerStyle={estilosAdmin.lista}
        data={estado.situacao === "pronto" ? estado.dados : []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(categoria) => categoria.id}
        ListEmptyComponent={
          estado.situacao === "carregando" ? (
            <Carregando />
          ) : estado.situacao === "falha" ? (
            <EstadoTela
              acao={{ rotulo: "Tentar novamente", onPress: tentarNovamente }}
              erro
              icone="cloud-offline-outline"
              texto={estado.mensagem}
              titulo="Não foi possível carregar as categorias"
            />
          ) : (
            <EstadoTela icone="grid-outline" titulo="Nenhuma categoria cadastrada" />
          )
        }
        ListHeaderComponent={cabecalho}
        refreshControl={<RefreshControl onRefresh={atualizar} refreshing={atualizando} />}
        renderItem={({ item: categoria }) => (
          <CartaoAdmin>
            <View style={estilosAdmin.linhaTopo}>
              <Text style={estilosAdmin.titulo}>{categoria.nome}</Text>
              <EtiquetaStatus
                rotulo={categoria.status === "ATIVA" ? "Ativa" : "Inativa"}
                tom={categoria.status === "ATIVA" ? "sucesso" : "neutro"}
              />
            </View>
            {categoria.descricao ? <Text style={estilosAdmin.subtitulo}>{categoria.descricao}</Text> : null}
            <Text style={estilosAdmin.detalhe}>{categoria.total_anuncios} anúncio(s) vinculado(s)</Text>
            <View style={estilosAdmin.acoes}>
              <BotaoAcao
                desabilitado={processando === categoria.id}
                icone="create-outline"
                onPress={() => iniciarEdicao(categoria)}
                rotulo="Editar"
              />
              <BotaoAcao
                desabilitado={processando === categoria.id}
                onPress={() => alternarStatus(categoria)}
                rotulo={categoria.status === "ATIVA" ? "Inativar" : "Ativar"}
              />
              {categoria.total_anuncios === 0 ? (
                <BotaoAcao
                  desabilitado={processando === categoria.id}
                  icone="trash-outline"
                  onPress={() => excluir(categoria)}
                  perigo
                  rotulo="Excluir"
                />
              ) : null}
            </View>
          </CartaoAdmin>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  formTitulo: { marginBottom: 8, color: cores.texto, fontSize: 18, fontWeight: "800" },
  input: { flex: 1, paddingVertical: 14, color: cores.texto, fontSize: 16 },
});
