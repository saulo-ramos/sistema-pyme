/**
 * Cliente Supabase mock para pruebas de integración sin backend real.
 *
 * - mockClient     → equivalente al cliente de usuario; respeta lógica de tenant.
 * - mockAdminClient → equivalente al service_role; acceso total para setup/teardown.
 * - resetMockDb()  → reinicia el estado en memoria entre suites de tests.
 *
 * En producción (con Supabase real), tests/fixtures/supabase.ts usaría
 * createClient() con variables de entorno de tests/.env.test.
 */
import { mockSupabase, mockDb } from '@/mocks/mockClient';
import { INITIAL_MOCK_DB } from '@/mocks/data';

export type MockClient = typeof mockSupabase;

/** Reinicia el estado de la base de datos mock al estado inicial. */
export function resetMockDb(): void {
  const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DB));
  for (const key of Object.keys(mockDb)) delete mockDb[key];
  for (const [key, val] of Object.entries(fresh)) mockDb[key] = val as any[];
}

/** Cliente de usuario — mismo mock client para pruebas de integración. */
export const supabaseAdmin = mockSupabase;

/**
 * Crea un cliente autenticado como un usuario.
 * En el mock, siempre retorna el mismo cliente compartido (single tenant demo).
 */
export async function createUserClient(
  _email: string,
  _password: string
): Promise<MockClient> {
  return mockSupabase;
}

/** Cierra la sesión — no-op en modo mock. */
export async function signOut(_client?: MockClient): Promise<void> {}
