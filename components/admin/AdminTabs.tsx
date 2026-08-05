"use client";

import { useState } from "react";
import { AdminClientes } from "@/components/admin/AdminClientes";
import { AdminBonos } from "@/components/admin/AdminBonos";
import { AdminUsuarios } from "@/components/admin/AdminUsuarios";
import type { Cliente, Bono, Perfil } from "@/lib/types";

type Tab = "clientes" | "bonos" | "usuarios";

export function AdminTabs({
  clientes,
  bonos,
  usuarios,
}: {
  clientes: Cliente[];
  bonos: Bono[];
  usuarios: Perfil[];
}) {
  const [tab, setTab] = useState<Tab>("clientes");

  const tabs: { id: Tab; label: string }[] = [
    { id: "clientes", label: "Clientes" },
    { id: "bonos", label: "Bonos" },
    { id: "usuarios", label: "Usuarios" },
  ];

  return (
    <>
      <h1 style={{ marginBottom: "1.25rem" }}>Administración</h1>

      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? "var(--brand)" : "transparent"}`,
              color: tab === t.id ? "var(--text)" : "var(--text-mute)",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "0.6rem 1rem",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clientes" && <AdminClientes inicial={clientes} />}
      {tab === "bonos" && <AdminBonos clientes={clientes} inicial={bonos} />}
      {tab === "usuarios" && <AdminUsuarios inicial={usuarios} />}
    </>
  );
}
