"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Clock, PenLine, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { FirmaPad, type FirmaHandle } from "@/components/FirmaPad";
import { generarPartePDF } from "@/lib/pdf";
import { calcularHorasFacturables, minutosEntre } from "@/lib/horas";
import { subirFirma } from "@/lib/firmas";
import type { Cliente, Perfil, Modalidad } from "@/lib/types";
import { formatFecha } from "@/lib/format";

interface Props {
  clientesIniciales: Cliente[];
  trabajadores: Perfil[];
  usuarioActual: { id: string; nombre: string; email: string };
}

// Flujo mínimo para partes que no van contra un bono: clientes puntuales o
// nuevos que no tienen (todavía) horas contratadas. Sin selector de bono, sin
// aviso de horas restantes; el cliente se puede crear al vuelo con solo el
// nombre. Usa registrar_servicio_suelto (bono_id = null) y crear_cliente_rapido,
// dos funciones que ya existían en la base de datos pero no se llamaban desde
// ningún sitio.
export function FormParteRapido({ clientesIniciales, trabajadores, usuarioActual }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const firmaCliente = useRef<FirmaHandle>(null);
  const firmaTecnico = useRef<FirmaHandle>(null);

  const hoy = new Date().toISOString().split("T")[0];

  const [clientes, setClientes] = useState(clientesIniciales);
  const [clienteId, setClienteId] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [errorCliente, setErrorCliente] = useState("");
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [trabajadorId, setTrabajadorId] = useState(usuarioActual.id);
  const [tipo, setTipo] = useState("tecnico");
  const [modalidad, setModalidad] = useState<Modalidad>("presencial");
  const [fecha, setFecha] = useState(hoy);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("12:00");
  const [descripcion, setDescripcion] = useState("");
  const [material, setMaterial] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const minutos = useMemo(() => minutosEntre(inicio, fin), [inicio, fin]);
  const horas = useMemo(
    () => calcularHorasFacturables(minutos, modalidad),
    [minutos, modalidad]
  );

  async function crearClienteRapido() {
    setErrorCliente("");
    if (!nuevoNombre.trim()) {
      setErrorCliente("El nombre es obligatorio.");
      return;
    }
    setGuardandoCliente(true);
    const { data, error: rpcError } = await supabase.rpc("crear_cliente_rapido", {
      p_nombre: nuevoNombre.trim(),
      p_email: nuevoEmail.trim() || undefined,
      p_telefono: nuevoTelefono.trim() || undefined,
    });
    setGuardandoCliente(false);
    if (rpcError) {
      setErrorCliente(`No se pudo crear: ${rpcError.message}`);
      return;
    }
    const nuevo = data as Cliente;
    setClientes([...clientes, nuevo]);
    setClienteId(nuevo.id);
    setCreandoCliente(false);
    setNuevoNombre("");
    setNuevoEmail("");
    setNuevoTelefono("");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!clienteId || !descripcion.trim()) {
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

    setGuardando(true);

    const trabajador = trabajadores.find((t) => t.id === trabajadorId);
    const cliente = clientes.find((c) => c.id === clienteId);

    const firmaClienteDataUrl = firmaCliente.current?.dataURL() ?? null;
    const firmaTecnicoDataUrl = firmaTecnico.current?.dataURL() ?? null;

    let rutaFirmaCliente: string | null = null;
    let rutaFirmaTecnico: string | null = null;
    try {
      if (firmaClienteDataUrl) {
        rutaFirmaCliente = await subirFirma(supabase, firmaClienteDataUrl, clienteId);
      }
      if (firmaTecnicoDataUrl) {
        rutaFirmaTecnico = await subirFirma(supabase, firmaTecnicoDataUrl, clienteId);
      }
    } catch (e) {
      setError(
        `No se pudieron subir las firmas: ${e instanceof Error ? e.message : String(e)}`
      );
      setGuardando(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("registrar_servicio_suelto", {
      p_cliente_id: clienteId,
      p_trabajador_id: trabajadorId,
      p_trabajador_nombre: trabajador?.nombre ?? usuarioActual.nombre,
      p_tipo: tipo,
      p_modalidad: modalidad,
      p_fecha: fecha,
      p_hora_inicio: inicio,
      p_hora_fin: fin,
      p_descripcion: descripcion.trim(),
      p_material: material.trim() || null,
      p_firma_cliente: rutaFirmaCliente,
      p_firma_tecnico: rutaFirmaTecnico,
      p_firmante_nombre: null,
      p_creado_por: usuarioActual.email,
    });

    if (rpcError) {
      setError(`No se pudo guardar: ${rpcError.message}`);
      setGuardando(false);
      return;
    }

    const nombreArchivo = `${data.num_parte}_${(cliente?.nombre ?? "cliente").replace(/\s/g, "_")}.pdf`;
    try {
      const doc = generarPartePDF({
        servicio: {
          ...data,
          firma_cliente: firmaClienteDataUrl,
          firma_tecnico: firmaTecnicoDataUrl,
        },
        clienteNombre: cliente?.nombre ?? "—",
        numFactura: "Sin bono",
        horasRestantes: 0,
        horasTotales: 0,
      });
      doc.save(nombreArchivo);

      if (cliente?.email) {
        const pdfBase64 = doc.output("datauristring").split(",")[1];
        supabase.functions
          .invoke("enviar-parte", {
            body: {
              to: cliente.email,
              pdf_base64: pdfBase64,
              filename: nombreArchivo,
              vars: {
                cliente: cliente.nombre,
                num_parte: data.num_parte,
                fecha: formatFecha(fecha),
                horas: horas.toFixed(2),
                tecnico: trabajador?.nombre ?? usuarioActual.nombre,
              },
            },
          })
          .catch((e) => console.error("No se pudo enviar el email del parte:", e));
      }
    } catch (e) {
      console.error("Error generando PDF:", e);
    }

    router.push("/panel/historial");
    router.refresh();
  }

  return (
    <form onSubmit={guardar}>
      <h1 style={{ marginBottom: "0.35rem" }}>Parte rápido</h1>
      <p className="muted" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Para clientes puntuales o sin bono de horas contratado. No descuenta horas de
        ningún bono.
      </p>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="field">
          <label>Cliente *</label>
          {!creandoCliente ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                className="input"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Seleccionar…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCreandoCliente(true)}
              >
                <UserPlus size={14} strokeWidth={2.25} />
                Nuevo
              </button>
            </div>
          ) : (
            <div style={{ padding: "0.85rem", background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
              <div className="grid-2" style={{ marginBottom: "0.6rem" }}>
                <input
                  className="input"
                  placeholder="Nombre *"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  autoFocus
                />
                <input
                  className="input"
                  placeholder="Email (opcional)"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                />
              </div>
              <input
                className="input"
                placeholder="Teléfono (opcional)"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                style={{ marginBottom: "0.6rem" }}
              />
              {errorCliente && (
                <div className="error-box" style={{ marginBottom: "0.6rem" }}>
                  {errorCliente}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={guardandoCliente}
                  onClick={crearClienteRapido}
                >
                  {guardandoCliente ? <span className="spinner" /> : "Crear y usar"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setCreandoCliente(false);
                    setErrorCliente("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid-2">
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
              <option value="tecnico">Servicio Técnico</option>
              <option value="marketing">Servicio de Marketing</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Modalidad *</label>
            <select
              className="input"
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as Modalidad)}
            >
              <option value="presencial">Presencial</option>
              <option value="remota">Remota</option>
            </select>
          </div>
          <div className="field" />
        </div>

        <div className="grid-3">
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
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.55rem 0.9rem",
            background: "var(--brand-dim)",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <Clock size={15} strokeWidth={2.25} color="var(--brand-hi)" />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Duración facturable:
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
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <PenLine size={15} strokeWidth={2.25} />
          Firmas
        </h3>
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
    </form>
  );
}
