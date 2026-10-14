import { Alert, Platform } from "react-native";

// Alert.alert não exibe botões na web, então lá usamos o diálogo nativo do navegador.
export function confirmar(titulo: string, mensagem: string, rotuloConfirmar = "Confirmar"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensagem}`) ?? false);
  }

  return new Promise((resolver) => {
    Alert.alert(titulo, mensagem, [
      { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
      { text: rotuloConfirmar, style: "destructive", onPress: () => resolver(true) },
    ], { cancelable: true, onDismiss: () => resolver(false) });
  });
}
