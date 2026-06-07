import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { getRutError } from '@/lib/rut';
import RutInput from '@/components/RutInput';

interface Proveedor {
  id: string;
  rut: string;
  nombre: string;
  productos_servicios: string | null;
  correo: string | null;
  fono: string | null;
  activo: boolean;
  tenant_id: string;
}

const emptyForm = {
  rut: '',
  nombre: '',
  productos_servicios: '',
  correo: '',
  fono: '',
};

interface ProveedorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editingProveedor?: Proveedor | null;
  prefillRut?: string;
  onSuccess: (proveedor: Proveedor) => void;
}

export default function ProveedorFormSheet({
  open,
  onOpenChange,
  tenantId,
  editingProveedor,
  prefillRut,
  onSuccess,
}: ProveedorFormSheetProps) {
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [extranjero, setExtranjero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ rut?: string; nombre?: string }>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setExtranjero(false);
      if (editingProveedor) {
        setForm({
          rut: editingProveedor.rut,
          nombre: editingProveedor.nombre,
          productos_servicios: editingProveedor.productos_servicios ?? '',
          correo: editingProveedor.correo ?? '',
          fono: editingProveedor.fono ?? '',
        });
      } else {
        setForm({ ...emptyForm, rut: prefillRut ?? '' });
      }
    }
  }, [open, editingProveedor, prefillRut]);

  const validate = () => {
    const newErrors: { rut?: string; nombre?: string } = {};
    if (!extranjero) {
      const rutErr = getRutError(form.rut);
      if (rutErr) newErrors.rut = rutErr;
    } else if (!form.rut.trim()) {
      newErrors.rut = 'El RUT es obligatorio';
    }
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      rut: normalizeRut(form.rut),
      nombre: form.nombre.trim(),
      productos_servicios: form.productos_servicios.trim() || null,
      correo: form.correo.trim().toLowerCase() || null,
      fono: form.fono.trim() ? normalizeFono(form.fono) : null,
      updated_at: new Date().toISOString(),
    };

    if (editingProveedor) {
      const { data, error } = await (supabase as any)
        .from('proveedores')
        .update(payload)
        .eq('id', editingProveedor.id)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error al actualizar proveedor', variant: 'destructive' });
      } else {
        toast({ title: 'Proveedor actualizado correctamente' });
        onOpenChange(false);
        onSuccess(data as Proveedor);
      }
    } else {
      const { data, error } = await (supabase as any)
        .from('proveedores')
        .insert({ ...payload, activo: true, tenant_id: tenantId })
        .select()
        .single();

      if (error) {
        const isDuplicate = error.message?.includes('unique') || error.code === '23505';
        toast({
          title: isDuplicate ? 'Este RUT ya está registrado como proveedor' : 'Error al crear proveedor',
          description: isDuplicate ? undefined : error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Proveedor creado correctamente' });
        onOpenChange(false);
        onSuccess(data as Proveedor);
      }
    }

    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* RUT */}
          <RutInput
            id="pf-rut"
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
            <Label htmlFor="pf-nombre">
              Nombre del Proveedor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pf-nombre"
              placeholder="Nombre completo o razón social"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              maxLength={200}
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* Productos o Servicios */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-productos">Productos o Servicios</Label>
            <Textarea
              id="pf-productos"
              placeholder="Separar con coma si son varios"
              value={form.productos_servicios}
              onChange={(e) => setForm((f) => ({ ...f, productos_servicios: e.target.value }))}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Correo */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-correo">Correo</Label>
            <Input
              id="pf-correo"
              type="email"
              placeholder="correo@empresa.cl"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              maxLength={254}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-fono">Teléfono</Label>
            <Input
              id="pf-fono"
              placeholder="+56 9 1234 5678"
              value={form.fono}
              onChange={(e) => setForm((f) => ({ ...f, fono: e.target.value }))}
              maxLength={20}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-magenta hover:bg-magenta/90 text-white"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? 'Guardando...' : editingProveedor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
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
