/**
 * Pruebas de integración — Módulos Proveedores y Prestadores
 *
 * Proveedores: estructura idéntica a Clientes.
 * Prestadores: sin productos_servicios/vencimiento, tiene sociedad_prof.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

// ─── Proveedores ──────────────────────────────────────────────────────────────

describe('proveedores — estructura idéntica a clientes', () => {
  it('inserta proveedor con campos obligatorios', async () => {
    const { data, error } = await client
      .from('proveedores')
      .insert({
        rut: '96874030-K',
        nombre: 'Proveedor Prueba Ltda',
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.rut).toBe('96874030-K');
    expect(data!.activo).toBe(true);
  });

  it('inserta proveedor con todos los campos opcionales', async () => {
    const { data, error } = await client
      .from('proveedores')
      .insert({
        rut: '78900898-1',
        nombre: 'Proveedor Completo SA',
        productos_servicios: 'Servicios en la nube',
        vencimiento: 30,
        correo: 'factura@proveedor.cl',
        fono: '+56225551234',
        activo: true,
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.vencimiento).toBe(30);
    expect(data!.correo).toBe('factura@proveedor.cl');
  });

  it('retorna lista de proveedores del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('proveedores')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((p) => p.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('desactiva proveedor (activo = false)', async () => {
    const { data: inserted } = await client
      .from('proveedores')
      .insert({ rut: '81812834-7', nombre: 'Para Desactivar', tenant_id: TENANT_A_ID })
      .select()
      .single();

    const { data, error } = await client
      .from('proveedores')
      .update({ activo: false })
      .eq('id', inserted!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.activo).toBe(false);
  });
});

// ─── Prestadores ──────────────────────────────────────────────────────────────

describe('prestadores — persona natural o sociedad profesional', () => {
  it('inserta prestador persona natural', async () => {
    const { data, error } = await client
      .from('prestadores')
      .insert({
        rut: '15480471-K',
        nombre: 'Consultor Persona Natural',
        sociedad_prof: false,
        correo: 'consultor@gmail.com',
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.sociedad_prof).toBe(false);
    expect(data!.activo).toBe(true);
  });

  it('inserta prestador sociedad profesional', async () => {
    const { data, error } = await client
      .from('prestadores')
      .insert({
        rut: '76300099-1',
        nombre: 'Sociedad Profesional Prueba SpA',
        sociedad_prof: true,
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.sociedad_prof).toBe(true);
  });

  it('retorna lista de prestadores del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('prestadores')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});

describe('proveedores/prestadores — edge cases', () => {
  it.todo('RUT duplicado en el mismo tenant genera error de constraint única');
  it.todo('carga masiva de proveedores: validación de RUT chileno');
});
