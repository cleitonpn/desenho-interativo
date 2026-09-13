import { useEffect, useState } from "react";
import { carregarCatalogo, acharPersonagem } from "../lib/catalogo";
import { type Personagem } from "../lib/tipos";
import { type Arte } from "../lib/loja";
import { Desenho } from "./Desenho";
import { baixarCanvas, renderizar } from "../lib/exportar";
import { descrever } from "../lib/composicao";
export function ArtePedido({
  arte,
  personagemId,
}: {
  arte: Arte;
  personagemId: string;
}) {
  const [personagem, setPersonagem] = useState<Personagem | null>(null),
    [erro, setErro] = useState("");
  useEffect(() => {
    carregarCatalogo()
      .then((c) => setPersonagem(acharPersonagem(c, personagemId)))
      .catch(() => setErro("Não foi possível carregar o desenho."));
  }, [personagemId]);
  if (arte.tipo !== "galinha") return null;
  return (
    <div className="papel p-4 border-2 border-ink/20 rounded-xl">
      {personagem && (
        <>
          <Desenho
            personagem={personagem}
            escolhas={arte.escolhas}
            cor={arte.cor}
            ajustado
            className="w-32 mx-auto"
          />
          <p className="text-sm mt-3">
            {personagem.nome}: {descrever(personagem, arte.escolhas).join(", ")}{" "}
            · {arte.cor}
          </p>
          <button
            className="botao-neutro mt-3"
            onClick={async () => {
              try {
                baixarCanvas(
                  await renderizar(personagem, arte.escolhas, arte.cor, {
                    largura: 2400,
                  }),
                  "desenho-do-pedido.png",
                );
              } catch {
                setErro("Não foi possível exportar a imagem.");
              }
            }}
          >
            Baixar desenho para produção
          </button>
        </>
      )}
      {erro && <p role="alert">{erro}</p>}
    </div>
  );
}
