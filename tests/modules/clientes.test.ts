/**
 * Pruebas de integración — Módulo Clientes
 * Cubre: CRUD, validación de RUT, normalización de campos, carga masiva.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 * En producción los mismos tests corren contra la base de datos real
 * (ver tests/fixtures/supabase.ts para la implementación de producción).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';
import { normalizeRut } from '@/lib/formatters';

const cleanup: string[] = [];

beforeEach(() => {
  resetMockDb();
  cleanup.length = 0;
});

// ─── INSERT ───────────────────────────────────────────────────────────────────

describe('clientes — INSERT', () => {
  it('inserta cliente con campos obligatorios y retorna registro', async () => {
    const { data, error } = await client
      .from('clientes')
      .insert({ rut: '12345678-5', nombre: 'Empresa Prueba', tenant_id: TENANT_A_ID })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.rut).toBe('12345678-5');
    expect(data!.nombre).toBe('Empresa Prueba');
    expect(data!.activo).toBe(true);
    if (data) cleanup.push(data.id);
  });

  it('normaliza RUT con puntos para formato con guión', async () => {
    const rut = normalizeRut('56.789.012-0');
    expect(rut).toBe('56789012-0');

    const { data, error } = await client
      .from('clientes')
      .insert({ rut, nombre: 'Prueba Normalización', tenant_id: TENANT_A_ID })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.rut).toBe('56789012-0');
    if (data) cleanup.push(data.id);
  });

  it('inserta cliente con todos los campos opcionales', async () => {
    const { data, error } = await client
      .from('clientes')
      .insert({
        rut: '76354771-K',
        nombre: 'Cliente Completo SA',
        productos_servicios: 'Consultoría en TI',
        vencimiento: 30,
        correo: 'contacto@empresa.cl',
        fono: '+56912345678',
        activo: true,
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.vencimiento).toBe(30);
    expect(data!.correo).toBe('contacto@empresa.cl');
    if (data) cleanup.push(data.id);
  });

  it('rechaza INSERT sin tenant_id', async () => {
    const { error } = await client
      .from('clientes')
      .insert({ rut: '12345678-5', nombre: 'Sin Tenant' } as any)
      .select()
      .single();

    expect(error).not.toBeNull();
  });

  it('acepta campos opcionales enviados como null', async () => {
    const { data, error } = await client
      .from('clientes')
      .insert({
        rut: '96874030-K',
        nombre: 'Mínimo Campos',
        correo: null,
        fono: null,
        productos_servicios: null,
        vencimiento: null,
        tenant_id: TENANT_A_ID,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.correo).toBeNull();
    if (data) cleanup.push(data.id);
  });
});

// ─── SELECT ───────────────────────────────────────────────────────────────────

describe('clientes — SELECT', () => {
  it('busca solo clientes del propio tenant', async () => {
    const { data, error } = await client
      .from('clientes')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.every((c) => c.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('ordena por nombre ascendente', async () => {
    const { data } = await client
      .from('clientes')
      .select('nombre')
      .eq('tenant_id', TENANT_A_ID)
      .order('nombre', { ascending: true });

    const nombres = data?.map((c) => c.nombre) ?? [];
    const nombresOrdenados = [...nombres].sort((a, b) => a.localeCompare(b));
    expect(nombres).toEqual(nombresOrdenados);
  });

  it('filtra clientes activos correctamente', async () => {
    const { data } = await client
      .from('clientes')
      .select('id, activo')
      .eq('tenant_id', TENANT_A_ID)
      .eq('activo', true);

    expect(data!.every((c) => c.activo === true)).toBe(true);
  });

  it('retorna lista no vacía con los datos demo', async () => {
    const { data, error } = await client
      .from('clientes')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

describe('clientes — UPDATE', () => {
  it('desactiva cliente (activo = false)', async () => {
    const { data: inserted } = await client
      .from('clientes')
      .insert({ rut: '78900898-1', nombre: 'Para Desactivar', tenant_id: TENANT_A_ID })
      .select()
      .single();
    if (inserted) cleanup.push(inserted.id);

    const { data, error } = await client
      .from('clientes')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', inserted!.id)
      .eq('tenant_id', TENANT_A_ID)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.activo).toBe(false);
  });

  it('actualiza correo de un cliente existente', async () => {
    const { data: inserted } = await client
      .from('clientes')
      .insert({ rut: '76112233-1', nombre: 'Para Actualizar', tenant_id: TENANT_A_ID })
      .select()
      .single();
    if (inserted) cleanup.push(inserted.id);

    const { data, error } = await client
      .from('clientes')
      .update({ correo: 'nuevo@empresa.cl' })
      .eq('id', inserted!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.correo).toBe('nuevo@empresa.cl');
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('clientes — DELETE', () => {
  it('elimina cliente por id dentro del tenant', async () => {
    const { data: inserted } = await client
      .from('clientes')
      .insert({ rut: '81812834-7', nombre: 'Para Eliminar', tenant_id: TENANT_A_ID })
      .select()
      .single();

    const { error } = await client
      .from('clientes')
      .delete()
      .eq('id', inserted!.id)
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();

    const { data: verificar } = await client
      .from('clientes')
      .select('id')
      .eq('id', inserted!.id);
    expect(verificar).toHaveLength(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('clientes — edge cases', () => {
  it.todo('RUT duplicado en el mismo tenant genera error de constraint única');
  it.todo('vencimiento fuera del enum [0,15,30,60,90,120] es rechazado por el frontend');
  it.todo('carga masiva: RUT inválido en batch es separado de los válidos');
  it.todo('carga masiva: RUT duplicado en el archivo es señalizado');
  it.todo('carga masiva: máximo de 500 líneas por archivo');
});
