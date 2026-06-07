import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { normalizeRut }  from '@/lib/formatters';
import { getRutError }   from '@/lib/rut';
import RutInput          from '@/components/RutInput';
import {
  TIPOS_CONTRATO, AFPS, OPCIONES_SALUD,
} from '@/lib/remuneraciones';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Trabajador {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_ingreso: string | null;
  cargo: string | null;
  sucursal: string | null;
  tipo_contrato: string | null;
  afp: string | null;
  salud: string | null;
  activo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  editingTrabajador?: Trabajador | null;
  onSuccess: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FichaTrabajadorSheet({
  open, onOpenChange, tenantId, editingTrabajador, onSuccess,
}: Props) {
  const { toast } = useToast();
  const isEditing = !!editingTrabajador;

  // ── Form state ──────────────────────────────────────────────────
  const [rut, setRut]                         = useState(editingTrabajador?.rut ?? '');
  const [rutError, setRutError]               = useState<string | null>(null);
  const [extranjero, setExtranjero]           = useState(false);
  const [nombre, setNombre]                   = useState(editingTrabajador?.nombre ?? '');
  const [apellidoP, setApellidoP]             = useState(editingTrabajador?.apellido_paterno ?? '');
  const [apellidoM, setApellidoM]             = useState(editingTrabajador?.apellido_materno ?? '');
  const [fechaIngreso, setFechaIngreso]       = useState(editingTrabajador?.fecha_ingreso ?? '');
  const [cargo, setCargo]                     = useState(editingTrabajador?.cargo ?? '');
  const [sucursal, setSucursal]               = useState(editingTrabajador?.sucursal ?? '');
  const [tipoContrato, setTipoContrato]       = useState(editingTrabajador?.tipo_contrato ?? '');
  const [afp, setAfp]                         = useState(editingTrabajador?.afp ?? '');
  const [salud, setSalud]                     = useState(editingTrabajador?.salud ?? '');
  const [saving, setSaving]                   = useState(false);

  // Sync state when open/editingTrabajador changes
  useEffect(() => {
    if (open) {
      setRut(editingTrabajador?.rut ?? '');
      setRutError(null);
      setExtranjero(false);
      setNombre(editingTrabajador?.nombre ?? '');
      setApellidoP(editingTrabajador?.apellido_paterno ?? '');
      setApellidoM(editingTrabajador?.apellido_materno ?? '');
      setFechaIngreso(editingTrabajador?.fecha_ingreso ?? '');
      setCargo(editingTrabajador?.cargo ?? '');
      setSucursal(editingTrabajador?.sucursal ?? '');
      setTipoContrato(editingTrabajador?.tipo_contrato ?? '');
      setAfp(editingTrabajador?.afp ?? '');
      setSalud(editingTrabajador?.salud ?? '');
    }
  }, [open, editingTrabajador]);

  // ── Validation ──────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!extranjero) {
      const err = getRutError(rut);
      if (err) { setRutError(err); return false; }
    }
    if (!rut.trim())      { toast({ title: 'RUT es obligatorio', variant: 'destructive' }); return false; }
    if (!nombre.trim())   { toast({ title: 'Nombre es obligatorio', variant: 'destructive' }); return false; }
    if (!apellidoP.trim()){ toast({ title: 'Apellido paterno es obligatorio', variant: 'destructive' }); return false; }
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      tenant_id:        tenantId,
      rut:              extranjero ? rut.trim().toUpperCase() : normalizeRut(rut),
      nombre:           nombre.trim(),
      apellido_paterno: apellidoP.trim(),
      apellido_materno: apellidoM.trim() || null,
      fecha_ingreso:    fechaIngreso || null,
      cargo:            cargo.trim() || null,
      sucursal:         sucursal.trim() || null,
      tipo_contrato:    tipoContrato || null,
      afp:              afp || null,
      salud:            salud || null,
    };

    const { error } = isEditing
      ? await (supabase as any).from('trabajadores').update(payload).eq('id', editingTrabajador!.id)
      : await (supabase as any).from('trabajadores').insert({ ...payload, activo: true });

    setSaving(false);

    if (error) {
      const isDup = error.message?.includes('trabajadores_tenant_rut_unique');
      toast({
        title: isDup ? 'RUT ya existe en la nómina' : 'Error al guardar trabajador',
        description: isDup ? `El RUT ${payload.rut} ya está registrado.` : error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: isEditing ? 'Trabajador actualizado' : 'Trabajador creado correctamente' });
    onSuccess();
    onOpenChange(false);
  };

  // ── UI ───────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-navy text-lg font-bold">
            {isEditing ? 'Editar Trabajador' : 'Nuevo Trabajador'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* RUT */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">
              RUT <span className="text-destructive">*</span>
            </Label>
            <RutInput
              value={rut}
              onChange={setRut}
              error={rutError}
              onBlur={() => {
                if (!extranjero) setRutError(getRutError(rut));
              }}
              extranjero={extranjero}
              onExtranjeroChange={setExtranjero}
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-[10px] text-gray-text/60">El RUT no se puede modificar.</p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre(s)" className="text-sm" />
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">
                Apellido Paterno <span className="text-destructive">*</span>
              </Label>
              <Input value={apellidoP} onChange={e => setApellidoP(e.target.value)} placeholder="Paterno" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Apellido Materno</Label>
              <Input value={apellidoM} onChange={e => setApellidoM(e.target.value)} placeholder="Materno" className="text-sm" />
            </div>
          </div>

          {/* Fecha ingreso */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Fecha de Ingreso</Label>
            <Input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className="text-sm" />
          </div>

          {/* Cargo + Sucursal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Cargo</Label>
              <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej: Vendedor" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Sucursal</Label>
              <Input value={sucursal} onChange={e => setSucursal(e.target.value)} placeholder="Ej: Casa Matriz" className="text-sm" />
            </div>
          </div>

          {/* Tipo contrato */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Tipo de Contrato</Label>
            <Select value={tipoContrato} onValueChange={setTipoContrato}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_CONTRATO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* AFP + Salud */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">AFP</Label>
              <Select value={afp} onValueChange={setAfp}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="AFP..." /></SelectTrigger>
                <SelectContent>
                  {AFPS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-navy/70 uppercase tracking-wide">Salud</Label>
              <Select value={salud} onValueChange={setSalud}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Salud..." /></SelectTrigger>
                <SelectContent>
                  {OPCIONES_SALUD.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-navy hover:bg-navy/90 text-white"
            onClick={handleGuardar}
            disabled={saving}
          >
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
