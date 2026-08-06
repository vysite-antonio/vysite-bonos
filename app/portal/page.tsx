"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Gauge, Download } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { generarPartePDF } from "@/lib/pdf";
import type { Servicio } from "@/lib/types";

interface PortalData {
  cliente: { nombre: string; email: string };
  bonos: {
    id: string;
    num_factura: string;
    horas_totales: number;
    horas_usadas: number;
    precio: number | null;
    fecha_creacion: string;
    fecha_caducidad: string | null;
    activo: boolean;
  }[];
  servicios: {
    id: string;
    num_parte: string;
    tipo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    horas: number;
    descripcion: string;
    trabajador_nombre: string | null;
    editado: boolean;
    bonos: { num_factura: string } | null;
  }[];
}

/** Descarga la imagen de una firma (URL firmada de vida corta que devuelve la
 *  edge function) y la convierte al dataURL que jsPDF necesita. */
async function aDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url; // firmas antiguas, ya venían en base64
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function PortalContenido() {
  const params = useSearchParams();
  const token = params.get("token");
  const supabase = createClient();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // El PDF se arma en el navegador del cliente igual que en el panel, pero los
  // datos (y sobre todo las firmas, que están en un bucket privado) los sirve
  // la edge function solo para el parte pedido y validando que ese parte es
  // realmente suyo.
  async function descargarPDF(servicioId: string, numParte: string) {
    setDescargandoId(servicioId);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke(
        "portal-cliente",
        { body: { token, parte_id: servicioId } }
      );

      if (fnError || res?.error) {
        alert(res?.error ?? "No se pudo preparar el parte. Inténtalo de nuevo.");
        return;
      }

      const [firmaCliente, firmaTecnico] = await Promise.all([
        aDataUrl(res.firma_cliente),
        aDataUrl(res.firma_tecnico),
      ]);

      const bono = res.bono;
      const doc = generarPartePDF({
        servicio: {
          ...(res.servicio as Servicio),
          firma_cliente: firmaCliente,
          firma_tecnico: firmaTecnico,
        },
        clienteNombre: res.cliente?.nombre ?? "—",
        numFactura: bono?.num_factura ?? "—",
        horasRestantes: bono ? bono.horas_totales - bono.horas_usadas : 0,
        horasTotales: bono?.horas_totales ?? 0,
      });
      doc.save(`${numParte}.pdf`);
    } catch {
      alert("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      setDescargandoId(null);
    }
  }

  useEffect(() => {
    if (!token) {
      setError("Enlace no válido. Usa el enlace que te enviamos por email.");
      setCargando(false);
      return;
    }
    (async () => {
      const { data: res, error } = await supabase.functions.invoke("portal-cliente", {
        body: { token },
      });
      if (error || res?.error) {
        setError(res?.error ?? "No se pudo cargar la información.");
      } else {
        setData(res);
      }
      setCargando(false);
    })();
  }, [token, supabase]);

  if (cargando)
    return (
      <div className="empty">
        <span className="spinner" style={{ borderTopColor: "var(--brand)" }} />
      </div>
    );

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return null;

  const horasDisp = data.bonos
    .filter((b) => b.activo)
    .reduce((s, b) => s + (b.horas_totales - b.horas_usadas), 0);

  return (
    <>
      <div style={{ marginBottom: "2rem" }}>
        <div className="eyebrow">Portal de cliente</div>
        <h1 style={{ marginTop: 4 }}>{data.cliente.nombre}</h1>
      </div>

      <section className="card card-pad-lg card-accent" style={{ marginBottom: "1.75rem" }}>
        <div className="eyebrow">
          <Gauge size={13} strokeWidth={2.5} />
          Horas disponibles
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          <span className="dato" style={{ fontSize: "clamp(2.2rem, 10vw, 3rem)", fontWeight: 700, lineHeight: 1 }}>
            {horasDisp.toFixed(1)}
          </span>
          <span className="dato muted" style={{ fontSize: "1.1rem" }}>horas</span>
        </div>
      </section>

      <h2 style={{ marginBottom: "1rem" }}>Mis bonos</h2>
      {data.bonos.length === 0 ? (
        <div className="card empty">No tienes bonos registrados.</div>
      ) : (
        <div style={{ display: "grid", gap: "0.9rem", marginBottom: "2rem" }}>
          {data.bonos.map((b) => {
            const rem = b.horas_totales - b.horas_usadas;
            const pct = (b.horas_usadas / b.horas_totales) * 100;
            const nivel = pct > 85 ? "danger" : pct > 65 ? "warn" : "";
            return (
              <div key={b.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                  <span className="dato" style={{ fontWeight: 600 }}>Factura {b.num_factura}</span>
                  <span className={`badge ${b.activo ? "badge-ok" : "badge-danger"}`}>
                    {b.activo ? "Activo" : "Agotado"}
                  </span>
                </div>
                <div className="medidor">
                  <div className="medidor-track">
                    <div className={`medidor-fill ${nivel}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span className="dato muted">{b.horas_usadas.toFixed(1)}h consumidas</span>
                    <span className="dato" style={{ fontWeight: 600 }}>{rem.toFixed(1)}h disponibles</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 style={{ marginBottom: "1rem" }}>Servicios realizados</h2>
      {data.servicios.length === 0 ? (
        <div className="card empty">Aún no hay servicios registrados.</div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {data.servicios.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span className="dato muted" style={{ fontSize: "0.8rem" }}>{s.num_parte}</span>
                <span className="dato" style={{ fontWeight: 600 }}>{s.horas}h</span>
              </div>
              <div style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                <span className="dato">{s.fecha.split("-").reverse().join("/")}</span>
                <span className="muted"> · {s.hora_inicio}–{s.hora_fin}</span>
                {s.trabajador_nombre && <span className="muted"> · {s.trabajador_nombre}</span>}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>{s.descripcion}</div>

              {s.editado && (
                <div style={{ fontSize: "0.75rem", color: "var(--warn)", marginTop: "0.5rem" }}>
                  Modificado con posterioridad a la firma
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={descargandoId === s.id}
                  onClick={() => descargarPDF(s.id, s.num_parte)}
                >
                  {descargandoId === s.id ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <Download size={14} strokeWidth={2.25} />
                      Descargar parte
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Portal() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
      <Suspense fallback={<div className="empty"><span className="spinner" /></div>}>
        <PortalContenido />
      </Suspense>
    </main>
  );
}
