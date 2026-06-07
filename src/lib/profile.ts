import { supabase } from '@/integrations/supabase/client';
import { STORAGE_BUCKET, getPublicUrl } from '@/lib/storage';

export interface UserProfile {
  id: string;
  tenant_id: string;
  nombre: string | null;
  cargo: string | null;
  fono: string | null;
  foto_url: string | null;
  ultimo_acceso: string | null;
  activo: boolean | null;
}

export interface TenantInfo {
  id: string;
  nombre: string;
  razon_social: string | null;
  rut: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  region: string | null;
  fono: string | null;
  email: string | null;
  sitio_web: string | null;
  giro_principal: string | null;
  logo_url: string | null;
}

export async function getMyProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function upsertMyProfile(
  userId: string,
  tenantId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'tenant_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: userId, tenant_id: tenantId, ...updates, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function uploadAvatar(
  file: File,
  tenantId: string,
  userId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${tenantId}/usuarios/${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(path) + `?v=${Date.now()}`;
}

export async function uploadLogo(
  file: File,
  tenantId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${tenantId}/empresa/logo.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(path) + `?v=${Date.now()}`;
}

export async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id,nombre,razon_social,rut,direccion,comuna,ciudad,region,fono,email,sitio_web,giro_principal,logo_url')
    .eq('id', tenantId)
    .maybeSingle();
  return data ?? null;
}

export async function updateTenantInfo(
  tenantId: string,
  updates: Partial<Omit<TenantInfo, 'id'>>
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId);
  if (error) throw error;
}

export async function getTenantUsers(tenantId: string) {
  const { data: utRows } = await supabase
    .from('user_tenants')
    .select('user_id, role')
    .eq('tenant_id', tenantId);
  if (!utRows?.length) return [];

  const userIds = utRows.map((r) => r.user_id);

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds);

  return (utRows ?? []).map((ut) => {
    const profile = profiles?.find((p) => p.id === ut.user_id) ?? null;
    return { user_id: ut.user_id, role: ut.role, profile };
  });
}
