# Corrida do Quintal

## O que foi implementado

- Corrida automática com toque em qualquer ponto do cenário. Toques curtos não se perdem entre quadros; segurar aumenta o salto. Espaço, W e seta para cima funcionam no teclado.
- Contagem regressiva, pausa manual e pausa ao sair da aba. Som sintetizado opcional, partículas, proteção visual e avisos de coleta.
- Três cenários vetoriais originais: quintal, skyline da rua e ateliê. Camadas de fundo em velocidades diferentes, tons de papel e detalhes vermelhos.
- Silhueta opaca calculada apenas sob o corpo: o cenário não atravessa a galinha. Aberturas de capuzes, óculos e outros acessórios preservam a transparência original e deixam o rosto visível. O preenchimento acompanha as pernas animadas e o cartão compartilhável; os PNGs originais e a exportação normal do editor permanecem intactos.
- Penas, caixas de acessórios, caixas surpresa, plataformas, rotas de coleta em alturas diferentes, poças, minhocas e combos. Ao abrir uma caixa, a peça voa sete unidades à frente e cai no chão. Passar por ela veste; pular por cima mantém o visual. Durante o voo ela não equipa, e o ímã só atrai penas. A coleção registra apenas peças recolhidas; a abertura continua contando para pontos, missões e elegibilidade de cupons.
- Minhocas entram pela direita, olham para a esquerda e só começam a andar ao se aproximarem do jogador. A colisão de pisada exige descida pelo topo e produz um novo salto.
- Escudo, ímã e bônus de três segundos, com corrida limitada a 70 segundos. Dificuldade aumenta gradualmente.
- Missões, desafio diário com percurso compartilhado, objetivo semanal, recorde, histórico local, álbum e conquistas. Ao chegar, o personagem pode ser aberto no editor ou exportado em um cartão de imagem; o compartilhamento nativo usa um arquivo quando suportado, com download como alternativa.
- Corridas premiadas autenticadas e ranking semanal validado pelo servidor. Apelidos públicos automáticos evitam expor nomes e contatos do cadastro.
- Cupons percentuais, valores em reais, brindes e outros benefícios. Carteira com validade, situação e link para abrir uma mensagem no WhatsApp do Vital. O jogador conclui o envio; o sistema não envia mensagens automaticamente.
- Aba **Jogo & benefícios** em `/vital`: cadastro/edição de campanhas, ativação/pausa, valor, chance, estoque total, datas, validade após emissão, limite por pessoa, intervalo entre ganhos, número mínimo de caixas e missão exigida. Totais de emissão e uso, consulta por código e baixa de cupom.
- Editor de evento no mesmo painel: título, texto, período, cenário e seleção de peças para a coleção temática.

## Executar localmente

```sh
npm ci
npm run dev
```

A rota é `/jogo`. O modo livre funciona sem as novas Cloud Functions. Nenhum desconto comercial é criado em modo livre. Não há campanha de desconto ativada automaticamente no projeto real.

## Servidor e validação

`src/lib/corrida.ts` é a simulação determinística a 60 passos por segundo. A compilação das funções produz `functions/engine.mjs` a partir desse mesmo arquivo.

`beginRun` cria a semente e a sessão no servidor. `finishRun` recebe somente o identificador e as transições de toque, repete a simulação e calcula pontos, caixas e missões. A emissão usa uma transação: verifica sessão, estoque, período e limites pessoais; registra no máximo um benefício por partida. Repetir a chamada devolve o mesmo resultado. Os dados da campanha são copiados para o cupom, preservando as condições originais. O sorteio usa um segredo de sessão que não é entregue ao cliente.

O replay impede aceitar uma pontuação arbitrária enviada pelo navegador; não constitui detecção de bots. Existe limite de início por pessoa e intervalo entre corridas. App Check pode ser configurado e exigido numa etapa de operação, com as chaves próprias do projeto.

As regras bloqueiam escrita direta em cupons, campanhas comerciais e ranking. A administração consulta o perfil `usuarios/{uid}.admin`. A criação de perfil pelo cliente não pode incluir esse campo; atualizações pessoais também não podem alterá-lo.

O progresso das corridas livres é local ao aparelho. Cupons e recordes premiados são armazenados no servidor. Corridas premiadas pendentes podem ser reenviadas pela carteira enquanto a sessão estiver dentro do prazo de 30 minutos. O prazo começa na criação da sessão e inclui pausas.

## Testes isolados

```sh
npm --prefix functions ci
npm --prefix functions test
npm run test:silhouette
```

Para testar as integrações, instale Firebase CLI e Java 21 e execute:

```sh
firebase emulators:start --only firestore,auth,functions --project demo-quintal --config firebase.test.json
node --test functions/test/integration.emulator.mjs
```

O teste integrado usa exclusivamente `demo-quintal`: verifica autenticação, acesso de admin, replay, chamada duplicada concorrente, limite de estoque, leitura privada da carteira, impossibilidade de forjar cupom/promover perfil e uso único.

Para abrir o painel de demonstração:

```sh
node functions/seed-emulator.mjs
```

Inicie o Vite com `VITE_FIREBASE_EMULATORS=1`. Em PowerShell:

```powershell
$env:VITE_FIREBASE_EMULATORS = '1'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178
```

Conta fictícia do emulador: `vital@example.test`, senha `Quintal-Teste-2026!`. Estes dados só existem no emulador. A campanha semeada é explicitamente de teste e não tem validade comercial. O teste integrado desativa campanhas do emulador para executar isoladamente; rode o seed novamente depois dele se desejar a demonstração.

No Windows, se o Java falhar ao criar um socket local, configure `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<pasta existente de caminho curto>`. Se a descoberta das funções exceder o prazo do CLI, configure `FUNCTIONS_DISCOVERY_TIMEOUT=60`.

## Publicação

A implementação local não publica nem altera dados do Firebase real. Para colocar cupons em produção é necessário publicar as funções, as regras e o frontend no projeto `galeriadovital`, com acesso autorizado e faturamento compatível com Cloud Functions.

```sh
npm ci
npm --prefix functions ci
npm --prefix functions test
npm run build
firebase deploy --project galeriadovital --only functions:quintal-game,firestore:rules,hosting
```

GitHub Pages publica apenas o frontend: funções e regras continuam precisando de publicação no Firebase. O backend está na região `southamerica-east1`.

Depois de publicar, o administrador cria a campanha com suas condições comerciais reais e a ativa. Não se deve usar a campanha fictícia do emulador como benefício real.

Referências de implementação: [funções callable](https://firebase.google.com/docs/functions/callable), [transações do Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Deploy pelo GitHub

O workflow `Publicar funções do jogo` instala as dependências, testa a simulação e publica somente `functions:quintal-game` usando o secret existente `FIREBASE_SERVICE_ACCOUNT`. Executa em alterações do backend na branch de produção ou manualmente em Actions. Não usa `--force` e não publica campanhas comerciais.

As regras e índices do Firestore são publicados pelo workflow separado. O Storage fica manual: copie `storage.rules` para Firebase Console > Storage > Rules e publique. A separação evita que a falta de permissão `firebasestorage.defaultBucket.get` bloqueie os outros deploys. Alterar regras não concede permissões IAM à conta do GitHub.
