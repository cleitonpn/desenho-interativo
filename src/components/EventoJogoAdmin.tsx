import { useEffect, useState } from "react";
import {
  DEFAULT_EVENT,
  loadEvent,
  saveEvent,
  type GameEvent,
} from "../lib/eventoJogo";
import { carregarCatalogo } from "../lib/catalogo";
import type { Peca } from "../lib/tipos";
export function EventoJogoAdmin() {
  const [event, setEvent] = useState<GameEvent>(DEFAULT_EVENT),
    [pieces, setPieces] = useState<Peca[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    loadEvent()
      .then(setEvent)
      .catch(() => setMessage("Evento indisponível. Tente novamente."));
    carregarCatalogo()
      .then((c) =>
        setPieces(
          c.personagens.flatMap((p) =>
            p.pecas.filter((x) => x.slot !== "base" && !x.oculta),
          ),
        ),
      )
      .catch(() => setMessage("Catálogo indisponível."));
  }, []);
  function date(n: number) {
    if (!n) return "";
    const d = new Date(n);
    return new Date(n - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  return (
    <details className="moldura-sutil p-5">
      <summary className="font-bold cursor-pointer">
        Evento especial, cenário e coleção temática
      </summary>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (event.ends && event.ends <= event.starts)
              throw Error("O término precisa ser posterior ao início.");
            await saveEvent(event);
            setMessage(
              "Evento salvo. A próxima abertura do jogo carrega a campanha.",
            );
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Erro ao salvar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          Título
          <input
            className="campo mt-1"
            required
            maxLength={80}
            value={event.title}
            onChange={(e) => setEvent({ ...event, title: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Descrição
          <textarea
            className="campo mt-1"
            maxLength={240}
            value={event.description}
            onChange={(e) =>
              setEvent({ ...event, description: e.target.value })
            }
          />
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["starts", "ends"] as const).map((k) => (
            <label className="text-sm" key={k}>
              {k === "starts" ? "Início" : "Término"}
              <input
                type="datetime-local"
                className="campo mt-1"
                value={date(event[k])}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    [k]: e.target.value
                      ? new Date(e.target.value).getTime()
                      : 0,
                  })
                }
              />
            </label>
          ))}
          <label className="text-sm">
            Cenário
            <select
              className="campo mt-1"
              value={event.scenery}
              onChange={(e) =>
                setEvent({
                  ...event,
                  scenery: e.target.value as GameEvent["scenery"],
                })
              }
            >
              <option value="auto">Jornada pelos três cenários</option>
              <option value="quintal">Quintal</option>
              <option value="rua">Skyline da rua</option>
              <option value="atelie">Ateliê</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-muted">
          Selecione peças para a coleção do evento. As caixas priorizam estas
          peças enquanto a campanha estiver ativa.
        </p>
        <div className="max-h-48 overflow-auto grid sm:grid-cols-3 gap-2">
          {pieces.map((p) => (
            <label key={p.id} className="text-xs flex gap-2">
              <input
                type="checkbox"
                checked={event.pieces.includes(p.id)}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    pieces: e.target.checked
                      ? [...event.pieces, p.id]
                      : event.pieces.filter((id) => id !== p.id),
                  })
                }
              />
              {p.rotulo}
            </label>
          ))}
        </div>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={event.active}
            onChange={(e) => setEvent({ ...event, active: e.target.checked })}
          />{" "}
          Evento ativo
        </label>
        <button disabled={busy} className="botao-principal">
          {busy ? "Salvando…" : "Salvar evento"}
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
