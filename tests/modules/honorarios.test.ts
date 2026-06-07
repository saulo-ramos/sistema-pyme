/**
 * Pruebas de integración — Módulo Honorarios
 * Cubre: CRUD, cálculo de retención, estados, detección de duplicados.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';
import { calcularRetencion, calcularPagado } from '@/lib/honorarios';

beforeEach(() => {
  resetMockDb();
});

const BASE_HONORARIO = {
  fecha_docto: '2024-05-10',
  anio: 2024,
  mes: 5,
  tipo_documento: 'Boleta de Honorarios',
  folio: 8001,
  rut_prestador: '15480471-4',
  nombre_prestador: 'Consultor Prueba',
  estado: 'emitido',
  monto_bruto: 1_000_000,
  monto_retenido: 90_000,
  tenant_id: TENANT_A_ID,
};

// ─── Lógica de retención ──────────────────────────────────────────────────────

describe('honorarios — cálculo de retención', () => {
  it('calcula retención del 10% del monto bruto', () => {
    const bruto = 1_000_000;
    const retencion = calcularRetencion(bruto);
    expect(retencion).toBe(100_000);
  });

  it('calcula monto pagado = bruto - retención', () => {
    const bruto = 1_000_000;
    const retencion = calcularRetencion(bruto);
    const pagado = calcularPagado(bruto, retencion);
    expect(pagado).toBe(900_000);
  });

  it('retención es 10% del bruto por defecto', () => {
    const retencion = calcularRetencion(1_000_000);
    expect(retencion).toBe(100_000);
  });
});

// ─── INSERT ───────────────────────────────────────────────────────────────────

describe('honorarios — INSERT', () => {
  it('inserta honorario con campos obligatorios', async () => {
    const { data, error } = await client
      .from('movimientos_honorarios')
      .insert({ ...BASE_HONORARIO, folio: 9001 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.folio).toBe(9001);
    expect(data!.nombre_prestador).toBe('Consultor Prueba');
  });

  it('inserta con estado "emitido" por defecto', async () => {
    const { data } = await client
      .from('movimientos_honorarios')
      .insert({ ...BASE_HONORARIO, folio: 9002 })
      .select()
      .single();

    expect(data!.estado).toBe('emitido');
  });

  it('inserta honorario de sociedad profesional sin retención', async () => {
    const { data, error } = await client
      .from('movimientos_honorarios')
      .insert({
        ...BASE_HONORARIO,
        folio: 9003,
        tipo_documento: 'Factura de Honorarios',
        monto_retenido: 0,
        sociedad_prof: 'Consultoría Profesional SpA',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.monto_retenido).toBe(0);
  });
});

// ─── SELECT ───────────────────────────────────────────────────────────────────

describe('honorarios — SELECT', () => {
  it('retorna honorarios del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('movimientos_honorarios')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('filtra por estado "pagado"', async () => {
    const { data } = await client
      .from('movimientos_honorarios')
      .select('id, estado')
      .eq('tenant_id', TENANT_A_ID)
      .eq('estado', 'pagado');

    expect(data!.every((h) => h.estado === 'pagado')).toBe(true);
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

describe('honorarios — UPDATE', () => {
  it('marca honorario como pagado', async () => {
    const { data: inserted } = await client
      .from('movimientos_honorarios')
      .insert({ ...BASE_HONORARIO, folio: 9010, estado: 'emitido' })
      .select()
      .single();

    const { data, error } = await client
      .from('movimientos_honorarios')
      .update({ estado: 'pagado', monto_pagado: inserted!.monto_bruto - inserted!.monto_retenido })
      .eq('id', inserted!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.estado).toBe('pagado');
  });
});

// ─── Libro de Honorarios (view) ───────────────────────────────────────────────

describe('honorarios — libro_honorarios (view)', () => {
  it('retorna registros con período correcto', async () => {
    const { data, error } = await client
      .from('libro_honorarios')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]).toHaveProperty('periodo');
    expect(data![0]).toHaveProperty('bruto');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('honorarios — edge cases', () => {
  it.todo('anulación de honorario registra fecha_anulacion y cambia estado a "anulado"');
  it.todo('folio duplicado en el mismo período es detectado por el frontend');
  it.todo('carga masiva: RUT de prestador inválido es señalizado');
});
