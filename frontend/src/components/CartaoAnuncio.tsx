import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { obterCorFundoAnuncio, obterIconeCategoria } from "@/features/anuncios/categorias";
import { formatarData, formatarPreco } from "@/features/usuarios/perfil";
import { Anuncio } from "@/services/anuncios";
import { Categoria } from "@/services/categorias";
import { Ionicons } from "@expo/vector-icons";
import { cores, raios } from "@/theme/tokens";

type CartaoAnuncioProps = {
  anuncio: Anuncio;
  categoria?: Categoria;
  onPress: () => void;
};

export function CartaoAnuncio({ anuncio, categoria, onPress }: CartaoAnuncioProps) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const mostrarImagem = Boolean(anuncio.imagem_url) && !imagemFalhou;
  const publicadoEm = formatarData(anuncio.postado_em);

  return (
    <Pressable
      accessibilityLabel={`Ver anúncio ${anuncio.titulo}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.cartao, pressed ? styles.cartaoPressionado : null]}
    >
      <View style={[styles.miniatura, mostrarImagem ? null : { backgroundColor: obterCorFundoAnuncio(anuncio.id) }]}>
        {mostrarImagem ? (
          <Image
            contentFit="cover"
            onError={() => setImagemFalhou(true)}
            source={{ uri: anuncio.imagem_url ?? undefined }}
            style={styles.imagem}
            transition={150}
          />
        ) : (
          <Ionicons color="rgba(255,255,255,0.55)" name={categoria ? obterIconeCategoria(categoria.nome) : "cube-outline"} size={26} />
        )}
      </View>

      <View style={styles.corpo}>
        {categoria ? <Text style={styles.categoria}>{categoria.nome}</Text> : null}
        <Text numberOfLines={2} style={styles.titulo}>
          {anuncio.titulo}
        </Text>
        {publicadoEm ? <Text numberOfLines={1} style={styles.data}>Publicado em {publicadoEm}</Text> : null}
        <View style={styles.rodape}>
          <Text style={styles.preco}>{formatarPreco(anuncio.preco)}</Text>
          <Text numberOfLines={1} style={styles.quantidade}>{anuncio.quantidade} un.</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: "row",
    gap: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    backgroundColor: cores.superficie,
  },
  cartaoPressionado: { backgroundColor: cores.superficieSuave },
  miniatura: {
    width: 104,
    height: 104,
    flexShrink: 0,
    borderRadius: raios.medio,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagem: { width: "100%", height: "100%" },
  corpo: { flex: 1, minWidth: 0, justifyContent: "center", gap: 3 },
  categoria: { color: cores.acao, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  titulo: { color: cores.texto, fontSize: 14.5, lineHeight: 19, fontWeight: "800" },
  data: { color: cores.textoSuave, fontSize: 11.5, fontWeight: "600" },
  rodape: { marginTop: 4, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  preco: { color: cores.texto, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  quantidade: { flexShrink: 1, color: cores.textoSecundario, fontSize: 11, fontWeight: "600" },
});
