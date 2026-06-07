import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { useUserProfile } from '@/hooks/useUserProfile';
import AvatarUploader from '@/components/AvatarUploader';
import CambiarPasswordDialog from '@/components/CambiarPasswordDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeFono, displayFono } from '@/lib/formatters';

export default function MiCuentaTab() {
  const { user } = useAuth();
  const tenantId = useTenantId();
  const { profile, loading, save } = useUserProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    cargo: '',
    fono: '',
    foto_url: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nombre: profile.nombre ?? '',
        cargo: profile.cargo ?? '',
        fono: profile.fono ? displayFono(profile.fono).replace(/\s|-/g, '') : '',
        foto_url: profile.foto_url ?? '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({
        nombre: form.nombre.trim() || null,
        cargo: form.cargo.trim() || null,
        fono: form.fono ? normalizeFono(form.fono) : null,
        foto_url: form.foto_url || null,
      });
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-periwinkle" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {user && tenantId && (
          <AvatarUploader
            fotoUrl={form.foto_url || null}
            nombre={form.nombre || user.email || null}
            tenantId={tenantId}
            userId={user.id}
            onUploaded={(url) => setForm((f) => ({ ...f, foto_url: url }))}
          />
        )}

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} readOnly className="bg-muted text-gray-text" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              placeholder="Contador, Gerente, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fono">Teléfono</Label>
            <Input
              id="fono"
              value={form.fono}
              onChange={(e) => setForm((f) => ({ ...f, fono: e.target.value }))}
              placeholder="+56 9 1234 5678"
              inputMode="tel"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPassword(true)}
          >
            Cambiar contraseña
          </Button>
        </div>
      </form>

      <CambiarPasswordDialog open={showPassword} onOpenChange={setShowPassword} />
    </>
  );
}
