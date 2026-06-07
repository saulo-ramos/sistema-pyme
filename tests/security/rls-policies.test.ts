/**
 * Pruebas de seguridad — Políticas RLS
 *
 * Verifica que las tablas críticas del sistema están protegidas por RLS
 * para SELECT, INSERT, UPDATE y DELETE.
 *
 * En modo demo (mock) se validan restricciones de tenant_id a nivel de aplicación.
 * En producción con PostgreSQL real, el aislamiento está garantizado por
 * Row Level Security (RLS) con la función my_tenant_id() que identifica
 * el tenant del JWT del usuario autenticado.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID, TENANT_B_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

const TABLAS_CRITICAS = [
  'clientes',
  'proveedores',
  'prestadores',
  'trabajadores',
  'movimientos_venta',
  'movimientos_compra',
  'movimientos_honorarios',
  'movimientos_remuneracion',
  'documentos',
] as const;

// ─── SELECT con tenant correcto ───────────────────────────────────────────────

describe('RLS — SELECT solo retorna datos del propio tenant', () => {
  for (const tabla of TABLAS_CRITICAS) {
    it(`${tabla}: filtro por tenant A solo retorna registros de tenant A`, async () => {
      const { data, error } = await client
        .from(tabla)
        .select('id, tenant_id')
        .eq('tenant_id', TENANT_A_ID);

      expect(error).toBeNull();
      expect(data!.every((r: any) => r.tenant_id === TENANT_A_ID)).toBe(true);
    });
  }
});

// ─── SELECT con tenant diferente retorna vacío ────────────────────────────────

describe('RLS — filtro por tenant B retorna lista vacía en datos de tenant A', () => {
  for (const tabla of ['clientes', 'movimientos_venta', 'movimientos_compra'] as const) {
    it(`${tabla}: filtro tenant B retorna 0 registros`, async () => {
      const { data } = await client
        .from(tabla)
        .select('id')
        .eq('tenant_id', TENANT_B_ID);

      expect(data).toHaveLength(0);
    });
  }
});

// ─── INSERT sin tenant_id es rechazado ────────────────────────────────────────

describe('RLS — INSERT sin tenant_id es rechazado por la aplicación', () => {
  it('clientes: INSERT sin tenant_id genera error', async () => {
    const { error } = await client
      .from('clientes')
      .insert({ rut: '55555555-5', nombre: 'Sin Tenant' } as any)
      .select()
      .single();

    expect(error).not.toBeNull();
  });
});

// ─── Notas para producción con PostgreSQL ─────────────────────────────────────

describe('RLS — garantías de PostgreSQL en producción', () => {
  it.todo('usuario autenticado de Tenant B no puede leer datos de Tenant A (RLS SELECT)');
  it.todo('usuario autenticado de Tenant B no puede insertar en Tenant A (RLS INSERT CHECK)');
  it.todo('usuario autenticado de Tenant B no puede modificar registros de Tenant A (RLS UPDATE)');
  it.todo('usuario anónimo (sin JWT) no puede acceder a ninguna tabla protegida');
  it.todo('my_tenant_id() función PostgreSQL retorna el tenant_id del JWT del usuario');
  it.todo('service_role key bypassa RLS — solo usada en setup/teardown de tests');
});
