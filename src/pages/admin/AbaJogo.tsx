import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { Gift, Plus, Search, Save, Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import {
  call,
  rewards,
  EMPTY_REWARD,
  type Reward,
  type Coupon,
} from "../../lib/recompensas";
import { EventoJogoAdmin } from "../../components/EventoJogoAdmin";

export function AbaJogo() {
  const { perfil } = useAuth();
  const [items, setItems] = useState<Reward[]>([]),
    [form, setForm] = useState<Reward | null>(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [code, setCode] = useState(""),
    [coupon, setCoupon] = useState<Coupon | null>(null),
    [recent, setRecent] = useState<Coupon[]>([]);
  const [confirmUse, setConfirmUse] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setItems(await rewards());
      const list = await getDocs(
        query(
          collection(db, "gameCoupons"),
          orderBy("created", "desc"),
          limit(30),
        ),
      );
      setRecent(list.docs.map((d) => d.data() as Coupon));
    } catch {
      setMessage(
        "Não foi possível carregar o painel. Confira sua permissão de administrador e a publicação das regras do jogo.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (perfil?.admin) void load();
  }, [perfil?.admin]);
  if (!perfil?.admin) return <p>Acesso exclusivo de administradores.</p>;
  async function save() {
    if (!form) return;
    setBusy(true);
    setMessage("");
    try {
      await call("saveGameReward", form);
      setForm(null);
      await load();
      setMessage("Recompensa salva.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function find() {
    setBusy(true);
    setCoupon(null);
    setConfirmUse(false);
    setMessage("");
    try {
      const normalized = code.trim().toUpperCase();
      if (!/^QUINTAL-[A-F0-9]{16}$/.test(normalized))
        throw Error(
          "Digite um código no formato QUINTAL seguido de 16 letras ou números.",
        );
      const s = await getDoc(doc(db, "gameCoupons", normalized));
      if (!s.exists()) throw Error("Cupom não encontrado.");
      setCoupon(s.data() as Coupon);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível consultar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function redeem() {
    if (!coupon) return;
    setBusy(true);
    try {
      setCoupon(await call<Coupon>("redeemGameCoupon", { code: coupon.code }));
      setConfirmUse(false);
      await load();
      setMessage("Uso registrado. Este cupom não pode ser usado novamente.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível registrar o uso.",
      );
    } finally {
      setBusy(false);
    }
  }
  const totals = items.reduce(
    (s, r) => ({ issued: s.issued + r.issued, used: s.used + r.used }),
    { issued: 0, used: 0 },
  );
  const numberField = (
    key: keyof Reward,
    title: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="block text-sm" key={key}>
      {title}
      <input
        className="campo mt-1"
        type="number"
        min={min}
        max={max}
        step={step}
        required
        value={String(form?.[key] ?? "")}
        onChange={(e) =>
          setForm((f) => f && { ...f, [key]: Number(e.target.value) })
        }
      />
    </label>
  );
  function dateValue(value: number) {
    if (!value) return "";
    const d = new Date(value);
    return new Date(value - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  return (
    <div className="space-y-6">
      <EventoJogoAdmin />
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Corrida & benefícios</h2>
          <p className="text-sm text-muted mt-2">
            {totals.issued} cupons emitidos · {totals.used} utilizados ·{" "}
            {totals.issued
              ? Math.round((totals.used / totals.issued) * 100)
              : 0}
            % de resgate
          </p>
        </div>
        <button
          className="botao-principal"
          onClick={() => {
            setForm({ ...EMPTY_REWARD });
            setMessage("");
          }}
        >
          <Plus size={16} /> Nova recompensa
        </button>
      </div>
      {message && (
        <p role="status" className="moldura-sutil p-4 text-sm">
          {message}
        </p>
      )}
      {busy && <p role="status">Carregando…</p>}
      <section className="moldura-sutil p-5 space-y-3">
        <h3 className="font-bold">Conferir cupom</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void find();
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            className="campo flex-1 min-w-0"
            aria-label="Código do cupom"
            placeholder="QUINTAL-…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="botao-neutro" disabled={busy}>
            <Search size={16} /> Consultar
          </button>
        </form>
        {coupon && (
          <div className="space-y-2">
            <h4 className="font-bold">{coupon.name}</h4>
            <p>{coupon.terms}</p>
            <p className="text-sm">
              Validade: {new Date(coupon.expires).toLocaleDateString("pt-BR")} ·{" "}
              {coupon.usedAt
                ? "Já utilizado"
                : coupon.expires < Date.now()
                  ? "Expirado"
                  : "Disponível"}
            </p>
            {!coupon.usedAt &&
              coupon.expires > Date.now() &&
              (confirmUse ? (
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-sm">
                    Confirme apenas quando o benefício for aplicado ao
                    atendimento. O uso é único.
                  </p>
                  <button
                    disabled={busy}
                    className="botao-principal"
                    onClick={() => void redeem()}
                  >
                    <Check size={16} /> Confirmar uso
                  </button>
                  <button
                    className="botao-neutro"
                    onClick={() => setConfirmUse(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="botao-principal"
                  onClick={() => setConfirmUse(true)}
                >
                  Registrar uso no atendimento
                </button>
              ))}
          </div>
        )}
      </section>
      {form && (
        <form
          className="moldura-sutil p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3 className="font-bold text-xl">
            {form.id ? "Editar recompensa" : "Nova recompensa"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              Nome exibido
              <input
                required
                maxLength={100}
                className="campo mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Tipo
              <select
                className="campo mt-1"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as Reward["type"] })
                }
              >
                <option value="percent">Desconto percentual</option>
                <option value="fixed">Desconto em reais</option>
                <option value="gift">Brinde</option>
                <option value="benefit">Outro benefício</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Descrição
            <textarea
              className="campo mt-1"
              maxLength={400}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            Condições do benefício
            <textarea
              required
              className="campo mt-1"
              maxLength={1000}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Imagem (URL HTTPS, opcional)
            <input
              type="url"
              className="campo mt-1"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </label>
          <div className="grid sm:grid-cols-3 gap-4">
            {numberField(
              "value",
              form.type === "percent"
                ? "Desconto (%)"
                : "Valor (R$; zero para brinde)",
              0,
              form.type === "percent" ? 100 : 100000,
              0.01,
            )}
            {numberField(
              "chance",
              "Chance por cupom surpresa coletado (%)",
              0,
              100,
              0.1,
            )}
            {numberField(
              "stock",
              "Quantidade total de cupons",
              form.issued,
              100000,
            )}
            {numberField("validityDays", "Validade após ganhar (dias)", 1, 365)}
            {numberField("perUser", "Limite total por pessoa", 1, 100)}
            {numberField("cooldownDays", "Intervalo por pessoa (dias)", 0, 365)}
            {numberField("minBoxes", "Caixas mínimas na corrida", 1, 100)}
            <label className="text-sm">
              Missão exigida
              <select
                className="campo mt-1"
                value={form.mission}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mission: e.target.value as Reward["mission"],
                  })
                }
              >
                <option value="">Nenhuma</option>
                <option value="penas">20 penas</option>
                <option value="minhocas">3 minhocas</option>
                <option value="caixas">5 caixas</option>
                <option value="limpa">Sem tinta</option>
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {(["starts", "ends"] as const).map((k) => (
              <label className="text-sm" key={k}>
                {k === "starts" ? "Início da campanha" : "Fim da campanha"}
                <input
                  className="campo mt-1"
                  type="datetime-local"
                  value={dateValue(form[k])}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [k]: e.target.value
                        ? new Date(e.target.value).getTime()
                        : 0,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Campanha ativa
          </label>
          <p className="text-xs text-muted">
            No máximo um benefício por corrida. O sorteio considera as campanhas
            disponíveis e os limites de cada pessoa. Cupons emitidos preservam as
            condições originais mesmo após uma edição.
          </p>
          <div className="flex gap-2">
            <button disabled={busy} className="botao-principal">
              <Save size={16} /> Salvar
            </button>
            <button
              type="button"
              className="botao-neutro"
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((r) => (
          <article className="moldura-sutil p-5 space-y-2" key={r.id}>
            <div className="flex justify-between">
              <Gift size={20} />
              <span className="text-xs">{r.active ? "ATIVA" : "PAUSADA"}</span>
            </div>
            <h3 className="font-bold">{r.name}</h3>
            <p className="text-sm text-muted">{r.description}</p>
            <p className="text-xs">
              {r.issued}/{r.stock} emitidos · {r.used} usados · {r.chance}% por
              cupom surpresa coletado
            </p>
            <button
              className="botao-neutro !py-2"
              onClick={() => {
                setForm(r);
                setMessage("");
              }}
            >
              Editar campanha
            </button>
          </article>
        ))}
      </div>
      {!items.length && !busy && (
        <p className="text-muted text-sm">
          Cadastre a primeira campanha. Nenhum desconto é distribuído sem uma
          campanha ativa.
        </p>
      )}
      <section>
        <h3 className="font-bold mb-3">Últimos cupons emitidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Código</th>
                <th className="p-2">Benefício</th>
                <th className="p-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.code} className="border-t border-line">
                  <td className="p-2 font-mono text-xs">{c.code}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">
                    {c.usedAt
                      ? "Utilizado"
                      : c.expires < Date.now()
                        ? "Expirado"
                        : "Disponível"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
