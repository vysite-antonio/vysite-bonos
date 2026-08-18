"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Zap, History, ShieldCheck, LogOut } from "lucide-react";

interface Props {
  nombre: string;
  esAdmin: boolean;
}

const ICONOS = {
  "/panel": Home,
  "/panel/nuevo-servicio": PlusCircle,
  "/panel/parte-rapido": Zap,
  "/panel/historial": History,
  "/panel/admin": ShieldCheck,
} as const;

export function PanelNav({ nombre, esAdmin }: Props) {
  const path = usePathname();

  const enlaces = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/nuevo-servicio", label: "Nuevo" },
    { href: "/panel/parte-rapido", label: "Rápido" },
    { href: "/panel/historial", label: "Historial" },
    ...(esAdmin ? [{ href: "/panel/admin", label: "Admin" }] : []),
  ];

  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Toda la navegación vive arriba, en una única barra fija. Antes había
          una barra inferior que tapaba el último elemento de cada pantalla
          (el botón de guardar el parte, sobre todo). Al subirla, la parte baja
          de la pantalla queda libre y ningún botón queda oculto. */}
      <header className="panel-header">
        <div className="panel-header-inner">
          <Link href="/panel" className="panel-logo" aria-label="Vysite · Inicio">
            <img src="/logo-vysite.png" alt="Vysite" />
          </Link>

          <nav className="panel-nav" aria-label="Navegación principal">
            {enlaces.map((e) => {
              const activo = path === e.href;
              const Icono = ICONOS[e.href as keyof typeof ICONOS];
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={`panel-nav-link${activo ? " activo" : ""}`}
                  title={e.label}
                  aria-label={e.label}
                  aria-current={activo ? "page" : undefined}
                >
                  <Icono size={19} strokeWidth={activo ? 2.5 : 2} />
                  <span className="panel-nav-label">
                    {e.label === "Nuevo" ? "Nuevo servicio" : e.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="panel-user">
            <span className="panel-avatar" title={nombre}>
              {iniciales || "?"}
            </span>
            <form action="/auth/salir" method="post">
              <button
                type="submit"
                className="panel-salir"
                title="Salir"
                aria-label="Salir"
              >
                <LogOut size={18} strokeWidth={2.25} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <style>{`
        .panel-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(11, 18, 33, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--line);
          padding-top: env(safe-area-inset-top);
        }
        .panel-header-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.7rem;
          min-height: 54px;
        }

        .panel-logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          text-decoration: none;
          padding: 0.25rem;
          -webkit-tap-highlight-color: transparent;
        }
        .panel-logo img {
          height: 21px;
          width: auto;
          display: block;
        }

        /* Menú compacto: en móvil solo iconos (el texto se oculta) para que
           quepa todo en una línea junto al logo; en escritorio se despliega
           con etiqueta. overflow-x como red de seguridad en pantallas muy
           estrechas. */
        .panel-nav {
          display: flex;
          align-items: center;
          gap: 0.1rem;
          margin-left: auto;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .panel-nav::-webkit-scrollbar { display: none; }

        .panel-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: var(--r-sm);
          text-decoration: none;
          color: var(--text-mute);
          transition: color 0.15s ease, background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .panel-nav-link:active { transform: scale(0.94); }
        .panel-nav-link.activo {
          color: var(--brand-hi);
          background: var(--brand-dim);
        }
        .panel-nav-label {
          display: none;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .panel-user {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
          margin-left: 0.25rem;
          padding-left: 0.5rem;
          border-left: 1px solid var(--line);
        }
        .panel-avatar {
          display: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand), var(--brand-hi));
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .panel-salir {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: none;
          background: none;
          border-radius: var(--r-sm);
          color: var(--text-mute);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .panel-salir:hover { color: #fca5a5; background: var(--surface-2); }
        .panel-salir:active { transform: scale(0.94); }

        @media (min-width: 860px) {
          .panel-header-inner { padding: 0.5rem 1.25rem; gap: 1rem; }
          .panel-logo img { height: 24px; }
          .panel-nav { gap: 0.25rem; }
          .panel-nav-link { width: auto; padding: 0 0.9rem; }
          .panel-nav-label { display: inline; }
          .panel-avatar { display: flex; }
        }
      `}</style>
    </>
  );
}
