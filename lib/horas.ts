import type { Modalidad } from "./types";

/**
 * Calcula las horas facturables de un servicio a partir de su duración en
 * minutos y la modalidad (presencial/remota).
 *
 * ESTA FUNCIÓN DEBE SER UN ESPEJO EXACTO DE LA FUNCIÓN SQL
 * `calcular_horas_facturables` (ver migración 06_modalidad_y_calculo_horas).
 * La regla de facturación vive canónicamente en esa función SQL — es la que
 * de verdad descuenta horas de los bonos en `registrar_servicio` /
 * `registrar_servicio_suelto`. Esta versión en TypeScript existe únicamente
 * para poder mostrarle al técnico, en el momento de rellenar el formulario,
 * una previsualización de las horas que se le van a descontar, y para poder
 * testear que ambas implementaciones no han divergido.
 *
 * SI TOCAS LA REGLA DE FACTURACIÓN, TOCA LAS DOS IMPLEMENTACIONES A LA VEZ
 * (esta función y `calcular_horas_facturables` en SQL) y actualiza los tests
 * de `lib/horas.test.ts`. Ver README para más detalle.
 *
 * Reglas (no se tocan sin aprobación explícita):
 * - Presencial: mínimo 1 hora; a partir de ahí, bloques de 30 min con 10 min
 *   de cortesía (es decir, los primeros 10 minutos de cada bloque adicional
 *   no se facturan).
 * - Remota: bloques de 30 min al alza desde el primer minuto, sin mínimo.
 */
export function calcularHorasFacturables(minutos: number, modalidad: Modalidad): number {
  if (minutos <= 0) return 0;

  if (modalidad === "remota") {
    const bloques = Math.ceil(minutos / 30);
    return bloques * 0.5;
  }

  // Presencial: mínimo 1 hora.
  if (minutos <= 60) return 1;

  // A partir de la 1ª hora: bloques de 30 min con 10 min de cortesía.
  const bloques = Math.ceil((minutos - 10) / 30);
  return bloques * 0.5;
}

/** Convierte dos horas "HH:MM" en minutos transcurridos entre ambas (puede ser negativo o 0 si el horario es inválido). */
export function minutosEntre(horaInicio: string, horaFin: string): number {
  const [hIni, mIni] = horaInicio.split(":").map(Number);
  const [hFin, mFin] = horaFin.split(":").map(Number);
  return hFin * 60 + mFin - (hIni * 60 + mIni);
}
