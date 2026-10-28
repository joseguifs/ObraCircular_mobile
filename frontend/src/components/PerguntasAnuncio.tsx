import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  contarPendentes,
  descreverTotalPerguntas,
  formatarTempoRelativo,
  mesclarPerguntas,
  PERGUNTA_MAX,
  RESPOSTA_MAX,
  validarPergunta,
  validarResposta,
} from "@/features/anuncios/perguntas";
import { Anuncio } from "@/services/anuncios";
import { criarPergunta, listarPerguntas, PerguntaAnuncio, responderPergunta } from "@/services/perguntas";
import { cores, raios } from "@/theme/tokens";

const POR_PAGINA = 10;

type PerguntasAnuncioProps = {
  anuncio: Anuncio;
  // Usuário logado (vem da navegação). Vazio quando a tela foi aberta sem login.
  usuarioId?: string;
};

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error && erro.message ? erro.message : padrao;
}

export function PerguntasAnuncio({ anuncio, usuarioId }: PerguntasAnuncioProps) {
  const logado = Boolean(usuarioId);
  const ehVendedor = logado && usuarioId === anuncio.vendedor_id;
  const encerrado = anuncio.status === "ENCERRADO";
  const podePerguntar = !ehVendedor && !encerrado;

  const [perguntas, setPerguntas] = useState<PerguntaAnuncio[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const [tentativa, setTentativa] = useState(0);

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    let ativo = true;
    listarPerguntas(anuncio.id, { offset: 0, limit: POR_PAGINA })
      .then((resposta) => {
        if (!ativo) return;
        setPerguntas(resposta.items);
        setTotal(resposta.total);
        setErroLista("");
      })
      .catch((erro: unknown) => {
        if (ativo) setErroLista(mensagemErro(erro, "Não foi possível carregar as perguntas."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [anuncio.id, tentativa]);

  function recarregar() {
    setCarregando(true);
    setErroLista("");
    setTentativa((atual) => atual + 1);
  }

  async function carregarMais() {
    setCarregandoMais(true);
    try {
      const resposta = await listarPerguntas(anuncio.id, { offset: perguntas.length, limit: POR_PAGINA });
      setPerguntas((atuais) => mesclarPerguntas(atuais, resposta.items));
      setTotal(resposta.total);
    } catch (erro) {
      setErroLista(mensagemErro(erro, "Não foi possível carregar mais perguntas."));
    } finally {
      setCarregandoMais(false);
    }
  }

  async function enviarPergunta() {
    if (!usuarioId || enviando) return;
    const erro = validarPergunta(texto);
    if (erro) {
      setErroEnvio(erro);
      return;
    }

    setEnviando(true);
    setErroEnvio("");
    setEnviada(false);
    try {
      const criada = await criarPergunta(anuncio.id, usuarioId, texto.trim());
      setPerguntas((atuais) => [criada, ...atuais]);
      setTotal((atual) => atual + 1);
      setTexto("");
      setEnviada(true);
    } catch (erroRecebido) {
      setErroEnvio(mensagemErro(erroRecebido, "Não foi possível enviar sua pergunta."));
    } finally {
      setEnviando(false);
    }
  }

  function atualizarPergunta(atualizada: PerguntaAnuncio) {
    setPerguntas((atuais) => atuais.map((item) => (item.id === atualizada.id ? atualizada : item)));
  }

  const pendentes = contarPendentes(perguntas);

  return (
    <View style={styles.secao}>
      <Text accessibilityRole="header" style={styles.secaoTitulo}>Perguntas e respostas</Text>

      {ehVendedor ? (
        <View style={styles.aviso}>
          <Ionicons color="#25415F" name="storefront-outline" size={17} />
          <Text style={styles.avisoTexto}>
            Este anúncio é seu.{" "}
            {pendentes > 0
              ? `Você tem ${pendentes} ${pendentes === 1 ? "pergunta" : "perguntas"} aguardando resposta.`
              : "As perguntas dos interessados aparecem aqui para você responder."}
          </Text>
        </View>
      ) : null}

      {encerrado && !ehVendedor ? (
        <View style={styles.aviso}>
          <Ionicons color="#25415F" name="lock-closed-outline" size={17} />
          <Text style={styles.avisoTexto}>Este anúncio foi encerrado e não recebe novas perguntas.</Text>
        </View>
      ) : null}

      {podePerguntar && logado ? (
        <View style={styles.formulario}>
          <Text style={styles.rotulo}>Pergunte ao vendedor</Text>
          <TextInput
            accessibilityHint="Sua pergunta ficará visível para todos"
            accessibilityLabel="Pergunte ao vendedor"
            editable={!enviando}
            maxLength={PERGUNTA_MAX}
            multiline
            onChangeText={(valor) => {
              setTexto(valor);
              setEnviada(false);
              if (erroEnvio) setErroEnvio("");
            }}
            placeholder="Escreva sua pergunta..."
            placeholderTextColor={cores.textoSuave}
            style={[styles.campo, erroEnvio ? styles.campoErro : null]}
            textAlignVertical="top"
            value={texto}
          />
          <View style={styles.formularioRodape}>
            <Text style={styles.ajuda}>Não compartilhe telefone, e-mail ou dados pessoais.</Text>
            <Text style={styles.contador}>{texto.length}/{PERGUNTA_MAX}</Text>
          </View>
          {erroEnvio ? (
            <Text accessibilityLiveRegion="polite" style={styles.erro}>{erroEnvio}</Text>
          ) : null}
          {enviada ? (
            <Text accessibilityLiveRegion="polite" style={styles.sucesso}>
              Pergunta enviada! A resposta do vendedor vai aparecer aqui.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: enviando, busy: enviando }}
            disabled={enviando}
            onPress={enviarPergunta}
            style={({ pressed }) => [
              styles.botaoPrincipal,
              pressed ? styles.botaoPrincipalPressionado : null,
              enviando ? styles.botaoDesativado : null,
            ]}
          >
            {enviando ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <Text style={styles.botaoPrincipalTexto}>{enviando ? "Enviando..." : "Perguntar"}</Text>
          </Pressable>
        </View>
      ) : null}

      {podePerguntar && !logado ? (
        <Link asChild href="/login">
          <Pressable accessibilityRole="link" style={styles.aviso}>
            <Ionicons color="#25415F" name="log-in-outline" size={17} />
            <Text style={styles.avisoTexto}>
              <Text style={styles.avisoLink}>Entre na sua conta</Text> para fazer uma pergunta ao vendedor.
            </Text>
          </Pressable>
        </Link>
      ) : null}

      {carregando ? (
        <View accessibilityLiveRegion="polite" style={styles.estado}>
          <ActivityIndicator color={cores.acao} size="small" />
          <Text style={styles.estadoTexto}>Carregando perguntas...</Text>
        </View>
      ) : null}

      {!carregando && erroLista ? (
        <View style={styles.estado}>
          <Text accessibilityLiveRegion="polite" style={styles.erro}>{erroLista}</Text>
          <Pressable accessibilityRole="button" onPress={recarregar} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Recarregar perguntas</Text>
          </Pressable>
        </View>
      ) : null}

      {!carregando && !erroLista && perguntas.length === 0 ? (
        <View style={styles.vazio}>
          <Ionicons color={cores.textoSuave} name="chatbubbles-outline" size={26} />
          <Text style={styles.estadoTexto}>
            {ehVendedor || encerrado ? "Ninguém perguntou nada ainda." : "Ninguém perguntou nada ainda. Seja o primeiro!"}
          </Text>
        </View>
      ) : null}

      {perguntas.length > 0 ? (
        <>
          <Text style={styles.subtitulo}>{descreverTotalPerguntas(total)}</Text>
          <View style={styles.lista}>
            {perguntas.map((item) => (
              <ItemPergunta
                key={item.id}
                anuncioId={anuncio.id}
                ehMinha={logado && item.autor_id === usuarioId}
                pergunta={item}
                vendedorId={ehVendedor ? usuarioId : undefined}
                aoResponder={atualizarPergunta}
              />
            ))}
          </View>
          {perguntas.length < total ? (
            <Pressable
              accessibilityRole="button"
              disabled={carregandoMais}
              onPress={carregarMais}
              style={({ pressed }) => [styles.botaoSecundario, pressed ? styles.botaoSecundarioPressionado : null]}
            >
              <Text style={styles.botaoSecundarioTexto}>{carregandoMais ? "Carregando..." : "Ver mais perguntas"}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

type ItemPerguntaProps = {
  anuncioId: string;
  pergunta: PerguntaAnuncio;
  ehMinha: boolean;
  // Preenchido somente quando quem está vendo é o vendedor do anúncio.
  vendedorId?: string;
  aoResponder: (pergunta: PerguntaAnuncio) => void;
};

function ItemPergunta({ anuncioId, pergunta, ehMinha, vendedorId, aoResponder }: ItemPerguntaProps) {
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviarResposta() {
    if (!vendedorId || enviando) return;
    const erroValidacao = validarResposta(resposta);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      aoResponder(await responderPergunta(anuncioId, pergunta.id, vendedorId, resposta.trim()));
    } catch (erroRecebido) {
      setErro(mensagemErro(erroRecebido, "Não foi possível enviar a resposta."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.item}>
      <View style={styles.itemPergunta}>
        <Ionicons color={cores.textoSecundario} name="chatbubble-outline" size={15} style={styles.itemIcone} />
        <View style={styles.itemTextos}>
          <Text style={styles.itemTexto}>{pergunta.pergunta}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.data}>{formatarTempoRelativo(pergunta.criado_em)}</Text>
            {ehMinha ? (
              <View style={styles.selo}>
                <Text style={styles.seloTexto}>Sua pergunta</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {pergunta.resposta !== null ? (
        <View style={styles.resposta}>
          <Text style={styles.respostaTexto}>{pergunta.resposta}</Text>
          {pergunta.respondido_em ? (
            <Text style={styles.data}>Vendedor · {formatarTempoRelativo(pergunta.respondido_em)}</Text>
          ) : null}
        </View>
      ) : vendedorId ? (
        <View style={styles.responder}>
          <TextInput
            accessibilityLabel={`Responder: ${pergunta.pergunta}`}
            editable={!enviando}
            maxLength={RESPOSTA_MAX}
            multiline
            onChangeText={(valor) => {
              setResposta(valor);
              if (erro) setErro("");
            }}
            placeholder="Escreva sua resposta..."
            placeholderTextColor={cores.textoSuave}
            style={[styles.campo, styles.campoResposta, erro ? styles.campoErro : null]}
            textAlignVertical="top"
            value={resposta}
          />
          {erro ? <Text accessibilityLiveRegion="polite" style={styles.erro}>{erro}</Text> : null}
          <View style={styles.responderAcoes}>
            <Text style={styles.contador}>{resposta.length}/{RESPOSTA_MAX}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: enviando, busy: enviando }}
              disabled={enviando}
              onPress={enviarResposta}
              style={({ pressed }) => [
                styles.botaoResponder,
                pressed ? styles.botaoPrincipalPressionado : null,
                enviando ? styles.botaoDesativado : null,
              ]}
            >
              <Text style={styles.botaoPrincipalTexto}>{enviando ? "Enviando..." : "Responder"}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.pendente}>Aguardando resposta do vendedor</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { marginTop: 24 },
  secaoTitulo: { color: cores.texto, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    marginBottom: 12,
    borderRadius: raios.medio,
    backgroundColor: "#EEF3FA",
    borderWidth: 1,
    borderColor: "#DCE7F5",
  },
  avisoTexto: { flex: 1, color: "#25415F", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  avisoLink: { color: cores.acao, fontWeight: "800", textDecorationLine: "underline" },
  formulario: {
    padding: 14,
    marginBottom: 14,
    borderRadius: raios.grande,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  rotulo: { color: cores.texto, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  campo: {
    minHeight: 76,
    maxHeight: 160,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: raios.medio,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficieSuave,
    color: cores.texto,
    fontSize: 14.5,
    lineHeight: 20,
  },
  campoResposta: { minHeight: 64, backgroundColor: cores.superficie },
  campoErro: { borderColor: cores.erro, backgroundColor: cores.erroFundo },
  formularioRodape: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 6 },
  ajuda: { flex: 1, color: cores.textoSecundario, fontSize: 11.5, lineHeight: 16 },
  contador: { color: cores.textoSuave, fontSize: 11.5, fontWeight: "700" },
  erro: { marginTop: 6, color: cores.erro, fontSize: 12.5, fontWeight: "700" },
  sucesso: { marginTop: 6, color: cores.sucesso, fontSize: 12.5, fontWeight: "700" },
  botaoPrincipal: {
    marginTop: 12,
    height: 46,
    borderRadius: raios.medio,
    backgroundColor: cores.acao,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoPrincipalPressionado: { backgroundColor: cores.acaoPressionada },
  botaoDesativado: { opacity: 0.7 },
  botaoPrincipalTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  botaoSecundario: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: raios.pill,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  botaoSecundarioPressionado: { backgroundColor: cores.superficieSuave },
  botaoSecundarioTexto: { color: "#25415F", fontSize: 13, fontWeight: "800" },
  estado: { alignItems: "center", gap: 8, paddingVertical: 14 },
  estadoTexto: { color: cores.textoSecundario, fontSize: 13.5, textAlign: "center" },
  vazio: { alignItems: "center", gap: 6, paddingVertical: 18 },
  subtitulo: { color: cores.textoSecundario, fontSize: 12.5, fontWeight: "800", marginBottom: 8 },
  lista: {
    borderRadius: raios.grande,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    overflow: "hidden",
  },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#EAEFEC" },
  itemPergunta: { flexDirection: "row", gap: 9 },
  itemIcone: { marginTop: 2 },
  itemTextos: { flex: 1, minWidth: 0 },
  itemTexto: { color: cores.texto, fontSize: 14.5, lineHeight: 21, fontWeight: "600" },
  itemMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 3 },
  data: { color: cores.textoSuave, fontSize: 11.5, fontWeight: "600" },
  selo: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: raios.pill, backgroundColor: "#E7EFFA" },
  seloTexto: { color: "#1B5FA8", fontSize: 10.5, fontWeight: "800" },
  resposta: {
    marginTop: 10,
    marginLeft: 24,
    paddingLeft: 12,
    paddingVertical: 2,
    gap: 3,
    borderLeftWidth: 2,
    borderLeftColor: cores.destaque,
  },
  respostaTexto: { color: "#3F4E5F", fontSize: 14, lineHeight: 21 },
  pendente: { marginTop: 8, marginLeft: 24, color: cores.textoSecundario, fontSize: 12.5, fontStyle: "italic" },
  responder: { marginTop: 10, marginLeft: 24 },
  responderAcoes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  botaoResponder: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: raios.medio, backgroundColor: cores.acao },
});
