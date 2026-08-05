"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { generarPartePDF } from "@/lib/pdf";
import { resolverFirmaParaPdf } from "@/lib/firmas";
import type { Servicio, Cliente, Bono } from "@/lib/types";

const POR_PAGINA = 25;

// Columnas necesarias para la lista del historial. Las firmas (firma_cliente /
// firma_tecnico) se cargan aparte, solo al pulsar "Descargar PDF" de un parte
// concreto, para no descargar decenas de KB por firma en cada carga de página.
const COLUMNAS_LISTA =
  "id, num_parte, bono_id, cliente_id, trabajador_id, trabajador_nombre, tipo, modalidad, " +
  "fecha, hora_inicio, hora_fin, horas, descripcion, material, firmante_nombre, creado_por, creado_en, " +
  "anulado, anulado_motivo, anulado_por, anulado_en, clientes(nombre), bonos(num_factura)";

export default function Historial() {
  const supabase = createClient();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  const mesActual = new Date().toISOString().slice(0, 7);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMes, setFiltroMes] = useState(mesActual);

  const cargarPagina = useCallback(
    async (pag: number, cliente: string, mes: string) => {
      const desde = pag * POR_PAGINA;
      const hasta = desde + POR_PAGINA - 1;
      let q = supabase
        .from("servicios")
        .select(COLUMNAS_LISTA)
        .order("fecha", { ascending: false })
        .order("creado_en", { ascending: false })
        .range(desde, hasta);

      if (cliente) q = q.eq("cliente_id", cliente);
      if (mes) {
        const [anio, m] = mes.split("-").map(Number);
        const desdeFecha = `${mes}-01`;
        const finMes = new Date(anio, m, 1).toISOString().slice(0, 10);
        q = q.gte("fecha", desdeFecha).lt("fecha", finMes);
      }

      const { data: servs, error } = await q;
      if (error) {
        console.error("Error cargando historial:", error);
        return [] as Servicio[];
      }
      return (servs ?? []) as unknown as Servicio[];
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      // El rol de admin depende de una consulta encadenada (usuario -> perfil),
      // pero no hace falta esperar a que termine el resto para lanzarla: se
      // dispara a la vez que las otras tres consultas en vez de después,
      // ahorrando una ida y vuelta completa al servidor en cada carga.
      const esAdminPromise = (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;
        const { data: perfil } = await supabase
          .from("profiles")
          .select("rol")
          .eq("id", user.id)
          .single();
        return perfil?.rol === "admin";
      })();

      const [primeraPagina, { data: clis }, { data: bns }, esAdminResultado] = await Promise.all([
        cargarPagina(0, filtroCliente, filtroMes),
        // Columnas explícitas: esta pantalla la ve cualquier técnico, no solo
        // admin, y "clientes" tiene token_portal (el token del portal de
        // autoservicio). select("*") lo traería al navegador de cualquiera
        // con sesión; aquí solo hace falta el nombre para el filtro.
        supabase.from("clientes").select("id, nombre").order("nombre"),
        supabase.from("bonos").select("*"),
        esAdminPromise,
      ]);
      setServicios(primeraPagina);
      setHayMas(primeraPagina.length === POR_PAGINA);
      setPagina(0);
      setClientes((clis ?? []) as Cliente[]);
      setBonos((bns ?? []) as Bono[]);
      setEsAdmin(esAdminResultado);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, filtroCliente, filtroMes]);

  async function cargarMas() {
    setCargandoMas(true);
    const siguiente = pagina + 1;
    const nuevos = await cargarPagina(siguiente, filtroCliente, filtroMes);
    setServicios((prev) => [...prev, ...nuevos]);
    setHayMas(nuevos.length === POR_PAGINA);
    setPagina(siguiente);
    setCargandoMas(false);
  }

  const filtrados = servicios;

  async function descargarPDF(s: Servicio) {
    // Las firmas no viajan en el select de la lista: se piden aquí, al vuelo,
    // solo para el parte que se está exportando.
    const { data: completo, error } = await supabase
      .from("servicios")
      .select("firma_cliente, firma_tecnico")
      .eq("id", s.id)
      .single();
    if (error) {
      alert("No se pudieron obtener las firmas del parte.");
      return;
    }

    // firma_cliente/firma_tecnico pueden ser una ruta de Storage (servicios
    // nuevos) o, si quedara alguno, un dataURL base64 legado. resolverFirmaParaPdf
    // distingue los dos casos y siempre devuelve un dataURL listo para el PDF.
    const [firmaCliente, firmaTecnico] = await Promise.all([
      resolverFirmaParaPdf(supabase, completo?.firma_cliente),
      resolverFirmaParaPdf(supabase, completo?.firma_tecnico),
    ]);

    const bono = bonos.find((b) => b.id === s.bono_id);
    const doc = generarPartePDF({
      servicio: { ...s, firma_cliente: firmaCliente, firma_tecnico: firmaTecnico },
      clienteNombre: s.clientes?.nombre ?? "—",
      numFactura: bono?.num_factura ?? s.bonos?.num_factura ?? "—",
      horasRestantes: bono ? bono.horas_totales - bono.horas_usadas : 0,
      horasTotales: bono?.horas_totales ?? 0,
    });
    doc.save(`${s.num_parte}.pdf`);
  }

  async function anular(s: Servicio) {
    const motivo = prompt(
      `Vas a anular el parte ${s.num_parte}.\n\nEsto devolverá ${s.horas}h al bono (si tenía uno asignado) y no se puede deshacer.\n\nIndica el motivo:`
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert("Debes indicar un motivo.");
      return;
    }
    if (!confirm(`¿Confirmas anular el parte ${s.num_parte}?`)) return;

    setAnulandoId(s.id);
    const { data, error } = await supabase.rpc("anular_servicio", {
      p_servicio_id: s.id,
      p_motivo: motivo.trim(),
    });
    setAnulandoId(null);

    if (error) {
      alert(`No se pudo anular: ${error.message}`);
      return;
    }

    const actualizado = data as Servicio;
    setServicios((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...actualizado } : x)));

    // Refrescamos el bono en memoria para que el resto de la pantalla
    // (medidor, selects de "nuevo servicio", etc.) refleje las horas devueltas.
    if (s.bono_id) {
      const { data: bonoActualizado } = await supabase
        .from("bonos")
        .select("*")
        .eq("id", s.bono_id)
        .single();
      if (bonoActualizado) {
        setBonos((prev) => prev.map((b) => (b.id === s.bono_id ? (bonoActualizado as Bono) : b)));
      }
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>Historial de servicios</h1>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <select
              className="input"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Mes</label>
            <input
              type="month"
              className="input"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="card empty">
          <span className="spinner" style={{ borderTopColor: "var(--brand)" }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card empty">No hay servicios en este periodo.</div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {filtrados.map((s) => (
              <div
                key={s.id}
                className="card"
                style={s.anulado ? { opacity: 0.6 } : undefined}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        textDecoration: s.anulado ? "line-through" : "none",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {s.clientes?.nombre ?? "Cliente eliminado"}
                    </div>
                    <div className="dato muted" style={{ fontSize: "0.78rem", overflowWrap: "anywhere" }}>
                      {s.num_parte}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {s.anulado && <span className="badge badge-danger">ANULADO</span>}
                    <button className="btn btn-ghost btn-sm" onClick={() => descargarPDF(s)}>
                      <Download size={14} strokeWidth={2.25} />
                      PDF
                    </button>
                    {esAdmin && !s.anulado && (
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={anulandoId === s.id}
                        onClick={() => anular(s)}
                      >
                        {anulandoId === s.id ? (
                          "Anulando…"
                        ) : (
                          <>
                            <Ban size={14} strokeWidth={2.25} />
                            Anular
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                    fontSize: "0.82rem",
                    marginBottom: "0.75rem",
                    textDecoration: s.anulado ? "line-through" : "none",
                  }}
                >
                  <span>
                    <span className="muted">Fecha </span>
                    <span className="dato">{s.fecha.split("-").reverse().join("/")}</span>
                  </span>
                  <span>
                    <span className="muted">Horas </span>
                    <span className="dato" style={{ fontWeight: 600 }}>
                      {s.horas}h
                    </span>
                  </span>
                  <span>
                    <span className="muted">Técnico </span>
                    {s.trabajador_nombre ?? "—"}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-soft)",
                    background: "var(--surface-2)",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "var(--r-sm)",
                    textDecoration: s.anulado ? "line-through" : "none",
                  }}
                >
                  {s.descripcion}
                </div>

                {s.anulado && (
                  <div
                    style={{
                      marginTop: "0.6rem",
                      fontSize: "0.8rem",
                      color: "var(--text-soft)",
                    }}
                  >
                    <strong>Motivo de anulación:</strong> {s.anulado_motivo ?? "—"}
                    {s.anulado_por && <> · anulado por {s.anulado_por}</>}
                    {s.anulado_en && (
                      <> · {new Date(s.anulado_en).toLocaleString("es-ES")}</>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {hayMas && !cargando && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
              <button className="btn btn-ghost" onClick={cargarMas} disabled={cargandoMas}>
                {cargandoMas ? <span className="spinner" /> : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
