"use client";

import { useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { Cliente, Bono } from "@/lib/types";

export function AdminBonos({
  clientes,
  inicial,
}: {
  clientes: Cliente[];
  inicial: Bono[];
}) {
  const supabase = createClient();
  const [bonos, setBonos] = useState(inicial);
  const [clienteId, setClienteId] = useState("");
  const [factura, setFactura] = useState("");
  const [horas, setHoras] = useState("");
  const [precio, setPrecio] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [error, setError] = useState("");

  const hoy = new Date().toISOString().split("T")[0];

  async function crear() {
    setError("");
    const h = parseFloat(horas);
    if (!clienteId || !factura.trim() || !h) {
      setError("Cliente, factura y horas son obligatorios.");
      return;
    }
    const p = parseFloat(precio) || 0;
    const { data, error } = await supabase
      .from("bonos")
      .insert({
        cliente_id: clienteId,
        num_factura: factura.trim(),
        horas_totales: h,
        precio: p,
        precio_hora: p > 0 ? +(p / h).toFixed(2) : 0,
        fecha_creacion: hoy,
        fecha_caducidad: caducidad || null,
      })
      .select("*, clientes(nombre)")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setBonos([data as Bono, ...bonos]);
    setFactura("");
    setHoras("");
    setPrecio("");
    setCaducidad("");
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este bono? Se puede recuperar durante 30 días desde Admin > Papelera.")) return;
    // Ya no se borra la fila de verdad: eliminar_bono lo manda a la papelera
    // (eliminado = true). Sigue existiendo para que el historial de sus
    // partes no se rompa, pero desaparece de esta lista.
    const { error } = await supabase.rpc("eliminar_bono", { p_bono_id: id });
    if (error) {
      alert(`No se pudo eliminar el bono: ${error.message}`);
      return;
    }
    setBonos(bonos.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Nuevo bono</h3>
        <div className="grid-3">
          <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Cliente *</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <input className="input" placeholder="Nº Factura *" value={factura} onChange={(e) => setFactura(e.target.value)} />
          <input className="input" type="number" step="0.5" placeholder="Horas *" value={horas} onChange={(e) => setHoras(e.target.value)} />
          <input className="input" type="number" step="0.01" placeholder="Precio total (€)" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <input className="input" type="date" value={caducidad} onChange={(e) => setCaducidad(e.target.value)} title="Caducidad (opcional)" />
        </div>
        {error && <div className="error-box" style={{ marginTop: "0.75rem" }}>{error}</div>}
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={crear}>
          <PackagePlus size={16} strokeWidth={2.25} />
          Crear bono
        </button>
      </div>

      {bonos.length === 0 ? (
        <div className="card empty">No hay bonos todavía.</div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {bonos.map((b) => {
            const rem = b.horas_totales - b.horas_usadas;
            const pct = (b.horas_usadas / b.horas_totales) * 100;
            const nivel = pct > 85 ? "danger" : pct > 65 ? "warn" : "";
            return (
              <div key={b.id} className="card">
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{b.clientes?.nombre ?? "—"}</div>
                    <div className="dato muted" style={{ fontSize: "0.8rem", overflowWrap: "anywhere" }}>
                      Factura {b.num_factura}
                      {b.precio ? ` · ${b.precio.toFixed(2)}€` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={`badge ${b.activo ? "badge-ok" : "badge-danger"}`}>
                      {b.activo ? "Activo" : "Agotado"}
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => borrar(b.id)}>
                      <Trash2 size={14} strokeWidth={2.25} />
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="medidor">
                  <div className="medidor-track">
                    <div className={`medidor-fill ${nivel}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="dato muted" style={{ fontSize: "0.78rem", textAlign: "right" }}>
                    {rem.toFixed(1)}h / {b.horas_totales}h
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
