export const CATEGORIAS_GASTO = [
  'Movilización',
  'Alimentación',
  'Hospedaje',
  'Materiales',
  'Servicios',
  'Combustible',
  'Peajes y estacionamiento',
  'Otros',
] as const;

export type CategoriaGasto = typeof CATEGORIAS_GASTO[number];

export const ESTADOS_RENDICION = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada'] as const;
export type EstadoRendicion = typeof ESTADOS_RENDICION[number];

export function calcularTotal(items: { monto: number }[]): number {
  return items.reduce((s, i) => s + (i.monto || 0), 0);
}

export function puedeEditar(
  rendicion: { estado: string; solicitante_id: string },
  userId: string,
): boolean {
  return rendicion.estado === 'Borrador' && rendicion.solicitante_id === userId;
}

export function puedeAprobar(userRole: string | null): boolean {
  return userRole === 'admin' || userRole === 'aprobador';
}

export function generarNumero(correlativo: number, anio: number): string {
  return `REND-${anio}-${String(correlativo).padStart(4, '0')}`;
}

export const BADGE_COLORS: Record<string, string> = {
  Borrador: 'bg-gray-100 text-gray-600 border border-gray-300',
  Enviada:  'bg-blue-100 text-blue-700 border border-blue-300',
  Aprobada: 'bg-green-100 text-green-700 border border-green-300',
  Rechazada:'bg-red-100 text-red-600 border border-red-300',
};
