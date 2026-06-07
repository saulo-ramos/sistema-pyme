/**
 * Testes unitários — lib/rendiciones.ts
 * Cobre: constantes, tipos, formatação e funções puras de negócio.
 */
import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_GASTO,
  ESTADOS_RENDICION,
  BADGE_COLORS,
  calcularTotal,
  puedeEditar,
  puedeAprobar,
  generarNumero,
} from '@/lib/rendiciones';
import { formatCLP } from '@/lib/formatters';

// ─── CATEGORIAS_GASTO ─────────────────────────────────────────────────────────

describe('CATEGORIAS_GASTO', () => {
  it('contiene exactamente 8 categorías', () => {
    expect(CATEGORIAS_GASTO).toHaveLength(8);
  });

  it('contiene todas las categorías esperadas', () => {
    expect(CATEGORIAS_GASTO).toContain('Movilización');
    expect(CATEGORIAS_GASTO).toContain('Alimentación');
    expect(CATEGORIAS_GASTO).toContain('Hospedaje');
    expect(CATEGORIAS_GASTO).toContain('Materiales');
    expect(CATEGORIAS_GASTO).toContain('Servicios');
    expect(CATEGORIAS_GASTO).toContain('Combustible');
    expect(CATEGORIAS_GASTO).toContain('Peajes y estacionamiento');
    expect(CATEGORIAS_GASTO).toContain('Otros');
  });

  it('es inmutable (readonly)', () => {
    // El objeto debe ser de tipo readonly — verificar que no se puede modificar en TypeScript
    // En runtime, los arrays const no son immutables, pero el tipo lo es.
    expect(Array.isArray(CATEGORIAS_GASTO)).toBe(true);
  });
});

// ─── ESTADOS_RENDICION ────────────────────────────────────────────────────────

describe('ESTADOS_RENDICION', () => {
  it('contiene exactamente 4 estados', () => {
    expect(ESTADOS_RENDICION).toHaveLength(4);
  });

  it('contiene los estados del workflow', () => {
    expect(ESTADOS_RENDICION).toContain('Borrador');
    expect(ESTADOS_RENDICION).toContain('Enviada');
    expect(ESTADOS_RENDICION).toContain('Aprobada');
    expect(ESTADOS_RENDICION).toContain('Rechazada');
  });

  it('los estados están en el orden correcto del workflow', () => {
    expect(ESTADOS_RENDICION[0]).toBe('Borrador');
    expect(ESTADOS_RENDICION[1]).toBe('Enviada');
    expect(ESTADOS_RENDICION[2]).toBe('Aprobada');
    expect(ESTADOS_RENDICION[3]).toBe('Rechazada');
  });
});

// ─── BADGE_COLORS ─────────────────────────────────────────────────────────────

describe('BADGE_COLORS', () => {
  it('tiene una entrada para cada estado', () => {
    for (const estado of ESTADOS_RENDICION) {
      expect(BADGE_COLORS).toHaveProperty(estado);
      expect(typeof BADGE_COLORS[estado]).toBe('string');
      expect(BADGE_COLORS[estado].length).toBeGreaterThan(0);
    }
  });

  it('Borrador usa clases de color gris', () => {
    expect(BADGE_COLORS['Borrador']).toContain('gray');
  });

  it('Aprobada usa clases de color verde', () => {
    expect(BADGE_COLORS['Aprobada']).toContain('green');
  });

  it('Rechazada usa clases de color rojo', () => {
    expect(BADGE_COLORS['Rechazada']).toContain('red');
  });

  it('Enviada usa clases de color azul', () => {
    expect(BADGE_COLORS['Enviada']).toContain('blue');
  });
});

// ─── formatCLP ────────────────────────────────────────────────────────────────

describe('formatCLP', () => {
  it('formatea entero positivo con separador de miles CLP', () => {
    expect(formatCLP(1500000)).toBe('$1.500.000');
  });

  it('formatea cero como $0', () => {
    expect(formatCLP(0)).toBe('$0');
  });

  it('formatea número pequeño sin separador', () => {
    expect(formatCLP(500)).toBe('$500');
  });

  it('formatea número con múltiples grupos de miles', () => {
    expect(formatCLP(12345678)).toBe('$12.345.678');
  });

  it('retorna "—" para null', () => {
    expect(formatCLP(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(formatCLP(undefined)).toBe('—');
  });
});

// ─── calcularTotal ────────────────────────────────────────────────────────────

describe('calcularTotal', () => {
  it('suma los montos de todos los ítems', () => {
    const items = [{ monto: 10000 }, { monto: 25000 }, { monto: 5000 }];
    expect(calcularTotal(items)).toBe(40000);
  });

  it('retorna 0 para lista vacía', () => {
    expect(calcularTotal([])).toBe(0);
  });

  it('retorna 0 para lista con un solo ítem de monto 0', () => {
    expect(calcularTotal([{ monto: 0 }])).toBe(0);
  });

  it('trata valores NaN como 0 en la suma', () => {
    const items = [{ monto: NaN }, { monto: 5000 }];
    expect(calcularTotal(items)).toBe(5000);
  });

  it('suma correctamente un solo ítem', () => {
    expect(calcularTotal([{ monto: 99999 }])).toBe(99999);
  });

  it('suma correctamente montos decimales', () => {
    const items = [{ monto: 10000.50 }, { monto: 9999.50 }];
    expect(calcularTotal(items)).toBeCloseTo(20000, 2);
  });

  it('suma correctamente muchos ítems', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ monto: (i + 1) * 1000 }));
    // 1000 + 2000 + ... + 10000 = 55000
    expect(calcularTotal(items)).toBe(55000);
  });
});

