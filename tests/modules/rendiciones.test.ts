/**
 * Pruebas de integración — Módulo Rendiciones
 * Cubre: CRUD de rendiciones, ítems, workflow de estados, view libro_rendiciones.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 * En producción: el trigger de total, workflow de aprobación y RLS por rol
 * se verifican contra PostgreSQL real.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';
import { DEMO_USER_ID } from '@/mocks/data';

beforeEach(() => {
  resetMockDb();
});

const BASE_RENDICION = {
  numero: 'RD-TEST-001',
  titulo: 'Gastos de prueba',
  descripcion: 'Rendición creada en test',
  estado: 'borrador',
  total: 0,
  solicitante_id: DEMO_USER_ID,
  solicitante_nombre: 'Usuario Demo',
  tenant_id: TENANT_A_ID,
  fecha_creacion: '2026-06-01',
};

// ─── INSERT ───────────────────────────────────────────────────────────────────

describe('rendiciones — INSERT', () => {
  it('inserta rendición con campos obligatorios', async () => {
    const { data, error } = await client
      .from('rendiciones')
      .insert({ ...BASE_RENDICION, numero: 'RD-TEST-001' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.titulo).toBe('Gastos de prueba');
    expect(data!.estado).toBe('borrador');
  });

  it('inserta rendición con ítems', async () => {
    const { data: rd } = await client
      .from('rendiciones')
      .insert({ ...BASE_RENDICION, numero: 'RD-TEST-002' })
      .select()
      .single();

    const { data: item, error } = await client
      .from('rendicion_items')
      .insert({
        rendicion_id: rd!.id,
        tenant_id: TENANT_A_ID,
        fecha_gasto: '2026-06-01',
        categoria: 'Transporte',
        comercio: 'Empresa de Transporte',
        descripcion: 'Traslado al cliente',
        monto: 25_000,
        orden: 1,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(item!.monto).toBe(25_000);
    expect(item!.rendicion_id).toBe(rd!.id);
  });
});

// ─── SELECT ───────────────────────────────────────────────────────────────────

describe('rendiciones — SELECT', () => {
  it('retorna rendiciones del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('rendiciones')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('filtra por estado "aprobado"', async () => {
    const { data } = await client
      .from('rendiciones')
      .select('id, estado')
      .eq('tenant_id', TENANT_A_ID)
      .eq('estado', 'aprobado');

    expect(data!.every((r) => r.estado === 'aprobado')).toBe(true);
  });
});

// ─── UPDATE (workflow de estados) ─────────────────────────────────────────────

describe('rendiciones — workflow de estados', () => {
  it('envía rendición para aprobación (borrador → pendiente)', async () => {
    const { data: rd } = await client
      .from('rendiciones')
      .insert({ ...BASE_RENDICION, numero: 'RD-TEST-003' })
      .select()
      .single();

    const { data, error } = await client
      .from('rendiciones')
      .update({ estado: 'pendiente', fecha_envio: '2026-06-02' })
      .eq('id', rd!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.estado).toBe('pendiente');
    expect(data!.fecha_envio).toBe('2026-06-02');
  });

  it('aprueba rendición (pendiente → aprobado)', async () => {
    const { data: rd } = await client
      .from('rendiciones')
      .insert({ ...BASE_RENDICION, numero: 'RD-TEST-004', estado: 'pendiente' })
      .select()
      .single();

    const { data, error } = await client
      .from('rendiciones')
      .update({
        estado: 'aprobado',
        aprobado_por: DEMO_USER_ID,
        aprobado_por_nombre: 'Aprobador Demo',
        fecha_aprobacion: '2026-06-03',
      })
      .eq('id', rd!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.estado).toBe('aprobado');
    expect(data!.aprobado_por).toBe(DEMO_USER_ID);
  });

  it('rechaza rendición con motivo', async () => {
    const { data: rd } = await client
      .from('rendiciones')
      .insert({ ...BASE_RENDICION, numero: 'RD-TEST-005', estado: 'pendiente' })
      .select()
      .single();

    const { data, error } = await client
      .from('rendiciones')
      .update({ estado: 'rechazado', motivo_rechazo: 'Documentación incompleta' })
      .eq('id', rd!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.estado).toBe('rechazado');
    expect(data!.motivo_rechazo).toBe('Documentación incompleta');
  });
});

// ─── Libro Rendiciones (view) ─────────────────────────────────────────────────

describe('rendiciones — libro_rendiciones (view)', () => {
  it('retorna rendiciones con cantidad de ítems', async () => {
    const { data, error } = await client
      .from('libro_rendiciones')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]).toHaveProperty('cantidad_items');
  });
});

describe('rendiciones — edge cases', () => {
  it.todo('trigger de total actualiza monto al agregar ítem (requiere PostgreSQL)');
  it.todo('admin puede aprobar/rechazar, viewer no puede (requiere RLS por rol)');
  it.todo('eliminación de rendición borra ítems en cascada');
});
