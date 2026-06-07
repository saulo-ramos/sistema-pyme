import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { updateTenantInfo } from '@/lib/profile';
import LogoUploader from '@/components/LogoUploader';
import RutInput from '@/components/RutInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeFono, normalizeRut, displayFono } from '@/lib/formatters';

const REGIONES_CHILE = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  'Región del Libertador General Bernardo O\'Higgins',
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del General Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
];

export default function MiEmpresaTab() {
  const tenantId = useTenantId();
  const { tenant, loading, refresh } = useTenantInfo();
  const [saving, setSaving] = useState(false);
  const [rutError, setRutError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    razon_social: '',
    rut: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    region: '',
    fono: '',
    email: '',
    sitio_web: '',
    giro_principal: '',
    logo_url: '',
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        nombre: tenant.nombre ?? '',
        razon_social: tenant.razon_social ?? '',
        rut: tenant.rut ?? '',
        direccion: tenant.direccion ?? '',
        comuna: tenant.comuna ?? '',
        ciudad: tenant.ciudad ?? '',
        region: tenant.region ?? '',
        fono: tenant.fono ? displayFono(tenant.fono).replace(/\s|-/g, '') : '',
        email: tenant.email ?? '',
        sitio_web: tenant.sitio_web ?? '',
        giro_principal: tenant.giro_principal ?? '',
        logo_url: tenant.logo_url ?? '',
      });
    }
  }, [tenant]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      await updateTenantInfo(tenantId, {
        nombre: form.nombre.trim(),
        razon_social: form.razon_social.trim() || null,
        rut: form.rut ? normalizeRut(form.rut) : null,
        direccion: form.direccion.trim() || null,
        comuna: form.comuna.trim() || null,
        ciudad: form.ciudad.trim() || null,
        region: form.region || null,
        fono: form.fono ? normalizeFono(form.fono) : null,
        email: form.email.trim() || null,
        sitio_web: form.sitio_web.trim() || null,
        giro_principal: form.giro_principal.trim() || null,
        logo_url: form.logo_url || null,
      });
      refresh();
      toast.success('Empresa actualizada');
    } catch {
      toast.error('Error al guardar los datos de la empresa');
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {tenantId && (
        <LogoUploader
          logoUrl={form.logo_url || null}
          tenantId={tenantId}
          onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nombre">Nombre de fantasía <span className="text-red-500">*</span></Label>
          <Input id="nombre" value={form.nombre} onChange={set('nombre')} required />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="razon_social">Razón social</Label>
          <Input id="razon_social" value={form.razon_social} onChange={set('razon_social')} />
        </div>

        <div className="space-y-1.5">
          <RutInput
            value={form.rut}
            onChange={(v) => setForm((f) => ({ ...f, rut: v }))}
            error={rutError}
            onBlur={() => setRutError(null)}
            label="RUT empresa"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="giro_principal">Giro principal</Label>
          <Input id="giro_principal" value={form.giro_principal} onChange={set('giro_principal')} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="direccion">Dirección</Label>
          <Input id="direccion" value={form.direccion} onChange={set('direccion')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comuna">Comuna</Label>
          <Input id="comuna" value={form.comuna} onChange={set('comuna')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input id="ciudad" value={form.ciudad} onChange={set('ciudad')} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="region">Región</Label>
          <select
            id="region"
            value={form.region}
            onChange={set('region')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Seleccionar región...</option>
            {REGIONES_CHILE.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fono-empresa">Teléfono</Label>
          <Input
            id="fono-empresa"
            value={form.fono}
            onChange={set('fono')}
            placeholder="+56 2 1234 5678"
            inputMode="tel"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email-empresa">Email empresa</Label>
          <Input
            id="email-empresa"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="contacto@empresa.cl"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sitio_web">Sitio web</Label>
          <Input
            id="sitio_web"
            value={form.sitio_web}
            onChange={set('sitio_web')}
            placeholder="https://empresa.cl"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  );
}