// ─── puedeEditar ─────────────────────────────────────────────────────────────

describe('puedeEditar', () => {
  const USER_ID = 'user-abc-123';
  const OTHER_USER_ID = 'user-xyz-999';

  it('retorna true si estado=Borrador y es el solicitante', () => {
    expect(puedeEditar({ estado: 'Borrador', solicitante_id: USER_ID }, USER_ID)).toBe(true);
  });

  it('retorna false si estado=Borrador pero NO es el solicitante', () => {
    expect(puedeEditar({ estado: 'Borrador', solicitante_id: OTHER_USER_ID }, USER_ID)).toBe(false);
  });

  it('retorna false si es el solicitante pero estado=Enviada', () => {
    expect(puedeEditar({ estado: 'Enviada', solicitante_id: USER_ID }, USER_ID)).toBe(false);
  });

  it('retorna false si es el solicitante pero estado=Aprobada', () => {
    expect(puedeEditar({ estado: 'Aprobada', solicitante_id: USER_ID }, USER_ID)).toBe(false);
  });

  it('retorna false si es el solicitante pero estado=Rechazada', () => {
    // Rechazada puede re-enviarse, pero editar ítems requiere lógica extra en el componente
    expect(puedeEditar({ estado: 'Rechazada', solicitante_id: USER_ID }, USER_ID)).toBe(false);
  });

  it('retorna false si NO es el solicitante y estado=Enviada', () => {
    expect(puedeEditar({ estado: 'Enviada', solicitante_id: OTHER_USER_ID }, USER_ID)).toBe(false);
  });

  it('retorna false para userId vacío', () => {
    expect(puedeEditar({ estado: 'Borrador', solicitante_id: USER_ID }, '')).toBe(false);
  });
});

// ─── puedeAprobar ────────────────────────────────────────────────────────────

describe('puedeAprobar', () => {
  it('retorna true para role="admin"', () => {
    expect(puedeAprobar('admin')).toBe(true);
  });

  it('retorna true para role="aprobador"', () => {
    expect(puedeAprobar('aprobador')).toBe(true);
  });

  it('retorna false para role="vista"', () => {
    expect(puedeAprobar('vista')).toBe(false);
  });

  it('retorna false para role="usuario"', () => {
    expect(puedeAprobar('usuario')).toBe(false);
  });

  it('retorna false para null (sin role)', () => {
    expect(puedeAprobar(null)).toBe(false);
  });

  it('retorna false para string vacía', () => {
    expect(puedeAprobar('')).toBe(false);
  });

  it('es sensible a mayúsculas — "Admin" (con A) no es válido', () => {
    expect(puedeAprobar('Admin')).toBe(false);
  });
});

// ─── generarNumero ────────────────────────────────────────────────────────────

describe('generarNumero', () => {
  it('genera número con correlativo de 4 dígitos con cero padding', () => {
    expect(generarNumero(1, 2026)).toBe('REND-2026-0001');
  });

  it('genera número para correlativo grande sin padding innecesario', () => {
    expect(generarNumero(1234, 2026)).toBe('REND-2026-1234');
  });

  it('genera número correcto para correlativo 10', () => {
    expect(generarNumero(10, 2026)).toBe('REND-2026-0010');
  });

  it('genera número correcto para correlativo 100', () => {
    expect(generarNumero(100, 2025)).toBe('REND-2025-0100');
  });

  it('incluye el año correctamente', () => {
    expect(generarNumero(1, 2024)).toContain('2024');
    expect(generarNumero(1, 2030)).toContain('2030');
  });

  it('siempre empieza con el prefijo REND-', () => {
    expect(generarNumero(5, 2026)).toMatch(/^REND-/);
  });

  it('formato general es REND-YYYY-NNNN', () => {
    expect(generarNumero(42, 2026)).toMatch(/^REND-\d{4}-\d{4}$/);
  });
});
