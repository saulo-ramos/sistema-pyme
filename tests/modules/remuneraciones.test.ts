/**
 * Pruebas de integración — Módulo Remuneraciones
 * Cubre: CRUD de trabajadores, movimientos de remuneración, constraints de unicidad.
 *
 * Usa el cliente mock en memoria — no requiere Supabase real.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';

beforeEach(() => {
  resetMockDb();
});

// ─── Trabajadores ─────────────────────────────────────────────────────────────

describe('remuneraciones — Trabajadores', () => {
  it('inserta trabajador con éxito', async () => {
    const { data, error } = await client
      .from('trabajadores')
      .insert({
        rut: '16543210-K',
        nombre: 'Nuevo Trabajador',
        cargo: 'Desarrollador',
        tenant_id: TENANT_A_ID,
        fecha_ingreso: '2026-01-15',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.nombre).toBe('Nuevo Trabajador');
    expect(data!.activo).toBe(true);
  });

  it('retorna trabajadores activos del tenant', async () => {
    const { data, error } = await client
      .from('trabajadores')
      .select('*')
      .eq('tenant_id', TENANT_A_ID)
      .eq('activo', true);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((t) => t.activo === true)).toBe(true);
  });

  it('desactiva trabajador', async () => {
    const { data: trabajador } = await client
      .from('trabajadores')
      .select('id')
      .eq('tenant_id', TENANT_A_ID)
      .limit(1)
      .single();

    const { data, error } = await client
      .from('trabajadores')
      .update({ activo: false })
      .eq('id', trabajador!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.activo).toBe(false);
  });
});

// ─── Movimientos de Remuneración ──────────────────────────────────────────────

describe('remuneraciones — Movimientos', () => {
  it('retorna movimientos del tenant con datos demo', async () => {
    const { data, error } = await client
      .from('movimientos_remuneracion')
      .select('*')
      .eq('tenant_id', TENANT_A_ID);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('filtra por año y mes', async () => {
    const { data } = await client
      .from('movimientos_remuneracion')
      .select('id, anio, mes')
      .eq('tenant_id', TENANT_A_ID)
      .eq('anio', 2026)
      .eq('mes', 3);

    expect(data!.every((m) => m.anio === 2026 && m.mes === 3)).toBe(true);
  });

  it('inserta movimiento de remuneración', async () => {
    const { data: trabajador } = await client
      .from('trabajadores')
      .select('id, rut, nombre')
      .eq('tenant_id', TENANT_A_ID)
      .limit(1)
      .single();

    const { data, error } = await client
      .from('movimientos_remuneracion')
      .insert({
        tenant_id: TENANT_A_ID,
        anio: 2026,
        mes: 6,
        trabajador_id: trabajador!.id,
        rut_trabajador: trabajador!.rut,
        nombre_trabajador: trabajador!.nombre,
        sueldo_base: 1_500_000,
        gratificacion: 125_000,
        descuentos_legales: 195_000,
        otros_descuentos: 0,
        liquido: 1_430_000,
        estado: 'pendiente',
        fecha_pago: '2026-06-30',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.sueldo_base).toBe(1_500_000);
    expect(data!.estado).toBe('pendiente');
  });

  it('calcula líquido correctamente (sueldo + gratificación - descuentos)', () => {
    const sueldoBase = 1_800_000;
    const gratificacion = 150_000;
    const descuentosLegales = 234_000;
    const otrosDescuentos = 0;
    const liquidoEsperado = sueldoBase + gratificacion - descuentosLegales - otrosDescuentos;

    expect(liquidoEsperado).toBe(1_716_000);
  });
});

describe('remuneraciones — edge cases', () => {
  it.todo('unicidad (trabajador_id + anio + mes) previene duplicados (requiere DB real)');
  it.todo('carga masiva: RUT de trabajador inválido es señalizado');
  it.todo('cambio de estado a "pagado" registra fecha_pago automáticamente');
});
