import type { Ionicons } from "@expo/vector-icons";

import type { TomStatus } from "@/features/pagamentos/pagamento";
import { cores } from "@/theme/tokens";

export const coresStatusPedido: Record<TomStatus, { fundo: string; texto: string; icone: keyof typeof Ionicons.glyphMap }> = {
  pendente: { fundo: "#FFF7E6", texto: "#8A5A00", icone: "time-outline" },
  sucesso: { fundo: cores.sucessoFundo, texto: cores.sucesso, icone: "checkmark-circle" },
  erro: { fundo: cores.erroFundo, texto: cores.erro, icone: "close-circle-outline" },
  neutro: { fundo: "#EEF3FA", texto: "#25415F", icone: "information-circle-outline" },
};
