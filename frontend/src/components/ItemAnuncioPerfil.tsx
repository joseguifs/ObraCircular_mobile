import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EtiquetaStatus } from "@/components/EtiquetaStatus";
import { descreverStatusAnuncio, formatarData, formatarPreco } from "@/features/usuarios/perfil";
import { Anuncio } from "@/services/anuncios";
import { cores, raios } from "@/theme/tokens";

type ItemAnuncioPerfilProps = {
  anuncio: Anuncio;
};

export function ItemAnuncioPerfil({ anuncio }: ItemAnuncioPerfilProps) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const status = descreverStatusAnuncio(anuncio.status);
  const preco = formatarPreco(anuncio.preco);
  const publicadoEm = formatarData(anuncio.postado_em);
  const mostrarImagem = Boolean(anuncio.imagem_url) && !imagemFalhou;

  return (
    <View
      accessibilityLabel={[
        anuncio.titulo,
        preco,
        `${anuncio.quantidade} unidades`,
        status.rotulo,
        publicadoEm ? `publicado em ${publicadoEm}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      accessible
      style={styles.item}
    >
      <View style={styles.miniatura}>
        {mostrarImagem ? (
          <Image
            contentFit="cover"
            onError={() => setImagemFalhou(true)}
            source={{ uri: anuncio.imagem_url ?? undefined }}
            style={styles.imagem}
            transition={150}
          />
        ) : (
          <Ionicons color={cores.textoSuave} name="cube-outline" size={26} />
        )}
      </View>

      <View style={styles.corpo}>
        <Text numberOfLines={2} style={styles.titulo}>
          {anuncio.titulo}
        </Text>
        <Text style={styles.detalhes}>
          {preco} · {anuncio.quantidade} un.
        </Text>
        <View style={styles.rodape}>
          <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
          {publicadoEm ? <Text style={styles.data}>Publicado em {publicadoEm}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.grande,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: cores.superficieSuave,
  },
  miniatura: {
    width: 68,
    height: 68,
    overflow: "hidden",
    borderRadius: raios.medio,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2EF",
  },
  imagem: { width: "100%", height: "100%" },
  corpo: { flex: 1 },
  titulo: { color: cores.texto, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  detalhes: { marginTop: 3, color: cores.textoSecundario, fontSize: 13, lineHeight: 18 },
  rodape: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 10,
    rowGap: 6,
  },
  data: { color: cores.textoSecundario, fontSize: 12, lineHeight: 16 },
});
