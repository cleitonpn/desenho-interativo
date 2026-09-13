import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { carregarCatalogo, acharPersonagem } from "../lib/catalogo";
import type { Personagem } from "../lib/tipos";
import { EnviarWhatsApp } from "../components/EnviarWhatsApp";
import { MARCA } from "../config/marca";
export function Encomendar() {
  const state = useLocation().state;
  const [personagem, setPersonagem] = useState<Personagem | null>(null);
  const [enviar, setEnviar] = useState(false);
  useEffect(() => {
    if (state?.arte)
      carregarCatalogo()
        .then((c) => setPersonagem(acharPersonagem(c, state.personagem)))
        .catch(() => {});
  }, [state]);
  const [ideia, setIdeia] = useState(state?.referencia || ""),
    [local, setLocal] = useState(""),
    [tamanho, setTamanho] = useState(""),
    [datas, setDatas] = useState("");
  const texto = `Olá, Vital! Quero agendar uma tattoo.\nIdeia: ${ideia}\nLocal do corpo: ${local}\nTamanho aproximado: ${tamanho}\nDisponibilidade: ${datas}\nPodemos combinar orçamento e data?`;
  return (
    <main className="galeria-pagina max-w-2xl">
      <p className="etiqueta">Seu próximo desenho na pele</p>
      <h1 className="font-display text-4xl mt-3">Bora tatuar?</h1>
      <p className="text-muted my-5">
        Conte sua ideia. O Vital confirma o orçamento e a disponibilidade antes
        do agendamento.
      </p>
      <div className="moldura p-6 space-y-4">
        <label className="block">
          Sua ideia
          <textarea
            className="campo"
            rows={6}
            value={ideia}
            onChange={(e) => setIdeia(e.target.value)}
          />
        </label>
        <label className="block">
          Local do corpo
          <input
            className="campo"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </label>
        <label className="block">
          Tamanho aproximado
          <input
            className="campo"
            placeholder="Ex.: 12 cm"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
          />
        </label>
        <label className="block">
          Dias ou períodos em que pode vir
          <input
            className="campo"
            value={datas}
            onChange={(e) => setDatas(e.target.value)}
          />
        </label>
        {state?.arte && personagem ? (
          <button className="botao-principal" onClick={() => setEnviar(true)}>
            Enviar ideia com o desenho
          </button>
        ) : (
          <a
            className="botao-principal"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(texto)}`}
          >
            Conversar com o Vital
          </a>
        )}
      </div>
      {enviar && personagem && state?.arte && (
        <EnviarWhatsApp
          personagem={personagem}
          escolhas={state.arte.escolhas}
          cor={state.arte.cor}
          contexto={texto}
          aoFechar={() => setEnviar(false)}
        />
      )}
    </main>
  );
}
