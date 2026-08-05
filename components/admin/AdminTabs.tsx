"use client";

import { useState } from "react";
import { Users, Wallet, UserCog } from "lucide-react";
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

  const tabs: { id: Tab; label: string; icono: typeof Users }[] = [
    { id: "clientes", label: "Clientes", icono: Users },
    { id: "bonos", label: "Bonos", icono: Wallet },
    { id: "usuarios", label: "Usuarios", icono: UserCog },
  ];

  return (
    <>
      <h1 style={{ marginBottom: "1.25rem" }}>Administración</h1>

      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--line)",
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => {
          const activo = tab === t.id;
          const Icono = t.icono;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: `2.5px solid ${activo ? "var(--brand)" : "transparent"}`,
                color: activo ? "var(--text)" : "var(--text-mute)",
                fontWeight: 600,
                fontSize: "0.88rem",
                padding: "0.7rem 0.9rem",
                minHeight: 44,
                cursor: "pointer",
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                whiteSpace: "nowrap",
                transition: "color 0.15s ease",
              }}
            >
              <Icono size={15} strokeWidth={2.25} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "clientes" && <AdminClientes inicial={clientes} />}
      {tab === "bonos" && <AdminBonos clientes={clientes} inicial={bonos} />}
      {tab === "usuarios" && <AdminUsuarios inicial={usuarios} />}
    </>
  );
}
