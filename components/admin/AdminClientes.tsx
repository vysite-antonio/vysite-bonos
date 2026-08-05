"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Cliente } from "@/lib/types";

export function AdminClientes({ inicial }: { inicial: Cliente[] }) {
  const supabase = createClient();
  const [clientes, setClientes] = useState(inicial);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cif, setCif] = useState("");
  const [error, setError] = useState("");
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);

  async function crear() {
    setError("");
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    const { data, error } = await supabase
      .from("clientes")
      .insert({ nombre: nombre.trim(), email: email.trim(), telefono, cif })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setClientes([...clientes, data as Cliente]);
    setNombre("");
    setEmail("");
    setTelefono("");
    setCif("");
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este cliente? Se borrarán también sus bonos.")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      // servicios.cliente_id es ON DELETE RESTRICT: si el cliente tiene algún
      // parte de trabajo registrado (directamente o a través de sus bonos),
      // el borrado falla aquí. Si no comprobáramos el error, la fila
      // desaparecería igualmente de la pantalla aunque no se haya borrado de
      // verdad en la base de datos.
      if (error.code === "23503") {
        alert(
          "No se puede eliminar: este cliente tiene partes de trabajo registrados (directamente o en alguno de sus bonos). Para conservar el historial, no se permite borrar clientes con partes asociados."
        );
      } else {
        alert(`No se pudo eliminar el cliente: ${error.message}`);
      }
      return;
    }
    setClientes(clientes.filter((c) => c.id !== id));
  }

  function copiarPortal(c: Cliente & { token_portal?: string }) {
    const url = `${window.location.origin}/portal?token=${c.token_portal}`;
    navigator.clipboard.writeText(url);
    alert("Enlace del portal copiado:\n\n" + url);
  }

  async function regenerarToken(c: Cliente) {
    if (
      !confirm(
        `¿Regenerar el enlace del portal de ${c.nombre}?\n\nEl enlace anterior dejará de funcionar de inmediato. Cualquiera que lo tuviera guardado o reenviado ya no podrá usarlo.`
      )
    )
      return;

    setRegenerandoId(c.id);
    const { data, error } = await supabase.rpc("regenerar_token_portal", {
      p_cliente_id: c.id,
    });
    setRegenerandoId(null);

    if (error) {
      alert(`No se pudo regenerar el token: ${error.message}`);
      return;
    }

    const actualizado = data as Cliente;
    setClientes(clientes.map((x) => (x.id === c.id ? { ...x, ...actualizado } : x)));

    const url = `${window.location.origin}/portal?token=${actualizado.token_portal}`;
    navigator.clipboard.writeText(url);
    alert("Token regenerado. Nuevo enlace copiado:\n\n" + url);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Nuevo cliente</h3>
        <div className="grid-form">
          <input className="input" placeholder="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="input" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className="input" placeholder="CIF/NIF" value={cif} onChange={(e) => setCif(e.target.value)} />
        </div>
        {error && <div className="error-box" style={{ marginTop: "0.75rem" }}>{error}</div>}
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={crear}>
          + Añadir cliente
        </button>
      </div>

      {clientes.length === 0 ? (
        <div className="card empty">No hay clientes todavía.</div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {clientes.map((c) => (
            <div key={c.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                <div className="muted" style={{ fontSize: "0.82rem" }}>
                  {c.email}{c.telefono ? ` · ${c.telefono}` : ""}{c.cif ? ` · ${c.cif}` : ""}
                </div>
                {c.token_generado_en && (
                  <div className="muted" style={{ fontSize: "0.74rem", marginTop: 2 }}>
                    Token generado: {new Date(c.token_generado_en).toLocaleString("es-ES")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => copiarPortal(c)}>Enlace portal</button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={regenerandoId === c.id}
                  onClick={() => regenerarToken(c)}
                >
                  {regenerandoId === c.id ? "Regenerando…" : "Regenerar token"}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => borrar(c.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 640px) { .grid-form { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
