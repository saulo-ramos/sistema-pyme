/**
 * Testes unitários — src/lib/formatters.ts
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeRut,
  normalizeFono,
  displayRut,
  displayDate,
  displayFono,
} from '@/lib/formatters';

// ─── normalizeRut ─────────────────────────────────────────────────────────────

describe('normalizeRut', () => {
  it('retorna formato padrão com guião', () => {
    expect(normalizeRut('123456789')).toBe('12345678-9');
  });

  it('remove pontos e recoloca guião', () => {
    expect(normalizeRut('12.345.678-9')).toBe('12345678-9');
  });

  it('converte k minúsculo para K maiúsculo', () => {
    expect(normalizeRut('14569484k')).toBe('14569484-K');
  });

  it('mantém RUT já normalizado', () => {
    expect(normalizeRut('12345678-9')).toBe('12345678-9');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizeRut('')).toBe('');
  });

  it('retorna input original quando tem menos de 2 caracteres', () => {
    expect(normalizeRut('1')).toBe('1');
  });
});

// ─── normalizeFono ────────────────────────────────────────────────────────────

describe('normalizeFono', () => {
  it('formata celular 9 dígitos para E.164', () => {
    expect(normalizeFono('912345678')).toBe('+56912345678');
  });

  it('formata celular com prefixo 56', () => {
    expect(normalizeFono('56912345678')).toBe('+56912345678');
  });

  it('formata celular com código de país e espaços', () => {
    expect(normalizeFono('+56 9 1234 5678')).toBe('+56912345678');
  });

  it('formata telefone fixo 8 dígitos', () => {
    expect(normalizeFono('21234567')).toBe('+5621234567');
  });

  it('formata formato legacy 0XXXXXXXXX', () => {
    expect(normalizeFono('0912345678')).toBe('+56912345678');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizeFono('')).toBe('');
  });

  it('retorna string vazia para entrada sem dígitos', () => {
    expect(normalizeFono('---')).toBe('');
  });
});

// ─── displayRut ───────────────────────────────────────────────────────────────

describe('displayRut', () => {
  it('formata RUT normalizado para exibição com pontos', () => {
    expect(displayRut('12345678-9')).toBe('12.345.678-9');
  });

  it('formata RUT sem formatação', () => {
    expect(displayRut('123456789')).toBe('12.345.678-9');
  });

  it('formata RUT curto corretamente', () => {
    expect(displayRut('5126663-3')).toBe('5.126.663-3');
  });
});

// ─── displayDate ──────────────────────────────────────────────────────────────

describe('displayDate', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(displayDate('2024-01-15')).toBe('15/01/2024');
  });

  it('retorna "—" para null', () => {
    expect(displayDate(null)).toBe('—');
  });

  it('retorna "—" para undefined', () => {
    expect(displayDate(undefined)).toBe('—');
  });

  it('retorna "—" para string vazia', () => {
    expect(displayDate('')).toBe('—');
  });

  it('trata meses e dias com zero à esquerda corretamente', () => {
    expect(displayDate('2024-03-05')).toBe('05/03/2024');
  });
});

// ─── displayFono ──────────────────────────────────────────────────────────────

describe('displayFono', () => {
  it('formata celular para exibição legível', () => {
    expect(displayFono('+56912345678')).toBe('+56 9 1234-5678');
  });

  it('formata telefone fixo para exibição legível', () => {
    expect(displayFono('+5621234567')).toBe('+56 2 1234-567');
  });

  it('retorna "—" para null', () => {
    expect(displayFono(null)).toBe('—');
  });
});
