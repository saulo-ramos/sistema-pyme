import { describe, it, expect, vi } from 'vitest';
import { validarFecha, calcularResultado } from '@/lib/movimentos';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {}
}));

describe('validarFecha', () => {
  it('retorna true para string no formato YYYY-MM-DD válido', () => {
    expect(validarFecha('2024-05-10')).toBe(true);
  });

  it('retorna false para formatos incorretos', () => {
    expect(validarFecha('05-10-2024')).toBe(false);
    expect(validarFecha('2024/05/10')).toBe(false);
    expect(validarFecha('20240510')).toBe(false);
  });

  it('retorna false para datas inexistentes no calendário', () => {
    expect(validarFecha('2024-02-30')).toBe(false);
    expect(validarFecha('2024-13-01')).toBe(false);
  });

  it('retorna false para string vazia ou undefined', () => {
    expect(validarFecha('')).toBe(false);
    expect(validarFecha(undefined as unknown as string)).toBe(false);
  });
});

describe('calcularResultado', () => {
  it('soma exento + neto + otro quando todos estão presentes', () => {
    expect(calcularResultado(100, 200, 50)).toBe(350);
  });

  it('faz parse de strings para números', () => {
    expect(calcularResultado('100', '200', '50')).toBe(350);
  });

  it('trata nulos e undefineds como zero no cálculo', () => {
    expect(calcularResultado(100, null, undefined)).toBe(100);
    expect(calcularResultado(null, 50, null)).toBe(50);
  });

  it('retorna null se todos os valores forem zero ou falsy (null, undefined, vazio)', () => {
    expect(calcularResultado(0, 0, 0)).toBe(null);
    expect(calcularResultado(null, null, null)).toBe(null);
    expect(calcularResultado('', '', '')).toBe(null);
  });
});
