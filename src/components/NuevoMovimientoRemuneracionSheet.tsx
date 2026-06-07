import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { buildStoragePath, extractPathFromUrl } from '@/lib/storage';
import {
  calcularTotalImponible, calcularTotalHaberes, calcularTotalDescuentos,
  calcularLiquido, calcularCostoTotal,
} from '@/lib/remuneraciones';
import { formatCLP } from '@/lib/formatters';
import { CUR_YEAR, MESES, ANOS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrabajadorBasico {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string | null;
  trabajadores: TrabajadorBasico[];
  editingId: string | null;
  defaultAnio: number;
  defaultMes: number;
  onSuccess: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────


// ─── Form helpers ─────────────────────────────────────────────────────────────

function buildEmpty(anio: number, mes: number) {
  return {
    trabajador_id: '',
    anio,
    mes,
    dias_trabajados: '',
    sueldo_base: '', gratificacion: '', horas_extras: '',
    bono_1: '', bono_2: '', bono_3: '',
    asig_familiar: '', movilizacion: '', colacion: '', viatico: '',
    afp: '', salud: '', seguro: '', impuesto: '', otros_descuentos: '',
    sis: '', aporte: '', vida: '', isl: '', mipe: '', corfo: '', otro: '',
    documento_url: null as string | null,
  };
}

type FormState = ReturnType<typeof buildEmpty>;

function n(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0;
  return Number(v) || 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MoneyField({ id, label, value, onChange }: {
  id: string; label: string; value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id} type="number" min="0" step="1" placeholder="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-right text-xs h-8"
      />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-navy uppercase tracking-wide border-b border-border pb-1 mt-4 mb-2">
      {title}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NuevoMovimientoRemuneracionSheet({
  open, onOpenChange, tenantId, trabajadores, editingId, defaultAnio, defaultMes, onSuccess,
}: Props) {
  const { toast } = useToast();
  const { uploading, uploadError, upload, remove } = useDocumentUpload();
  const [form, setForm] = useState<FormState>(() => buildEmpty(defaultAnio, defaultMes));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docKey] = useState<string>(() => crypto.randomUUID());

  // Load existing record for edit
  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      setForm(buildEmpty(defaultAnio, defaultMes));
      setErrors({});
      return;
    }
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from('movimientos_remuneracion')
        .select('*')
        .eq('id', editingId)
        .single();
      if (error || !data) {
        toast({ title: 'Error al cargar movimiento', variant: 'destructive' });
        return;
      }
      const s = (v: any) => (v != null ? String(v) : '');
      setForm({
        trabajador_id: data.trabajador_id ?? '',
        anio: data.anio ?? defaultAnio,
        mes: data.mes ?? defaultMes,
        dias_trabajados: s(data.dias_trabajados),
        sueldo_base: s(data.sueldo_base),
        gratificacion: s(data.gratificacion),
        horas_extras: s(data.horas_extras),
        bono_1: s(data.bono_1),
        bono_2: s(data.bono_2),
        bono_3: s(data.bono_3),
        asig_familiar: s(data.asig_familiar),
        movilizacion: s(data.movilizacion),
        colacion: s(data.colacion),
        viatico: s(data.viatico),
        afp: s(data.afp),
        salud: s(data.salud),
        seguro: s(data.seguro),
        impuesto: s(data.impuesto),
        otros_descuentos: s(data.otros_descuentos),
        sis: s(data.sis),
        aporte: s(data.aporte),
        vida: s(data.vida),
        isl: s(data.isl),
        mipe: s(data.mipe),
        corfo: s(data.corfo),
        otro: s(data.otro),
        documento_url: data.documento_url ?? null,
      });
      setErrors({});
    };
    load();
  }, [open, editingId]);

  const set = (field: keyof FormState, value: string | number | null) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Auto-calculated totals
  const totalImponible = useMemo(() =>
    calcularTotalImponible(
      n(form.sueldo_base), n(form.gratificacion), n(form.horas_extras),
      n(form.bono_1), n(form.bono_2), n(form.bono_3),
    ), [form.sueldo_base, form.gratificacion, form.horas_extras, form.bono_1, form.bono_2, form.bono_3]);

  const totalHaberes = useMemo(() =>
    calcularTotalHaberes(totalImponible, n(form.asig_familiar), n(form.movilizacion), n(form.colacion), n(form.viatico)),
    [totalImponible, form.asig_familiar, form.movilizacion, form.colacion, form.viatico]);

  const totalDescuentos = useMemo(() =>
    calcularTotalDescuentos(n(form.afp), n(form.salud), n(form.seguro), n(form.impuesto), n(form.otros_descuentos)),
    [form.afp, form.salud, form.seguro, form.impuesto, form.otros_descuentos]);

  const liquido = useMemo(() =>
    calcularLiquido(totalHaberes, totalDescuentos),
    [totalHaberes, totalDescuentos]);

  const costoTotal = useMemo(() =>
    calcularCostoTotal(totalHaberes, n(form.sis), n(form.aporte), n(form.vida), n(form.isl), n(form.mipe), n(form.corfo), n(form.otro)),
    [totalHaberes, form.sis, form.aporte, form.vida, form.isl, form.mipe, form.corfo, form.otro]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.trabajador_id) e.trabajador_id = 'Seleccione un trabajador';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      trabajador_id: form.trabajador_id,
      anio: Number(form.anio),
      mes: Number(form.mes),
      dias_trabajados: n(form.dias_trabajados) || null,
      sueldo_base: n(form.sueldo_base) || null,
      gratificacion: n(form.gratificacion) || null,
      horas_extras: n(form.horas_extras) || null,
      bono_1: n(form.bono_1) || null,
      bono_2: n(form.bono_2) || null,
      bono_3: n(form.bono_3) || null,
      total_imponible: totalImponible || null,
      asig_familiar: n(form.asig_familiar) || null,
      movilizacion: n(form.movilizacion) || null,
      colacion: n(form.colacion) || null,
      viatico: n(form.viatico) || null,
      total_haberes: totalHaberes || null,
      afp: n(form.afp) || null,
      salud: n(form.salud) || null,
      seguro: n(form.seguro) || null,
      impuesto: n(form.impuesto) || null,
      otros_descuentos: n(form.otros_descuentos) || null,
      total_descuentos: totalDescuentos || null,
      liquido: liquido || null,
      sis: n(form.sis) || null,
      aporte: n(form.aporte) || null,
      vida: n(form.vida) || null,
      isl: n(form.isl) || null,
      mipe: n(form.mipe) || null,
      corfo: n(form.corfo) || null,
      otro: n(form.otro) || null,
      costo_total: costoTotal || null,
      documento_url: form.documento_url ?? null,
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase as any)
        .from('movimientos_remuneracion')
        .update(payload)
        .eq('id', editingId));
    } else {
      ({ error } = await (supabase as any)
        .from('movimientos_remuneracion')
        .insert({ ...payload, tenant_id: tenantId }));
    }

    if (error) {
      const msg = error.message?.includes('unique')
        ? 'Ya existe un registro para este trabajador en el período seleccionado'
        : error.message;
      toast({ title: 'Error al guardar', description: msg, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Movimiento actualizado' : 'Movimiento guardado' });
      onOpenChange(false);
      onSuccess();
    }
    setSaving(false);
  };

  const handleDocUpload = async (file: File) => {
    if (!tenantId) return;
    const key = editingId ?? docKey;
    const path = buildStoragePath(tenantId, 'movimientos_remuneracion', key, file.name);
    const url = await upload(file, path);
    if (url) set('documento_url', url);
  };

  const handleDocDelete = async () => {
    if (!form.documento_url) return;
    const path = extractPathFromUrl(form.documento_url);
    if (path) await remove(path);
    set('documento_url', null);
  };

  const isEdit = !!editingId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {isEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-1">

          {/* Período */}
          <SectionHeader title="Período" />
          <div className="space-y-1.5">
            <Label className="text-xs">
              Trabajador <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.trabajador_id}
              onValueChange={v => set('trabajador_id', v)}
              disabled={isEdit}
            >
              <SelectTrigger className={`text-xs h-9 ${isEdit ? 'opacity-70' : ''}`}>
                <SelectValue placeholder="Seleccionar trabajador..." />
              </SelectTrigger>
              <SelectContent>
                {trabajadores.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.rut} — {t.nombre} {t.apellido_paterno}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.trabajador_id && (
              <p className="text-xs text-red-500">{errors.trabajador_id}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Año</Label>
              <Select
                value={String(form.anio)}
                onValueChange={v => set('anio', Number(v))}
                disabled={isEdit}
              >
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mes</Label>
              <Select
                value={String(form.mes)}
                onValueChange={v => set('mes', Number(v))}
                disabled={isEdit}
              >
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dias" className="text-xs">Días Trab.</Label>
              <Input
                id="dias" type="number" min="0" max="31" placeholder="0"
                className="text-xs h-9"
                value={form.dias_trabajados}
                onChange={e => set('dias_trabajados', e.target.value)}
              />
            </div>
          </div>

          {/* Haberes Imponibles */}
          <SectionHeader title="Haberes Imponibles" />
          <div className="grid grid-cols-2 gap-2">
            <MoneyField id="sueldo_base"   label="Sueldo Base"   value={form.sueldo_base}   onChange={v => set('sueldo_base', v)} />
            <MoneyField id="gratificacion" label="Gratificación" value={form.gratificacion} onChange={v => set('gratificacion', v)} />
            <MoneyField id="horas_extras"  label="Horas Extras"  value={form.horas_extras}  onChange={v => set('horas_extras', v)} />
            <MoneyField id="bono_1"        label="Bono 1"        value={form.bono_1}        onChange={v => set('bono_1', v)} />
            <MoneyField id="bono_2"        label="Bono 2"        value={form.bono_2}        onChange={v => set('bono_2', v)} />
            <MoneyField id="bono_3"        label="Bono 3"        value={form.bono_3}        onChange={v => set('bono_3', v)} />
          </div>
          <div className="bg-navy/5 rounded-lg p-2 flex justify-between items-center border border-navy/10 mt-1">
            <span className="text-xs font-semibold text-navy">Total Imponible</span>
            <span className="text-sm font-bold text-navy">{formatCLP(totalImponible)}</span>
          </div>

          {/* Haberes No Imponibles */}
          <SectionHeader title="Haberes No Imponibles" />
          <div className="grid grid-cols-2 gap-2">
            <MoneyField id="asig_familiar" label="Asig. Familiar" value={form.asig_familiar} onChange={v => set('asig_familiar', v)} />
            <MoneyField id="movilizacion"  label="Movilización"   value={form.movilizacion}  onChange={v => set('movilizacion', v)} />
            <MoneyField id="colacion"      label="Colación"       value={form.colacion}      onChange={v => set('colacion', v)} />
            <MoneyField id="viatico"       label="Viático"        value={form.viatico}       onChange={v => set('viatico', v)} />
          </div>
          <div className="bg-periwinkle/5 rounded-lg p-2 flex justify-between items-center border border-periwinkle/10 mt-1">
            <span className="text-xs font-semibold text-periwinkle">Total Haberes</span>
            <span className="text-sm font-bold text-periwinkle">{formatCLP(totalHaberes)}</span>
          </div>

          {/* Descuentos */}
          <SectionHeader title="Descuentos" />
          <div className="grid grid-cols-2 gap-2">
            <MoneyField id="afp"             label="AFP"              value={form.afp}             onChange={v => set('afp', v)} />
            <MoneyField id="salud"           label="Salud"            value={form.salud}           onChange={v => set('salud', v)} />
            <MoneyField id="seguro"          label="Seg. Cesantía"    value={form.seguro}          onChange={v => set('seguro', v)} />
            <MoneyField id="impuesto"        label="Impuesto 2a Cat." value={form.impuesto}        onChange={v => set('impuesto', v)} />
            <MoneyField id="otros_descuentos" label="Otros Desc."     value={form.otros_descuentos} onChange={v => set('otros_descuentos', v)} />
          </div>
          <div className="bg-magenta/5 rounded-lg p-2 flex justify-between items-center border border-magenta/10 mt-1">
            <span className="text-xs font-semibold text-magenta">Total Descuentos</span>
            <span className="text-sm font-bold text-magenta">{formatCLP(totalDescuentos)}</span>
          </div>

          {/* Líquido */}
          <div className="bg-navy rounded-lg p-3 flex justify-between items-center mt-3">
            <div>
              <span className="text-sm font-bold text-white">Líquido a Pagar</span>
              <p className="text-[10px] text-white/60">Total Haberes − Total Descuentos</p>
            </div>
            <span className="text-lg font-bold text-white">{formatCLP(liquido)}</span>
          </div>

          {/* Aportes Empresa */}
          <SectionHeader title="Aportes Empresa" />
          <div className="grid grid-cols-2 gap-2">
            <MoneyField id="sis"    label="SIS"           value={form.sis}    onChange={v => set('sis', v)} />
            <MoneyField id="aporte" label="Aporte Empresa" value={form.aporte} onChange={v => set('aporte', v)} />
            <MoneyField id="vida"   label="Vida"          value={form.vida}   onChange={v => set('vida', v)} />
            <MoneyField id="isl"    label="ISL"           value={form.isl}    onChange={v => set('isl', v)} />
            <MoneyField id="mipe"   label="MIPE"          value={form.mipe}   onChange={v => set('mipe', v)} />
            <MoneyField id="corfo"  label="CORFO"         value={form.corfo}  onChange={v => set('corfo', v)} />
            <MoneyField id="otro"   label="Otro"          value={form.otro}   onChange={v => set('otro', v)} />
          </div>
          <div className="bg-magenta/5 rounded-lg p-2 flex justify-between items-center border border-magenta/10 mt-1">
            <span className="text-xs font-semibold text-magenta">Costo Total Empresa</span>
            <span className="text-sm font-bold text-magenta">{formatCLP(costoTotal)}</span>
          </div>

          {/* Documento adjunto */}
          <SectionHeader title="Documento adjunto" />
          <div className="flex items-center gap-1.5 mb-2">
            <Paperclip className="h-3.5 w-3.5 text-navy/60" />
            <span className="text-xs text-gray-text/60">Adjunte comprobante (PDF, imagen)</span>
          </div>
          {form.documento_url ? (
            <DocumentList url={form.documento_url} onDelete={handleDocDelete} />
          ) : (
            <DocumentUpload onUpload={handleDocUpload} uploading={uploading} disabled={!tenantId} />
          )}
          {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-navy hover:bg-navy/90 text-white"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Guardar Movimiento'}
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
