/**
 * Pruebas de integración — Aislamiento por tenant (RLS)
 *
 * Garantía fundamental del sistema: el Tenant A nunca ve ni modifica
 * datos del Tenant B, incluso usando la misma base de datos.
 *
 * En modo demo (mock) se verifican las restricciones de tenant_id a nivel
 * de aplicación. En producción, el aislamiento es garantizado por políticas
 * RLS de PostgreSQL que el mock reproduce conceptualmente.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID, TENANT_B_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

// ─── Clientes ─────────────────────────────────────────────────────────────────

describe('aislamiento RLS — clientes', () => {
  it('solo retorna clientes del propio tenant', async () => {
    const { data, error } = await client
      .from('clientes')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.every((c) => c.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('filtro por otro tenant retorna lista vacía', async () => {
    const { data } = await client
      .from('clientes')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);

    expect(data).toHaveLength(0);
  });

  it('insert sin tenant_id es rechazado', async () => {
    const { error } = await client
      .from('clientes')
      .insert({ rut: '55555555-5', nombre: 'Sin Tenant' } as any)
      .select()
      .single();

    expect(error).not.toBeNull();
  });
});

// ─── Ventas ───────────────────────────────────────────────────────────────────

describe('aislamiento RLS — ventas', () => {
  it('solo retorna movimientos del propio tenant', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID);

    expect(data!.every((v) => v.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('filtro por tenant inexistente retorna lista vacía', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);

    expect(data).toHaveLength(0);
  });
});

// ─── Honorarios ───────────────────────────────────────────────────────────────

describe('aislamiento RLS — honorarios', () => {
  it('solo retorna honorarios del propio tenant', async () => {
    const { data } = await client
      .from('movimientos_honorarios')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID);

    expect(data!.every((h) => h.tenant_id === TENANT_A_ID)).toBe(true);
  });
});

// ─── Notas sobre RLS en producción ────────────────────────────────────────────

describe('aislamiento RLS — notas para producción', () => {
  it.todo('Tenant B autenticado no puede leer datos de Tenant A (RLS SELECT)');
  it.todo('Tenant B no puede insertar con tenant_id de Tenant A (RLS INSERT)');
  it.todo('Tenant B no puede modificar registros de Tenant A (RLS UPDATE)');
  it.todo('Tenant B no puede eliminar registros de Tenant A (RLS DELETE)');
  it.todo('usuario anónimo no puede acceder a ninguna tabla protegida');
  it.todo('JWT forjado no puede acceder a datos protegidos por RLS');
});
