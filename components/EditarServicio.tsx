"use client";

import { useState, useMemo } from "react";
import { Save, X, Clock, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { calcularHorasFacturables, minutosEntre } from "@/lib/horas";
import type { Servicio, Bono, Modalidad } from "@/lib/types";

interface Props {
  servicio: Servicio;
  /** Bono al que carga el parte, si cuelga de alguno. Solo se usa para avisar
   *  de si el cambio deja el bono en negativo antes de guardar. */
  bono?: Bono;
  onGuardado: (actualizado: Servicio) => void;
  onCancelar: () => void;
}

// "14:04:00" -> "14:04" (el input type=time no acepta segundos en algunos navegadores)
function aHoraCorta(h: string) {
  return h?.slice(0, 5) ?? "";
}

export function EditarServicio({ servicio, bono, onGuardado, onCancelar }: Props) {
  const supabase = createClient();

  const [fecha, setFecha] = useState(servicio.fecha);
  const [inicio, setInicio] = useState(aHoraCorta(servicio.hora_inicio));
  const [fin, setFin] = useState(aHoraCorta(servicio.hora_fin));
  const [modalidad, setModalidad] = useState<Modalidad>(servicio.modalidad);
  const [descripcion, setDescripcion] = useState(servicio.descripcion);
  const [material, setMaterial] = useState(servicio.material ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const minutos = useMemo(() => minutosEntre(inicio, fin), [inicio, fin]);
  const horas = useMemo(
    () => calcularHorasFacturables(minutos, modalidad),
    [minutos, modalidad]
  );

  const diferencia = horas - servicio.horas;

  // Horas que quedarían libres en el bono si se guarda este cambio. Se calcula
  // aquí solo para avisar; el cálculo que manda es el de la base de datos.
  const restantesTrasCambio = bono
    ? bono.horas_totales - bono.horas_usadas - diferencia
    : null;
  const sePasa = restantesTrasCambio !== null && restantesTrasCambio < 0;

  async function guardar() {
    setError("");

    if (!descripcion.trim()) {
      setError("La actuación realizada no puede quedar vacía.");
      return;
    }
    if (horas <= 0) {
      setError("El horario es inválido: la salida debe ser posterior a la entrada.");
      return;
    }
    if (
      sePasa &&
      !confirm(
        `Este cambio consume ${diferencia.toFixed(2)}h más de las que le quedan al bono ` +
          `(se quedaría en ${restantesTrasCambio!.toFixed(2)}h). ¿Guardar igualmente?`
      )
    ) {
      return;
    }

    setGuardando(true);
    const { data, error: rpcError } = await supabase.rpc("editar_servicio", {
      p_servicio_id: servicio.id,
      p_fecha: fecha,
      p_hora_inicio: inicio,
      p_hora_fin: fin,
      p_modalidad: modalidad,
      p_descripcion: descripcion.trim(),
      p_material: material.trim() || null,
    });
    setGuardando(false);

    if (rpcError) {
      setError(`No se pudo guardar: ${rpcError.message}`);
      return;
    }

    onGuardado(data as Servicio);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <strong style={{ fontSize: "0.9rem" }}>Editando {servicio.num_parte}</strong>
      </div>

      {/* Aviso permanente: el cliente ya firmó este documento. */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
          background: "var(--warn-bg)",
          border: "1px solid var(--warn)",
          borderRadius: "var(--r-sm)",
          padding: "0.7rem 0.85rem",
          marginBottom: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-soft)",
        }}
      >
        <AlertTriangle size={16} strokeWidth={2.25} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          El cliente firmó este parte. Si lo modificas, el PDF lo indicará con la fecha
          del cambio y quién lo hizo.
        </span>
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

      <div className="field">
        <label>Modalidad</label>
        <select
          className="input"
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value as Modalidad)}
        >
          <option value="presencial">Presencial</option>
          <option value="remota">Remota</option>
        </select>
      </div>

      {/* Horas facturables recalculadas en vivo, con la diferencia respecto a
          lo que el parte consume ahora mismo. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          padding: "0.55rem 0.9rem",
          background: "var(--brand-dim)",
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--line-soft)",
          marginBottom: "1rem",
        }}
      >
        <Clock size={15} strokeWidth={2.25} color="var(--brand-hi)" />
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Duración facturable:
        </span>
        <span className="dato" style={{ fontWeight: 700, color: "var(--brand-hi)" }}>
          {horas.toFixed(2)}h
        </span>
        {diferencia !== 0 && (
          <span
            className="dato"
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: diferencia > 0 ? "var(--warn)" : "var(--ok)",
            }}
          >
            ({diferencia > 0 ? "+" : ""}
            {diferencia.toFixed(2)}h respecto a ahora)
          </span>
        )}
      </div>

      {sePasa && (
        <div
          className="error-box"
          style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}
        >
          <AlertTriangle size={15} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            El bono se quedaría en {restantesTrasCambio!.toFixed(2)}h. Podrás guardar,
            pero te pedirá confirmación.
          </span>
        </div>
      )}

      <div className="field">
        <label>Actuación realizada *</label>
        <textarea
          className="input"
          rows={4}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Material utilizado</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Material usado (opcional)…"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={guardar}
          disabled={guardando}
          style={{ flex: "1 1 160px" }}
        >
          {guardando ? (
            <span className="spinner" />
          ) : (
            <>
              <Save size={16} strokeWidth={2.25} />
              Guardar cambios
            </>
          )}
        </button>
        <button
          className="btn btn-ghost"
          onClick={onCancelar}
          disabled={guardando}
          style={{ flex: "0 1 120px" }}
        >
          <X size={16} strokeWidth={2.25} />
          Cancelar
        </button>
      </div>
    </div>
  );
}
