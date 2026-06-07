/**
 * Global setup para las suites de integración.
 *
 * En modo demo (sin backend) no requiere pre-autenticación, ya que el
 * cliente mock mantiene el estado en memoria.
 *
 * En producción (con Supabase real), este archivo pre-autenticaría a todos
 * los usuarios de prueba y guardaría los tokens en tests/.sessions.json
 * para evitar el rate limit de autenticación.
 */

export async function setup() {
  // No-op en modo demo: el mock client no requiere autenticación real.
  // En producción se implementaría la pre-autenticación con Supabase.
  return async () => {};
}
