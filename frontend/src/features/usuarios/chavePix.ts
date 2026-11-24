import type { TipoChavePix } from "@/services/usuarios";

export const TIPOS_CHAVE_PIX = [
  { valor: "EMAIL", rotulo: "E-mail" },
  { valor: "CPF", rotulo: "CPF" },
] as const satisfies readonly { valor: TipoChavePix; rotulo: string }[];

export function cpfValido(numeros: string): boolean {
  if (!/^\d{11}$/.test(numeros) || /^(\d)\1{10}$/.test(numeros)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(numeros[i]) * (tamanho + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(numeros[tamanho])) return false;
  }
  return true;
}

// Máscara 000.000.000-00 aplicada enquanto o usuário digita.
export function formatarCpf(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// Mesmo formato que o backend armazena: e-mail minúsculo ou CPF só com dígitos.
export function normalizarChavePix(tipo: TipoChavePix, valor: string): string {
  return tipo === "EMAIL" ? valor.trim().toLowerCase() : valor.replace(/\D/g, "");
}

export function validarChavePix(tipo: TipoChavePix | "", valor: string): string | undefined {
  if (!tipo) return "Escolha o tipo da chave Pix.";
  if (!valor.trim()) return "Informe a chave Pix para receber o valor das vendas.";
  const chave = normalizarChavePix(tipo, valor);
  if (tipo === "EMAIL" && (chave.length > 77 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave))) {
    return "Informe um e-mail válido para a chave Pix.";
  }
  if (tipo === "CPF" && !cpfValido(chave)) return "Informe um CPF válido para a chave Pix.";
  return undefined;
}
