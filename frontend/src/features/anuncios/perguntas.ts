export const PERGUNTA_MIN = 3;
export const PERGUNTA_MAX = 500;
export const RESPOSTA_MAX = 1000;

type ComId = { id: string };
type ComResposta = { resposta: string | null };

// Retorna a mensagem de erro, ou null quando o texto pode ser enviado.
export function validarPergunta(texto: string) {
  const pergunta = texto.trim();
  if (pergunta.length < PERGUNTA_MIN) {
    return `Escreva uma pergunta com pelo menos ${PERGUNTA_MIN} caracteres.`;
  }
  if (pergunta.length > PERGUNTA_MAX) {
    return `A pergunta deve ter no máximo ${PERGUNTA_MAX} caracteres.`;
  }
  return null;
}

export function validarResposta(texto: string) {
  const resposta = texto.trim();
  if (!resposta) return "Escreva uma resposta antes de enviar.";
  if (resposta.length > RESPOSTA_MAX) {
    return `A resposta deve ter no máximo ${RESPOSTA_MAX} caracteres.`;
  }
  return null;
}

// Junta uma nova página sem repetir perguntas que já estavam na lista.
export function mesclarPerguntas<T extends ComId>(atuais: T[], novas: T[]) {
  const ids = new Set(atuais.map((item) => item.id));
  return [...atuais, ...novas.filter((item) => !ids.has(item.id))];
}

export function contarPendentes(perguntas: ComResposta[]) {
  return perguntas.filter((item) => item.resposta === null).length;
}

export function descreverTotalPerguntas(total: number) {
  return `${total} ${total === 1 ? "pergunta" : "perguntas"}`;
}

export function formatarTempoRelativo(dataIso: string, agora: Date = new Date()) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";

  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}
