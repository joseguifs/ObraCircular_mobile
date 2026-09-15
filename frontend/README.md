# ObraCircular Mobile

Aplicativo mobile do ObraCircular, desenvolvido com Expo e React Native.

## Executar o projeto

Instale as dependências:

```bash
npm install
```

Inicie o Expo:

```bash
npm start
```

Também estão disponíveis os comandos `npm run android`, `npm run ios` e `npm run web`.

## Configurar a API

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` conforme o ambiente:

- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator ou web: `http://localhost:8000`
- Dispositivo físico: use o IP local do computador que executa o backend

O cadastro de usuário envia os dados para `POST /api/v1/usuarios`.

## Verificações

```bash
npm run lint
npx tsc --noEmit
```
