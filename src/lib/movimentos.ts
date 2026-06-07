import { supabase } from '@/integrations/supabase/client';

/**
 * Valida que una fecha tenga formato YYYY-MM-DD y sea una fecha real.
 */
export function validarFecha(f: string): boolean {
  if (!f) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const d = new Date(f + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  return d.toISOString().startsWith(f);
}

/**
 * Calcula el campo `resultado` de un movimiento de venta/compra.
 * resultado = exento + neto + otro_impto  (NO incluye IVA)
 * Retorna null si todos los valores son 0 o nulos.
 */
export function calcularResultado(
  exento: string | number | null | undefined,
  neto:   string | number | null | undefined,
  otro:   string | number | null | undefined,
): number | null {
  const e = exento ? Number(exento) : null;
  const n = neto   ? Number(neto)   : null;
  const o = otro   ? Number(otro)   : null;
  return (e ?? 0) + (n ?? 0) + (o ?? 0) || null;
}

const ALLOWED_INSERT_TABLES = new Set([
  'movimientos_venta',
  'movimientos_compra',
  'movimientos_honorarios',
  'movimientos_remuneracion',
]);

/**
 * Inserta registros en una tabla de Supabase en lotes para evitar
 * timeouts con archivos grandes.
 * Retorna el conteo de registros insertados correctamente y fallidos.
 */
export async function insertBatch<T extends object>(
  table: string,
  rows: T[],
  batchSize = 50,
): Promise<{ success: number; failed: number }> {
  if (!ALLOWED_INSERT_TABLES.has(table)) {
    return { success: 0, failed: rows.length };
  }
  let success = 0, failed = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await (supabase as any)
      .from(table)
      .insert(batch);
    if (error) {
      if (import.meta.env.DEV) console.error(`insertBatch error (${table}):`, error);
      failed += batch.length;
    } else {
      success += batch.length;
    }
  }
  return { success, failed };
}
