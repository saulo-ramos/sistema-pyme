/**
 * Normaliza un RUT chileno al formato estándar: 12345678-9
 * Acepta cualquier variante: 12.345.678-9 / 123456789 / 12345678k / etc.
 */
export function normalizeRut(raw: string): string {
  if (!raw) return '';
  // Eliminar puntos, espacios; convertir a mayúsculas
  const clean = raw.replace(/[.\s]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  // Quitar guiones para trabajar con el string limpio
  const sinGuion = clean.replace(/-/g, '');
  const body = sinGuion.slice(0, -1);
  const dv   = sinGuion.slice(-1);
  if (!body) return clean;
  return `${body}-${dv}`;
}

/**
 * Normaliza un teléfono chileno al formato E.164: +56912345678
 * Acepta: +56 9 1234 5678 / 09 1234 5678 / 912345678 / 56912345678 / etc.
 */
export function normalizeFono(raw: string): string {
  if (!raw) return '';
  // Conservar solo dígitos
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Ya tiene código de país 56 y longitud correcta (mínimo 10 dígitos: 56 + 8 dígitos de fijo)
  if (digits.startsWith('56') && digits.length >= 10) {
    return '+' + digits;
  }
  // Formato legacy 0XXXXXXXXX (ej: 0912345678)
  if (digits.startsWith('0') && digits.length >= 9) {
    return '+56' + digits.slice(1);
  }
  // Celular: 9XXXXXXXX (9 dígitos)
  if (digits.startsWith('9') && digits.length === 9) {
    return '+56' + digits;
  }
  // Teléfono fijo 8 dígitos (ej: 21234567)
  if (digits.length === 8) {
    return '+56' + digits;
  }
  // Fallback: agregar +56
  return '+56' + digits;
}

/**
 * Formatea un RUT para mostrar en pantalla: 12.345.678-9
 */
export function displayRut(rut: string): string {
  const norm = normalizeRut(rut);
  if (!norm.includes('-')) return norm;
  const [body, dv] = norm.split('-');
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

/**
 * Formatea una fecha ISO 8601 (YYYY-MM-DD) para mostrar en pantalla: DD/MM/YYYY
 */
export function displayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Formatea un teléfono para mostrar en pantalla: +56 9 1234 5678
 */
export function displayFono(fono: string | null): string {
  if (!fono) return '—';
  const norm = normalizeFono(fono);
  // +56 9 XXXX XXXX
  if (norm.startsWith('+569') && norm.length === 12) {
    return `+56 9 ${norm.slice(4, 8)}-${norm.slice(8)}`;
  }
  // +56 2 XXXX XXXX (fijo)
  if (norm.startsWith('+562') && norm.length === 11) {
    return `+56 2 ${norm.slice(4, 8)}-${norm.slice(8)}`;
  }
  return norm;
}

export function formatCLP(n: number | null | undefined): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-CL')}`;
}
