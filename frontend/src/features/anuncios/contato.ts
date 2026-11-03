type AnuncioContato = { id: string; titulo: string; status: string };
type VendedorContato = { telefone: string | null; status: string };

type ContatoVendedor =
  | { url: string; indisponibilidade: null }
  | { url: null; indisponibilidade: string };

function telefoneInternacional(telefone: string | null): string | null {
  if (!telefone) return null;
  const numero = telefone.replace(/[\s().-]/g, "");
  let nacional: string;
  if (/^\+55\d{10,11}$/.test(numero)) {
    nacional = numero.slice(3);
  } else if (/^\d{10,11}$/.test(numero)) {
    nacional = numero;
  } else if (/^55\d{10,11}$/.test(numero)) {
    nacional = numero.slice(2);
  } else {
    return null;
  }
  return /^[1-9]\d{9,10}$/.test(nacional) ? `55${nacional}` : null;
}

export function obterContatoVendedor(anuncio: AnuncioContato, vendedor: VendedorContato): ContatoVendedor {
  if (anuncio.status !== "ATIVO") {
    return { url: null, indisponibilidade: "Este anúncio não está mais disponível para negociação." };
  }
  if (vendedor.status !== "ATIVO") {
    return { url: null, indisponibilidade: "O contato deste vendedor está indisponível." };
  }
  const telefone = telefoneInternacional(vendedor.telefone);
  if (!telefone) {
    return { url: null, indisponibilidade: "O vendedor não informou um telefone brasileiro válido para contato." };
  }
  const mensagem = `Olá! Vi o anúncio "${anuncio.titulo}" no ObraCircular e tenho interesse. O material ainda está disponível?\nCódigo do anúncio: ${anuncio.id}`;
  return { url: `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, indisponibilidade: null };
}
