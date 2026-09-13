import { useEffect, useState } from "react";
import { carregarBicho, salvarBicho } from "../../lib/bichoDados";
import { type ConfigBicho } from "../../lib/bicho";
import { subirFoto } from "../../lib/conteudo";
export function AbaBicho() {
  const [config, setConfig] = useState<ConfigBicho | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    carregarBicho()
      .then(setConfig)
      .catch(() =>
        setStatus("Não foi possível carregar. Atualize para tentar novamente."),
      );
  }, []);
  function mudar(fn: (c: ConfigBicho) => void) {
    setConfig((c) => {
      const novo = structuredClone(c!);
      fn(novo);
      return novo;
    });
    setStatus("");
  }
  if (!config) return <p role="status">{status || "Carregando…"}</p>;
  const grupos = [
    { id: "animais", nome: "Bichos", opcoes: config.animais },
    ...config.categorias,
  ];
  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl">O caderno do Jogo do Bicho</h2>
      <p className="text-muted">
        Envie os desenhos originais do iPad. Os acessórios aparecem como
        referências separadas para o desenho feito à mão.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          Chance total dos favoritos (%)
          <input
            type="number"
            min="0"
            max="100"
            className="campo"
            value={config.chanceFavoritos}
            onChange={(e) =>
              mudar((c) => {
                c.chanceFavoritos = Number(e.target.value);
              })
            }
          />
        </label>
        <label>
          Repetições após o primeiro sorteio
          <input
            type="number"
            min="0"
            max="10"
            className="campo"
            value={config.repeticoes}
            onChange={(e) =>
              mudar((c) => {
                c.repeticoes = Number(e.target.value);
              })
            }
          />
        </label>
      </div>
      {grupos.map((grupo, gi) => (
        <details key={grupo.id} className="moldura-sutil p-4" open={gi === 0}>
          <summary className="font-display cursor-pointer">
            {grupo.nome} · {grupo.opcoes.length} referências
          </summary>
          {gi > 0 && (
            <div className="flex gap-3 mt-3">
              <input
                aria-label="Nome da categoria"
                className="campo"
                value={grupo.nome}
                onChange={(e) =>
                  mudar((c) => {
                    c.categorias[gi - 1].nome = e.target.value;
                  })
                }
              />
              <button
                onClick={() =>
                  mudar((c) => {
                    c.categorias.splice(gi - 1, 1);
                  })
                }
              >
                Excluir categoria
              </button>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {grupo.opcoes.map((opcao, oi) => (
              <div
                key={opcao.id}
                className="border border-line p-3 rounded-xl space-y-2"
              >
                <label className="text-sm">
                  {gi === 0 ? `Bicho ${opcao.id}` : "Referência"}
                  <input
                    className="campo"
                    value={opcao.nome}
                    onChange={(e) =>
                      mudar((c) => {
                        (gi === 0 ? c.animais : c.categorias[gi - 1].opcoes)[
                          oi
                        ].nome = e.target.value;
                      })
                    }
                  />
                </label>
                {opcao.imagem && (
                  <img
                    src={opcao.imagem}
                    alt={opcao.nome}
                    className="h-24 object-contain"
                  />
                )}
                <label className="block text-sm">
                  Desenho (imagem)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    className="block w-full text-xs mt-1"
                    onChange={async (e) => {
                      const arquivo = e.target.files?.[0];
                      if (!arquivo) return;
                      setBusy(true);
                      try {
                        const url = await subirFoto(arquivo, "sobre");
                        mudar((c) => {
                          (gi === 0 ? c.animais : c.categorias[gi - 1].opcoes)[
                            oi
                          ].imagem = url;
                        });
                      } catch {
                        setStatus("Não foi possível enviar a imagem.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={opcao.ativo}
                    onChange={(e) =>
                      mudar((c) => {
                        (gi === 0 ? c.animais : c.categorias[gi - 1].opcoes)[
                          oi
                        ].ativo = e.target.checked;
                      })
                    }
                  />
                  Participa do sorteio
                </label>
              </div>
            ))}
          </div>
          {gi > 0 && (
            <button
              className="botao-neutro mt-4"
              onClick={() =>
                mudar((c) => {
                  c.categorias[gi - 1].opcoes.push({
                    id: crypto.randomUUID(),
                    nome: "Nova referência",
                    ativo: true,
                  });
                })
              }
            >
              Adicionar referência
            </button>
          )}
        </details>
      ))}
      <div className="flex gap-3 flex-wrap">
        <button
          className="botao-neutro"
          onClick={() =>
            mudar((c) => {
              c.categorias.push({
                id: crypto.randomUUID(),
                nome: "Nova categoria",
                opcoes: [
                  {
                    id: crypto.randomUUID(),
                    nome: "Nova referência",
                    ativo: true,
                  },
                ],
              });
            })
          }
        >
          Adicionar categoria
        </button>
        <button
          disabled={busy}
          className="botao-principal"
          onClick={async () => {
            setBusy(true);
            try {
              await salvarBicho(config);
              setStatus(
                "Publicado! As próximas partidas usarão estas referências.",
              );
            } catch (e) {
              setStatus(
                e instanceof Error ? e.message : "Não foi possível salvar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Publicar configurações
        </button>
      </div>
      <p role="status">{status}</p>
    </section>
  );
}
