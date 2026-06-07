import { describe, it, expect } from 'vitest';
import { escapeLikePattern } from '@/lib/sanitize';

describe('escapeLikePattern', () => {
  it('escapa o caractere %', () => {
    expect(escapeLikePattern('100% discount')).toBe('100\\% discount');
  });

  it('escapa o caractere _', () => {
    expect(escapeLikePattern('my_table')).toBe('my\\_table');
  });

  it('escapa o caractere de escape \\', () => {
    expect(escapeLikePattern('C:\\path')).toBe('C:\\\\path');
  });

  it('escapa múltiplas ocorrências misturadas', () => {
    expect(escapeLikePattern('%_\\%_\\')).toBe('\\%\\_\\\\\\%\\_\\\\');
  });

  it('retorna a mesma string se não houver caracteres especiais', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world');
  });
});
