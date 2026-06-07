/**
 * Testes unitários — src/lib/rut.ts
 * Não precisam de Supabase nem de DOM.
 */
import { describe, it, expect } from 'vitest';
import { formatRut, validateRut, getRutError, cleanRut } from '@/lib/rut';

// RUTs válidos reais para usar nos testes
const RUT_VALIDO = '12345678-5';      // formato normalizado (DV=5 verificado com módulo 11)
const RUT_COM_PONTOS = '12.345.678-5';
const RUT_SEM_GUIAO = '123456785';
const RUT_K = '7775735-K';            // dígito verificador K (soma=177, 177%11=1, 11-1=K)
const RUT_k_minusculo = '7775735-k'; // mesmo RUT, k minúsculo
const RUT_CURTO = '5126663-3';        // RUT de pessoa física curto
const RUT_INVALIDO = '12345678-0';    // dígito verificador errado (correto seria 5)

// ─── formatRut ────────────────────────────────────────────────────────────────

describe('formatRut', () => {
  it('formata string numérica para padrão com guião', () => {
    expect(formatRut('123456789')).toBe('12345678-9');
  });

  it('converte k minúsculo para K maiúsculo', () => {
    expect(formatRut('14569484k')).toBe('14569484-K');
  });

  it('remove pontos e outros caracteres não permitidos', () => {
    expect(formatRut('12.345.678-9')).toBe('12345678-9');
  });

  it('retorna sem guião quando tem menos de 5 caracteres', () => {
    expect(formatRut('1234')).toBe('1234');
  });

  it('adiciona guião com 5 ou mais caracteres', () => {
    expect(formatRut('12345')).toBe('1234-5');
  });

  it('limita a 9 caracteres (8 dígitos + DV)', () => {
    expect(formatRut('1234567890')).toBe('12345678-9');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(formatRut('')).toBe('');
  });
});

// ─── validateRut ──────────────────────────────────────────────────────────────

describe('validateRut', () => {
  it('valida RUT no formato padrão com guião', () => {
    expect(validateRut(RUT_VALIDO)).toBe(true);
  });

  it('valida RUT com pontos e guião', () => {
    expect(validateRut(RUT_COM_PONTOS)).toBe(true);
  });

  it('valida RUT sem formatação alguma', () => {
    expect(validateRut(RUT_SEM_GUIAO)).toBe(true);
  });

  it('valida RUT com DV = K maiúsculo', () => {
    expect(validateRut(RUT_K)).toBe(true);
  });

  it('valida RUT com DV = k minúsculo (deve aceitar)', () => {
    expect(validateRut(RUT_k_minusculo)).toBe(true);
  });

  it('valida RUT curto de pessoa física', () => {
    expect(validateRut(RUT_CURTO)).toBe(true);
  });

  it('rejeita RUT com dígito verificador errado', () => {
    expect(validateRut(RUT_INVALIDO)).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(validateRut('')).toBe(false);
  });

  it('rejeita string com apenas 1 caractere', () => {
    expect(validateRut('9')).toBe(false);
  });

  it('rejeita RUT com letras no corpo (exceto K no DV)', () => {
    expect(validateRut('1234A678-9')).toBe(false);
  });
});

// ─── getRutError ──────────────────────────────────────────────────────────────

describe('getRutError', () => {
  it('retorna null para RUT válido', () => {
    expect(getRutError(RUT_VALIDO)).toBeNull();
  });

  it('retorna mensagem "obrigatório" para string vazia', () => {
    expect(getRutError('')).toBe('El RUT es obligatorio');
  });

  it('retorna mensagem "obrigatório" para string só espaços', () => {
    expect(getRutError('   ')).toBe('El RUT es obligatorio');
  });

  it('retorna mensagem "muito curto" para menos de 3 chars limpos', () => {
    expect(getRutError('1-2')).toBe('RUT demasiado corto');
  });

  it('retorna mensagem de formato inválido para chars não permitidos', () => {
    expect(getRutError('abc-def')).toBe('Formato inválido. Use: 12345678-9');
  });

  it('retorna mensagem de dígito verificador errado', () => {
    expect(getRutError(RUT_INVALIDO)).toBe(
      'RUT inválido. Verifique el dígito verificador'
    );
  });

  it('retorna null para RUT com K maiúsculo', () => {
    expect(getRutError(RUT_K)).toBeNull();
  });

  it('retorna null para RUT com k minúsculo', () => {
    expect(getRutError(RUT_k_minusculo)).toBeNull();
  });
});

// ─── cleanRut ─────────────────────────────────────────────────────────────────

describe('cleanRut', () => {
  it('remove pontos, guião e converte para maiúsculo', () => {
    expect(cleanRut('12.345.678-9')).toBe('123456789');
  });

  it('converte k minúsculo para K maiúsculo', () => {
    expect(cleanRut('14569484-k')).toBe('14569484K');
  });

  it('não altera RUT já limpo', () => {
    expect(cleanRut('123456789')).toBe('123456789');
  });
});
