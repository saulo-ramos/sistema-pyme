/**
 * Pruebas de integración — Storage: upload de documentos
 * Verifica que el upload respeta el aislamiento por tenant
 * y que los metadatos son persistidos correctamente en `documentos`.
 *
 * En modo demo: usa el mock storage (retorna URLs ficticias).
 * En producción: verifica el bucket real de Supabase Storage con RLS.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseAdmin as client, resetMockDb } from '../fixtures/supabase';
import { TENANT_A_ID } from '../fixtures/users';
import { buildStoragePath, STORAGE_BUCKET } from '@/lib/storage';

beforeEach(() => {
  resetMockDb();
});

// ─── buildStoragePath ─────────────────────────────────────────────────────────

describe('buildStoragePath — formato del camino', () => {
  it('genera camino en formato tenantId/tabla/docKey/filename', () => {
    const path = buildStoragePath(
      TENANT_A_ID,
      'movimientos_venta',
      'doc-uuid-123',
      'nota_fiscal.pdf'
    );
    expect(path).toBe(`${TENANT_A_ID}/movimientos_venta/doc-uuid-123/nota_fiscal.pdf`);
  });

  it('sanitiza nombre de archivo con caracteres especiales', () => {
    const path = buildStoragePath(
      TENANT_A_ID,
      'movimientos_compra',
      'doc-uuid-456',
      'factura (1).pdf'
    );
    expect(path).toContain('factura__1_.pdf');
  });

  it('preserva extensión del archivo', () => {
    const path = buildStoragePath(TENANT_A_ID, 'documentos', 'uuid', 'contrato.docx');
    expect(path.endsWith('.docx')).toBe(true);
  });

  it('incluye el tenant_id al inicio del camino', () => {
    const path = buildStoragePath(TENANT_A_ID, 'clientes', 'uuid', 'archivo.pdf');
    expect(path.startsWith(TENANT_A_ID)).toBe(true);
  });
});

// ─── Upload mock ──────────────────────────────────────────────────────────────

describe('storage — upload de archivo (mock)', () => {
  it('upload retorna sin error', async () => {
    const storagePath = buildStoragePath(TENANT_A_ID, 'movimientos_venta', 'test-id', 'test.pdf');
    const contenido = new Blob(['%PDF-1.4 fake content'], { type: 'application/pdf' });

    const { error } = await client.storage.from(STORAGE_BUCKET).upload(storagePath, contenido as File);
    expect(error).toBeNull();
  });

  it('URL pública contiene el camino correcto del tenant', () => {
    const storagePath = buildStoragePath(TENANT_A_ID, 'movimientos_venta', 'test-id', 'doc.pdf');
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    expect(data.publicUrl).toContain(TENANT_A_ID);
    expect(data.publicUrl).toContain('movimientos_venta');
  });

  it('lista de archivos retorna array vacío en mock', async () => {
    const { data, error } = await client.storage.from(STORAGE_BUCKET).list(TENANT_A_ID);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── Metadatos en tabla documentos ───────────────────────────────────────────

describe('storage — metadatos en tabla documentos', () => {
  it('inserta registro de documento con metadatos correctos', async () => {
    const storagePath = buildStoragePath(TENANT_A_ID, 'movimientos_venta', 'mv-001', 'factura.pdf');

    const { data, error } = await client
      .from('documentos')
      .insert({
        tenant_id: TENANT_A_ID,
        modulo: 'movimientos_venta',
        referencia_id: 'mv-001',
        nombre_original: 'factura.pdf',
        nombre_storage: `${Date.now()}_factura.pdf`,
        ruta_storage: storagePath,
        tamano_bytes: 12345,
        tipo_mime: 'application/pdf',
        uploaded_by: 'user-demo',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.modulo).toBe('movimientos_venta');
    expect(data!.nombre_original).toBe('factura.pdf');
  });
});

// ─── Notas para producción ───────────────────────────────────────────────────

describe('storage — notas para producción', () => {
  it.todo('RLS de Storage: usuario solo puede acceder a archivos de su tenant');
  it.todo('archivos > 10MB son comprimidos automáticamente antes del upload');
  it.todo('eliminación de movimiento elimina documento asociado del Storage');
  it.todo('usuario de Tenant B no puede listar archivos del bucket de Tenant A');
});
