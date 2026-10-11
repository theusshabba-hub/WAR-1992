# Assembleia Mundial — jogo textual (1992)

Site estático (HTML + CSS + JS puros) para publicar no **GitHub Pages**, usando o **Firebase Firestore** (gratuito) como banco de dados compartilhado entre os jogadores.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Página única |
| `style.css` | Visual (paleta da ONU) |
| `app.js` | Todo o jogo: login, países, turnos, ações, notícias, guerras, painel ADM |
| `firebase-config.js` | Onde você cola as chaves do Firebase |

## Testar no computador (modo local)

Abra o `index.html` no navegador. Sem Firebase configurado o site funciona em **modo local**: tudo é salvo só naquele navegador. Serve para testar telas e fluxo, não para jogar com outras pessoas.

## Colocar no ar de verdade

### 1. Criar o banco (Firebase)
1. Acesse https://console.firebase.google.com e crie um projeto (pode desativar o Analytics).
2. No menu **Build → Firestore Database**, clique em **Criar banco de dados** (modo de produção, região mais próxima, ex.: `southamerica-east1`).
3. Aba **Regras**, cole e publique:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. **Configurações do projeto (engrenagem) → Seus apps → `</>` (Web)**: registre um app e copie o objeto `firebaseConfig`.
5. Cole esse objeto em `firebase-config.js`, trocando `window.FIREBASE_CONFIG = null;` por `window.FIREBASE_CONFIG = { ... };`.

### 2. Publicar no GitHub
1. Crie um repositório e envie os 4 arquivos para a raiz.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Em alguns minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Como funciona

- **ADM:** usuários `Mosca`, `Vini`, `Lucas`, `Mathlos` ou `Toko`, senha `1234`.
- **Player:** escolhe um país livre na lista, informa nome, e-mail e senha. O país passa a mostrar "Escolhido por (nome)". Depois só entra quem tiver aquele e-mail/nome + senha (login por e-mail **ou** nome do jogador).
- **Turnos:** 25 turnos (Turno 1 = 1992/1993 … Turno 25 = 2040/2041). O ADM define o turno atual; jogadores só enxergam até ele.
- **Ações:** 10 internas + 5 externas (título, texto até 2000 caracteres, orçamento). O rascunho é salvo automaticamente no navegador; ao enviar, o turno trava e aparece em "Ações enviadas" para todos.
- **Julgamento (ADM):** no painel, aba "Turnos enviados", o ADM escolhe o turno, abre um país e preenche, abaixo do orçamento de cada ação, o **Dado (1 a 12)** e o **Resultado** (até 300 caracteres), além das tabelas de estatística e de produção. Ao clicar em "Enviar julgamentos" o resultado é publicado e pode ser editado e reenviado depois. O rascunho do julgamento é salvo no navegador.
- **Resultado (player):** cada jogador só vê o seu, na aba Ações → Resultado (dados em `results/{turno}_{codigoDoPais}`).
- **Notícias / Guerras:** jogadores só leem. No painel do ADM, aba "Notícias e Guerras", cada notícia e cada guerra é uma entrada que pode ser adicionada, editada ou excluída.
- **Contas:** aba "Contas" do ADM lista os jogadores e permite excluir uma conta (o país volta a ficar disponível), com a opção de apagar também o histórico de ações e julgamentos do país.

## Estrutura dos dados (Firestore)

- `players/{codigoPais}`: país, nome, e-mail, hash da senha
- `meta/game`: `{ currentTurn }`
- `actions/{turno}_{codigoPais}`: ações enviadas
- `results/{turno}_{codigoPais}`: julgamento do ADM (`actions` com dado e resultado, `stats`, `prod`, `judgedAt`)
- `news_items/{id}` e `war_items/{id}`: uma notícia/guerra (`turn`, `title`, `text`, autor e datas)
- `news/{turno}` e `wars/{turno}`: formato antigo (`{ text }`), ainda exibido se existir

## Limitações importantes (segurança)

Como o site é estático, **toda a verificação acontece no navegador**. Na prática isso significa que quem souber mexer nas ferramentas do navegador pode, por exemplo, ver a senha de ADM no código ou ler dados de outros países (inclusive Resultados). Para um jogo entre amigos isso costuma bastar; se um dia precisar de segurança real, o caminho é usar Firebase Authentication + regras de segurança do Firestore. Dica: use senhas de jogo que você não usa em mais nenhum lugar.

## Ajustes rápidos

- **Lista de países:** edite `COUNTRIES_RAW` no início do `app.js` (formato `codigo-da-bandeira|Nome`). As bandeiras vêm de flagcdn.com (versões atuais); só Tchecoslováquia e Iugoslávia têm bandeira histórica desenhada.
- **Senha/usuários ADM:** constantes `ADMIN_USERS` e `ADMIN_PASS` no topo do `app.js`.
- **Quantidade de ações, caracteres e turnos:** `N_INTERNAS`, `N_EXTERNAS`, `MAX_CHARS`, `MAX_TURNS`.
