import { supabase } from '@/integrations/supabase/client';

export const STORAGE_BUCKET = 'documentos';

// Builds the storage path: {tenantId}/{tabla}/{docKey}/{sanitized_filename}
export function buildStoragePath(
  tenantId: string,
  tabla: string,
  docKey: string,
  filename: string
): string {
  const safeTabla  = tabla.replace(/[^a-zA-Z0-9_]/g, '_');
  const safeDocKey = docKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const hasExt = filename.includes('.');
  const ext = hasExt ? filename.split('.').pop()?.toLowerCase() ?? '' : '';
  const base = hasExt ? filename.substring(0, filename.lastIndexOf('.')) : filename;
  
  const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitized = ext ? `${safeBase}.${ext}` : safeBase;
  
  return `${tenantId}/${safeTabla}/${safeDocKey}/${sanitized}`;
}

// Returns the public URL for a given storage path
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Extracts the storage path from a full public URL
export function extractPathFromUrl(url: string): string {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : '';
}

// Deletes a file from storage by its path
export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
