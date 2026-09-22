# ObraCircular Mobile

Aplicativo mobile do ObraCircular, desenvolvido com Expo e React Native.

O projeto usa Expo SDK 54 para manter a versão compartilhada pela equipe nos iPhones.

## Executar o projeto

Instale as dependências:

```bash
npm ci
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

## Edição dos dados básicos do usuário

No perfil, toque em **Editar dados** para abrir `/usuarios/<uuid>/editar`.
A tela fica em `src/app/usuarios/[id]/editar.tsx` e mantém os componentes
`Marca`, `AvatarUsuario`, `CampoFormulario` e os tokens visuais usados no perfil.
Depois do login, **Meu perfil** na home abre o usuário retornado pela API.

O formulário carrega os dados com `GET /api/v1/usuarios/{id}` e permite alterar
nome, e-mail e telefone. Ao salvar, envia apenas os campos alterados em
`PATCH /api/v1/usuarios/{id}`. Senha e status não fazem parte desta tela.
O telefone é opcional: apagá-lo envia `null`. Espaços no nome, caixa do e-mail
e o formato brasileiro do telefone são normalizados conforme o backend.

Há validações antes do envio, tratamento de e-mail duplicado (409), usuário
inexistente (404), identificador inválido e falha da API com nova tentativa.
Falhas ao salvar preservam o formulário. Os botões ficam desabilitados durante
o envio; **Cancelar** retorna ao perfil sem gravar. Após salvar, a confirmação
permite voltar ao perfil, que recarrega os dados automaticamente.

A integração mantém o contrato de autenticação atual do projeto: o login retorna
um usuário, sem token, e os endpoints de usuários ainda não verificam a identidade
de quem os chama. O UUID na navegação identifica o registro, mas não é autorização.
Esta entrega não adiciona nem altera o mecanismo de autenticação do backend.

As validações e o conteúdo do PATCH são cobertos por `src/features/usuarios/edicao.test.mjs`,
seguindo o uso de `node:test` já adotado no perfil. Para conferir manualmente:

1. Entre com uma conta e abra **Meu perfil → Editar dados**.
2. Altere o nome, salve e volte ao perfil; confira o nome atualizado.
3. Tente usar o e-mail de outra conta; a edição deve permanecer aberta com o erro.
4. Apague o telefone, salve e confira **Não informado** no perfil.
5. Altere um campo e toque em **Cancelar**; o dado anterior deve ser preservado.

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

### Foto do perfil

Em **Meu perfil → Editar dados → Escolher foto**, selecione uma imagem da galeria.
A prévia e a remoção só são persistidas ao tocar em **Salvar alterações**; cancelar descarta as alterações.
São aceitos JPG, PNG e WebP de até 5 MB (até 25 megapixels no servidor).
O avatar volta às iniciais quando não há foto ou a imagem não pode ser exibida.

O seletor usa `expo-image-picker` compatível com o SDK 54. Para preparar outra máquina,
execute `npm ci` no frontend, instale `backend/requirements.txt` no ambiente Python e
rode `alembic upgrade head` no backend. A migração `20260922_0003` cria o campo opcional
`imagem_url`. A API valida e reduz a imagem para até 512 × 512, remove metadados e armazena
um data URI JPEG no banco, na mesma transação dos dados pessoais. Essa opção mantém o
ambiente local sem dependência de armazenamento externo; a imagem também acompanha as
respostas de usuário. Mantém-se a limitação de autenticação descrita acima.
