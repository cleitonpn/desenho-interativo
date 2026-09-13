import { paymentTransition } from './shop-payment.mjs';
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import {
  quote,
  text,
  validSignature,
} from "./shop-validation.mjs";
const options = {
  region: "southamerica-east1",
  maxInstances: 5,
  timeoutSeconds: 60,
};
const site = "https://cleitonpn.github.io/desenho-interativo";
const secretCache = new Map();
async function secret(name) {
  const cached = secretCache.get(name);
  if (cached && cached.until > Date.now()) return cached.value;
  // Lazy retrieval allows game functions to deploy before payment credentials exist.
  const credential = getApp().options.credential;
  const { access_token } = await credential.getAccessToken();
  const project = process.env.GCLOUD_PROJECT || "galeriadovital";
  const response = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${name}/versions/latest:access`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new HttpsError(
      "failed-precondition",
      "O pagamento online aguarda a ativação do Mercado Pago pelo Vital.",
    );
  const result = await response.json();
  const value = Buffer.from(result.payload.data, "base64")
    .toString("utf8")
    .trim();
  if (!value)
    throw new HttpsError(
      "failed-precondition",
      "Credencial de pagamento não configurada.",
    );
  secretCache.set(name, { value, until: Date.now() + 60000 });
  return value;
}
async function mp(path, token, init = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpsError(
      "unavailable",
      "Não foi possível consultar o Mercado Pago. Tente novamente.",
    );
  return response.json();
}
function user(req) {
  if (!req.auth)
    throw new HttpsError(
      "unauthenticated",
      "Entre para acompanhar seu pedido.",
    );
  return req.auth.uid;
}
async function admin(req) {
  const uid = user(req);
  if (!(await getFirestore().doc(`usuarios/${uid}`).get()).data()?.admin)
    throw new HttpsError("permission-denied", "Acesso exclusivo do Vital.");
  return uid;
}
export const createCheckout = onCall(options, async (req) => {
  const uid = user(req),
    input = req.data ?? {};
  if (
    !/^[a-zA-Z0-9_-]{8,80}$/.test(input.chave ?? "") ||
    !/^[a-zA-Z0-9_-]{1,120}$/.test(input.produtoId ?? "")
  )
    throw new HttpsError("invalid-argument", "Pedido inválido.");
  const token = await secret("MERCADOPAGO_ACCESS_TOKEN");
  await secret("MERCADOPAGO_WEBHOOK_SECRET");
  const db = getFirestore(),
    id = createHash("sha256")
      .update(`${uid}:${input.chave}`)
      .digest("hex")
      .slice(0, 40),
    ref = db.doc(`shopOrders/${id}`);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const productRef = db.doc(`produtos/${input.produtoId}`);
  const now = Date.now(),
    expires = now + 30 * 60000;
  const order = await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new HttpsError(
          "already-exists",
          "Este pedido já existe com outras opções. Atualize a página.",
        );
      if (old.expires <= now)
        throw new HttpsError(
          "deadline-exceeded",
          "O checkout expirou. Atualize a página para criar outro pedido.",
        );
      return old;
    }
    const product = (await tx.get(productRef)).data();
    const freight =
      typeof input.freteId === "string" && /^[\w-]{1,120}$/.test(input.freteId)
        ? (await tx.get(db.doc(`fretes/${input.freteId}`))).data()
        : null;
    const profile = (await tx.get(db.doc(`usuarios/${uid}`))).data();
    const gate = db.doc(`shopCustomers/${uid}`),
      prior = (await tx.get(gate)).data();
    if (prior?.lastCheckout > now - 15000)
      throw new HttpsError(
        "resource-exhausted",
        "Aguarde alguns segundos para criar outro pedido.",
      );
    let price;
    try {
      price = quote(product, input, freight);
    } catch (e) {
      throw new HttpsError("invalid-argument", e.message);
    }
    const reservations = Object.fromEntries(
      Object.entries(product.reservas ?? {}).filter(([, r]) => r.expires > now),
    );
    if (product.estoque != null) {
      const held = Object.values(reservations).reduce(
        (sum, r) => sum + r.quantidade,
        0,
      );
      if (
        !Number.isInteger(product.estoque) ||
        product.estoque - held < price.quantidade
      )
        throw new HttpsError(
          "failed-precondition",
          "Essa quantidade não está disponível.",
        );
      reservations[id] = { quantidade: price.quantidade, expires };
      tx.update(productRef, { reservas: reservations });
    }
    const created = {
      id,
      uid,
      fingerprint,
      ...price,
      produtoId: input.produtoId,
      produtoNome: text(product.nome),
      nome: text(profile?.nome),
      email: text(req.auth.token.email),
      telefone: text(input.telefone, 30),
      arte: product.tipo === "personalizavel" ? input.arte : null,
      personagem: text(input.personagem, 100),
      observacao: text(input.observacao, 1000),
      created: now,
      expires,
      status: "aguardando_pagamento",
      fulfillment: "aguardando",
      paymentId: null,
    };
    if (created.telefone.replace(/\D/g, "").length < 10)
      throw new HttpsError(
        "invalid-argument",
        "Informe um telefone de contato válido.",
      );
    tx.set(ref, created);
    tx.set(gate, { lastCheckout: now });
    return created;
  });
  if (order.checkoutUrl) return { id, url: order.checkoutUrl };
  const preference = await mp("/checkout/preferences", token, {
    method: "POST",
    headers: { "X-Idempotency-Key": id },
    body: JSON.stringify({
      items: [
        {
          id: order.produtoId,
          title: order.produtoNome,
          quantity: order.quantidade,
          currency_id: "BRL",
          unit_price: order.subtotal / order.quantidade / 100,
        },
        ...(order.frete
          ? [
              {
                id: "frete",
                title: `Entrega: ${order.entrega}`,
                quantity: 1,
                currency_id: "BRL",
                unit_price: order.frete / 100,
              },
            ]
          : []),
      ],
      external_reference: id,
      payer: { email: order.email },
      back_urls: {
        success: `${site}/pedidos?pedido=${id}`,
        failure: `${site}/pedidos?pedido=${id}`,
        pending: `${site}/pedidos?pedido=${id}`,
      },
      auto_return: "approved",
      notification_url:
        "https://southamerica-east1-galeriadovital.cloudfunctions.net/mercadoPagoWebhook",
      expires: true,
      expiration_date_from: new Date(order.created).toISOString(),
      expiration_date_to: new Date(order.expires).toISOString(),
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      },
    }),
  });
  // The preference URL is hosted by the provider; no card or Pix credentials enter the app.
  const url = token.startsWith("TEST-")
    ? preference.sandbox_init_point
    : preference.init_point;
  if (
    !url ||
    !/^https:\/\/([a-z0-9-]+\.)*mercadopago\.com(?:\.br)?\//i.test(url)
  )
    throw new HttpsError("unavailable", "Link de pagamento indisponível.");
  await ref.update({ checkoutUrl: url, preferenceId: preference.id });
  return { id, url };
});
export const mercadoPagoWebhook = onRequest(options, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST required");
    return;
  }
  const id = String(req.query["data.id"] ?? "");
  try {
    const signatureSecret = await secret("MERCADOPAGO_WEBHOOK_SECRET");
    if (
      !validSignature(
        req.get("x-signature"),
        req.get("x-request-id"),
        id,
        signatureSecret,
      )
    ) {
      res.status(401).send("Invalid signature");
      return;
    }
    if (!/^\d{1,30}$/.test(id)) {
      res.status(400).send("Invalid payment");
      return;
    }
    const payment = await mp(
      `/v1/payments/${id}`,
      await secret("MERCADOPAGO_ACCESS_TOKEN"),
    );
    if (!/^[a-f0-9]{40}$/.test(payment.external_reference ?? "")) {
      res.status(200).send("Ignored");
      return;
    }
    const db = getFirestore(),
      ref = db.doc(`shopOrders/${payment.external_reference}`);
    await db.runTransaction(async (tx) => {
      const order = (await tx.get(ref)).data();
      if (!order) return;
      const productRef = db.doc(`produtos/${order.produtoId}`),
        product = (await tx.get(productRef)).data();
      const change = paymentTransition(order, product, payment, id, Date.now());
      if (change.alert) { tx.set(db.doc(`shopPaymentAlerts/${id}`), change.alert); tx.update(ref, { alertaPagamento: 'Pagamento adicional recebido. Confira o Mercado Pago antes de produzir ou reembolsar.' }); }
      if (change.product) tx.update(productRef, change.product);
      if (change.order) tx.update(ref, change.order);
    });
    res.status(200).send("OK");
  } catch {
    res.status(503).send("Retry later");
  }
});
export const listShopOrders = onCall(options, async (req) => {
  const uid = user(req),
    db = getFirestore();
  if (req.data?.admin) await admin(req);
  const query = req.data?.admin
    ? db.collection("shopOrders").orderBy("created", "desc").limit(100)
    : db.collection("shopOrders").where("uid", "==", uid).limit(100);
  const snap = await query.get();
  return snap.docs
    .map((d) => {
      const { fingerprint, ...data } = d.data();
      return data;
    })
    .sort((a, b) => b.created - a.created);
});
export const updateShopOrder = onCall(options, async (req) => {
  await admin(req);
  if (
    !/^[a-f0-9]{40}$/.test(req.data?.id ?? "") ||
    !["aguardando", "em_producao", "enviado", "concluido"].includes(
      req.data.fulfillment,
    )
  )
    throw new HttpsError("invalid-argument", "Atualização inválida.");
  const ref = getFirestore().doc(`shopOrders/${req.data.id}`);
  await getFirestore().runTransaction(async (tx) => {
    const order = (await tx.get(ref)).data();
    if (order?.status !== "pago")
      throw new HttpsError(
        "failed-precondition",
        "O pagamento precisa estar confirmado e sem pendências.",
      );
    tx.update(ref, {
      fulfillment: req.data.fulfillment,
      rastreio: text(req.data.rastreio),
      updated: Date.now(),
    });
  });
  return { ok: true };
});
