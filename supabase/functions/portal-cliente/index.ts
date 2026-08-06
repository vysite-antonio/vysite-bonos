import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Las firmas viven en un bucket privado. El portal no tiene sesión, así que no
// puede pedirlas por su cuenta: se las damos como URL firmada de vida corta, y
// solo del parte concreto que el cliente ha pedido descargar.
async function firmaUrl(
  supabase: ReturnType<typeof createClient>,
  valor: string | null
): Promise<string | null> {
  if (!valor) return null;
  // Servicios antiguos guardaban la firma como dataURL base64 en la propia fila.
  if (valor.startsWith("data:")) return valor;
  const { data } = await supabase.storage.from("firmas").createSignedUrl(valor, 120);
  return data?.signedUrl ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { token, parte_id } = await req.json();
    if (!token) return json({ error: "Falta el token" }, 400);

    // Cliente con service role: controla exactamente qué se devuelve
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nombre, email")
      .eq("token_portal", token)
      .single();

    if (!cliente) return json({ error: "Enlace no válido" }, 404);

    // ---- Modo "un parte concreto": datos completos para generar su PDF ----
    // El filtro por cliente_id es lo que impide que, con un token válido, se
    // pueda pedir el parte de otro cliente pasando su id a mano.
    if (parte_id) {
      const { data: servicio } = await supabase
        .from("servicios")
        .select(
          "id, num_parte, bono_id, cliente_id, trabajador_nombre, tipo, modalidad, fecha, " +
            "hora_inicio, hora_fin, horas, descripcion, material, firma_cliente, firma_tecnico, " +
            "firmante_nombre, creado_en, anulado, editado, editado_en, editado_por"
        )
        .eq("id", parte_id)
        .eq("cliente_id", cliente.id)
        .eq("anulado", false)
        .single();

      if (!servicio) return json({ error: "Parte no encontrado" }, 404);

      let bono = null;
      if (servicio.bono_id) {
        const { data } = await supabase
          .from("bonos")
          .select("num_factura, horas_totales, horas_usadas")
          .eq("id", servicio.bono_id)
          .single();
        bono = data;
      }

      const [firma_cliente, firma_tecnico] = await Promise.all([
        firmaUrl(supabase, servicio.firma_cliente),
        firmaUrl(supabase, servicio.firma_tecnico),
      ]);

      return json({
        cliente,
        // No devolvemos las rutas internas de Storage, solo las URLs firmadas.
        servicio: { ...servicio, firma_cliente: null, firma_tecnico: null },
        bono,
        firma_cliente,
        firma_tecnico,
      });
    }

    // ---- Modo resumen: lo que ve el cliente al abrir el portal ----
    const [{ data: bonos }, { data: servicios }] = await Promise.all([
      supabase
        .from("bonos")
        .select(
          "id, num_factura, horas_totales, horas_usadas, precio, fecha_creacion, fecha_caducidad, activo"
        )
        .eq("cliente_id", cliente.id)
        .eq("eliminado", false)
        .order("fecha_creacion", { ascending: false }),
      supabase
        .from("servicios")
        .select(
          "id, num_parte, tipo, fecha, hora_inicio, hora_fin, horas, descripcion, trabajador_nombre, editado, bonos(num_factura)"
        )
        .eq("cliente_id", cliente.id)
        .eq("anulado", false)
        .order("fecha", { ascending: false }),
    ]);

    return json({ cliente, bonos: bonos ?? [], servicios: servicios ?? [] });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
