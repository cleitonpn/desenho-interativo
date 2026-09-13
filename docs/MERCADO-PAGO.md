# Mercado Pago — ativação do Pix e cartão

A integração usa Checkout Pro: o cliente paga no Mercado Pago. O site não recebe número de cartão, CVV ou credenciais bancárias. O retorno do navegador nunca marca um pedido como pago.

## Configurar a conta do Vital

1. No [painel de desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app), crie ou selecione a aplicação do Vital e configure Checkout Pro. Conclua os requisitos da conta para receber por Pix e cartão.
2. No projeto Google Cloud `galeriadovital`, ative a API Secret Manager, se necessário.
3. No [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=galeriadovital), crie os segredos `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`. O primeiro recebe o Access Token da aplicação; o segundo recebe a assinatura secreta da configuração de Webhooks. Não coloque esses valores no código, em variáveis `VITE_*`, no Firestore ou em conversas.
4. Em **cada um desses dois segredos**, conceda o papel **Acessador de segredos do Secret Manager** (`roles/secretmanager.secretAccessor`) à conta de execução `731323588702-compute@developer.gserviceaccount.com`. O acesso pode ficar limitado a esses segredos.
5. Nos Webhooks da aplicação Mercado Pago, selecione notificações de pagamentos e configure esta URL:
   `https://southamerica-east1-galeriadovital.cloudfunctions.net/mercadoPagoWebhook`
6. Use as credenciais e contas de teste do Mercado Pago para homologar primeiro. Credenciais `TEST-` usam a URL sandbox retornada pela API. Teste pagamento aprovado, pendente, rejeitado, repetição da notificação e reembolso. Confira tanto o painel Mercado Pago quanto o pedido do site. Nenhum pagamento real foi realizado durante o desenvolvimento.
7. Depois da homologação, publique a versão do Access Token de produção nos mesmos segredos e configure a assinatura correspondente ao ambiente de produção. O cache de credenciais dura até um minuto; não é necessário publicar novamente as funções.

Referências: [Checkout Pro](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/overview), [notificações de pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications), [compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).

## Preparar a loja

No painel Vital → Loja, cadastre produtos reais, preços, imagens, opções e prazos. Cada checkout compra uma configuração de produto, de 1 a 10 unidades. Cadastre modalidades de entrega e seus preços. O cliente escolhe a região; confira o endereço antes de produzir/enviar. Ainda não existe cotação automática por CEP ou integração de transportadora.

Produtos sob consulta vão para orçamento. Produtos com preço definido podem ser pagos online. Para tattoo, o pagamento não confirma uma data; combine a sessão com o cliente. Não anuncie um sinal ou valor integral sem descrever isso no produto.

O estoque finito fica reservado por 30 minutos e é abatido uma única vez ao confirmar o pagamento. Pagamento tardio sem estoque vira **pago_revisar_estoque**; o Vital deve combinar uma solução ou reembolsar no Mercado Pago. Reembolsos, contestações e pagamentos adicionais exigem revisão humana. Não há reembolso automático.

No painel → Pedidos, acompanhe a confirmação e atualize produção/envio/conclusão. Nunca considere o pedido pago apenas porque o cliente voltou do checkout ou enviou uma captura de tela.

## Infraestrutura e privacidade

As funções de pagamento são publicadas pelo mesmo workflow GitHub das funções da corrida. As credenciais são lidas apenas durante o pagamento: a ausência delas não impede publicar ou usar os jogos. Os pedidos ficam em `shopOrders`, sem acesso direto pelo cliente; as funções validam dono ou administrador. As regras atuais de bloqueio por padrão protegem essas coleções. Os dados de configuração do Jogo do Bicho ficam em `conteudo/jogoBicho`; as imagens usam o prefixo de Storage `sobre/`, já autorizado para o administrador.

Pedidos só são confirmados após validar HMAC do webhook e consultar o pagamento na API autenticada, conferindo referência, moeda e valor. Monitore as falhas de webhook no painel do Mercado Pago e as pendências no painel Vital.
