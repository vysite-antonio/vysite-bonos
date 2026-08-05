import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "firmas";

/**
 * Sube una firma (dataURL PNG capturada en el FirmaPad) al bucket privado
 * `firmas` y devuelve la ruta guardada en Storage (no una URL pública: el
 * bucket es privado y no tiene URLs públicas).
 *
 * Esta ruta es lo que se guarda en servicios.firma_cliente / firma_tecnico
 * para los servicios NUEVOS, en vez del base64 completo que se guardaba
 * antes directamente en la fila.
 */
export async function subirFirma(
  supabase: SupabaseClient,
  dataUrl: string,
  carpeta: string
): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const ruta = `${carpeta}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw error;
  return ruta;
}

// true si el valor guardado es un dataURL base64 "de los antiguos"
// (servicios registrados antes de esta migración), en vez de una ruta de
// Storage.
function esBase64Legado(valor: string): boolean {
  return valor.startsWith("data:");
}

/**
 * Resuelve el valor guardado en firma_cliente/firma_tecnico a un dataURL que
 * jsPDF pueda usar directamente en addImage().
 *
 * - Si es base64 legado (servicios de antes de esta migración), se devuelve
 *   tal cual: compatibilidad hacia atrás, el PDF sigue funcionando igual que
 *   siempre aunque ya no queden filas así en producción.
 * - Si es una ruta de Storage (servicios nuevos), se pide una URL firmada,
 *   se descarga la imagen y se convierte a dataURL.
 */
export async function resolverFirmaParaPdf(
  supabase: SupabaseClient,
  valor: string | null | undefined
): Promise<string | null> {
  if (!valor) return null;
  if (esBase64Legado(valor)) return valor;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(valor, 60);
  if (error || !data?.signedUrl) return null;

  const blob = await (await fetch(data.signedUrl)).blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
