/**
 * Pruebas de seguridad — SQL Injection
 *
 * Verifica que los campos de búsqueda e inserción son tratados con seguridad.
 * El SDK @supabase/supabase-js usa queries parametrizadas internamente,
 * pero probamos los campos que usan LIKE/ILIKE explícitamente
 * y los que pasan por escapeLikePattern() en src/lib/sanitize.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';
import { escapeLikePattern } from '@/lib/sanitize';

beforeEach(() => {
  resetMockDb();
});

const PAYLOADS_SQL = [
  "'; DROP TABLE clientes; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM user_tenants --",
  "Robert'); DROP TABLE students; --",
  "%'; SELECT * FROM tenants; --",
  "1; DELETE FROM movimientos_venta WHERE tenant_id IS NOT NULL; --",
];

const PAYLOADS_LIKE = [
  '%',
  '_',
  '%_%',
  '\\%',
  '%test%',
  '____',
];

// ─── escapeLikePattern ────────────────────────────────────────────────────────

describe('escapeLikePattern — sanitización de patrones LIKE', () => {
  it('escapa % a \\%', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
  });

  it('escapa _ a \\_', () => {
    expect(escapeLikePattern('_')).toBe('\\_');
  });

  it('escapa \\ a \\\\', () => {
    expect(escapeLikePattern('\\')).toBe('\\\\');
  });

  it('no altera texto normal', () => {
    expect(escapeLikePattern('empresa prueba')).toBe('empresa prueba');
  });

  it('escapa combinación de wildcards', () => {
    expect(escapeLikePattern('%test_')).toBe('\\%test\\_');
  });

  for (const payload of PAYLOADS_LIKE) {
    it(`escapa payload LIKE: "${payload}"`, () => {
      const escaped = escapeLikePattern(payload);
      expect(escaped).not.toMatch(/(?<!\\)[%_]/);
    });
  }
});

// ─── INSERT con payloads maliciosos ───────────────────────────────────────────

describe('SQL injection — INSERT de campos de texto', () => {
  for (const payload of PAYLOADS_SQL) {
    it(`inserta payload en nombre sin ejecutar SQL: "${payload.slice(0, 40)}"`, async () => {
      const { data, error } = await client
        .from('clientes')
        .insert({
          rut: '12345678-9',
          nombre: payload,
          tenant_id: TENANT_A_ID,
        })
        .select('id, nombre')
        .single();

      if (data) {
        // El valor debe almacenarse literalmente, sin ser interpretado como SQL
        expect(data.nombre).toBe(payload);
        expect(error).toBeNull();
      } else {
        // Puede fallar por constraint de unicidad — no por SQL injection
        expect(error?.message).not.toContain('syntax error');
        expect(error?.message).not.toContain('DROP TABLE');
      }
    });
  }
});

// ─── Búsqueda con ILIKE ───────────────────────────────────────────────────────

describe('SQL injection — búsqueda ILIKE en clientes', () => {
  it('payload % en búsqueda ILIKE retorna solo resultados del tenant', async () => {
    const termo = escapeLikePattern('%');
    const { data } = await client
      .from('clientes')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID)
      .ilike('nombre', `%${termo}%`);

    // Todos los resultados deben ser del Tenant A
    expect(data?.every((c) => c.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('búsqueda con término normal funciona correctamente', async () => {
    const { data } = await client
      .from('clientes')
      .select('id, nombre')
      .eq('tenant_id', TENANT_A_ID)
      .ilike('nombre', '%SpA%');

    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── Notas para producción ───────────────────────────────────────────────────

describe('SQL injection — notas para producción', () => {
  it.todo('SDK Supabase usa queries parametrizadas — SQL injection es estructuralmente imposible');
  it.todo('RLS garantiza que payloads no pueden acceder a datos de otros tenants');
  it.todo('escapeLikePattern previene LIKE injection en búsquedas de texto libre');
});
