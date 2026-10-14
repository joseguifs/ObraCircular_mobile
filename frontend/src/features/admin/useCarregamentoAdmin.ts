import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ehErroDeSessao, possuiSessaoAdmin } from "@/services/admin";

export type EstadoCarregamento<T> =
  | { situacao: "carregando" }
  | { situacao: "falha"; mensagem: string }
  | { situacao: "pronto"; dados: T };

/**
 * Carrega dados protegidos do painel e devolve o admin para o login
 * quando não há sessão ou quando ela expira.
 */
export function useCarregamentoAdmin<T>(carregar: () => Promise<T>) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoCarregamento<T>>({ situacao: "carregando" });
  const [atualizando, setAtualizando] = useState(false);
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;
  const requisicaoAtual = useRef(0);

  const tratarErro = useCallback(
    (erro: unknown, padrao: string) => {
      if (ehErroDeSessao(erro)) {
        router.replace("/admin/login");
        return null;
      }
      return erro instanceof Error ? erro.message : padrao;
    },
    [router],
  );

  const recarregar = useCallback(() => {
    if (!possuiSessaoAdmin()) {
      router.replace("/admin/login");
      return;
    }
    const id = ++requisicaoAtual.current;
    carregarRef
      .current()
      .then((dados) => {
        if (id === requisicaoAtual.current) setEstado({ situacao: "pronto", dados });
      })
      .catch((erro: unknown) => {
        if (id !== requisicaoAtual.current) return;
        const mensagem = tratarErro(erro, "Não foi possível carregar os dados.");
        if (mensagem) setEstado({ situacao: "falha", mensagem });
      })
      .finally(() => {
        if (id === requisicaoAtual.current) setAtualizando(false);
      });
  }, [router, tratarErro]);

  useFocusEffect(recarregar);

  const atualizar = useCallback(() => {
    setAtualizando(true);
    recarregar();
  }, [recarregar]);

  const tentarNovamente = useCallback(() => {
    setEstado({ situacao: "carregando" });
    recarregar();
  }, [recarregar]);

  const definirDados = useCallback((transformar: (dados: T) => T) => {
    setEstado((atual) => (atual.situacao === "pronto" ? { situacao: "pronto", dados: transformar(atual.dados) } : atual));
  }, []);

  return { estado, atualizando, atualizar, recarregar, tentarNovamente, definirDados, tratarErro };
}

/** Atualiza a lista quando um filtro muda, aguardando a digitação terminar. */
export function useAoMudarFiltros(efeito: () => void, filtros: unknown[], atraso = 300) {
  const primeiraExecucao = useRef(true);
  const efeitoRef = useRef(efeito);
  efeitoRef.current = efeito;
  const chave = JSON.stringify(filtros);

  useEffect(() => {
    // O carregamento inicial já é feito ao focar a tela.
    if (primeiraExecucao.current) {
      primeiraExecucao.current = false;
      return;
    }
    const temporizador = setTimeout(() => efeitoRef.current(), atraso);
    return () => clearTimeout(temporizador);
  }, [chave, atraso]);
}
