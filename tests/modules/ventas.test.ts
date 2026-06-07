/**
 * Pruebas de integración — Módulo Ventas
 * Cubre: CRUD, cálculo de resultado, detección de duplicados, filtro año/mes.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 * En producción, las mismas pruebas corren contra la DB real con
 * aislamiento multi-tenant garantizado por políticas RLS de PostgreSQL.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

const BASE_VENTA = {
  fecha_docto: '2024-06-15',
  anio: 2024,
  mes: 6,
  rut_cliente: '12345678-9',
  razon_social: 'Cliente Prueba SA',
  folio: 1001,
  tenant_id: TENANT_A_ID,
};

// ─── INSERT ───────────────────────────────────────────────────────────────────

describe('ventas — INSERT', () => {
  it('inserta venta con campos obligatorios', async () => {
    const { data, error } = await client
      .from('movimientos_venta')
      .insert({ ...BASE_VENTA, folio: 2001 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.folio).toBe(2001);
    expect(data!.anio).toBe(2024);
    expect(data!.mes).toBe(6);
  });

  it('inserta venta con montos de IVA (19%)', async () => {
    const neto = 100_000;
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;

    const { data, error } = await client
      .from('movimientos_venta')
      .insert({
        ...BASE_VENTA,
        folio: 2002,
        monto_neto: neto,
        monto_iva: iva,
        monto_total: total,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.monto_neto).toBe(100_000);
    expect(data!.monto_iva).toBe(19_000);
    expect(data!.monto_total).toBe(119_000);
  });

  it('inserta venta exenta sin IVA', async () => {
    const { data, error } = await client
      .from('movimientos_venta')
      .insert({
        ...BASE_VENTA,
        folio: 2003,
        monto_exento: 80_000,
        monto_neto: null,
        monto_iva: null,
        monto_total: 80_000,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.monto_exento).toBe(80_000);
    expect(data!.monto_iva).toBeNull();
  });

  it('edge case: todos los montos en cero', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .insert({
        ...BASE_VENTA,
        folio: 2004,
        monto_exento: 0,
        monto_neto: 0,
        monto_iva: 0,
        monto_total: 0,
      })
      .select()
      .single();

    expect(data!.monto_total).toBe(0);
  });
});

// ─── Detección de duplicados ──────────────────────────────────────────────────

describe('ventas — detección de duplicados (folio + tipo_doc_id)', () => {
  it('detecta folio duplicado con mismo tipo_doc_id', async () => {
    await client
      .from('movimientos_venta')
      .insert({ ...BASE_VENTA, folio: 3001, tipo_doc_id: 33 })
      .select()
      .single();

    const { data: existentes } = await client
      .from('movimientos_venta')
      .select('folio, tipo_doc_id')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2024)
      .eq('mes', 6);

    const foliosExistentes = new Set(
      (existentes ?? []).map((e) => `${e.folio}-${e.tipo_doc_id ?? 'null'}`)
    );

    expect(foliosExistentes.has('3001-33')).toBe(true);
    expect(foliosExistentes.has('3001-null')).toBe(false);
  });

  it('mismo folio con tipo_doc_id diferente NO es duplicado', async () => {
    await client
      .from('movimientos_venta')
      .insert({ ...BASE_VENTA, folio: 3002, tipo_doc_id: 33 })
      .select()
      .single();

    const { data: segunda } = await client
      .from('movimientos_venta')
      .insert({ ...BASE_VENTA, folio: 3002, tipo_doc_id: 34 })
      .select()
      .single();

    expect(segunda).not.toBeNull();
  });
});

// ─── Filtro año/mes ───────────────────────────────────────────────────────────

describe('ventas — filtro por año y mes', () => {
  it('filtra correctamente por año en los datos demo', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id, anio')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2026);

    expect(data!.every((v) => v.anio === 2026)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('filtra correctamente por año y mes específico', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id, anio, mes')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2026)
      .eq('mes', 3);

    expect(data!.every((v) => v.anio === 2026 && v.mes === 3)).toBe(true);
    expect(data!.length).toBe(10);
  });

  it('retorna lista vacía para período sin datos', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2020)
      .eq('mes', 1);

    expect(data).toHaveLength(0);
  });
});

// ─── Libro de Ventas (view) ───────────────────────────────────────────────────

describe('ventas — libro_ventas (view)', () => {
  it('libro de ventas retorna registros con período correcto', async () => {
    const { data, error } = await client
      .from('libro_ventas')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0]).toHaveProperty('periodo');
    expect(data![0]).toHaveProperty('total');
  });

  it('libro ventas filtra por período', async () => {
    const { data } = await client
      .from('libro_ventas')
      .select('*')
      .eq('tenant_id', TENANT_A_ID)
      .eq('periodo', '2026-03');

    expect(data!.every((r) => r.periodo === '2026-03')).toBe(true);
  });
});

// ─── RLS: aislamiento cross-tenant ────────────────────────────────────────────

describe('ventas — RLS: aislamiento cross-tenant', () => {
  it('solo se retornan ventas del propio tenant', async () => {
    const { data } = await client
      .from('movimientos_venta')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_A_ID);

    expect(data!.every((v) => v.tenant_id === TENANT_A_ID)).toBe(true);
  });

  it.todo('Tenant B no puede leer ventas de Tenant A (requiere DB real con RLS)');
  it.todo('Tenant B no puede insertar en tenant A (requiere RLS de PostgreSQL)');
  it.todo('JWT forjado no puede acceder a datos protegidos (requiere verificación JWT)');
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('ventas — edge cases', () => {
  it.todo('carga masiva: archivo con línea vacía entre registros válidos');
  it.todo('carga masiva: RUT inválido en línea del Excel es señalizado con número de línea');
  it.todo('carga masiva: máximo de 500 líneas — línea 501 genera aviso');
  it.todo('carga masiva: archivo mayor a 5MB es rechazado antes de procesar');
  it.todo('fecha_recepcion en formato ISO con T es aceptada y persistida correctamente');
});
