import Link from "next/link";
import { Gauge, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Bono } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const supabase = await createClient();

  const { data: bonos } = await supabase
    .from("bonos")
    .select("*, clientes(nombre)")
    .order("activo", { ascending: false })
    .order("fecha_creacion", { ascending: false });

  const lista = (bonos ?? []) as Bono[];
  const activos = lista.filter((b) => b.activo);

  const horasDisponibles = activos.reduce(
    (s, b) => s + (b.horas_totales - b.horas_usadas),
    0
  );
  const horasTotales = activos.reduce((s, b) => s + b.horas_totales, 0);

  return (
    <>
      {/* HÉROE: medidor agregado de horas */}
      <section className="card card-pad-lg card-accent" style={{ marginBottom: "1.75rem" }}>
        <div className="eyebrow">
          <Gauge size={13} strokeWidth={2.5} />
          Horas disponibles en bonos activos
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            margin: "0.6rem 0 1.35rem",
            flexWrap: "wrap",
          }}
        >
          <span
            className="dato"
            style={{ fontSize: "clamp(2.4rem, 11vw, 3.5rem)", fontWeight: 700, lineHeight: 1 }}
          >
            {horasDisponibles.toFixed(1)}
          </span>
          <span className="dato muted" style={{ fontSize: "1.3rem" }}>
            / {horasTotales.toFixed(0)}h
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <div className="muted">Bonos activos</div>
            <div className="dato" style={{ fontSize: "1.3rem", fontWeight: 600 }}>
              {activos.length}
            </div>
          </div>
          <div>
            <div className="muted">Bonos totales</div>
            <div className="dato" style={{ fontSize: "1.3rem", fontWeight: 600 }}>
              {lista.length}
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <h2>Bonos por cliente</h2>
        <Link href="/panel/nuevo-servicio" className="btn btn-primary btn-sm">
          <PlusCircle size={16} strokeWidth={2.25} />
          Registrar servicio
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="card empty">
          Aún no hay bonos. Crea el primero desde Administración.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {lista.map((b) => {
            const restantes = b.horas_totales - b.horas_usadas;
            const pctUsado = (b.horas_usadas / b.horas_totales) * 100;
            const nivel =
              pctUsado > 85 ? "danger" : pctUsado > 65 ? "warn" : "";
            return (
              <div key={b.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.9rem",
                    gap: "1rem",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {b.clientes?.nombre ?? "Cliente eliminado"}
                    </div>
                    <div className="dato muted" style={{ fontSize: "0.8rem", overflowWrap: "anywhere" }}>
                      Factura {b.num_factura}
                    </div>
                  </div>
                  <span className={`badge ${b.activo ? "badge-ok" : "badge-danger"}`}>
                    {b.activo ? "Activo" : "Agotado"}
                  </span>
                </div>

                <div className="medidor">
                  <div className="medidor-track">
                    <div
                      className={`medidor-fill ${nivel}`}
                      style={{ width: `${Math.min(pctUsado, 100)}%` }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span className="dato muted">{b.horas_usadas.toFixed(1)}h usadas</span>
                    <span className="dato" style={{ fontWeight: 600 }}>
                      {restantes.toFixed(1)}h restantes
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
