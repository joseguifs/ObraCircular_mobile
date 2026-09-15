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

A tela está disponível em `/anuncios/novo` e também pode ser aberta pelo link na tela inicial. Ela carrega as categorias da API, valida os dados, cria um endereço quando o usuário ainda não possui um e publica o anúncio em `POST /api/v1/anuncios`.

Como a autenticação ainda será implementada, o contexto de publicação é temporário. É possível definir `EXPO_PUBLIC_DEV_USUARIO_ID` e `EXPO_PUBLIC_DEV_ENDERECO_ID` no `.env`; sem essas variáveis, a aplicação usa o primeiro usuário ativo e o primeiro endereço encontrado para ele.

## Configurar a API

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` conforme o ambiente:

- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator ou web: `http://localhost:8000`
- Dispositivo físico: use o IP local do computador que executa o backend

O cadastro de usuário envia os dados para `POST /api/v1/usuarios` e o login para `POST /api/v1/auth/login`. O cadastro de anúncio usa os endpoints de usuários, endereços, categorias e anúncios do backend.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
```
