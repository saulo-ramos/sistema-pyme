/**
 * Centraliza toda la lógica de validación y formateo de RUT chileno.
 * Usar esta utilidad en todos los módulos del sistema.
 */

/**
 * Formatea un RUT en tiempo real mientras el usuario escribe.
 * - Elimina todo excepto dígitos y K/k
 * - Convierte K a mayúscula
 * - Limita a 9 caracteres (8 dígitos + DV)
 * - Agrega guión antes del último carácter cuando hay 5+ chars
 *
 * Ejemplos:
 *   "123456789"    → "12345678-9"
 *   "12345678k"   → "12345678-K"
 *   "12.345.678-9" → "12345678-9"
 *   "1234"         → "1234"
 *   "12345"        → "1234-5"
 */
export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 4) return clean;
  const limited = clean.slice(0, 9);
  return `${limited.slice(0, -1)}-${limited.slice(-1)}`;
}

/**
 * Valida un RUT chileno usando el algoritmo Módulo 11.
 * Acepta cualquier formato: con/sin puntos, con/sin guión, K mayúscula o minúscula.
 * Retorna true solo si el RUT es matemáticamente válido.
 */
export function validateRut(rut: string): boolean {
  const clean = rut.trim().replace(/[.\s-]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body) || !/^[0-9K]$/.test(dv)) return false;
  let suma = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const calc = 11 - (suma % 11);
  const expected = calc === 11 ? '0' : calc === 10 ? 'K' : String(calc);
  return dv === expected;
}

/**
 * Retorna un mensaje de error específico, o null si el RUT es válido.
 *
 *   RUT vacío                     → "El RUT es obligatorio"
 *   Menos de 3 caracteres limpios → "RUT demasiado corto"
 *   Caracteres no permitidos      → "Formato inválido. Use: 12345678-9"
 *   Dígito verificador incorrecto → "RUT inválido. Verifique el dígito verificador"
 */
export function getRutError(rut: string): string | null {
  if (!rut || !rut.trim()) return 'El RUT es obligatorio';
  const clean = rut.trim().replace(/[.\s-]/g, '');
  if (clean.length < 3) return 'RUT demasiado corto';
  if (!/^[0-9]+[0-9kK]$/.test(clean)) return 'Formato inválido. Use: 12345678-9';
  if (!validateRut(rut)) return 'RUT inválido. Verifique el dígito verificador';
  return null;
}

/**
 * Retorna el RUT limpio: sin puntos, sin guión, en mayúscula.
 * Útil para comparaciones en memoria. Para guardar en BD usa normalizeRut (con guión).
 *
 * Ejemplo: "12.345.678-9" → "123456789"
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[.\s-]/g, '').toUpperCase();
}
