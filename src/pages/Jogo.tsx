import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  Gift,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { Desenho } from "../components/Desenho";
import { CenarioCorrida } from "../components/CenarioCorrida";
import {
  carregarCatalogo,
  personagemPadrao,
  personagensVisiveis,
  caminhoDaPeca,
} from "../lib/catalogo";
import {
  createRun,
  stepRun,
  missions,
  challenges,
  difficulty,
  VERSION,
  type Run,
  type Input,
  type Thing,
} from "../lib/corrida";
import {
  journal,
  saveJournal,
  dailySeed,
  dayKey,
  weekKey,
  ACHIEVEMENTS,
  type Journal,
} from "../lib/corridaProgresso";
import {
  beginRun,
  finishRun,
  myCoupons,
  couponLink,
  leaderboard,
  type Coupon,
  type Session,
} from "../lib/recompensas";
import { guardarPartida, pecasJogaveis } from "../lib/jogo";
import { registrarDescoberta } from "../lib/progresso";
import { useAuth } from "../contexts/AuthContext";
import { MARCA } from "../config/marca";
import {
  DEFAULT_EVENT,
  loadEvent,
  eventActive,
  type GameEvent,
} from "../lib/eventoJogo";
import { resultCard, shareCard } from "../lib/compartilharCorrida";
import type { Catalogo, Escolhas } from "../lib/tipos";
import "./jogo.css";

type Phase = "intro" | "countdown" | "playing" | "paused" | "end";
const EMPTY = createRun(1),
  STAGES = ["O quintal", "Pelas ruas", "Ateliê do Vital"];
