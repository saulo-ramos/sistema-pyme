export const TIPOS_HONORARIO = ['BH', 'BT'] as const;
export type TipoHonorario = typeof TIPOS_HONORARIO[number];

export const TIPOS_HONORARIO_LABELS: Record<TipoHonorario, string> = {
  BH: 'Boleta de Honorarios',
  BT: 'Boleta de Honorarios por Terceros',
};

export const ESTADOS_HONORARIO = ['Vigente', 'Anulado'] as const;
export type EstadoHonorario = typeof ESTADOS_HONORARIO[number];

export function calcularRetencion(bruto: number): number {
  return Math.round(bruto * 0.10);
}

export function calcularPagado(bruto: number, retenido: number): number {
  return bruto - retenido;
}

