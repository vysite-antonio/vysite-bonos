"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, History, ShieldCheck, LogOut } from "lucide-react";

interface Props {
  nombre: string;
  esAdmin: boolean;
}

const ICONOS = {
  "/panel": Home,
  "/panel/nuevo-servicio": PlusCircle,
  "/panel/historial": History,
  "/panel/admin": ShieldCheck,
} as const;

export function PanelNav({ nombre, esAdmin }: Props) {
  const path = usePathname();

  const enlaces = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/nuevo-servicio", label: "Nuevo" },
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
      {/* Cabecera: logo + (nav en escritorio) + usuario. En móvil/tablet la
          navegación vive en la barra inferior, más cómoda para el pulgar. */}
      <header className="panel-header">
        <div className="panel-header-inner">
          <Link href="/panel" className="panel-logo">
            Vysite
          </Link>

          <nav className="panel-nav-desktop">
            {enlaces.map((e) => {
              const activo = path === e.href;
              const Icono = ICONOS[e.href as keyof typeof ICONOS];
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={`panel-nav-link${activo ? " activo" : ""}`}
                >
                  <Icono size={16} strokeWidth={2.25} />
                  {e.label === "Nuevo" ? "Nuevo servicio" : e.label}
                </Link>
              );
            })}
          </nav>

          <div className="panel-user">
            <span className="panel-avatar">{iniciales || "?"}</span>
            <span className="muted panel-user-nombre">{nombre}</span>
            <form action="/auth/salir" method="post">
              <button type="submit" className="btn btn-ghost btn-icon" title="Salir" aria-label="Salir">
                <LogOut size={17} strokeWidth={2.25} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Barra inferior: solo móvil/tablet, navegación principal a un toque. */}
      <nav className="panel-tabbar" aria-label="Navegación principal">
        {enlaces.map((e) => {
          const activo = path === e.href;
          const Icono = ICONOS[e.href as keyof typeof ICONOS];
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`panel-tab${activo ? " activo" : ""}`}
            >
              <span className="panel-tab-icon">
                <Icono size={21} strokeWidth={activo ? 2.5 : 2} />
              </span>
              <span className="panel-tab-label">{e.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        .panel-header {
          border-bottom: 1px solid var(--line);
          background: rgba(17, 28, 48, 0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 20;
          padding-top: env(safe-area-inset-top);
        }
        .panel-header-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          min-height: 56px;
        }
        .panel-logo {
          font-weight: 800;
          font-size: 1.15rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--brand-hi), var(--brand));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-decoration: none;
          flex-shrink: 0;
        }
        .panel-nav-desktop { display: none; flex: 1; gap: 0.3rem; }
        .panel-nav-link {
          display: inline-flex; align-items: center; gap: 0.45rem;
          font-size: 0.85rem; font-weight: 600; padding: 0.55rem 0.85rem;
          border-radius: var(--r-sm); text-decoration: none;
          color: var(--text-mute); transition: all 0.15s ease;
        }
        .panel-nav-link:hover { color: var(--text); background: var(--surface-2); }
        .panel-nav-link.activo { color: var(--text); background: var(--surface-2); }
        .panel-user { display: flex; align-items: center; gap: 0.65rem; margin-left: auto; }
        .panel-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand), var(--brand-hi));
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; color: #fff;
        }
        .panel-user-nombre { font-size: 0.8rem; display: none; }

        .panel-tabbar {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
          display: flex; justify-content: space-around;
          background: rgba(13, 21, 38, 0.92);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid var(--line);
          padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom));
        }
        .panel-tab {
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          flex: 1; padding: 0.35rem 0.25rem; border-radius: var(--r-sm);
          text-decoration: none; color: var(--text-mute); min-height: 48px;
          justify-content: center; -webkit-tap-highlight-color: transparent;
          transition: color 0.15s ease;
        }
        .panel-tab-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 26px; border-radius: 99px; transition: background 0.15s ease;
        }
        .panel-tab.activo { color: var(--brand-hi); }
        .panel-tab.activo .panel-tab-icon { background: var(--brand-dim); }
        .panel-tab-label { font-size: 0.68rem; font-weight: 600; }

        @media (min-width: 860px) {
          .panel-nav-desktop { display: flex; }
          .panel-user-nombre { display: inline; }
          .panel-tabbar { display: none; }
        }
      `}</style>
    </>
  );
}
