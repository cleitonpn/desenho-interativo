import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  type Produto as ProdutoTipo,
  type Frete,
  type Arte,
  type CorCamiseta,
  type AreaId,
  formatarPreco,
  precisaEntrega,
} from "../lib/loja";
import { listarFretes } from "../lib/produtos";
import { useAuth } from "../contexts/AuthContext";
import { carregarCatalogo, acharPersonagem } from "../lib/catalogo";
import { type Personagem } from "../lib/tipos";
import { Camiseta } from "../components/Camiseta";
import { Desenho } from "../components/Desenho";
import { call } from "../lib/recompensas";
import { MARCA } from "../config/marca";
type ArteSalva = { arte?: Arte; personagem?: string };
export function Produto() {
  const { id } = useParams();
  const location = useLocation(),
    navigate = useNavigate();
  const { usuario } = useAuth();
  const [produto, setProduto] = useState<ProdutoTipo | null>(null);
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [arte] = useState<ArteSalva>(() => {
    try {
      return location.state?.arte
        ? location.state
        : JSON.parse(sessionStorage.getItem("vital-arte-produto") || "{}");
    } catch {
      return {};
    }
  });
  const [personagem, setPersonagem] = useState<Personagem | null>(null);
  const [cor, setCor] = useState<CorCamiseta>("branca"),
    [area, setArea] = useState<AreaId>("costas");
  const [tamanho, setTamanho] = useState(""),
    [freteId, setFreteId] = useState(""),
    [endereco, setEndereco] = useState(""),
    [telefone, setTelefone] = useState(""),
    [observacao, setObservacao] = useState("");
  const [quantidade, setQuantidade] = useState(1),
    [opcoes, setOpcoes] = useState<Record<string, string>>({});
  const [chave] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (!produto) return;
    try { const d = JSON.parse(sessionStorage.getItem(`vital-pedido-${id}`) || 'null'); if (d) { if (produto.cores?.includes(d.cor)) setCor(d.cor); if (produto.areas?.includes(d.area)) setArea(d.area); if (produto.tamanhos?.includes(d.tamanho)) setTamanho(d.tamanho); setQuantidade(d.quantidade || 1); setOpcoes(d.opcoes || {}); setFreteId(d.freteId || ''); setEndereco(d.endereco || ''); setTelefone(d.telefone || ''); setObservacao(d.observacao || ''); sessionStorage.removeItem(`vital-pedido-${id}`); } } catch { /* Ignore invalid local drafts. */ }
  }, [produto, id]);
  useEffect(() => {
    if (arte.arte) {
      try {
        sessionStorage.setItem("vital-arte-produto", JSON.stringify(arte));
      } catch {
        /* Optional persistence. */
      }
    }
    carregarCatalogo()
      .then((c) => setPersonagem(acharPersonagem(c, arte.personagem)))
      .catch(() => {});
  }, [arte]);
  useEffect(() => {
    setProduto(null);
    setErro("");
    Promise.all([getDoc(doc(db, "produtos", id!)), listarFretes()])
      .then(([snap, tarifas]) => {
        if (!snap.exists() || !snap.data().ativo)
          throw Error("Este produto não está disponível.");
        const p = { id: snap.id, ...snap.data() } as ProdutoTipo;
        setProduto(p);
        setFretes(tarifas);
        setCor(p.cores?.[0] || "branca");
        setArea(p.areas?.[0] || "costas");
        setTamanho(p.tamanhos?.[0] || "");
      })
      .catch((e) =>
        setErro(e.message || "Não foi possível abrir este produto."),
      );
  }, [id]);
  if (!produto)
    return (
      <main className="galeria-pagina">
        <p role="status">{erro || "Abrindo a peça…"}</p>
        <Link to="/loja" className="botao-neutro mt-5">
          Voltar à loja
        </Link>
      </main>
    );
  const p = produto,
    frete = fretes.find((f) => f.id === freteId),
    entrega = precisaEntrega(p.tipo),
    personalizada = p.tipo === "personalizavel";
  const consulta = p.precoSobConsulta || p.precoCentavos < 100;
  async function comprar(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!usuario) {
      try { sessionStorage.setItem(`vital-pedido-${id}`, JSON.stringify({ cor, area, tamanho, quantidade, opcoes, freteId, endereco, telefone, observacao })); } catch { /* Navigation still works without local storage. */ }
      navigate("/entrar", { state: { destino: `/loja/${id}` } });
      return;
    }
    setBusy(true);
    setErro("");
    try {
      const result = await call<{ id: string; url: string }>("createCheckout", {
        chave,
        produtoId: p.id,
        quantidade,
        cor,
        area,
        tamanho,
        opcoes,
        freteId,
        endereco,
        telefone,
        observacao,
        arte: arte.arte || null,
        personagem: arte.personagem || "",
      });
      window.location.assign(result.url);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível iniciar o pagamento.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="galeria-pagina">
      <Link to="/loja" state={arte} className="text-muted">
        ← Todas as peças
      </Link>
      <div className="grid md:grid-cols-2 gap-8 mt-7">
        <section className="space-y-4">
          <div className="papel moldura p-6">
            {personalizada && (!p.modelo || p.modelo === "camiseta") ? (
              <Camiseta
                personagem={personagem}
                cor={cor}
                area={area}
                arte={arte.arte || null}
                mostrarGuia
                className="max-w-sm mx-auto"
              />
            ) : personalizada && p.modelo === "caneca" ? (
              <div className="relative max-w-xs mx-auto h-72">
                <svg
                  viewBox="0 0 300 280"
                  className="w-full h-full"
                  aria-hidden="true"
                >
                  <path
                    d="M215 60 Q300 50 280 160 Q265 190 215 175 M45 35 H220 V225 Q130 265 45 225 Z"
                    fill="rgb(var(--c-surface))"
                    stroke="rgb(var(--c-ink))"
                    strokeWidth="5"
                  />
                </svg>
                {arte.arte?.tipo === "galinha" && personagem && (
                  <div className="absolute w-24 left-20 top-16"><Desenho
                    personagem={personagem}
                    escolhas={arte.arte.escolhas}
                    cor={arte.arte.cor}
                    ajustado
                    className="w-full"
                  /></div>
                )}
              </div>
            ) : p.fotos[0] ? (
              <img
                src={p.fotos[0]}
                alt={p.nome}
                className="w-full aspect-square object-contain"
              />
            ) : (
              <div className="h-64 grid place-items-center font-display text-3xl">
                {p.nome}
              </div>
            )}
            {personalizada && (
              <p className="text-xs text-muted text-center mt-4">
                Prévia ilustrativa. Veja as fotos e a descrição para os detalhes
                do produto.
              </p>
            )}
          </div>
          {p.fotos.map((foto, i) => (
            <img
              key={foto}
              src={foto}
              alt={`${p.nome} · foto ${i + 1}`}
              loading="lazy"
              className="rounded-xl border-2 border-ink/20 max-h-80 object-contain mx-auto"
            />
          ))}
        </section>
        <section>
          <p className="etiqueta">{p.categoria}</p>
          <h1 className="font-display text-4xl mt-2">{p.nome}</h1>
          <p className="text-muted whitespace-pre-line my-5">{p.descricao}</p>
          <p className="font-display text-3xl">
            {consulta ? "Sob consulta" : formatarPreco(p.precoCentavos)}
          </p>
          {p.prazoProducao && (
            <p className="text-sm mt-3">Produção: {p.prazoProducao}</p>
          )}
          {personalizada && (
            <div className="moldura-sutil p-4 mt-5">
              <p>
                {arte.arte
                  ? `Sua criação: ${personagem?.nome || "personagem escolhido"}`
                  : "Primeiro, crie o desenho que vai nesta peça."}
              </p>
              <Link className="underline text-brand" to="/montar">
                {arte.arte ? "Escolher outro desenho" : "Criar meu desenho"}
              </Link>
              {p.modelo === "outro" &&
                arte.arte?.tipo === "galinha" &&
                personagem && (
                  <Desenho
                    personagem={personagem}
                    escolhas={arte.arte.escolhas}
                    cor={arte.arte.cor}
                    ajustado
                    className="w-28 mt-3"
                  />
                )}
            </div>
          )}
          {consulta ? (
            <a
              className="botao-principal mt-6"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(`Olá, Vital! Quero um orçamento para ${p.nome}. ${new URL(window.location.href).href}`)}`}
            >
              Pedir orçamento
            </a>
          ) : (
            <form onSubmit={comprar} className="space-y-4 mt-6">
              {personalizada && (
                <>
                  {[
                    ["Cor", p.cores, cor, setCor],
                    ["Tamanho", p.tamanhos, tamanho, setTamanho],
                    ["Estampa", p.areas, area, setArea],
                  ].map(([label, valores, value, set]) =>
                    Array.isArray(valores) && valores.length > 0 ? (
                      <label key={String(label)} className="block">
                        {String(label)}
                        <select
                          className="campo"
                          value={String(value)}
                          onChange={(e) =>
                            (set as (v: string) => void)(e.target.value)
                          }
                        >
                          {valores.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    ) : null,
                  )}
                  {p.opcoes?.map((grupo) => (
                    <label className="block" key={grupo.nome}>
                      {grupo.nome}
                      <select
                        required
                        className="campo"
                        value={opcoes[grupo.nome] || ""}
                        onChange={(e) =>
                          setOpcoes((o) => ({
                            ...o,
                            [grupo.nome]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione</option>
                        {grupo.valores.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <label className="block">
                Quantidade
                <input
                  className="campo"
                  type="number"
                  required
                  min="1"
                  max={Math.min(10, p.estoque ?? 10)}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </label>
              {entrega && (
                <>
                  <label className="block">
                    Entrega
                    <select
                      required
                      className="campo"
                      value={freteId}
                      onChange={(e) => setFreteId(e.target.value)}
                    >
                      <option value="">Escolha sua região</option>
                      {fretes.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.regiao} · {formatarPreco(f.precoCentavos)} ·{" "}
                          {f.prazo}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!fretes.length && (
                    <p className="text-brand">
                      As opções de entrega ainda não foram cadastradas pelo
                      Vital.
                    </p>
                  )}
                  {!frete?.retirada && (
                    <label className="block">
                      Endereço completo
                      <textarea
                        required
                        minLength={20}
                        maxLength={1000}
                        className="campo"
                        placeholder="CEP, rua, número, complemento, bairro, cidade e estado"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                      />
                    </label>
                  )}
                </>
              )}
              <label className="block">
                WhatsApp de contato
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  minLength={10}
                  maxLength={30}
                  className="campo"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </label>
              <label className="block">
                Observações
                <textarea
                  maxLength={1000}
                  className="campo"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </label>
              <div className="border-y-2 border-ink py-4">
                <p className="font-display text-xl">
                  Total:{" "}
                  {formatarPreco(
                    p.precoCentavos * quantidade + (frete?.precoCentavos || 0),
                  )}
                </p>
                {entrega && !frete && (
                  <p className="text-sm text-muted">
                    Selecione a entrega para calcular o total.
                  </p>
                )}
                <p className="text-sm mt-2">
                  Pix ou cartão no ambiente seguro do Mercado Pago.
                </p>
                {!entrega && (
                  <p className="text-sm mt-2">
                    O pagamento não confirma uma data. O agendamento será
                    combinado com o Vital.
                  </p>
                )}
              </div>
              {erro && (
                <p role="alert" className="text-brand">
                  {erro}
                </p>
              )}
              <button
                disabled={
                  busy || p.estoque === 0 || (personalizada && !arte.arte)
                }
                className="botao-principal w-full"
              >
                {busy
                  ? "Preparando pagamento…"
                  : p.estoque === 0
                    ? "Esgotado"
                    : usuario
                      ? "Pagar com Pix ou cartão →"
                      : "Entrar para comprar →"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
