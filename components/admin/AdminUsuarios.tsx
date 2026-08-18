"use client";

import { useState } from "react";
import { UserPlus, KeyRound, Power } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { Perfil } from "@/lib/types";

export function AdminUsuarios({ inicial }: { inicial: Perfil[] }) {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState(inicial);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("tecnico");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function crear() {
    setError("");
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setError("Nombre, email y contraseña (mín. 6 caracteres) son obligatorios.");
      return;
    }
    setOcupado(true);
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { accion: "crear", nombre: nombre.trim(), email: email.trim(), password, rol },
    });
    setOcupado(false);
    if (error || data?.error) {
      setError(data?.error ?? error?.message ?? "Error al crear usuario");
      return;
    }
    setUsuarios([
      ...usuarios,
      {
        id: data.id,
        nombre: nombre.trim(),
        rol: rol as Perfil["rol"],
        activo: true,
        creado_en: new Date().toISOString(),
      },
    ]);
    alert(`Usuario creado.\nEmail: ${email}\nContraseña: ${password}\n\nAnota la contraseña.`);
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("tecnico");
  }

  async function cambiarPassword(u: Perfil) {
    const pw = prompt(`Nueva contraseña para ${u.nombre} (mín. 6):`);
    if (!pw || pw.length < 6) {
      if (pw !== null) alert("Mínimo 6 caracteres.");
      return;
    }
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { accion: "password", id: u.id, password: pw },
    });
    if (error || data?.error) alert(data?.error ?? "Error");
    else alert("Contraseña cambiada.");
  }

  async function alternarEstado(u: Perfil) {
    const nuevo = !u.activo;
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { accion: "estado", id: u.id, activo: nuevo },
    });
    if (error || data?.error) {
      alert(data?.error ?? "Error");
      return;
    }
    setUsuarios(usuarios.map((x) => (x.id === u.id ? { ...x, activo: nuevo } : x)));
  }

  const roles: Record<string, string> = { admin: "Administrador", tecnico: "Técnico" };

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Nuevo usuario</h3>
        <div className="grid-2">
          <input className="input" placeholder="Nombre completo *" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="input" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Contraseña *" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="tecnico">Técnico</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {error && <div className="error-box" style={{ marginTop: "0.75rem" }}>{error}</div>}
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={crear} disabled={ocupado}>
          {ocupado ? <span className="spinner" /> : (
            <>
              <UserPlus size={16} strokeWidth={2.25} />
              Crear usuario
            </>
          )}
        </button>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {usuarios.map((u) => (
          <div key={u.id} className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ minWidth: 0, flex: "1 1 160px" }}>
              <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{u.nombre}</div>
              <div className="muted" style={{ fontSize: "0.82rem", overflowWrap: "anywhere" }}>{roles[u.rol] ?? u.rol}</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span className={`badge ${u.activo ? "badge-ok" : "badge-danger"}`}>
                {u.activo ? "Activo" : "Inactivo"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => cambiarPassword(u)}>
                <KeyRound size={14} strokeWidth={2.25} />
                Contraseña
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => alternarEstado(u)}>
                <Power size={14} strokeWidth={2.25} />
                {u.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
