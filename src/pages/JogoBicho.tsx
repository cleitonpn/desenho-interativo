import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { carregarBicho } from "../lib/bichoDados";
import {
  sortearReferencia,
  type ConfigBicho,
  type Referencia,
} from "../lib/bicho";
import { baixarBrief } from "../lib/briefImagem";
import { MARCA } from "../config/marca";

export function JogoBicho() {
  const [config, setConfig] = useState<ConfigBicho | null>(null);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState(0);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<Referencia | null>(null);
  const [selecoes, setSelecoes] = useState<Referencia[]>([]);
  const [tentativas, setTentativas] = useState(0);
  const [girando, setGirando] = useState(false);
  const [numero, setNumero] = useState("—");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [salvo, setSalvo] = useState(false);
  useEffect(() => {
    carregarBicho()
      .then(setConfig)
      .catch(() =>
        setErro(
          "Não foi possível carregar as referências. Atualize a página para tentar novamente.",
        ),
      );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  if (!config)
    return (
      <main className="galeria-pagina">
        <h1 className="font-display text-4xl">Jogo do Bicho</h1>
        <p role="status">{erro || "Abrindo o caderno de referências…"}</p>
      </main>
    );
  const etapas = [
    { id: "animal", nome: "Bicho", opcoes: config.animais },
    ...config.categorias,
  ];
  const terminou = etapa === etapas.length;
  const atual = etapas[etapa];
  const texto = [
    "Minha ideia para o Vital desenhar à mão:",
    ...selecoes.map(
      (s, i) => `${etapas[i].nome}: ${i === 0 ? s.id + " · " : ""}${s.nome}`,
    ),
    "Quero conversar sobre essa criação e pedir um orçamento.",
  ].join("\n");
  function sortear() {
    if (girando || tentativas > config!.repeticoes) return;
    const escolhido = sortearReferencia(
      atual.opcoes,
      favoritos,
      config!.chanceFavoritos,
    );
    setGirando(true);
    setResultado(null);
    setTentativas((n) => n + 1);
    const opcoes = atual.opcoes.filter((o) => o.ativo);
    let passos = 0;
    const reduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    timer.current = setInterval(() => {
      setNumero(opcoes[passos % opcoes.length].id);
      passos++;
      if (passos >= (reduzido ? 1 : 15)) {
        clearInterval(timer.current!);
        timer.current = null;
        setNumero(escolhido.id);
        setResultado(escolhido);
        setGirando(false);
      }
    }, 80);
  }
  function salvar() {
    const brief = {
      id: crypto.randomUUID(),
      criadoEm: Date.now(),
      texto,
      referencias: selecoes,
    };
    try {
      const lista = JSON.parse(
        localStorage.getItem("vital-referencias") || "[]",
      );
      localStorage.setItem(
        "vital-referencias",
        JSON.stringify(
          [brief, ...(Array.isArray(lista) ? lista : [])].slice(0, 30),
        ),
      );
    } catch {
      /* O download funciona também quando o navegador bloqueia armazenamento. */
    }
    const url = URL.createObjectURL(
      new Blob([texto], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "minha-ideia-vital.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSalvo(true);
  }
  return (
    <main className="galeria-pagina">
      <p className="etiqueta">Um encontro de ideias · sem apostas</p>
      <h1 className="font-display text-4xl sm:text-6xl mt-3">
        Jogo do <span className="text-brand">Bicho.</span>
      </h1>
      <p className="max-w-2xl text-muted mt-4">
        Você escolhe os favoritos. O acaso mistura as referências. O Vital
        transforma essa ideia em um desenho feito à mão.
      </p>
      {!terminou ? (
        <>
          <div className="flex gap-2 flex-wrap my-6" aria-label="Etapas">
            {etapas.map((e, i) => (
              <span
                key={e.id}
                className={`px-3 py-2 rounded-full border text-sm ${i === etapa ? "bg-ink text-canvas" : ""}`}
              >
                {i + 1}. {e.nome}
              </span>
            ))}
          </div>
          <section className="moldura p-5 sm:p-8 mb-7">
            <p className="etiqueta">
              Etapa {etapa + 1} / {etapas.length}
            </p>
            <h2 className="font-display text-2xl mt-2">
              {atual.nome}: marque seus favoritos
            </h2>
            <p className="text-muted text-sm my-3">
              Todos os itens ativos participam. Os favoritos juntos têm{" "}
              {config.chanceFavoritos}% de chance; os demais dividem o restante.
              Sem favoritos, ou com todos marcados, as chances são iguais.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {atual.opcoes
                .filter((o) => o.ativo)
                .map((o) => (
                  <button
                    key={o.id}
                    disabled={girando}
                    aria-pressed={favoritos.includes(o.id)}
                    onClick={() =>
                      setFavoritos((f) =>
                        f.includes(o.id)
                          ? f.filter((id) => id !== o.id)
                          : [...f, o.id],
                      )
                    }
                    className={`referencia ${favoritos.includes(o.id) ? "referencia-ativa" : ""}`}
                  >
                    {o.imagem ? (
                      <img
                        src={o.imagem}
                        alt=""
                        className="h-24 w-full object-contain mb-3"
                      />
                    ) : (
                      <span className="font-display text-3xl text-brand block mb-3">
                        {etapa === 0 ? o.id : "✳"}
                      </span>
                    )}
                    <span className="font-semibold">
                      {etapa === 0 && o.imagem ? `${o.id} · ` : ""}
                      {o.nome}
                    </span>
                    <span className="block text-xs mt-1">
                      {favoritos.includes(o.id)
                        ? "♥ Favorito"
                        : "Marcar favorito"}
                    </span>
                  </button>
                ))}
            </div>
            <div className="papel border-2 border-ink rounded-2xl mt-6 p-6 text-center">
              <div aria-live="polite">
                {girando ? (
                  <p className="font-display text-4xl">{numero}</p>
                ) : resultado ? (
                  <>
                    <p className="etiqueta">O acaso escolheu</p>
                    {resultado.imagem && (
                      <img
                        src={resultado.imagem}
                        alt=""
                        className="h-36 object-contain mx-auto my-3"
                      />
                    )}
                    <p className="font-display text-3xl my-2">
                      {etapa === 0 ? `${resultado.id} · ` : ""}
                      {resultado.nome}
                    </p>
                  </>
                ) : (
                  <p className="text-muted mb-4">
                    O sorteio é aleatório. Seus favoritos não são uma garantia
                    de resultado.
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center flex-wrap mt-4">
                <button
                  className="botao-principal"
                  onClick={sortear}
                  disabled={girando || tentativas > config.repeticoes}
                >
                  {girando
                    ? "Embaralhando…"
                    : tentativas
                      ? "Sortear novamente"
                      : "Sortear"}
                </button>
                {resultado && (
                  <button
                    className="botao-neutro"
                    onClick={() => {
                      setSelecoes((s) => [...s, resultado]);
                      setEtapa((e) => e + 1);
                      setFavoritos([]);
                      setResultado(null);
                      setTentativas(0);
                    }}
                  >
                    Fico com esse →
                  </button>
                )}
              </div>
              <p className="text-sm text-muted mt-4">
                {tentativas
                  ? `${Math.max(0, config.repeticoes + 1 - tentativas)} novas tentativas nesta etapa.`
                  : `Você pode repetir ${config.repeticoes} vezes após o primeiro sorteio.`}
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="moldura p-6 mt-8">
          <p className="etiqueta">Seu caderno de referências</p>
          <h2 className="font-display text-3xl mt-2">
            Uma ideia que só você tirou.
          </h2>
          <p className="text-muted mt-3">
            Os acessórios são referências separadas. O desenho final e o
            orçamento serão combinados com o Vital.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 my-6">
            {selecoes.map((s, i) => (
              <div key={i} className="referencia">
                <p className="etiqueta">{etapas[i].nome}</p>
                {s.imagem && (
                  <img
                    src={s.imagem}
                    alt=""
                    className="h-32 w-full object-contain my-3"
                  />
                )}
                <p className="font-display text-xl mt-3">
                  {i === 0 ? s.id + " · " : ""}
                  {s.nome}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="botao-neutro"
              onClick={() => {
                void baixarBrief(
                  selecoes,
                  etapas.map((e) => e.nome),
                ).catch(() =>
                  setErro(
                    "Não foi possível gerar a imagem. Use Salvar referências para baixar o texto.",
                  ),
                );
              }}
            >
              Baixar imagem
            </button>
            <button className="botao-neutro" onClick={salvar}>
              {salvo ? "Baixar novamente" : "Salvar referências"}
            </button>
            <a
              className="botao-principal"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(texto)}`}
            >
              Compartilhar com o Vital
            </a>
            <Link
              className="botao-neutro"
              to="/encomendar"
              state={{ referencia: texto }}
            >
              Quero uma tattoo
            </Link>
          </div>
          {erro && (
            <p role="alert" className="mt-4 text-brand">
              {erro}
            </p>
          )}
          <button
            className="underline mt-6"
            onClick={() => {
              setEtapa(0);
              setSelecoes([]);
              setSalvo(false);
            }}
          >
            Criar outra ideia
          </button>
        </section>
      )}
    </main>
  );
}
