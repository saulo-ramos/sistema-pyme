/**
 * Testes unitários — src/lib/honorarios.ts
 */
import { describe, it, expect } from 'vitest';
import {
  calcularRetencion,
  calcularPagado,
  TIPOS_HONORARIO,
  TIPOS_HONORARIO_LABELS,
  ESTADOS_HONORARIO,
} from '@/lib/honorarios';
import { formatCLP } from '@/lib/formatters';

// ─── calcularRetencion ────────────────────────────────────────────────────────

describe('calcularRetencion', () => {
  it('calcula 10% do bruto', () => {
    expect(calcularRetencion(100_000)).toBe(10_000);
  });

  it('arredonda o resultado (Math.round)', () => {
    // 10% de 100_001 = 10_000.1 → arredondado para 10_000
    expect(calcularRetencion(100_001)).toBe(10_000);
    // 10% de 100_005 = 10_000.5 → arredondado para 10_001
    expect(calcularRetencion(100_005)).toBe(10_001);
  });

  it('retorna 0 para bruto = 0', () => {
    expect(calcularRetencion(0)).toBe(0);
  });

  it('calcula corretamente para valor pequeno', () => {
    expect(calcularRetencion(1_000)).toBe(100);
  });

  it('calcula corretamente para valor grande', () => {
    expect(calcularRetencion(5_000_000)).toBe(500_000);
  });
});

// ─── calcularPagado ───────────────────────────────────────────────────────────

describe('calcularPagado', () => {
  it('retorna bruto menos retenido', () => {
    expect(calcularPagado(100_000, 10_000)).toBe(90_000);
  });

  it('retorna 0 quando retenido igual ao bruto', () => {
    expect(calcularPagado(50_000, 50_000)).toBe(0);
  });

  it('funciona com retenido = 0', () => {
    expect(calcularPagado(75_000, 0)).toBe(75_000);
  });

  it('composição: pagado = bruto - calcularRetencion(bruto)', () => {
    const bruto = 200_000;
    const retenido = calcularRetencion(bruto);
    expect(calcularPagado(bruto, retenido)).toBe(180_000);
  });
});

// ─── formatCLP ────────────────────────────────────────────────────────────────

describe('formatCLP', () => {
  it('formata número com prefixo $', () => {
    const result = formatCLP(100_000);
    expect(result).toMatch(/^\$/);
  });

  it('usa locale es-CL (separador de milhar com ponto)', () => {
    const result = formatCLP(1_000_000);
    expect(result).toBe('$1.000.000');
  });

  it('formata zero corretamente', () => {
    expect(formatCLP(0)).toBe('$0');
  });
});

// ─── Constantes ───────────────────────────────────────────────────────────────

describe('constantes de tipos e estados', () => {
  it('TIPOS_HONORARIO contém BH e BT', () => {
    expect(TIPOS_HONORARIO).toContain('BH');
    expect(TIPOS_HONORARIO).toContain('BT');
    expect(TIPOS_HONORARIO).toHaveLength(2);
  });

  it('TIPOS_HONORARIO_LABELS tem label para cada tipo', () => {
    for (const tipo of TIPOS_HONORARIO) {
      expect(TIPOS_HONORARIO_LABELS[tipo]).toBeTruthy();
    }
  });

  it('ESTADOS_HONORARIO contém Vigente e Anulado', () => {
    expect(ESTADOS_HONORARIO).toContain('Vigente');
    expect(ESTADOS_HONORARIO).toContain('Anulado');
    expect(ESTADOS_HONORARIO).toHaveLength(2);
  });
});
