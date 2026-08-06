"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface ConfigEmail {
  brevo_api_key?: string;
  remitente_nombre?: string;
  remitente_email?: string;
  asunto?: string;
  plantilla_html?: string;
}

// Ajustes del envío automático de partes por email (Brevo). Se guardan en
// la tabla config (clave "email"), protegida por RLS a solo admin. Nunca
// tocamos el código para cambiar la API key: se edita aquí y las edge
// functions enviar-parte / enviar-resumen la leen en cada envío.
export function AdminConfig() {
  const supabase = createClient();
  const [cargando, setCargando] = useState(true);
  const [cfg, setCfg] = useState<ConfigEmail>({});
  const [avanzado, setAvanzado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [emailPrueba, setEmailPrueba] = useState("");
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("clave", "email").single();
      if (data?.valor) setCfg(data.valor as ConfigEmail);
      setCargando(false);
    })();
  }, [supabase]);

  async function guardar() {
    setError("");
    setMensaje("");
    if (!cfg.remitente_email?.trim()) {
      setError("El email remitente es obligatorio.");
      return;
    }
    setGuardando(true);
    const { error: upErr } = await supabase
      .from("config")
      .upsert({ clave: "email", valor: cfg, actualizado_en: new Date().toISOString() });
    setGuardando(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setMensaje("Guardado.");
  }

  async function enviarPrueba() {
    setError("");
    setMensaje("");
    if (!emailPrueba.trim()) {
      setError("Indica un email al que mandar la prueba.");
      return;
    }
    setProbando(true);
    const { data, error: fnError } = await supabase.functions.invoke("enviar-parte", {
      body: {
        to: emailPrueba.trim(),
        vars: {
          cliente: "Cliente de prueba",
          num_parte: "PT-PRUEBA",
          fecha: new Date().toLocaleDateString("es-ES"),
          horas: "1.00",
          tecnico: "—",
        },
      },
    });
    setProbando(false);
    if (fnError || data?.error) {
      setError(data?.error ?? fnError?.message ?? "No se pudo enviar la prueba.");
      return;
    }
    setMensaje(`Email de prueba enviado a ${emailPrueba.trim()}.`);
  }

  if (cargando) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Mail size={15} strokeWidth={2.25} />
          Envío automático de partes por email
        </h3>
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
          Al guardar un parte nuevo, se manda automáticamente por email al cliente (al email de su
          ficha) con el PDF adjunto, usando Brevo. Si el cliente no tiene email registrado, no se
          envía nada y el parte se guarda igual.
        </p>

        <div className="grid-2">
          <div className="field">
            <label>API key de Brevo *</label>
            <input
              className="input"
              type="password"
              placeholder="xkeysib-..."
              value={cfg.brevo_api_key ?? ""}
              onChange={(e) => setCfg({ ...cfg, brevo_api_key: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Email remitente *</label>
            <input
              className="input"
              type="email"
              placeholder="partes@vysite.es"
              value={cfg.remitente_email ?? ""}
              onChange={(e) => setCfg({ ...cfg, remitente_email: e.target.value })}
            />
          </div>
        </div>
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: "-0.5rem", marginBottom: "1rem" }}>
          El remitente debe estar verificado en Brevo (remitente individual o dominio autenticado),
          si no los envíos se rechazan.
        </p>

        <div className="grid-2">
          <div className="field">
            <label>Nombre remitente</label>
            <input
              className="input"
              placeholder="Vysite"
              value={cfg.remitente_nombre ?? ""}
              onChange={(e) => setCfg({ ...cfg, remitente_nombre: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Asunto</label>
            <input
              className="input"
              placeholder="Parte de trabajo {{num_parte}}"
              value={cfg.asunto ?? ""}
              onChange={(e) => setCfg({ ...cfg, asunto: e.target.value })}
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: avanzado ? "1rem" : 0 }}
          onClick={() => setAvanzado(!avanzado)}
        >
          {avanzado ? "Ocultar plantilla avanzada" : "Plantilla HTML avanzada (opcional)"}
        </button>
        {avanzado && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Plantilla HTML</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Déjalo vacío para usar la plantilla por defecto de Vysite."
              value={cfg.plantilla_html ?? ""}
              onChange={(e) => setCfg({ ...cfg, plantilla_html: e.target.value })}
              style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
              Variables disponibles: {"{{cliente}}"}, {"{{num_parte}}"}, {"{{fecha}}"}, {"{{horas}}"},{" "}
              {"{{tecnico}}"}.
            </p>
          </div>
        )}

        {error && <div className="error-box" style={{ marginTop: "1rem" }}>{error}</div>}
        {mensaje && (
          <div className="badge badge-ok" style={{ marginTop: "1rem", display: "inline-block" }}>
            {mensaje}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: "1.25rem" }}
          disabled={guardando}
          onClick={guardar}
        >
          {guardando ? <span className="spinner" /> : "Guardar ajustes"}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Send size={15} strokeWidth={2.25} />
          Enviar prueba
        </h3>
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
          Manda un email de ejemplo (sin PDF adjunto) para comprobar que la configuración funciona.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <input
            className="input"
            type="email"
            placeholder="tu-email@vysite.es"
            style={{ flex: "1 1 220px" }}
            value={emailPrueba}
            onChange={(e) => setEmailPrueba(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" disabled={probando} onClick={enviarPrueba}>
            {probando ? <span className="spinner" /> : "Enviar prueba"}
          </button>
        </div>
      </div>
    </div>
  );
}
