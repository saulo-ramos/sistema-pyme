import { describe, it, expect, vi } from 'vitest';
import { buildStoragePath, extractPathFromUrl, STORAGE_BUCKET } from '@/lib/storage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn()
    }
  }
}));

describe('buildStoragePath', () => {
  it('Constrói um caminho sanitizado corretamente', () => {
    const path = buildStoragePath('tenant-123', 'minha tabla!', 'doc_123', 'file name.pdf');
    // tabla vira minha_tabla_ (limpa espaço e !), docKey vira doc_123, base do arquivo vira file_name
    expect(path).toBe('tenant-123/minha_tabla_/doc_123/file_name.pdf');
  });

  it('Trata nomes de arquivo sem extensão', () => {
    const path = buildStoragePath('t', 'tab', 'key', 'arquivo sem extensao');
    expect(path).toBe('t/tab/key/arquivo_sem_extensao');
  });

  it('Preserva apenas a última extensão e sanitiza pontos intermediários no filename', () => {
    const path = buildStoragePath('t', 'tab', 'key', 'meu.relatorio.final.v2.pdf');
    expect(path).toBe('t/tab/key/meu_relatorio_final_v2.pdf');
  });
});

describe('extractPathFromUrl', () => {
  it('Extrai o caminho relativo baseando-se no STORAGE_BUCKET da URL pública', () => {
    const url = `https://supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/tenant-1/tabla/doc/file.pdf`;
    expect(extractPathFromUrl(url)).toBe('tenant-1/tabla/doc/file.pdf');
  });

  it('Retorna string vazia se a URL não provir do bucket esperado', () => {
    const url = `https://supabase.co/storage/v1/object/public/outro_bucket/file.pdf`;
    expect(extractPathFromUrl(url)).toBe('');
  });

  it('Decodifica entidades da URL para formar uma string original (decodeURIComponent)', () => {
    const url = `https://supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/tenant-1/tabla/doc/file%20name.pdf`;
    expect(extractPathFromUrl(url)).toBe('tenant-1/tabla/doc/file name.pdf');
  });
});
