import { createClient } from "jsr:@supabase/supabase-js@2";

// Envia al cliente (email de su ficha) un PDF resumen de sus bonos y partes,
// vía Brevo (antes Resend). Publica (verify_jwt=false) pero con
// autenticacion propia: valida el token de portal y solo envia al email
// guardado en la ficha (nunca a un destinatario proporcionado por el
// cliente), evitando abuso.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function emailHtml(cliente: string, totales: number, consumidas: number, restantes: number, nPartes: number): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#1e3a5f;padding:26px 32px;border-radius:8px 8px 0 0;border-bottom:3px solid #3b82f6;">
    <div style="color:#ffffff;font-size:30px;font-weight:bold;letter-spacing:-0.5px;">VYSITE<span style="color:#3b82f6;">.ES</span></div>
    <div style="color:#94a3b8;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Informática y Marketing</div>
  </div>
  <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:16px;margin:0 0 6px;">Hola ${cliente},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 22px;">
      Te enviamos el resumen de tus bonos de horas y de los partes de trabajo realizados.
      Encontrarás el detalle completo en el <strong>PDF adjunto</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 22px;">
      <tr>
        <td style="padding:14px;background:#ffffff;border:1px solid #e2e8f0;text-align:center;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contratadas</div>
          <div style="color:#0f172a;font-size:22px;font-weight:bold;">${totales.toFixed(1)}h</div>
        </td>
        <td style="padding:14px;background:#ffffff;border:1px solid #e2e8f0;text-align:center;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Consumidas</div>
          <div style="color:#475569;font-size:22px;font-weight:bold;">${consumidas.toFixed(1)}h</div>
        </td>
        <td style="padding:14px;background:#ffffff;border:1px solid #e2e8f0;text-align:center;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Restantes</div>
          <div style="color:#3b82f6;font-size:22px;font-weight:bold;">${restantes.toFixed(1)}h</div>
        </td>
      </tr>
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 4px;">
      Total de partes incluidos: <strong>${nPartes}</strong>.
    </p>
    <p style="color:#475569;font-size:14px;margin:22px 0 0;">Un saludo,<br>Equipo Vysite</p>
  </div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Vysite.es · Servicios Informáticos y Marketing Digital · Albacete</p>
    <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">comercial@vysite.es · www.vysite.es</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { token, pdf_base64, filename } = await req.json();
    if (!token || !pdf_base64) return json({ error: "Faltan datos (token o PDF)" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cliente } = await admin
      .from("clientes")
      .select("id, nombre, email")
      .eq("token_portal", token)
      .single();
    if (!cliente) return json({ error: "Enlace no válido" }, 404);
    if (!cliente.email) return json({ error: "No tienes un email registrado en tu ficha" }, 400);

    const [{ data: bonos }, { count: nPartes }] = await Promise.all([
      admin.from("bonos").select("horas_totales, horas_usadas").eq("cliente_id", cliente.id).eq("eliminado", false),
      admin.from("servicios").select("id", { count: "exact", head: true }).eq("cliente_id", cliente.id),
    ]);
    const totales = (bonos ?? []).reduce((s, b) => s + Number(b.horas_totales), 0);
    const consumidas = (bonos ?? []).reduce((s, b) => s + Number(b.horas_usadas), 0);

    const { data: cfgRow } = await admin.from("config").select("valor").eq("clave", "email").single();
    const cfg = cfgRow?.valor ?? {};
    const apiKey = cfg.brevo_api_key;
    if (!apiKey) return json({ error: "Falta la API key de Brevo en Admin > Ajustes" }, 400);
    if (!cfg.remitente_email) return json({ error: "Falta el email remitente en Admin > Ajustes" }, 400);

    const html = emailHtml(cliente.nombre, totales, consumidas, totales - consumidas, nPartes ?? 0);

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: cfg.remitente_nombre || "Vysite", email: cfg.remitente_email },
        to: [{ email: cliente.email }],
        subject: `Resumen de tus bonos y partes · Vysite`,
        htmlContent: html,
        attachment: [{ content: pdf_base64, name: filename || "Resumen_Vysite.pdf" }],
      }),
    });
    const result = await res.json();
    if (!res.ok) return json({ error: result.message || "Error de Brevo", detalle: result }, 400);
    return json({ ok: true, id: result.messageId, to: cliente.email });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
