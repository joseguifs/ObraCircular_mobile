import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { cores } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={cores.superficie} style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.superficie },
          headerTintColor: cores.acao,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="anuncios/novo" options={{ title: "Novo anúncio" }} />
        <Stack.Screen name="anuncios/sucesso" options={{ headerShown: false }} />
        <Stack.Screen name="usuarios/[id]" options={{ title: "Perfil" }} />
        <Stack.Screen name="usuarios/[id]/editar" options={{ title: "Editar dados" }} />
        <Stack.Screen name="enderecos/novo" options={{ title: "Novo endereço" }} />
        <Stack.Screen name="admin/login" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ title: "Painel administrativo" }} />
        <Stack.Screen name="admin/usuarios" options={{ title: "Usuários" }} />
        <Stack.Screen name="admin/anuncios" options={{ title: "Anúncios" }} />
        <Stack.Screen name="admin/categorias" options={{ title: "Categorias" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
