import { type ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MARCA } from "../config/marca";
export function GaleriaLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { usuario, perfil } = useAuth();
  const [aberto, setAberto] = useState(false);
  if (pathname === "/jogo" || pathname === "/montar") return <>{children}</>;
  return (
    <div className="galeria-shell">
      <a href="#conteudo" className="sr-only focus:not-sr-only">
        Pular para o conteúdo
      </a>
      <header className="galeria-header">
        <Link to="/" className="font-display text-xl leading-tight">
          QUINTAL
          <span className="block text-xs tracking-widest text-brand mt-1">
            GALERIA DO VITAL
          </span>
        </Link>
        <button
          className="botao-neutro !py-2 sm:hidden"
          aria-expanded={aberto}
          aria-controls="menu-galeria"
          onClick={() => setAberto(!aberto)}
        >
          Menu
        </button>
        <nav
          id="menu-galeria"
          aria-label="Navegação principal"
          className={`${aberto ? "flex" : "hidden"} sm:flex flex-wrap gap-4 items-center`}
          onClick={() => setAberto(false)}
        >
          {[
            ["/montar", "Criar"],
            ["/jogo-bicho", "Jogo do Bicho"],
            ["/jogo", "Corrida"],
            ["/loja", "Loja"],
            ["/tattoos", "Tattoos"],
            ["/sobre", "O Vital"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? "text-brand underline underline-offset-4" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
          <Link
            className="text-sm font-semibold"
            to={usuario ? "/pedidos" : "/entrar"}
          >
            {usuario ? "Pedidos" : "Entrar"}
          </Link>
          {usuario && (
            <Link className="text-sm" to="/conta">
              Conta
            </Link>
          )}
          {perfil?.admin && (
            <Link className="text-sm text-brand" to="/vital">
              Painel
            </Link>
          )}
        </nav>
      </header>
      <div id="conteudo">{children}</div>
      <footer className="galeria-footer">
        <p className="font-display">
          Arte para vestir, tatuar e levar pra vida.
        </p>
        <div className="flex gap-5 flex-wrap text-sm">
          <a href={MARCA.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <Link to="/minhas">Minhas criações</Link>
          <Link to="/privacidade">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
