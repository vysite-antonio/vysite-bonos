"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw, PackageOpen } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { Bono, Servicio } from "@/lib/types";
import { formatFechaCorta } from "@/lib/format";

const DIAS_RECUPERACION = 30;

function diasRestantes(fechaIso: string | null): number {
  if (!fechaIso) return 0;
  const transcurridos = (Date.now() - new Date(fechaIso).getTime()) / 86_400_000;
  return Math.ceil(DIAS_RECUPERACION - transcurridos);
}

// Papelera de bonos eliminados y partes anulados, recuperables durante 30
// días. Al entrar, se intenta purgar_papelera() (borra de verdad los bonos
// que llevan más de 30 días y no tienen ningún parte asociado) antes de
// pintar la lista, así lo que se ve ya está al día.
export function AdminPapelera() {
  const supabase = createClient();
  const [cargando, setCargando] = useState(true);
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [partes, setPartes] = useState<Servicio[]>([]);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    await supabase.rpc("purgar_papelera"); // best-effort, no bloquea la carga si falla

    const desde30dias = new Date(Date.now() - DIAS_RECUPERACION * 86_400_000).toISOString();

    const [{ data: bs }, { data: ps }] = await Promise.all([
      supabase
        .from("bonos")
        .select("*, clientes(nombre)")
        .eq("eliminado", true)
        .order("eliminado_en", { ascending: false }),
      supabase
        .from("servicios")
        .select(
          "id, num_parte, cliente_id, bono_id, horas, anulado, anulado_motivo, anulado_por, anulado_en, clientes(nombre)"
        )
        .eq("anulado", true)
        .gte("anulado_en", desde30dias)
        .order("anulado_en", { ascending: false }),
    ]);
    setBonos((bs ?? []) as Bono[]);
    setPartes((ps ?? []) as unknown as Servicio[]);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restaurarBono(id: string) {
    setError("");
    setOcupadoId(id);
    const { error: rpcError } = await supabase.rpc("restaurar_bono", { p_bono_id: id });
    setOcupadoId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setBonos((prev) => prev.filter((b) => b.id !== id));
  }

  async function recuperarParte(id: string) {
    setError("");
    setOcupadoId(id);
    const { error: rpcError } = await supabase.rpc("reactivar_servicio", { p_servicio_id: id });
    setOcupadoId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setPartes((prev) => prev.filter((p) => p.id !== id));
  }

  if (cargando) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1.25rem" }}>
        Lo que se elimina aquí (bonos) o se anula (partes) se puede recuperar durante 30 días.
        Pasado ese plazo, los bonos se borran de verdad y los partes anulados se quedan así para
        siempre, aunque el registro nunca desaparece del historial.
      </p>

      {error && <div className="error-box" style={{ marginBottom: "1.25rem" }}>{error}</div>}

      <h3 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <PackageOpen size={15} strokeWidth={2.25} />
        Bonos eliminados
      </h3>
      {bonos.length === 0 ? (
        <div className="card empty" style={{ marginBottom: "1.75rem" }}>
          No hay bonos en la papelera.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.75rem" }}>
          {bonos.map((b) => {
            const restantes = diasRestantes(b.eliminado_en);
            return (
              <div key={b.id} className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {b.clientes?.nombre ?? "Cliente eliminado"}
                    </div>
                    <div className="dato muted" style={{ fontSize: "0.8rem", overflowWrap: "anywhere" }}>
                      Factura {b.num_factura} · {b.horas_totales}h
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                      Eliminado {b.eliminado_en ? formatFechaCorta(b.eliminado_en) : "—"}
                      {b.eliminado_por && <> por {b.eliminado_por}</>}
                    </div>
                    {restantes > 0 ? (
                      <div className="muted" style={{ fontSize: "0.78rem" }}>
                        Se borra definitivamente en {restantes} día{restantes === 1 ? "" : "s"}.
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.78rem", color: "var(--warn)" }}>
                        No se pudo borrar automáticamente: tiene partes de trabajo asociados.
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={ocupadoId === b.id}
                    onClick={() => restaurarBono(b.id)}
                  >
                    {ocupadoId === b.id ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <RotateCcw size={14} strokeWidth={2.25} />
                        Restaurar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <Trash2 size={15} strokeWidth={2.25} />
        Partes anulados (últimos 30 días)
      </h3>
      {partes.length === 0 ? (
        <div className="card empty">No hay partes anulados recuperables.</div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {partes.map((p) => {
            const restantes = diasRestantes(p.anulado_en);
            return (
              <div key={p.id} className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {p.clientes?.nombre ?? "Cliente eliminado"}
                    </div>
                    <div className="dato muted" style={{ fontSize: "0.8rem", overflowWrap: "anywhere" }}>
                      {p.num_parte} · {p.horas}h
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                      Anulado {p.anulado_en ? formatFechaCorta(p.anulado_en) : "—"}
                      {p.anulado_por && <> por {p.anulado_por}</>}
                      {p.anulado_motivo && <> · {p.anulado_motivo}</>}
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      Se puede recuperar durante {Math.max(restantes, 0)} día{restantes === 1 ? "" : "s"} más.
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={ocupadoId === p.id}
                    onClick={() => recuperarParte(p.id)}
                  >
                    {ocupadoId === p.id ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <RotateCcw size={14} strokeWidth={2.25} />
                        Recuperar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
