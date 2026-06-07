import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { getRutError } from '@/lib/rut';
import RutInput from '@/components/RutInput';
import { Tables } from '@/integrations/supabase/types';

type Cliente = Tables<'clientes'>;

const VENCIMIENTO_OPTIONS = [
  { value: '0',   label: 'Sin vencimiento' },
  { value: '15',  label: '15 días' },
  { value: '30',  label: '30 días' },
  { value: '60',  label: '60 días' },
  { value: '90',  label: '90 días' },
  { value: '120', label: '120 días' },
];

const emptyForm = {
  rut: '',
  nombre: '',
  productos_servicios: '',
  vencimiento: '',
  correo: '',
  fono: '',
};

interface ClienteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editingCliente?: Cliente | null;
  onSuccess: (cliente: Cliente) => void;
}

export default function ClienteFormSheet({
  open,
  onOpenChange,
  tenantId,
  editingCliente,
  onSuccess,
}: ClienteFormSheetProps) {
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [extranjero, setExtranjero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ rut?: string; nombre?: string }>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setExtranjero(false);
      if (editingCliente) {
        setForm({
          rut: editingCliente.rut,
          nombre: editingCliente.nombre,
          productos_servicios: editingCliente.productos_servicios ?? '',
          vencimiento: editingCliente.vencimiento !== null ? String(editingCliente.vencimiento) : '',
          correo: editingCliente.correo ?? '',
          fono: editingCliente.fono ?? '',
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, editingCliente]);

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
      vencimiento: form.vencimiento !== '' ? Number(form.vencimiento) : null,
      correo: form.correo.trim().toLowerCase() || null,
      fono: form.fono.trim() ? normalizeFono(form.fono) : null,
      updated_at: new Date().toISOString(),
    };

    if (editingCliente) {
      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', editingCliente.id)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error al actualizar cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Cliente actualizado correctamente' });
        onOpenChange(false);
        onSuccess(data as Cliente);
      }
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert({ ...payload, activo: true, tenant_id: tenantId })
        .select()
        .single();

      if (error) {
        toast({ title: 'Error al crear cliente', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cliente creado correctamente' });
        onOpenChange(false);
        onSuccess(data as Cliente);
      }
    }

    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* RUT */}
          <RutInput
            id="cf-rut"
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
            <Label htmlFor="cf-nombre">
              Nombre del Cliente <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-nombre"
              placeholder="Nombre completo o razón social"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              maxLength={200}
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* Productos o Servicios */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-productos">Productos o Servicios</Label>
            <Textarea
              id="cf-productos"
              placeholder="Separar con coma si son varios"
              value={form.productos_servicios}
              onChange={(e) => setForm((f) => ({ ...f, productos_servicios: e.target.value }))}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Vencimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-vencimiento">Vencimiento</Label>
            <Select
              value={form.vencimiento}
              onValueChange={(v) => setForm((f) => ({ ...f, vencimiento: v }))}
            >
              <SelectTrigger id="cf-vencimiento">
                <SelectValue placeholder="Seleccionar vencimiento" />
              </SelectTrigger>
              <SelectContent>
                {VENCIMIENTO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Correo */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-correo">Correo</Label>
            <Input
              id="cf-correo"
              type="email"
              placeholder="correo@empresa.cl"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              maxLength={254}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-fono">Teléfono</Label>
            <Input
              id="cf-fono"
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
              {saving ? 'Guardando...' : editingCliente ? 'Actualizar Cliente' : 'Guardar Cliente'}
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
