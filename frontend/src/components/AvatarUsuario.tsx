import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { obterIniciais } from "@/features/usuarios/perfil";
import { cores } from "@/theme/tokens";

type AvatarUsuarioProps = {
  nome: string;
  tamanho?: number;
  imagemUrl?: string | null;
};

export function AvatarUsuario({ nome, tamanho = 76, imagemUrl }: AvatarUsuarioProps) {
  const [imagemComErro, setImagemComErro] = useState<string | null>(null);
  // O nome já aparece ao lado do avatar, então as iniciais ficam fora do leitor de tela.
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circulo, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}
    >
      {imagemUrl && imagemComErro !== imagemUrl ? (
        <Image source={{ uri: imagemUrl }} contentFit="cover" style={StyleSheet.absoluteFill}
          onError={() => setImagemComErro(imagemUrl)} />
      ) : <Text style={[styles.iniciais, { fontSize: Math.round(tamanho * 0.36) }]}>
        {obterIniciais(nome)}
      </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#EAF3FC",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.acao,
  },
  iniciais: { color: cores.superficie, fontWeight: "800", letterSpacing: 0.5 },
});
