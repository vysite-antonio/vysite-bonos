import { createClient } from "jsr:@supabase/supabase-js@2";

// Envía un parte de trabajo por email al cliente, vía Brevo (antes Resend).
// Se invoca desde dos sitios: automáticamente al guardar un parte nuevo
// (FormNuevoServicio) y, si se quiere reenviar, desde el historial. La API
// key y el remitente se guardan en config (clave "email"), editables desde
// Admin > Ajustes; nunca viven en el código.
//
// pdf_base64 es opcional: sin PDF, sirve para el botón "Enviar prueba" de
// Ajustes sin tener que fabricar un parte de mentira.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLANTILLA_FALLBACK = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1e3a5f;padding:24px 32px;border-radius:8px 8px 0 0;">
    <div style="color:#3b82f6;font-size:26px;font-weight:bold;">Vysite</div>
    <div style="color:#94a3b8;font-size:13px;">Gestión de Bonos de Horas</div>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:3px solid #3b82f6;">
    <p style="color:#0f172a;font-size:15px;">Hola {{cliente}},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Adjuntamos el parte de trabajo <strong>{{num_parte}}</strong> correspondiente al servicio
      realizado el {{fecha}}.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Parte</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:bold;">{{num_parte}}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Fecha</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:bold;">{{fecha}}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Horas</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:bold;">{{horas}}h</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Técnico</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:bold;">{{tecnico}}</td></tr>
    </table>
    <p style="color:#475569;font-size:14px;">Encontrarás el detalle completo en el PDF adjunto.</p>
    <p style="color:#475569;font-size:14px;">Un saludo,<br>Equipo Vysite</p>
  </div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Vysite.es · Servicios Informáticos y Marketing Digital · Albacete</p>
  </div>
</div>`;

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sesión inválida" }, 401);

    const admin = createClient(url, service);
    const { data: cfgRow } = await admin.from("config").select("valor").eq("clave", "email").single();
    const cfg = cfgRow?.valor ?? {};

    const apiKey = cfg.brevo_api_key;
    if (!apiKey) return json({ error: "Falta la API key de Brevo en Admin > Ajustes" }, 400);

    const { to, pdf_base64, filename, vars } = await req.json();
    if (!to) return json({ error: "Falta el destinatario" }, 400);

    const asunto = render(cfg.asunto || "Parte de trabajo {{num_parte}}", vars ?? {});
    const plantilla = cfg.plantilla_html?.trim() ? cfg.plantilla_html : PLANTILLA_FALLBACK;
    const html = render(plantilla, vars ?? {});

    const body: Record<string, unknown> = {
      sender: { name: cfg.remitente_nombre || "Vysite", email: cfg.remitente_email },
      to: [{ email: to }],
      subject: asunto,
      htmlContent: html,
    };
    if (pdf_base64) {
      body.attachment = [{ content: pdf_base64, name: filename || "parte.pdf" }];
    }
    if (!cfg.remitente_email) return json({ error: "Falta el email remitente en Admin > Ajustes" }, 400);

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) return json({ error: result.message || "Error de Brevo", detalle: result }, 400);
    return json({ ok: true, id: result.messageId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
