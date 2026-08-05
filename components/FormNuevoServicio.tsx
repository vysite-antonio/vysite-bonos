"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { FirmaPad, type FirmaHandle } from "@/components/FirmaPad";
import { generarPartePDF } from "@/lib/pdf";
import type { Cliente, Bono, Perfil } from "@/lib/types";

interface Props {
  clientes: Cliente[];
  bonos: Bono[];
  trabajadores: Perfil[];
  usuarioActual: { id: string; nombre: string; email: string };
}

export function FormNuevoServicio({
  clientes,
  bonos,
  trabajadores,
  usuarioActual,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const firmaCliente = useRef<FirmaHandle>(null);
  const firmaTecnico = useRef<FirmaHandle>(null);

  const hoy = new Date().toISOString().split("T")[0];

  const [trabajadorId, setTrabajadorId] = useState(usuarioActual.id);
  const [tipo, setTipo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [bonoId, setBonoId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("12:00");
  const [descripcion, setDescripcion] = useState("");
  const [material, setMaterial] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const bonosCliente = useMemo(
    () => bonos.filter((b) => b.cliente_id === clienteId && b.activo),
    [bonos, clienteId]
  );

  const horas = useMemo(() => {
    const ini = new Date(`2000-01-01T${inicio}`);
    const f = new Date(`2000-01-01T${fin}`);
    return Math.max(0, (f.getTime() - ini.getTime()) / 3600000);
  }, [inicio, fin]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!tipo || !clienteId || !bonoId || !descripcion.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }
    if (firmaCliente.current?.estaVacia() || firmaTecnico.current?.estaVacia()) {
      setError("Faltan las firmas del cliente y/o técnico.");
      return;
    }
    if (horas <= 0) {
      setError("El horario es inválido: la salida debe ser posterior a la entrada.");
      return;
    }

    const bono = bonos.find((b) => b.id === bonoId);
    const restantes = bono ? bono.horas_totales - bono.horas_usadas : 0;
    if (bono && horas > restantes) {
      if (
        !confirm(
          `Este servicio consume ${horas.toFixed(2)}h pero solo quedan ${restantes.toFixed(
            2
          )}h. ¿Continuar igualmente?`
        )
      )
        return;
    }

    setGuardando(true);

    const trabajador = trabajadores.find((t) => t.id === trabajadorId);

    const { data, error: rpcError } = await supabase.rpc("registrar_servicio", {
      p_bono_id: bonoId,
      p_cliente_id: clienteId,
      p_trabajador_id: trabajadorId,
      p_trabajador_nombre: trabajador?.nombre ?? usuarioActual.nombre,
      p_tipo: tipo,
      p_fecha: fecha,
      p_hora_inicio: inicio,
      p_hora_fin: fin,
      p_descripcion: descripcion.trim(),
      p_material: material.trim() || null,
      p_firma_cliente: firmaCliente.current?.dataURL() ?? null,
      p_firma_tecnico: firmaTecnico.current?.dataURL() ?? null,
      p_creado_por: usuarioActual.email,
    });

    if (rpcError) {
      setError(`No se pudo guardar: ${rpcError.message}`);
      setGuardando(false);
      return;
    }

    // Generar y descargar el PDF
    const cliente = clientes.find((c) => c.id === clienteId);
    try {
      const doc = generarPartePDF({
        servicio: data,
        clienteNombre: cliente?.nombre ?? "—",
        numFactura: bono?.num_factura ?? "—",
        horasRestantes: (bono?.horas_totales ?? 0) - (bono?.horas_usadas ?? 0) - horas,
        horasTotales: bono?.horas_totales ?? 0,
      });
      doc.save(`${data.num_parte}_${(cliente?.nombre ?? "cliente").replace(/\s/g, "_")}.pdf`);
    } catch (e) {
      console.error("Error generando PDF:", e);
    }

    router.push("/panel/historial");
    router.refresh();
  }

  const inputClienteCambio = (id: string) => {
    setClienteId(id);
    setBonoId("");
  };

  return (
    <form onSubmit={guardar}>
      <h1 style={{ marginBottom: "1.5rem" }}>Nuevo servicio</h1>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="fila-2">
          <div className="field">
            <label>Técnico *</label>
            <select
              className="input"
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
            >
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo de servicio *</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Seleccionar…</option>
              <option value="tecnico">Servicio Técnico</option>
              <option value="marketing">Servicio de Marketing</option>
            </select>
          </div>
        </div>

        <div className="fila-2">
          <div className="field">
            <label>Cliente *</label>
            <select
              className="input"
              value={clienteId}
              onChange={(e) => inputClienteCambio(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Bono a utilizar *</label>
            <select
              className="input"
              value={bonoId}
              onChange={(e) => setBonoId(e.target.value)}
              disabled={!clienteId}
            >
              <option value="">
                {clienteId ? "Seleccionar bono…" : "Primero elige cliente"}
              </option>
              {bonosCliente.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.num_factura} · {(b.horas_totales - b.horas_usadas).toFixed(1)}h disp.
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fila-3">
          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              className="input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Entrada</label>
            <input
              type="time"
              className="input"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Salida</label>
            <input
              type="time"
              className="input"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: "0.4rem",
            padding: "0.5rem 0.85rem",
            background: "var(--brand-dim)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Duración:
          </span>
          <span className="dato" style={{ fontWeight: 700, color: "var(--brand-hi)" }}>
            {horas.toFixed(2)}h
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="field">
          <label>Actuación realizada *</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Describe el trabajo realizado…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Material utilizado</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Material usado (opcional)…"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Firmas</h3>
        <FirmaPad ref={firmaCliente} etiqueta="Firma del cliente" />
        <FirmaPad ref={firmaTecnico} etiqueta="Firma del técnico" />
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
        {guardando ? <span className="spinner" /> : "Guardar y generar parte"}
      </button>

      <style>{`
        .fila-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .fila-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) {
          .fila-2, .fila-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </form>
  );
}
