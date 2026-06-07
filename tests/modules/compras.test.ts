/**
 * Pruebas de integración — Módulo Compras
 * Estructura idéntica a Ventas. Diferencias: rut_proveedor, tipo_compra, tabla movimientos_compra.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

const BASE_COMPRA = {
  fecha_docto: '2024-06-20',
  anio: 2024,
  mes: 6,
  rut_proveedor: '76354771-K',
  razon_social: 'Proveedor Prueba Ltda',
  folio: 5001,
  tenant_id: TENANT_A_ID,
};

describe('compras — INSERT', () => {
  it('inserta compra con campos obligatorios', async () => {
    const { data, error } = await client
      .from('movimientos_compra')
      .insert({ ...BASE_COMPRA, folio: 6001 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.folio).toBe(6001);
    expect(data!.rut_proveedor).toBe('76354771-K');
  });

  it('inserta compra con montos de IVA', async () => {
    const neto = 500_000;
    const iva = Math.round(neto * 0.19);

    const { data, error } = await client
      .from('movimientos_compra')
      .insert({
        ...BASE_COMPRA,
        folio: 6002,
        monto_neto: neto,
        monto_iva: iva,
        monto_total: neto + iva,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.monto_neto).toBe(500_000);
    expect(data!.monto_iva).toBe(95_000);
  });
});

describe('compras — SELECT', () => {
  it('retorna compras del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('movimientos_compra')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((c) => c.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it('filtra por año y mes', async () => {
    const { data } = await client
      .from('movimientos_compra')
      .select('id, anio, mes')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2026)
      .eq('mes', 3);

    expect(data!.every((c) => c.anio === 2026 && c.mes === 3)).toBe(true);
  });
});

describe('compras — UPDATE', () => {
  it('actualiza fecha de acuse de recibo', async () => {
    const { data: inserted } = await client
      .from('movimientos_compra')
      .insert({ ...BASE_COMPRA, folio: 6003 })
      .select()
      .single();

    const { data, error } = await client
      .from('movimientos_compra')
      .update({ fecha_acuse: '2024-06-22' })
      .eq('id', inserted!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.fecha_acuse).toBe('2024-06-22');
  });
});

describe('compras — DELETE', () => {
  it('elimina compra por id', async () => {
    const { data: inserted } = await client
      .from('movimientos_compra')
      .insert({ ...BASE_COMPRA, folio: 6004 })
      .select()
      .single();

    const { error } = await client
      .from('movimientos_compra')
      .delete()
      .eq('id', inserted!.id);

    expect(error).toBeNull();

    const { data: verificar } = await client
      .from('movimientos_compra')
      .select('id')
      .eq('id', inserted!.id);
    expect(verificar).toHaveLength(0);
  });
});

describe('compras — libro_compras (view)', () => {
  it('libro de compras retorna registros con período correcto', async () => {
    const { data, error } = await client
      .from('libro_compras')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]).toHaveProperty('periodo');
    expect(data![0]).toHaveProperty('total');
  });
});

describe('compras — edge cases', () => {
  it.todo('folio duplicado con mismo tipo_doc_id debe ser detectado');
  it.todo('carga masiva: RUT de proveedor inválido es señalizado');
  it.todo('carga masiva: máximo de 500 líneas por archivo');
});
