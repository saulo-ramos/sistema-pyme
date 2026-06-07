/**
 * Setup global para suites de integración.
 *
 * En modo demo (portfólio sin backend) el mock client no requiere
 * variables de entorno. En producción con Supabase real, las variables
 * vendrían de tests/.env.test (ver tests/.env.test.example).
 */
import { beforeEach } from 'vitest';
import { resetMockDb } from './fixtures/supabase';

// Reinicia el estado del mock DB antes de cada suite para garantizar
// aislamiento entre tests — equivalente a un rollback de transacción.
beforeEach(() => {
  resetMockDb();
});
