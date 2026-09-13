# Galeria do Vital

## O que mudou

- Identidade de papel, contorno e vermelho nas páginas e no painel, com navegação compartilhada e menu para celular.
- A corrida destaca o modo de benefícios, preserva esse modo ao repetir e consulta as campanhas disponíveis. O painel diferencia campanhas agendadas, encerradas, esgotadas e pausadas.
- Jogo do Bicho com os 25 números, favoritos com 25% de chance total por padrão, primeiro sorteio mais três repetições por etapa, acessórios separados, download de imagem/texto e link para compartilhar com o Vital. Não há apostas ou pagamento para sortear.
- Painel → Jogo do Bicho: chance dos favoritos, número de repetições, imagens, referências e categorias. Os desenhos do iPad precisam ser enviados pelo Vital; os nomes e números já estão disponíveis.
- Loja com páginas de produto, prévias de camiseta/caneca, outras categorias, opções extras, quantidade, entrega/retirada e pedidos. Cada compra contém uma configuração de produto. A arte escolhida acompanha o cliente do editor à loja.
- Solicitação de tattoo com desenho, local do corpo, tamanho e disponibilidade. A conversa é aberta no WhatsApp; o agendamento só é confirmado pelo Vital.
- Integração Mercado Pago e acompanhamento de pedidos. Consulte [a ativação e os limites operacionais](MERCADO-PAGO.md). Não houve homologação com uma conta Mercado Pago neste desenvolvimento, pois as credenciais não foram fornecidas.

## Operação

1. No painel → Peças, cadastre personagens e acessórios do editor.
2. Em Jogo do Bicho, envie os desenhos dos animais e acessórios de referência e publique as configurações.
3. Em Loja, cadastre produtos, fotos, preços reais, estoque, opções, prazo de produção e modalidades de entrega. Para canecas ou outros objetos, selecione o modelo adequado e configure as opções pertinentes.
4. Em Pedidos, confira pagamentos e avance o andamento de pedidos confirmados. Para reembolso ou contestação, use a conta Mercado Pago.
5. Em Jogo & benefícios, confira o intervalo de datas e o estoque da campanha. Ativar o interruptor não estende uma campanha vencida.

## Verificação de desenvolvimento

`npm run build`, `npm run test:game`, `npm run test:bicho` e `npm run test:silhouette`.

Integração isolada: configure Java 21, `FUNCTIONS_DISCOVERY_TIMEOUT=60` e inicie `firebase emulators:start --config firebase.emulators.json --only auth,firestore,functions --project demo-quintal`. Execute `node functions/test/integration.emulator.mjs` e `node functions/test/shop.emulator.mjs`. Ambos fixam o projeto fictício e não podem cair em produção. Para a interface de teste, use `VITE_FIREBASE_EMULATORS=1` no Vite; `node functions/seed-emulator.mjs` cria a conta fictícia de administrador.
