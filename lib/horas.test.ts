import { describe, expect, it } from "vitest";
import { calcularHorasFacturables, minutosEntre } from "./horas";

/**
 * Los valores esperados de este archivo se verificaron ejecutando la función
 * SQL real `calcular_horas_facturables` en el proyecto Supabase (no se han
 * inventado a mano) el 2026-08-05:
 *
 *   select calcular_horas_facturables(m, 'presencial') from unnest(array[...]) m;
 *   select calcular_horas_facturables(m, 'remota') from unnest(array[...]) m;
 *
 * Si cambias la regla de facturación en SQL, vuelve a ejecutar esas consultas
 * y actualiza los números de abajo — no al revés.
 */

describe("calcularHorasFacturables — presencial", () => {
  const casos: [number, number][] = [
    [15, 1.0], // por debajo del mínimo de 1h
    [60, 1.0], // justo el mínimo
    [61, 1.0], // dentro de la cortesía de 10 min
    [70, 1.0], // límite superior de la cortesía (60 + 10)
    [71, 1.5], // ya entra en el siguiente bloque de 30 min
    [90, 1.5],
    [100, 1.5], // límite superior del bloque de 1.5h (90 + 10 de cortesía)
    [101, 2.0], // siguiente bloque
    [110, 2.0],
    [130, 2.0], // límite superior del bloque de 2h
    [140, 2.5], // siguiente bloque
    [141, 2.5],
  ];

  it.each(casos)("%i minutos presencial -> %sh", (minutos, esperado) => {
    expect(calcularHorasFacturables(minutos, "presencial")).toBe(esperado);
  });
});

describe("calcularHorasFacturables — remota", () => {
  const casos: [number, number][] = [
    [1, 0.5], // sin mínimo, redondea al alza al primer bloque de 30 min
    [30, 0.5], // justo el límite del primer bloque
    [31, 1.0], // siguiente bloque
    [60, 1.0], // límite del segundo bloque
    [61, 1.5], // siguiente bloque
    [90, 1.5],
  ];

  it.each(casos)("%i minutos remota -> %sh", (minutos, esperado) => {
    expect(calcularHorasFacturables(minutos, "remota")).toBe(esperado);
  });
});

describe("calcularHorasFacturables — casos límite", () => {
  it("devuelve 0 si los minutos son 0 o negativos (horario inválido)", () => {
    expect(calcularHorasFacturables(0, "presencial")).toBe(0);
    expect(calcularHorasFacturables(-5, "presencial")).toBe(0);
    expect(calcularHorasFacturables(0, "remota")).toBe(0);
    expect(calcularHorasFacturables(-5, "remota")).toBe(0);
  });
});

describe("minutosEntre", () => {
  it("calcula minutos entre dos horas HH:MM", () => {
    expect(minutosEntre("09:00", "10:00")).toBe(60);
    expect(minutosEntre("09:00", "09:15")).toBe(15);
    expect(minutosEntre("09:30", "11:11")).toBe(101);
  });

  it("devuelve un valor <= 0 si la salida es anterior o igual a la entrada", () => {
    expect(minutosEntre("10:00", "09:00")).toBeLessThan(0);
    expect(minutosEntre("10:00", "10:00")).toBe(0);
  });
});
