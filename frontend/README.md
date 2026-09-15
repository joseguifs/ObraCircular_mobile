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

As telas e os layouts ficam em `src/app`, seguindo o roteamento baseado em arquivos do Expo Router.

## Cadastro de anúncio

A tela está disponível em `/anuncios/novo` e também pode ser aberta pelo link na tela inicial. Nesta etapa, ela valida os dados e apresenta a confirmação local; a persistência será conectada quando o backend disponibilizar o contrato de criação e a autenticação fornecer vendedor e endereço.

## Configurar a API

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` conforme o ambiente:

- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator ou web: `http://localhost:8000`
- Dispositivo físico: use o IP local do computador que executa o backend

O cadastro de usuário envia os dados para `POST /api/v1/usuarios`.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
```
