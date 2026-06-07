/**
 * lib/remuneraciones.ts
 * Cálculos puros para el módulo de Remuneraciones.
 * Sin dependencias React ni Supabase.
 */

// ─── Cálculos financieros ────────────────────────────────────────────────────

/** Total imponible = sueldo_base + gratificacion + horas_extras + bonos */
export function calcularTotalImponible(
  sueldo_base = 0,
  gratificacion = 0,
  horas_extras = 0,
  bono_1 = 0,
  bono_2 = 0,
  bono_3 = 0,
): number {
  return sueldo_base + gratificacion + horas_extras + bono_1 + bono_2 + bono_3;
}

/** Total haberes = total_imponible + no imponibles */
export function calcularTotalHaberes(
  total_imponible = 0,
  asig_familiar = 0,
  movilizacion = 0,
  colacion = 0,
  viatico = 0,
): number {
  return total_imponible + asig_familiar + movilizacion + colacion + viatico;
}

/** Total descuentos = AFP + salud + seguro + impuesto + otros */
export function calcularTotalDescuentos(
  afp = 0,
  salud = 0,
  seguro = 0,
  impuesto = 0,
  otros_descuentos = 0,
): number {
  return afp + salud + seguro + impuesto + otros_descuentos;
}

/** Líquido a pagar = total_haberes − total_descuentos */
export function calcularLiquido(
  total_haberes = 0,
  total_descuentos = 0,
): number {
  return total_haberes - total_descuentos;
}

/** Costo total empresa = total_haberes + aportes patronales */
export function calcularCostoTotal(
  total_haberes = 0,
  sis = 0,
  aporte = 0,
  vida = 0,
  isl = 0,
  mipe = 0,
  corfo = 0,
  otro = 0,
): number {
  return total_haberes + sis + aporte + vida + isl + mipe + corfo + otro;
}

// ─── Constantes de dominio ───────────────────────────────────────────────────

export const TIPOS_CONTRATO = ['Indefinido', 'Plazo Fijo', 'Honorarios'] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const AFPS = [
  'Capital',
  'Cuprum',
  'Habitat',
  'Modelo',
  'PlanVital',
  'ProVida',
  'Uno AFP',
] as const;
export type Afp = (typeof AFPS)[number];

export const OPCIONES_SALUD = ['Fonasa', 'Isapre'] as const;
export type OpcionSalud = (typeof OPCIONES_SALUD)[number];
