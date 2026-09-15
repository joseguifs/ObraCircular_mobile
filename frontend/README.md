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

## Perfil do usuário

A tela fica em `src/app/usuarios/[id].tsx` e responde em `/usuarios/<uuid do usuário>`, também por deep link (`obracircular://usuarios/<uuid>`). Depois de criar uma conta, o link **Ver perfil** abre o perfil recém-cadastrado.

Ela consulta `GET /api/v1/usuarios/{id}`, `GET /api/v1/enderecos/usuario/{id}` e `GET /api/v1/anuncios?vendedor_id={id}`, e mostra nome, situação da conta, contato, cidades dos endereços e anúncios publicados. Os estados de carregamento, falha com nova tentativa, perfil inexistente (incluindo identificador fora do formato UUID) e ausência de anúncios são tratados na própria tela. No celular, puxar a tela para baixo recarrega os dados.

## Configurar a API

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` conforme o ambiente:

- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator ou web: `http://localhost:8000`
- Dispositivo físico: use o IP local do computador que executa o backend

O cadastro de usuário envia os dados para `POST /api/v1/usuarios`, o cadastro de anúncio usa os endpoints de usuários, endereços, categorias e anúncios do backend, e o perfil consulta usuários, endereços e anúncios.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
```
