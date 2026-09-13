import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { call } from "../lib/recompensas";
import { ArtePedido } from "../components/ArtePedido";
import { formatarPreco, type Arte } from "../lib/loja";
type Pedido = {
  id: string;
  produtoNome: string;
  quantidade: number;
  total: number;
  created: number;
  expires: number;
  status: string;
  fulfillment: string;
  checkoutUrl?: string;
  nome: string;
  telefone: string;
  endereco: string;
  entrega: string;
  opcoes: Record<string, string>;
  observacao: string;
  personagem: string;
  arte?: Arte;
  rastreio?: string;
  alertaPagamento?: string;
};
const STATUS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pagamento confirmado",
  pago_revisar_estoque: "Pagamento recebido · Vital precisa revisar o estoque",
  reembolsado: "Reembolsado",
  contestado: "Pagamento contestado",
};
const ETAPAS: Record<string, string> = {
  aguardando: "Aguardando produção",
  em_producao: "Em produção",
  enviado: "Enviado",
  concluido: "Concluído",
};
export function Pedidos({ admin = false }: { admin?: boolean }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]),
    [erro, setErro] = useState(""),
    [busy, setBusy] = useState(false);
  async function carregar() {
    setBusy(true);
    setErro("");
    try {
      setPedidos(await call<Pedido[]>("listShopOrders", { admin }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void carregar();
  }, [admin]);
  return (
    <section className={admin ? "space-y-5" : "galeria-pagina space-y-5"}>
      <p className="etiqueta">Do ateliê até você</p>
      <h1 className="font-display text-4xl">
        {admin ? "Pedidos da galeria" : "Meus pedidos"}
      </h1>
      <p className="text-muted">
        A confirmação pode levar alguns instantes. Atualize após concluir o
        pagamento.
      </p>
      <button
        onClick={() => void carregar()}
        disabled={busy}
        className="botao-neutro"
      >
        {busy ? "Consultando…" : "Atualizar pedidos"}
      </button>
      {erro && (
        <p role="alert" className="text-brand">
          {erro}
        </p>
      )}
      {!busy && !erro && !pedidos.length && (
        <p>
          Nenhum pedido por aqui ainda.{" "}
          <Link to="/loja" className="underline">
            Conhecer a loja
          </Link>
        </p>
      )}
      {pedidos.map((p) => (
        <article key={p.id} className="moldura-sutil p-5 space-y-3">
          <p className="etiqueta">
            {new Date(p.created).toLocaleString("pt-BR")} · {p.id.slice(0, 8)}
          </p>
          <h2 className="font-display text-xl">
            {p.quantidade} × {p.produtoNome}
          </h2>
          <p>
            {formatarPreco(p.total)} ·{" "}
            <strong>{STATUS[p.status] || p.status}</strong>
          </p>
          <p>{ETAPAS[p.fulfillment] || p.fulfillment}</p>
          <p className="text-sm">
            {Object.entries(p.opcoes || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
          {p.rastreio && <p>Rastreio: {p.rastreio}</p>}
          {p.status === "aguardando_pagamento" &&
            p.checkoutUrl &&
            p.expires > Date.now() && (
              <a className="botao-principal" href={p.checkoutUrl}>
                Continuar pagamento
              </a>
            )}
          {p.status === "aguardando_pagamento" && p.expires <= Date.now() && (
            <p className="text-sm">
              Link expirado. Se você pagou, aguarde a confirmação; se não pagou,
              faça um novo pedido na loja.
            </p>
          )}
          {admin && p.alertaPagamento && <p role="alert" className="text-brand">{p.alertaPagamento}</p>}
          {admin && (
            <>
              <p>
                {p.nome} · {p.telefone}
              </p>
              <p>
                {p.entrega} · {p.endereco}
              </p>
              <p>{p.observacao}</p>
              {p.arte && (
                <ArtePedido arte={p.arte} personagemId={p.personagem} />
              )}
              <label className="block">
                Andamento
                <select
                  className="campo"
                  disabled={busy || p.status !== "pago"}
                  value={p.fulfillment}
                  onChange={async (e) => {
                    setBusy(true);
                    try {
                      await call("updateShopOrder", {
                        id: p.id,
                        fulfillment: e.target.value,
                        rastreio: p.rastreio || "",
                      });
                      await carregar();
                    } catch (err) {
                      setErro(
                        err instanceof Error
                          ? err.message
                          : "Falha ao atualizar.",
                      );
                      setBusy(false);
                    }
                  }}
                >
                  {Object.entries(ETAPAS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted">
                Reembolsos e contestações são tratados na conta Mercado Pago do
                Vital.
              </p>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
