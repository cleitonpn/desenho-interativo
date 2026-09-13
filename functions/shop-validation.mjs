import { createHmac, timingSafeEqual } from "node:crypto";
export function text(value, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function quote(product, input, freight) {
  if (
    !product?.ativo ||
    product.precoSobConsulta ||
    !Number.isSafeInteger(product.precoCentavos) ||
    product.precoCentavos < 100
  )
    throw Error(
      "Produto indisponível para pagamento online. Peça um orçamento.",
    );
  const quantity = input.quantidade;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw Error("Escolha de 1 a 10 unidades.");
  const options = {};
  if (product.tipo === "personalizavel") {
    for (const [key, allowed] of [
      ["cor", product.cores],
      ["tamanho", product.tamanhos],
      ["area", product.areas],
    ]) {
      if (allowed?.length) {
        if (!allowed.includes(input[key]))
          throw Error(`Selecione uma opção válida de ${key}.`);
        options[key] = input[key];
      }
    }
    for (const group of product.opcoes ?? []) {
      if (!group.valores.includes(input.opcoes?.[group.nome]))
        throw Error(`Selecione ${group.nome}.`);
      options[group.nome] = input.opcoes[group.nome];
    }
    if (
      !input.arte ||
      input.arte.tipo !== "galinha" ||
      !text(input.personagem, 100) ||
      typeof input.arte.escolhas !== "object" ||
      !input.arte.escolhas
    )
      throw Error("Escolha seu desenho antes de comprar.");
    if (JSON.stringify(input.arte).length > 5000)
      throw Error("Desenho inválido.");
    if (
      !["vermelho", "preto", "branco"].includes(input.arte.cor) ||
      Object.values(input.arte.escolhas).some(
        (v) => typeof v !== "string" || v.length > 200,
      )
    )
      throw Error("Desenho inválido.");
  }
  const delivery = ["personalizavel", "pronto"].includes(product.tipo);
  if (
    delivery &&
    (!freight ||
      !Number.isSafeInteger(freight.precoCentavos) ||
      freight.precoCentavos < 0)
  )
    throw Error("Escolha uma modalidade de entrega válida.");
  const address = text(input.endereco, 1000);
  if (delivery && !freight.retirada && address.length < 20)
    throw Error(
      "Informe CEP, rua, número, bairro, cidade e estado para entrega.",
    );
  return {
    quantidade: quantity,
    opcoes: options,
    subtotal: product.precoCentavos * quantity,
    frete: delivery ? freight.precoCentavos : 0,
    total:
      product.precoCentavos * quantity + (delivery ? freight.precoCentavos : 0),
    endereco: delivery && !freight.retirada ? address : "",
    entrega: delivery ? text(freight.regiao) : "Combinar sessão no estúdio",
    prazo: delivery ? text(freight.prazo) : "",
  };
}
export function validSignature(signature, requestId, id, secret) {
  if (!signature || !requestId || !id || !secret) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=")),
  );
  if (!/^\d+$/.test(parts.ts ?? "") || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? ""))
    return false;
  const hash = createHmac("sha256", secret)
    .update(
      `id:${String(id).toLowerCase()};request-id:${requestId};ts:${parts.ts};`,
    )
    .digest();
  return timingSafeEqual(hash, Buffer.from(parts.v1, "hex"));
}
export function confirmedPayment(payment, order) {
  return (
    payment.external_reference === order.id &&
    payment.currency_id === "BRL" &&
    Math.round(Number(payment.transaction_amount) * 100) === order.total &&
    payment.status === "approved"
  );
}
