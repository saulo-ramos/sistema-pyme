import { describe, it, expect } from 'vitest';
import {
  calcularTotalImponible,
  calcularTotalHaberes,
  calcularTotalDescuentos,
  calcularLiquido,
  calcularCostoTotal,
  TIPOS_CONTRATO,
  AFPS,
  OPCIONES_SALUD
} from '@/lib/remuneraciones';
import { formatCLP } from '@/lib/formatters';

describe('Funciones cálculo Remuneraciones', () => {

  it('calcularTotalImponible - suma todos los valores imponibles', () => {
    // sueldo_base, gratificacion, horas_extras, bono_1, bono_2, bono_3
    expect(calcularTotalImponible(500000, 100000, null, 50000, null, 0)).toBe(650000);
    expect(calcularTotalImponible(null, null, null, null, null, null)).toBe(0);
  });

  it('calcularTotalHaberes - suma imponible + haberes no imponibles', () => {
    // total_imponible, asig_familiar, movilizacion, colacion, viatico
    expect(calcularTotalHaberes(650000, 10000, 20000, 30000, null)).toBe(710000);
    expect(calcularTotalHaberes(0, null, null, null, null)).toBe(0);
  });

  it('calcularTotalDescuentos - suma todos los descuentos', () => {
    // afp, salud, seguro, impuesto, otros_descuentos
    expect(calcularTotalDescuentos(50000, 45000, 1500, 0, 10000)).toBe(106500);
    expect(calcularTotalDescuentos(null, null, null, null, null)).toBe(0);
  });

  it('calcularLiquido - resta total_haberes - total_descuentos', () => {
    expect(calcularLiquido(710000, 106500)).toBe(603500);
    expect(calcularLiquido(0, 0)).toBe(0);
  });

  it('calcularCostoTotal - suma total_haberes + aportes empresa', () => {
    // total_haberes, sis, aporte, vida, isl, mipe, corfo, otro
    expect(calcularCostoTotal(710000, 15000, 5000, 1000, 0, null, null, 2000)).toBe(733000);
    expect(calcularCostoTotal(100000, null, null, null, null, null, null, null)).toBe(100000);
  });

});

describe('formatCLP', () => {
  it('formatea número a formato CLP', () => {
    expect(formatCLP(1500000)).toBe('$1.500.000');
    expect(formatCLP(0)).toBe('$0');
  });

  it('retorna "-" si es null o undefined', () => {
    expect(formatCLP(null)).toBe('—');
  });
});

describe('Constantes Dominio Remuneraciones', () => {
  it('TIPOS_CONTRATO están correctamente definidos', () => {
    expect(TIPOS_CONTRATO).toContain('Indefinido');
    expect(TIPOS_CONTRATO).toContain('Plazo Fijo');
    expect(TIPOS_CONTRATO).toContain('Honorarios');
  });

  it('AFPS están correctamente definidas', () => {
    expect(AFPS.length).toBeGreaterThan(5);
    expect(AFPS).toContain('Modelo');
    expect(AFPS).toContain('Habitat');
  });

  it('OPCIONES_SALUD están correctamente definidas', () => {
    expect(OPCIONES_SALUD).toContain('Fonasa');
    expect(OPCIONES_SALUD).toContain('Isapre');
  });
});
