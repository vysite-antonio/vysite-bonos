// Helpers de formato compartidos. Antes cada pantalla repetía su propia
// versión de "fecha con guiones -> con barras", "fecha con hora en es-ES" y
// los umbrales de color del medidor de horas de un bono; ahora viven aquí
// una sola vez.

/** "2026-08-18" -> "18/08/2026" */
export function formatFecha(fechaYmd: string): string {
  return fechaYmd.split("-").reverse().join("/");
}

/** Fecha corta en es-ES a partir de un timestamp ISO: "18/8/2026" */
export function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES");
}

/** Fecha + hora en es-ES a partir de un timestamp ISO */
export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES");
}

export type NivelMedidor = "" | "warn" | "danger";

/**
 * Horas restantes, % consumido y nivel de color (para la clase
 * `medidor-fill ${nivel}`) de un bono. Mismos umbrales en todas las
 * pantallas que muestran el medidor: >85% consumido = danger (rojo),
 * >65% = warn (ámbar), si no, normal.
 */
export function medidorBono(bono: { horas_totales: number; horas_usadas: number }): {
  restantes: number;
  pct: number;
  nivel: NivelMedidor;
} {
  const restantes = bono.horas_totales - bono.horas_usadas;
  const pct = (bono.horas_usadas / bono.horas_totales) * 100;
  const nivel: NivelMedidor = pct > 85 ? "danger" : pct > 65 ? "warn" : "";
  return { restantes, pct, nivel };
}
