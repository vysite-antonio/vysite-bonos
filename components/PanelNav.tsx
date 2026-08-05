"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  nombre: string;
  esAdmin: boolean;
}

export function PanelNav({ nombre, esAdmin }: Props) {
  const path = usePathname();

  const enlaces = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/nuevo-servicio", label: "Nuevo servicio" },
    { href: "/panel/historial", label: "Historial" },
    ...(esAdmin ? [{ href: "/panel/admin", label: "Administración" }] : []),
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0.9rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <Link
          href="/panel"
          style={{
            fontWeight: 800,
            fontSize: "1.2rem",
            letterSpacing: "-0.02em",
            color: "var(--brand-hi)",
            textDecoration: "none",
          }}
        >
          Vysite
        </Link>

        <nav style={{ display: "flex", gap: "0.25rem", flex: 1, flexWrap: "wrap" }}>
          {enlaces.map((e) => {
            const activo = path === e.href;
            return (
              <Link
                key={e.href}
                href={e.href}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  padding: "0.45rem 0.8rem",
                  borderRadius: "var(--r-sm)",
                  textDecoration: "none",
                  color: activo ? "var(--text)" : "var(--text-mute)",
                  background: activo ? "var(--surface-2)" : "transparent",
                }}
              >
                {e.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {nombre}
          </span>
          <form action="/auth/salir" method="post">
            <button type="submit" className="btn btn-ghost btn-sm">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
