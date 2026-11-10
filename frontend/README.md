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

### Filtros de anúncios

Na seção **Anúncios publicados** do perfil, use **Todos**, **Ativos** ou **Finalizados**
para filtrar a lista. O contador acompanha o filtro selecionado, e os indicadores
do perfil continuam mostrando os totais gerais. A filtragem usa os dados já carregados,
sem novas chamadas à API. Anúncios esgotados e encerrados entram em **Finalizados**.

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

## Busca e filtros da vitrine

Na home, a busca considera título, descrição e categoria, sem diferenciar letras
maiúsculas ou acentos. Ela pode ser combinada com a categoria e com **Preço mínimo**
e **Preço máximo**. Os limites são inclusivos e opcionais; informe valores em reais,
como `50`, `50,50` ou `1.234,56`. Faixas invertidas ou valores inválidos exibem um
erro até serem corrigidos.

**Somente doações** mostra os anúncios com preço zero e suspende a faixa de preço.
Os valores digitados são preservados e voltam a valer ao desativar a opção.
Escolha **Mais recentes** (padrão), **Menor preço** ou **Maior preço** para ordenar;
preços iguais são desempatados pela publicação mais recente. Apenas anúncios
ativos aparecem. **Limpar filtros** restaura busca, categoria, preços, doações e
ordenação ao estado inicial, inclusive quando a busca não retorna resultados.

Os filtros usam os anúncios já carregados, sem chamadas adicionais à API.
A lógica está coberta por `src/features/anuncios/vitrine.test.mjs`.

Para conferir manualmente, abra a home com anúncios ativos de preços diferentes:

1. Busque uma palavra da descrição sem acento e selecione sua categoria.
2. Defina uma faixa de preço e confira os limites e a quantidade de resultados.
3. Inverta os limites e confira a mensagem de validação; depois corrija-os.
4. Ative **Somente doações** e confira os itens gratuitos; desative e confira a faixa restaurada.
5. Alterne a ordenação e use **Limpar filtros** para restaurar a vitrine.

## Cidade e informações dos materiais

Na home, **Cidade dos materiais** abre uma lista pesquisável das cidades/UF com
anúncios ativos. A seleção usa o endereço vinculado ao anúncio, diferencia cidades
homônimas em estados diferentes e pode ser combinada com busca, categoria, preço
e doações. **Todas as cidades** remove apenas a restrição de localização;
**Limpar filtros** restaura todos os filtros. A lista de cidades não desaparece ao
aplicar outros filtros. Não é necessário conceder acesso ao GPS.

Os cartões mostram a cidade/UF e a quantidade com sua unidade. O cadastro inclui
unidade de medida (unidades, m², m³, metros, kg, litros, caixas, sacos ou lotes),
estado de conservação (novo/sem uso ou usado), dimensões opcionais e modalidade
de retirada/entrega. Quantidades aceitam vírgula ou ponto e até três casas
decimais, por exemplo `12,5 m²`. O preço informado é o total da quantidade anunciada.
Os detalhes exibem essas informações; perfil e administração também respeitam
a unidade cadastrada.

Antes de iniciar a API atualizada, execute `python -m alembic upgrade head` no
backend. Anúncios anteriores continuam em unidades, com conservação não informada,
dimensões ausentes e entrega a combinar.

Para conferir manualmente:

1. Cadastre anúncios em cidades diferentes e abra a seleção de cidade na home.
2. Selecione uma cidade/UF e combine com categoria, faixa de preço e doações.
3. Use **Todas as cidades** e **Limpar filtros**; confira a lista e os contadores.
4. Publique um material de `12,5 m²`, conservação usada, dimensões e entrega.
5. Confira quantidade, cidade e demais informações no cartão e no detalhe.

## Contato com o vendedor pelo WhatsApp

No detalhe do anúncio, **Conversar pelo WhatsApp** abre uma conversa com o telefone
do vendedor e uma mensagem com o título e o código do anúncio. O comprador pode editar
a mensagem e decide quando enviá-la. O link segue o formato oficial de
[clique para conversa do WhatsApp](https://faq.whatsapp.com/5913398998672934/?locale=pt_BR).

O botão fica indisponível com uma explicação quando o anúncio está esgotado ou
encerrado, a conta do vendedor está inativa ou bloqueada, ou o telefone está ausente
ou fora do formato brasileiro com DDD. Aceita telefones de 10 ou 11 dígitos, com ou
sem `+55`, inclusive os formatos com espaços, parênteses e hífen. A validação do
formato não confirma que o número possui uma conta no WhatsApp.

Falhas ao abrir o link exibem uma mensagem com possibilidade de tentar novamente.
A feature usa os dados já carregados no detalhe, sem novas chamadas à API e sem
dependências adicionais. Os cenários de telefone, mensagem e disponibilidade são
cobertos por `src/features/anuncios/contato.test.mjs`.

Para conferir manualmente:

1. Abra um anúncio ativo de um vendedor ativo com telefone cadastrado.
2. Toque em **Conversar pelo WhatsApp** e confira o destinatário, o título e o código na mensagem.
3. Volte ao aplicativo e abra um anúncio esgotado ou encerrado; confira o botão desabilitado e a explicação.
4. Abra um anúncio cujo vendedor não tenha telefone; confira a explicação de contato indisponível.
5. Simule uma falha em `Linking.openURL`; confira a mensagem de erro e tente novamente.

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