export function Jogo() {
  const { usuario } = useAuth(),
    navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalogo | null>(null),
    [personId, setPersonId] = useState("");
  const [error, setError] = useState(""),
    [phase, setPhase] = useState<Phase>("intro"),
    [count, setCount] = useState(3);
  const [event, setEvent] = useState<GameEvent>(DEFAULT_EVENT),
    [card, setCard] = useState<File | null>(null);
  const [run, setRun] = useState<Run>(EMPTY),
    [progress, setProgress] = useState<Journal>(journal);
  const [newAchievements, setNewAchievements] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false),
    [panel, setPanel] = useState<"collection" | "coupons" | "ranking" | null>(
      null,
    );
  const [coupons, setCoupons] = useState<Coupon[]>([]),
    [ranking, setRanking] = useState<{ alias: string; score: number }[]>([]);
  const [rewardStatus, setRewardStatus] = useState(""),
    [daily, setDaily] = useState(false),
    [width, setWidth] = useState(960);
  const viewRef = useRef<HTMLDivElement>(null),
    live = useRef<Run>(EMPTY),
    held = useRef(false),
    tap = useRef(false);
  const inputs = useRef<Input[]>([]),
    session = useRef<Session | null>(null),
    audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(false),
    lastTone = useRef(0),
    [pending, setPending] = useState(false);
  useEffect(() => {
    carregarCatalogo()
      .then((c) => {
        setCatalog(c);
        setPersonId(personagemPadrao(c).id);
      })
      .catch(() =>
        setError("Não foi possível carregar os desenhos. Recarregue a página."),
      );
  }, []);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    setCoupons([]);
    setPending(false);
  }, [usuario?.uid]);
  useEffect(() => {
    if (!panel) return;
    const prior = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".run-modal button:not(:disabled), .run-modal a[href], .run-modal input, .run-modal select",
        ),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, [panel]);
  useEffect(() => {
    loadEvent()
      .then((e) => {
        if (eventActive(e)) setEvent(e);
      })
      .catch(() => {
        /* Standard scenery remains available offline. */
      });
  }, []);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(
        Math.max(560, Math.min(1250, (el.clientWidth / el.clientHeight) * 650)),
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [catalog]);
  const character = useMemo(
    () =>
      catalog?.personagens.find((p) => p.id === personId) ??
      (catalog ? personagemPadrao(catalog) : null),
    [catalog, personId],
  );
  const allPieces = useMemo(
    () => (character ? pecasJogaveis(character) : []),
    [character],
  );
  const pieces = useMemo(() => {
    const featured = allPieces.filter((p) => event.pieces.includes(p.id));
    return featured.length ? featured : allPieces;
  }, [allPieces, event]);
  const collected = useMemo(
    () =>
      run.items
        .map((id) => pieces[id % pieces.length])
        .filter(Boolean),
    [run.items.length, pieces],
  );
  const clothes = useMemo(
    () => Object.fromEntries(collected.map((p) => [p.slot, p.id])) as Escolhas,
    [collected],
  );
  useEffect(() => {
    setCard(null);
    let active = true;
    if (phase === "end" && character)
      void resultCard(character, clothes, run.score)
        .then((f) => {
          if (active) setCard(f);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [phase, character, clothes, run.score]);
  const tone = useCallback((frequency: number) => {
    const ctx = audio.current;
    if (!soundRef.current || !ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 1.4,
      ctx.currentTime + 0.08,
    );
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }, []);
  function unlockAudio() {
    if (sound) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    }
  }
  async function sendResult() {
    if (!session.current) return;
    setBusy(true);
    setRewardStatus("Conferindo sua corrida…");
    try {
      const result = await finishRun(session.current.id, inputs.current);
      setCoupons((old) => [
        ...result.coupons,
        ...old.filter((c) => !result.coupons.some((n) => n.code === c.code)),
      ]);
      setRewardStatus(
        result.coupons.length
          ? "Seu benefício está na carteira!"
          : "Corrida validada. Nenhum cupom nesta vez; confira as próximas campanhas.",
      );
      setPending(false);
      try {
        localStorage.removeItem(`quintal:pending:${usuario?.uid}`);
      } catch {
        /* storage unavailable */
      }
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        [
          "functions/failed-precondition",
          "functions/permission-denied",
        ].includes(String(err.code))
      ) {
        setPending(false);
        setRewardStatus(
          "Esta partida não pode mais ser validada. Inicie uma nova corrida premiada.",
        );
        try {
          localStorage.removeItem(`quintal:pending:${usuario?.uid}`);
        } catch {
          /* Storage unavailable. */
        }
        return;
      }
      setPending(true);
      setRewardStatus(
        "Não conseguimos validar agora. Sua partida foi guardada para tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  const finishRef = useRef<() => void>(() => {});
  finishRef.current = () => {
    const r = live.current,
      itemIds = r.items
        .map((id) => pieces[id % pieces.length]?.id)
        .filter(Boolean);
    const saved = saveJournal(r, itemIds, daily);
    setProgress(saved.journal);
    setNewAchievements(saved.newAchievements);
    if (usuario && character)
      void registrarDescoberta(usuario.uid, itemIds, character.id);
    setPhase("end");
    held.current = false;
    if (session.current) {
      try {
        localStorage.setItem(
          `quintal:pending:${usuario?.uid}`,
          JSON.stringify({ session: session.current, inputs: inputs.current }),
        );
      } catch {
        /* Keep in memory. */
      }
      void sendResult();
    }
  };
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      setPhase("playing");
      return;
    }
    const timer = setTimeout(() => setCount((v) => v - 1), 850);
    return () => clearTimeout(timer);
  }, [phase, count]);
  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0,
      previous = performance.now(),
      bank = 0,
      lastPaint = 0;
    function loop(now: number) {
      bank += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      while (bank >= 1 / 60 && live.current.tick < live.current.end) {
        const r = live.current;
        const desired = held.current || tap.current;
        if (r.held !== desired)
          inputs.current.push({ tick: r.tick, held: desired });
        stepRun(r, desired);
        tap.current = false;
        bank -= 1 / 60;
      }
      if (live.current.noticeUntil !== lastTone.current) {
        lastTone.current = live.current.noticeUntil;
        tone(live.current.notice.includes("Tinta") ? 140 : 600);
      }
      if (now - lastPaint > 30) {
        setRun({ ...live.current });
        lastPaint = now;
      }
      if (live.current.tick >= live.current.end) {
        setRun({ ...live.current });
        finishRef.current();
        return;
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, tone]);
  useEffect(() => {
    const cancel = () => {
      held.current = false;
      tap.current = false;
      setPhase((p) => (p === "playing" || p === "countdown" ? "paused" : p));
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches("input,textarea,select")) return;
      if ([" ", "ArrowUp", "w", "W"].includes(e.key) && phase === "playing") {
        e.preventDefault();
        if (!e.repeat) tap.current = true;
        held.current = true;
      }
      if (e.key === "Escape" && phase === "playing") cancel();
    };
    const up = (e: KeyboardEvent) => {
      if ([" ", "ArrowUp", "w", "W"].includes(e.key)) held.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [phase]);
  async function start(mode: "free" | "daily" | "reward") {
    if (busy) return;
    unlockAudio();
    setError("");
    setBusy(true);
    session.current = null;
    setRewardStatus("");
    setPending(false);
    try {
      let seed =
        mode === "daily"
          ? dailySeed()
          : crypto.getRandomValues(new Uint32Array(1))[0];
      if (mode === "reward") {
        if (!usuario) {
          navigate("/entrar", { state: { destino: "/jogo" } });
          return;
        }
        session.current = await beginRun();
        if (session.current.version !== VERSION)
          throw Error("Atualize a página para jogar.");
        seed = session.current.seed;
      }
      setDaily(mode === "daily");
      const next = createRun(seed);
      if (mode === "daily")
        next.notice = "Missão de hoje: " + missions(next)[dailySeed() % 4].name;
      live.current = next;
      setRun({ ...next });
      inputs.current = [];
      held.current = false;
      tap.current = false;
      setNewAchievements([]);
      setCount(3);
      setPhase("countdown");
    } catch {
      setError(
        "A corrida premiada está indisponível agora. Você pode jogar livremente e tentar mais tarde.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openPanel(value: "collection" | "coupons" | "ranking") {
    setPanel(value);
    setError("");
    if (value === "coupons" && usuario) {
      setBusy(true);
      try {
        setCoupons(await myCoupons(usuario.uid));
        const raw = localStorage.getItem(`quintal:pending:${usuario.uid}`);
        if (raw) {
          const p = JSON.parse(raw);
          session.current = p.session;
          inputs.current = p.inputs;
          setPending(true);
        }
      } catch {
        setError("Não foi possível carregar os cupons. Tente novamente.");
      } finally {
        setBusy(false);
      }
    }
    if (value === "ranking") {
      setBusy(true);
      try {
        setRanking(await leaderboard(weekKey()));
      } catch {
        setError("Ranking indisponível no momento.");
      } finally {
        setBusy(false);
      }
    }
  }
  function edit() {
    if (!character) return;
    guardarPartida(character.id, clothes);
    navigate("/montar", {
      state: { escolhas: clothes, personagem: character.id },
    });
  }
  const naturalStage = difficulty(run),
    stage =
      event.scenery === "auto"
        ? naturalStage
        : ["quintal", "rua", "atelie"].indexOf(event.scenery),
    camera = run.x - 3.4,
    px = (x: number) => (x - camera) * 55,
    running = phase === "playing";
  if (!catalog || !character)
    return (
      <div className="run-loading">
        {error || "Preparando o quintal…"}
        {error && (
          <button onClick={() => location.reload()}>Tentar novamente</button>
        )}
      </div>
    );
  return (
    <div className="run-page">
      <header className="run-top">
        <Link to="/" aria-label="Voltar ao início">
          <ArrowLeft size={19} />
        </Link>
        <span>
          QUINTAL <i>/</i> NA CORRIDA
        </span>
        <button
          aria-label={sound ? "Desligar som" : "Ligar som"}
          onClick={() => {
            if (!sound) {
              audio.current ??= new AudioContext();
              void audio.current.resume();
            }
            setSound((v) => !v);
          }}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      </header>
      <div className="run-layout">
        <div className="run-view" ref={viewRef}>
          <svg
            className="run-scene"
            viewBox={`0 0 ${width} 650`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <CenarioCorrida camera={camera} stage={stage} width={width} />
            {run.things
              .filter(
                (o) => !o.taken && px(o.x) > -150 && px(o.x) < width + 150,
              )
              .map((o) => (
                <ObjectDrawing key={o.id} thing={o} x={px(o.x)}
                  accessory={o.kind === "accessory" && pieces.length ? caminhoDaPeca(pieces[o.sourceId! % pieces.length]) : undefined} />
              ))}
            {run.effects.map((p, i) => (
              <g
                key={`${p.until}-${i}`}
                transform={`translate(${px(p.x)},${532 - p.y * 55})`}
                stroke="#ed3525"
                strokeWidth="2"
                opacity={(p.until - run.tick) / 24}
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <path
                    key={n}
                    transform={`rotate(${n * 60})`}
                    d={`M0 ${36 - p.until + run.tick}v8`}
                  />
                ))}
              </g>
            ))}
            <ellipse
              cx={px(run.x)}
              cy="534"
              rx={31 - Math.min(run.y * 4, 15)}
              ry="5"
              fill="#423b32"
              opacity=".18"
            />
          </svg>
          <div
            className={`run-bird ${run.shield > run.tick ? "protected" : ""}`}
            style={{
              left: `${(px(run.x) / width) * 100}%`,
              bottom: `${((118 + run.y * 55 - 13) / 650) * 100}%`,
              width: `${(118 / width) * 100}%`,
              height: "25%",
              filter:
                run.immune > run.tick && run.tick % 12 < 6
                  ? "drop-shadow(0 0 5px #e93625)"
                  : undefined,
              transform: `translateX(-50%) scale(${run.vy > 0 ? 0.96 : 1.02},${run.vy > 0 ? 1.04 : 0.99})`,
            }}
          >
            <Desenho
              personagem={character}
              opaco
              escolhas={clothes}
              cor="vermelho"
              className="w-full h-full"
              patas={{ andando: running, noAr: !run.ground }}
            />
          </div>
          {running && (
            <button
              className="run-touch"
              aria-label="Pular: toque rápido ou segure para pular mais alto"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                held.current = true;
                tap.current = true;
              }}
              onPointerUp={() => {
                held.current = false;
              }}
              onPointerCancel={() => {
                held.current = false;
              }}
              onLostPointerCapture={() => {
                held.current = false;
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
          {phase !== "intro" && (
            <div className="run-hud">
              <div>
                <small>PONTOS</small>
                <strong>{run.score.toLocaleString("pt-BR")}</strong>
              </div>
              <div className="run-route">
                <span>
                  {daily
                    ? "Desafio do dia · "
                    : session.current
                      ? "Premiada · "
                      : ""}
                  {STAGES[stage]}
                </span>
                <progress
                  aria-label="Caminho até o estúdio"
                  max={run.end}
                  value={run.tick}
                />
              </div>
              <div>
                <small>TEMPO</small>
                <strong>
                  {Math.ceil((run.end - run.tick) / 60)}
                  <em>s</em>
                </strong>
              </div>
              {running && (
                <button
                  aria-label="Pausar jogo"
                  onClick={() => {
                    held.current = false;
                    setPhase("paused");
                  }}
                >
                  <Pause size={20} />
                </button>
              )}
            </div>
          )}
          {running && (
            <>
              <div className="run-notice" role="status">
                {run.noticeUntil > run.tick ? run.notice : ""}
              </div>
              <div className="run-power">
                <span>Nível {difficulty(run) + 1}/3</span>
                {run.tickets.length > 0 && <span>🎟 {run.tickets.length} {session.current ? "a conferir no final" : "· demonstração"}</span>}
                {run.shield > run.tick && (
                  <span>
                    ◇ Escudo {Math.ceil((run.shield - run.tick) / 60)}s
                  </span>
                )}
                {run.magnet > run.tick && (
                  <span>↟ Ímã {Math.ceil((run.magnet - run.tick) / 60)}s</span>
                )}
                {run.combo > 1 && <span>COMBO ×{run.combo}</span>}
              </div>
              <div className="run-stage-label">
                {run.tick < 400
                  ? "TOQUE PARA PULAR · SEGURE PARA IR MAIS ALTO"
                  : stage === 2
                    ? "O ESTÚDIO ESTÁ LOGO ALI"
                    : "SIGA AS PENAS. ENCONTRE SEU ESTILO."}
              </div>
            </>
          )}
          {phase === "intro" && (
            <div className="run-intro">
              <span className="run-eyebrow">
                {event.title || "UM QUINTAL. INFINITAS COMBINAÇÕES."}
              </span>
              <h1>
                Seu estilo.
                <br />
                Sua corrida<span>.</span>
              </h1>
              <p>
                {event.description ||
                  "120 segundos até o Vital. O ritmo aumenta, as plataformas sobem e cada missão abre um novo desafio."}
              </p>
              <div className="run-intro-actions">
                <button
                  className="run-primary"
                  disabled={busy}
                  onClick={() => void start("free")}
                >
                  <Play size={18} /> Bora correr
                </button>
                <button
                  className="run-secondary"
                  disabled={busy}
                  onClick={() => void start("daily")}
                >
                  Desafio do dia ↗
                </button>
              </div>
              <button
                className="run-reward-entry"
                disabled={busy}
                onClick={() => void start("reward")}
              >
                <Gift size={16} />
                {busy ? "Preparando…" : "Jogar por benefícios"}{" "}
                <span>requer conta</span>
              </button>
              <div className="run-instructions">
                <span>
                  <b>01</b> Corre sozinha
                </span>
                <span>
                  <b>02</b> Toque para pular
                </span>
                <span>
                  <b>03</b> Vista o que encontrar
                </span>
              </div>
            </div>
          )}
          {phase === "countdown" && (
            <div className="run-overlay countdown">
              <strong>{count || "VAI!"}</strong>
              <p>Um toque. Um pulo. Seu estilo.</p>
            </div>
          )}
          {phase === "paused" && (
            <div className="run-overlay">
              <span className="run-eyebrow">RESPIRA UM POUCO</span>
              <h2>Quintal em pausa</h2>
              <p>A corrida continua de onde você parou.</p>
              <button
                className="run-primary"
                onClick={() => {
                  unlockAudio();
                  setCount(3);
                  setPhase("countdown");
                }}
              >
                <Play size={18} /> Continuar
              </button>
              <button
                className="run-secondary"
                onClick={() => {
                  setPhase("intro");
                  held.current = false;
                }}
              >
                Voltar ao início
              </button>
            </div>
          )}
          {phase === "end" && (
            <div className="run-overlay run-result">
              <span className="run-eyebrow">VOCÊ CHEGOU AO ATELIÊ</span>
              <h2>
                {run.score.toLocaleString("pt-BR")} <small>pontos</small>
              </h2>
              <p>
                {run.score >= progress.best
                  ? "Seu melhor resultado!"
                  : "Mais uma história no quintal."}{" "}
                {daily && `Desafio de ${dayKey()}`}
              </p>
              <div className="run-result-stats">
                <span>
                  <b>{run.feathers}</b> penas
                </span>
                <span>
                  <b>{run.worms}</b> minhocas
                </span>
                <span>
                  <b>{run.boxes}</b> caixas
                </span>
                <span>
                  <b>{run.tickets.length}</b> cupons coletados
                </span>
              </div>
              {newAchievements.length > 0 && (
                <p className="run-achievement">
                  ✦ {newAchievements.map((id) => ACHIEVEMENTS[id]).join(" · ")}
                </p>
              )}
              <div className="run-final-missions">
                {missions(run).map((m) => (
                  <span
                    key={m.id}
                    className={m.value >= m.target ? "done" : ""}
                  >
                    {m.value >= m.target ? "✓" : "○"} {m.name}
                  </span>
                ))}
              </div>
              {run.tickets.length > 0 && !session.current && <p>Cupons de demonstração. Entre e escolha “Jogar por benefícios” para concorrer aos benefícios reais.</p>}
              {rewardStatus && <p role="status">{rewardStatus}</p>}
              {pending && (
                <button
                  className="run-secondary"
                  disabled={busy}
                  onClick={() => void sendResult()}
                >
                  Tentar validar novamente
                </button>
              )}
              {coupons
                .filter((c) => c.created > Date.now() - 10 * 60000)
                .map((c) => (
                  <a
                    key={c.code}
                    className="run-primary"
                    href={couponLink(c)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar {c.name} para o Vital ↗
                  </a>
                ))}
              <div className="run-result-actions">
                <button
                  className="run-primary"
                  onClick={() => void start("free")}
                  disabled={busy}
                >
                  <RotateCcw size={16} /> De novo
                </button>
                <button className="run-secondary" onClick={edit}>
                  Ver meu desenho
                </button>
                {card && (
                  <button
                    className="run-secondary"
                    onClick={() =>
                      void shareCard(card).catch((e) => {
                        if (e?.name !== "AbortError")
                          setError("Não foi possível compartilhar a imagem.");
                      })
                    }
                  >
                    Compartilhar imagem
                  </button>
                )}
                <a
                  className="run-secondary"
                  href={`https://wa.me/?text=${encodeURIComponent(`Fiz ${run.score} pontos no ${MARCA.nomeCompleto}! Montei meu personagem com ${collected.length} acessórios. ${location.origin}${import.meta.env.BASE_URL}jogo`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Share2 size={16} /> Compartilhar
                </a>
              </div>
            </div>
          )}
        </div>
        <aside className="run-sidebar">
          <div className="run-sidebar-title">
            <span>SEU PASSAPORTE</span>
            <Trophy size={16} />
          </div>
          <div className="run-record">
            <strong>{progress.best.toLocaleString("pt-BR")}</strong>
            <span>seu recorde</span>
          </div>
          {phase === "intro" && personagensVisiveis(catalog).length > 1 && (
            <label className="run-select">
              Seu personagem
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                {personagensVisiveis(catalog).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="run-missions">
            <h3>Missões em sequência</h3>
            {challenges(run)
              .map((m) => (
                <div key={m.id}>
                  <span>
                    {m.name} · Etapa {m.level}/{m.total}
                    <b>
                      {Math.min(m.value, m.target)}/{m.target}
                    </b>
                  </span>
                  <progress max={m.target} value={m.value} />
                </div>
              ))}
          </div>
          <div className="run-collected">
            <h3>
              {collected.length
                ? "Seu estilo nesta corrida"
                : "Uma peça de cada vez"}
            </h3>
            {collected.length ? (
              <div>
                {collected.map((p, i) => (
                  <img
                    key={`${p.id}-${i}`}
                    src={caminhoDaPeca(p)}
                    alt={p.rotulo}
                    className="miniatura-peca"
                  />
                ))}
              </div>
            ) : (
              <p>As peças caem à frente. Passe por elas para vestir ou pule por cima para manter seu visual. Caixas vermelhas também soltam cupons surpresa: pegue e confira o resultado no final.</p>
            )}
          </div>
          <nav className="run-nav">
            <button
              disabled={running || phase === "countdown"}
              onClick={() => void openPanel("collection")}
            >
              Coleção <span>{progress.collection.length} ↗</span>
            </button>
            <button
              disabled={running || phase === "countdown"}
              onClick={() => void openPanel("coupons")}
            >
              Meus benefícios <Gift size={15} />
            </button>
            <button
              disabled={running || phase === "countdown"}
              onClick={() => void openPanel("ranking")}
            >
              Ranking da semana <Trophy size={15} />
            </button>
          </nav>
          <p className="run-local-note">
            Coleção e recorde livre ficam neste aparelho. Benefícios e ranking
            usam corridas validadas.
          </p>
        </aside>
      </div>
      {error && (
        <div className="run-error" role="alert">
          {error}
          <button aria-label="Fechar aviso" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <footer className="run-footer">
        <span>FEITO DE TRAÇO, TINTA E PERSONALIDADE.</span>
        <span>Arte do Vital Monteiro</span>
      </footer>
      {panel && (
        <div
          className="run-modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            panel === "collection"
              ? "Coleção"
              : panel === "coupons"
                ? "Meus benefícios"
                : "Ranking"
          }
        >
          <div>
            <button
              className="run-modal-close"
              autoFocus
              aria-label="Fechar"
              onClick={() => setPanel(null)}
            >
              <X />
            </button>
            <h2>
              {panel === "collection"
                ? "Seu álbum do quintal"
                : panel === "coupons"
                  ? "Meus benefícios"
                  : "Ranking da semana"}
            </h2>
            {busy && <p role="status">Carregando…</p>}
            {panel === "collection" && (
              <>
                <p>
                  {progress.collection.length} peças descobertas ·{" "}
                  {progress.runs.length} últimas corridas
                </p>
                <div className="run-badges">
                  {Object.entries(ACHIEVEMENTS).map(([id, title]) => (
                    <span
                      key={id}
                      className={
                        progress.achievements.includes(id) ? "earned" : ""
                      }
                    >
                      {progress.achievements.includes(id) ? "✦" : "◇"} {title}
                    </span>
                  ))}
                </div>
                <div className="run-album">
                  {allPieces.map((p) => (
                    <div key={p.id}>
                      {progress.collection.includes(p.id) ? (
                        <img
                          src={caminhoDaPeca(p)}
                          alt={p.rotulo}
                          className="miniatura-peca"
                        />
                      ) : (
                        <span>?</span>
                      )}
                      <small>
                        {progress.collection.includes(p.id)
                          ? p.rotulo
                          : "A descobrir"}
                      </small>
                    </div>
                  ))}
                </div>
                <h3>Desafio da semana</h3>
                <p>
                  Abra 30 caixas:{" "}
                  {Math.min(
                    30,
                    progress.weekly?.key === weekKey()
                      ? progress.weekly.boxes
                      : progress.runs
                          .filter(
                            (r) =>
                              r.date >=
                              new Date(weekKey() + "T00:00:00Z").getTime(),
                          )
                          .reduce((n, r) => n + r.boxes, 0),
                  )}
                  /30.
                </p>
                {event.pieces.length > 0 && (
                  <p>
                    Coleção {event.title}:{" "}
                    {
                      event.pieces.filter((id) =>
                        progress.collection.includes(id),
                      ).length
                    }
                    /{event.pieces.length} peças.
                  </p>
                )}
                <h3>Histórico recente</h3>
                {progress.runs.slice(0, 5).map((r, i) => (
                  <p key={i}>
                    {new Date(r.date).toLocaleDateString("pt-BR")} · {r.score}{" "}
                    pontos · {r.boxes} caixas
                  </p>
                ))}
              </>
            )}
            {panel === "coupons" && (
              <>
                {!usuario ? (
                  <Link
                    className="run-primary"
                    to="/entrar"
                    state={{ destino: "/jogo" }}
                  >
                    Entrar para ver benefícios
                  </Link>
                ) : (
                  <>
                    {pending && (
                      <button
                        disabled={busy}
                        className="run-secondary"
                        onClick={() => void sendResult()}
                      >
                        Validar corrida pendente
                      </button>
                    )}
                    {rewardStatus && <p role="status">{rewardStatus}</p>}
                    {!busy && !coupons.length && (
                      <p>
                        Você ainda não tem benefícios. Participe de uma corrida
                        premiada e abra caixas surpresa.
                      </p>
                    )}
                    {coupons.map((c) => (
                      <article className="run-coupon" key={c.code}>
                        <Gift />
                        {c.image && (
                          <img
                            src={c.image}
                            alt=""
                            className="h-24 w-full object-contain"
                          />
                        )}
                        <h3>{c.name}</h3>
                        {c.description && <p>{c.description}</p>}
                        <p>{c.terms}</p>
                        <code>{c.code}</code>
                        <p>
                          Até {new Date(c.expires).toLocaleDateString("pt-BR")}{" "}
                          ·{" "}
                          {c.usedAt
                            ? "Utilizado"
                            : c.expires < Date.now()
                              ? "Expirado"
                              : "Disponível"}
                        </p>
                        {!c.usedAt && c.expires > Date.now() && (
                          <a
                            className="run-primary"
                            target="_blank"
                            rel="noreferrer"
                            href={couponLink(c)}
                          >
                            Enviar para o Vital no WhatsApp ↗
                          </a>
                        )}
                      </article>
                    ))}
                  </>
                )}
              </>
            )}
            {panel === "ranking" && (
              <>
                <p>
                  Semana de{" "}
                  {new Date(weekKey() + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                  . Somente corridas validadas; nomes públicos são apelidos
                  automáticos.
                </p>
                {ranking.map((r, i) => (
                  <div className="run-ranking" key={r.alias}>
                    <b>{i + 1}</b>
                    <span>{r.alias}</span>
                    <strong>{r.score} pts</strong>
                  </div>
                ))}
                {!busy && !ranking.length && (
                  <p>O pódio está esperando os primeiros corredores.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectDrawing({ thing: o, x, accessory }: { thing: Thing; x: number; accessory?: string }) {
  const y = 532 - o.y * 55,
    w = o.w * 55,
    h = o.h * 55;
  return (
    <g transform={`translate(${x},${y})`}>
      {(o.kind === "box" || o.kind === "gift") && (
        <g>
          <path
            d={`M${-w / 2 + 4} ${-h + 4}h${w}v${h}h${-w}z`}
            fill="#3c352d"
          />
          <rect
            x={-w / 2}
            y={-h}
            width={w}
            height={h}
            rx="7"
            fill={o.kind === "gift" ? "#e93625" : "#fffaf1"}
            stroke="#3c352d"
            strokeWidth="2.5"
          />
          {o.kind === "gift" ? (
            <>
              <path
                d={`M0 ${-h}v${h}M${-w / 2} ${-h / 2}h${w}`}
                stroke="#fff5e5"
                strokeWidth="4"
              />
              <path
                d={`M0 ${-h}q-32-25-22-27q24-8 22 27q27-31 30-19q3 15-30 19`}
                fill="none"
                stroke="#c42d20"
                strokeWidth="3"
              />
            </>
          ) : (
            <text
              y={-h / 2 + 11}
              textAnchor="middle"
              fontSize="32"
              fontWeight="900"
              fill="#ed3525"
            >
              ?
            </text>
          )}
        </g>
      )}
      {o.kind === "coupon" && (
        <g>
          <rect x={-w / 2} y={-h} width={w} height={h} rx="7" fill="#fff0b8" stroke="#b54a24" strokeWidth="2.5" />
          <path d={`M${w / 2 - 13} ${-h + 5}v${h - 10}`} stroke="#b54a24" strokeDasharray="3 3" />
          <text x="-5" y={-h / 2 + 7} textAnchor="middle" fontSize="23" fontWeight="900" fill="#b54a24">%</text>
          <text y={-h - 10} textAnchor="middle" fontSize="13" fontWeight="800" fill="#44362d">CUPOM SURPRESA</text>
        </g>
      )}
      {o.kind === "accessory" && (
        <g>
          <rect x={-w / 2} y={-h} width={w} height={h} rx="9" fill="#fffaf1" stroke="#e93625" strokeWidth="2" strokeDasharray="4 3" />
          {accessory ? <image href={accessory} x={-w / 2 + 3} y={-h + 3} width={w - 6} height={h - 6} preserveAspectRatio="xMidYMid meet" /> : <text y={-12} textAnchor="middle" fill="#e93625">?</text>}
          <text y={-h - 9} textAnchor="middle" fontSize="12" fontWeight="700" fill="#44362d">Pule para deixar</text>
        </g>
      )}
      {o.kind === "worm" && (
        <g transform="scale(-1,1)">
          <path
            d="M-26-7Q-16-29-5-13T16-13"
            fill="none"
            stroke="#e93625"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="23" cy="-15" r="10" fill="#e93625" />
          <circle cx="27" cy="-18" r="2.3" fill="#fff" />
          <path d="M29-12l-5 2" stroke="#843329" strokeWidth="1.6" />
        </g>
      )}
      {o.kind === "ink" && (
        <>
          <path
            d="M-39 0q-5-13 11-12q0-12 18-5q12-12 23 1q18-2 24 16z"
            fill="#44362d"
          />
          <path
            d="M-14-7q9-5 17 0"
            fill="none"
            stroke="#a89077"
            strokeWidth="2"
          />
        </>
      )}
      {o.kind === "platform" && (
        <>
          <rect
            x={-w / 2}
            y={-h}
            width={w}
            height={h}
            rx="4"
            fill="#d3b997"
            stroke="#554636"
            strokeWidth="2"
          />
          <path
            d={`M${-w / 2 + 6} -5h${w - 12}`}
            stroke="#8a7155"
            strokeWidth="2"
          />
        </>
      )}
      {o.kind === "feather" && (
        <g transform="translate(0,-14) rotate(25)">
          <path d="M0 16Q-21-8 0-20Q19-8 0 16" fill="#e93625" />
          <path
            d="M0-13v32m0-21-7-5m7 12 8-7"
            stroke="#fff0d7"
            strokeWidth="1.5"
          />
        </g>
      )}
      {["shield", "magnet", "clock"].includes(o.kind) && (
        <g>
          <circle
            cy="-22"
            r="24"
            fill="#fffaf1"
            stroke="#44362d"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text y="-13" textAnchor="middle" fontSize="27" fill="#e93625">
            {o.kind === "shield" ? "◇" : o.kind === "magnet" ? "↟" : "+3"}
          </text>
        </g>
      )}
    </g>
  );
}
