import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { getRutError } from '@/lib/rut';
import RutInput from '@/components/RutInput';

interface Prestador {
  id: string;
  rut: string;
  nombre: string;
  correo: string | null;
  fono: string | null;
  sociedad_prof: boolean;
  activo: boolean;
  tenant_id: string;
}

const emptyForm = {
  rut: '',
  nombre: '',
  correo: '',
  fono: '',
  sociedad_prof: false,
};

interface PrestadorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editingPrestador?: Prestador | null;
  prefillRut?: string;
  onSuccess: (prestador: Prestador) => void;
}

export default function PrestadorFormSheet({
  open,
  onOpenChange,
  tenantId,
  editingPrestador,
  prefillRut,
  onSuccess,
}: PrestadorFormSheetProps) {
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [extranjero, setExtranjero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ rut?: string; nombre?: string }>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setExtranjero(false);
      if (editingPrestador) {
        setForm({
          rut: editingPrestador.rut,
          nombre: editingPrestador.nombre,
          correo: editingPrestador.correo ?? '',
          fono: editingPrestador.fono ?? '',
          sociedad_prof: editingPrestador.sociedad_prof ?? false,
        });
      } else {
        setForm({ ...emptyForm, rut: prefillRut ?? '' });
      }
    }
  }, [open, editingPrestador, prefillRut]);

  const validate = () => {
    const newErrors: { rut?: string; nombre?: string } = {};
    if (!extranjero) {
      const rutErr = getRutError(form.rut);
      if (rutErr) newErrors.rut = rutErr;
    } else if (!form.rut.trim()) {
      newErrors.rut = 'El RUT é obrigatório';
    }
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      rut: normalizeRut(form.rut),
      nombre: form.nombre.trim(),
      correo: form.correo.trim().toLowerCase() || null,
      fono: form.fono.trim() ? normalizeFono(form.fono) : null,
      sociedad_prof: form.sociedad_prof,
      updated_at: new Date().toISOString(),
    };

    if (editingPrestador) {
      const { data, error } = await (supabase as any)
        .from('prestadores')
        .update(payload)
        .eq('id', editingPrestador.id)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error ao atualizar prestador', variant: 'destructive' });
      } else {
        toast({ title: 'Prestador atualizado com sucesso' });
        onOpenChange(false);
        onSuccess(data as Prestador);
      }
    } else {
      const { data, error } = await (supabase as any)
        .from('prestadores')
        .insert({ ...payload, activo: true, tenant_id: tenantId })
        .select()
        .single();

      if (error) {
        const isDuplicate = error.message?.includes('unique') || error.code === '23505';
        toast({
          title: isDuplicate ? 'Este RUT ya está registrado como prestador' : 'Error ao criar prestador',
          description: isDuplicate ? undefined : error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Prestador criado com sucesso' });
        onOpenChange(false);
        onSuccess(data as Prestador);
      }
    }

    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {editingPrestador ? 'Editar Prestador' : 'Nuevo Prestador'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* RUT */}
          <RutInput
            id="pr-rut"
            value={form.rut}
            onChange={(v) => setForm((f) => ({ ...f, rut: v }))}
            error={errors.rut}
            required
            extranjero={extranjero}
            onExtranjeroChange={(v) => {
              setExtranjero(v);
              setErrors((e) => ({ ...e, rut: undefined }));
            }}
          />

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-nombre">
              Nombre del Prestador <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pr-nombre"
              placeholder="Nombre completo o razón social"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              maxLength={200}
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* Correo */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-correo">Correo</Label>
            <Input
              id="pr-correo"
              type="email"
              placeholder="correo@ejemplo.cl"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              maxLength={254}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-fono">Teléfono</Label>
            <Input
              id="pr-fono"
              placeholder="+56 9 1234 5678"
              value={form.fono}
              onChange={(e) => setForm((f) => ({ ...f, fono: e.target.value }))}
              maxLength={20}
            />
          </div>

          {/* Sociedad Profesional */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="pr-sociedad"
              checked={form.sociedad_prof}
              onCheckedChange={(v) => setForm((f) => ({ ...f, sociedad_prof: !!v }))}
            />
            <Label htmlFor="pr-sociedad" className="text-sm cursor-pointer">
              Sociedad Profesional
            </Label>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-magenta hover:bg-magenta/90 text-white"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? 'Salvando...' : editingPrestador ? 'Atualizar Prestador' : 'Guardar Prestador'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
