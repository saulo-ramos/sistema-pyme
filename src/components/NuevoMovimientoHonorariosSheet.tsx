import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, CheckCircle2, Loader2, ChevronRight, X, Paperclip } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { buildStoragePath, extractPathFromUrl } from '@/lib/storage';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { escapeLikePattern } from '@/lib/sanitize';
import { getRutError } from '@/lib/rut';
import RutInput from '@/components/RutInput';
import {
  calcularRetencion, calcularPagado,
  TIPOS_HONORARIO, TIPOS_HONORARIO_LABELS, ESTADOS_HONORARIO,
} from '@/lib/honorarios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prestador {
  id: string;
  tenant_id: string;
  rut: string;
  nombre: string;
  correo: string | null;
  fono: string | null;
  sociedad_prof: boolean;
  activo: boolean;
}

export interface EditingMovimientoHonorarios {
  id: string;
  fecha_docto: string;
  folio: number;
  tipo_documento: string;
  rut_prestador: string;
  nombre_prestador: string;
  monto_bruto: number;
  monto_retenido: number;
  monto_pagado: number | null;
  estado: string;
  fecha_anulacion: string | null;
  producto_servicio: string | null;
  documento_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string | null;
  editingMovimiento?: EditingMovimientoHonorarios | null;
  onSuccess: () => void;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ id, label, required, error, children }: {
  id: string; label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NuevoMovimientoHonorariosSheet({ open, onOpenChange, tenantId, editingMovimiento, onSuccess }: Props) {
  const { toast } = useToast();
  const { uploading, uploadError, upload, remove } = useDocumentUpload();

  // ── Formulario principal
  const [form, setFormState] = useState(buildEmptyForm);
  const [editarRetencion, setEditarRetencion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Búsqueda de prestador
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Prestador[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);

  // ── Mini-formulario crear prestador
  const [showMiniCreate, setShowMiniCreate] = useState(false);
  const [miniForm, setMiniForm] = useState({ nombre: '', correo: '', fono: '', sociedad_prof: false });
  const [miniSaving, setMiniSaving] = useState(false);
  const [miniError, setMiniError] = useState('');

  // ── Documento adjunto
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [docKey] = useState<string>(() => crypto.randomUUID());

  // ── Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Reset al abrir ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setErrors({});
      setResults([]);
      setShowDropdown(false);
      setShowMiniCreate(false);
      setMiniForm({ nombre: '', correo: '', fono: '', sociedad_prof: false });
      setMiniError('');

      if (editingMovimiento) {
        setFormState({
          fecha_docto: editingMovimiento.fecha_docto,
          rut_prestador: editingMovimiento.rut_prestador,
          nombre_prestador: editingMovimiento.nombre_prestador,
          tipo_documento: editingMovimiento.tipo_documento,
          folio: String(editingMovimiento.folio),
          monto_bruto: String(editingMovimiento.monto_bruto),
          monto_retenido: String(editingMovimiento.monto_retenido),
          monto_pagado: String(editingMovimiento.monto_pagado ?? 0),
          estado: editingMovimiento.estado,
          fecha_anulacion: editingMovimiento.fecha_anulacion ?? '',
          producto_servicio: editingMovimiento.producto_servicio ?? '',
        });
        setEditarRetencion(false);
        setQuery(editingMovimiento.rut_prestador);
        setSelectedPrestador(null);
        setDocumentoUrl(editingMovimiento.documento_url ?? null);
      } else {
        setFormState(buildEmptyForm());
        setEditarRetencion(false);
        setQuery('');
        setSelectedPrestador(null);
        setDocumentoUrl(null);
      }
    }
  }, [open, editingMovimiento]);

  // ─── Cerrar dropdown al clic fuera ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Cleanup debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // ─── Búsqueda de prestadores ────────────────────────────────────────────────
  const buscarPrestadores = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const term = q.trim().replace(/\./g, '');
      const safeTerm = escapeLikePattern(term);
      const { data } = await (supabase as any)
        .from('prestadores')
        .select('*')
        .or(`rut.ilike.%${safeTerm}%,nombre.ilike.%${safeTerm}%`)
        .order('nombre')
        .limit(8);
      setResults((data ?? []) as Prestador[]);
      setShowDropdown(true);
      setSearching(false);
    }, 350);
  }, []);

  // ─── Seleccionar prestador ──────────────────────────────────────────────────
  const handleSelectPrestador = (p: Prestador) => {
    setSelectedPrestador(p);
    setQuery(p.rut);
    setShowDropdown(false);
    setShowMiniCreate(false);
    setFormState(prev => ({
      ...prev,
      rut_prestador: p.rut,
      nombre_prestador: p.nombre,
    }));
    setErrors(prev => ({ ...prev, rut_prestador: '', nombre_prestador: '' }));
  };

  const handleClearPrestador = () => {
    setSelectedPrestador(null);
    setQuery('');
    setResults([]);
    setShowMiniCreate(false);
    setFormState(prev => ({ ...prev, rut_prestador: '', nombre_prestador: '' }));
  };

  const handleAbrirMiniCreate = () => {
    const esRut = /^[\d]{6,}-[\dkK]$/.test(query.trim()) || /^[\d]{7,}[\dkK]$/.test(query.trim().replace(/\./g, ''));
    setMiniForm({ nombre: '', correo: '', fono: '', sociedad_prof: false });
    setFormState(prev => ({ ...prev, rut_prestador: esRut ? normalizeRut(query) : '' }));
    setShowDropdown(false);
    setShowMiniCreate(true);
  };

  const handleGuardarMiniPrestador = async () => {
    if (!miniForm.nombre.trim()) { setMiniError('El nombre es obligatorio'); return; }
    const rutErr = getRutError(form.rut_prestador);
    if (rutErr) { setMiniError(rutErr); return; }

    setMiniSaving(true);
    const { data, error } = await (supabase as any)
      .from('prestadores')
      .insert({
        rut: normalizeRut(form.rut_prestador),
        nombre: miniForm.nombre.trim(),
        correo: miniForm.correo.trim().toLowerCase() || null,
        fono: miniForm.fono.trim() ? normalizeFono(miniForm.fono) : null,
        sociedad_prof: miniForm.sociedad_prof,
        activo: true,
      })
      .select()
      .single();

    if (error) {
      setMiniError(error.message.includes('unique') ? 'Este RUT ya está registrado' : 'Error al crear prestador');
    } else if (data) {
      toast({ title: `Prestador "${data.nombre}" creado correctamente` });
      handleSelectPrestador(data as Prestador);
      setShowMiniCreate(false);
    }
    setMiniSaving(false);
  };

  // ─── Actualizar campo con recálculo de montos ────────────────────────────────
  const setField = useCallback((field: string, value: string) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };
      const bruto = field === 'monto_bruto' ? Number(value) || 0 : Number(prev.monto_bruto) || 0;

      if (field === 'monto_bruto' && !editarRetencion) {
        next.monto_retenido = String(calcularRetencion(bruto));
      }

      const retenido = field === 'monto_retenido' ? Number(value) || 0 : Number(next.monto_retenido) || 0;
      next.monto_pagado = String(calcularPagado(bruto, retenido));

      return next;
    });
  }, [editarRetencion]);

  const handleBrutoChange = (v: string) => {
    setField('monto_bruto', v);
  };

  const handleRetencionChange = (v: string) => {
    setFormState(prev => {
      const bruto = Number(prev.monto_bruto) || 0;
      const retenido = Number(v) || 0;
      return {
        ...prev,
        monto_retenido: v,
        monto_pagado: String(calcularPagado(bruto, retenido)),
      };
    });
  };

  const restaurarRetencionAuto = () => {
    setEditarRetencion(false);
    setFormState(prev => {
      const bruto = Number(prev.monto_bruto) || 0;
      const retenido = calcularRetencion(bruto);
      return {
        ...prev,
        monto_retenido: String(retenido),
        monto_pagado: String(calcularPagado(bruto, retenido)),
      };
    });
  };

  // ─── Validación ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fecha_docto) e.fecha_docto = 'La fecha es obligatoria';
    const rutErr = getRutError(form.rut_prestador);
    if (rutErr) e.rut_prestador = rutErr;
    if (!form.nombre_prestador.trim()) e.nombre_prestador = 'El nombre del prestador es obligatorio';
    if (!form.folio.trim()) {
      e.folio = 'El folio es obligatorio';
    } else if (isNaN(Number(form.folio)) || Number(form.folio) <= 0) {
      e.folio = 'El folio debe ser un número positivo';
    }
    if (!form.tipo_documento) e.tipo_documento = 'Seleccione un tipo de documento';
    if (form.monto_bruto === '' || Number(form.monto_bruto) < 0) e.monto_bruto = 'El monto bruto es obligatorio';
    if (form.estado === 'Anulado' && !form.fecha_anulacion) e.fecha_anulacion = 'La fecha de anulación es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Guardar movimiento ──────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);
    const [y, m] = form.fecha_docto.split('-').map(Number);
    const bruto = Number(form.monto_bruto) || 0;
    const retenido = Number(form.monto_retenido) || 0;

    const payload = {
      fecha_docto: form.fecha_docto,
      anio: y,
      mes: m,
      rut_prestador: normalizeRut(form.rut_prestador),
      nombre_prestador: form.nombre_prestador.trim(),
      tipo_documento: form.tipo_documento,
      folio: Number(form.folio),
      monto_bruto: bruto,
      monto_retenido: retenido,
      estado: form.estado,
      fecha_anulacion: form.estado === 'Anulado' ? form.fecha_anulacion || null : null,
      producto_servicio: form.producto_servicio.trim() || null,
      documento_url: documentoUrl ?? null,
    };

    let error;
    if (editingMovimiento) {
      ({ error } = await (supabase as any)
        .from('movimientos_honorarios')
        .update(payload)
        .eq('id', editingMovimiento.id));
    } else {
      ({ error } = await (supabase as any)
        .from('movimientos_honorarios')
        .insert(payload));
    }

    if (error) {
      toast({ title: 'Error al guardar honorario', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingMovimiento ? 'Honorario actualizado correctamente' : 'Honorario guardado correctamente' });
      onOpenChange(false);
      onSuccess();
    }
    setSaving(false);
  };

  // ─── Upload de documento ─────────────────────────────────────────────────────
  const handleDocUpload = async (file: File) => {
    if (!tenantId) return;
    const path = buildStoragePath(tenantId, 'movimientos_honorarios', docKey, file.name);
    const url = await upload(file, path);
    if (url) setDocumentoUrl(url);
  };

  const handleDocDelete = async () => {
    if (!documentoUrl) return;
    const path = extractPathFromUrl(documentoUrl);
    if (path) await remove(path);
    setDocumentoUrl(null);
  };

  const pagado = Number(form.monto_pagado) || 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {editingMovimiento ? 'Editar Honorario' : 'Nuevo Honorario'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">

          {/* Fecha + Folio */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="fecha_docto" label="Fecha Docto" required error={errors.fecha_docto}>
              <Input id="fecha_docto" type="date" value={form.fecha_docto}
                onChange={e => setField('fecha_docto', e.target.value)} />
            </Field>
            <Field id="folio" label="Folio" required error={errors.folio}>
              <Input id="folio" placeholder="Ej: 1234" value={form.folio} maxLength={10}
                onChange={e => setField('folio', e.target.value)} />
            </Field>
          </div>

          {/* ── Búsqueda de prestador ── */}
          <div className="space-y-1.5">
            <Label>
              Buscar Prestador <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-text/60 ml-2">por RUT o nombre</span>
            </Label>

            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/40 pointer-events-none" />
                <Input
                  placeholder="Escribe RUT o nombre del prestador..."
                  value={selectedPrestador ? `${selectedPrestador.rut} — ${selectedPrestador.nombre}` : query}
                  readOnly={!!selectedPrestador}
                  maxLength={100}
                  onChange={e => { setQuery(e.target.value); buscarPrestadores(e.target.value); }}
                  onFocus={() => { if (!selectedPrestador && results.length > 0) setShowDropdown(true); }}
                  className={`pl-9 pr-9 ${selectedPrestador ? 'bg-green-50 border-green-300 text-green-800' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searching && <Loader2 className="h-4 w-4 animate-spin text-gray-text/40" />}
                  {!searching && selectedPrestador && (
                    <button type="button" onClick={handleClearPrestador}
                      className="text-green-600 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {selectedPrestador && (
                <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Prestador encontrado — haz clic en ✕ para cambiar
                </p>
              )}

              {showDropdown && !selectedPrestador && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-card z-50 overflow-hidden">
                  {results.length > 0 ? (
                    <>
                      <div className="py-1 max-h-52 overflow-y-auto">
                        {results.map(p => (
                          <button key={p.id} type="button" onClick={() => handleSelectPrestador(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-light transition-colors flex items-center justify-between group">
                            <div>
                              <p className="text-sm font-medium text-navy">{p.nombre}</p>
                              <p className="text-xs text-gray-text/70">{p.rut}{p.sociedad_prof ? ' · Soc. Prof.' : ''}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-text/30 group-hover:text-periwinkle transition-colors" />
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-border">
                        <button type="button" onClick={handleAbrirMiniCreate}
                          className="w-full text-left px-3 py-2.5 text-xs text-periwinkle hover:bg-periwinkle/5 transition-colors flex items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5" />
                          No está en la lista — Crear nuevo prestador
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="px-3 py-3 text-sm text-gray-text/60 text-center">No se encontraron prestadores</p>
                      <div className="border-t border-border">
                        <button type="button" onClick={handleAbrirMiniCreate}
                          className="w-full text-left px-3 py-2.5 text-xs text-periwinkle hover:bg-periwinkle/5 transition-colors flex items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5" />
                          Crear nuevo prestador
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.rut_prestador && <p className="text-xs text-red-500">{errors.rut_prestador}</p>}
          </div>

          {/* ── Mini-formulario crear prestador ── */}
          {showMiniCreate && (
            <div className="border border-periwinkle/30 bg-periwinkle/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-navy flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-periwinkle" />
                  Crear nuevo prestador
                </p>
                <button type="button" onClick={() => setShowMiniCreate(false)}
                  className="text-gray-text/40 hover:text-gray-text">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <RutInput
                id="mini-rut-prestador"
                label="RUT Prestador"
                value={form.rut_prestador}
                onChange={v => setFormState(prev => ({ ...prev, rut_prestador: v }))}
                required
                inputClassName="h-8 text-sm"
              />

              <div className="space-y-1">
                <Label className="text-xs">Nombre del Prestador <span className="text-red-500">*</span></Label>
                <Input placeholder="Nombre o razón social" value={miniForm.nombre} maxLength={200}
                  onChange={e => setMiniForm(p => ({ ...p, nombre: e.target.value }))}
                  className="h-8 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Correo</Label>
                  <Input placeholder="correo@..." value={miniForm.correo} maxLength={254}
                    onChange={e => setMiniForm(p => ({ ...p, correo: e.target.value }))}
                    className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input placeholder="+56 9..." value={miniForm.fono} maxLength={20}
                    onChange={e => setMiniForm(p => ({ ...p, fono: e.target.value }))}
                    className="h-8 text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sociedad_prof"
                  checked={miniForm.sociedad_prof}
                  onCheckedChange={v => setMiniForm(p => ({ ...p, sociedad_prof: !!v }))}
                />
                <Label htmlFor="sociedad_prof" className="text-xs cursor-pointer">Sociedad Profesional</Label>
              </div>

              {miniError && <p className="text-xs text-red-500">{miniError}</p>}

              <Button size="sm" className="w-full bg-periwinkle hover:bg-periwinkle/90 text-white h-8 text-xs"
                onClick={handleGuardarMiniPrestador} disabled={miniSaving}>
                {miniSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                {miniSaving ? 'Guardando...' : 'Guardar y usar este prestador'}
              </Button>
            </div>
          )}

          {/* Nombre Prestador (manual si no hay seleccionado) */}
          {!selectedPrestador && (
            <Field id="nombre_prestador" label="Nombre Prestador" required error={errors.nombre_prestador}>
              <Input id="nombre_prestador" placeholder="Ingrese el nombre manualmente"
                value={form.nombre_prestador} maxLength={200}
                onChange={e => setFormState(prev => ({ ...prev, nombre_prestador: e.target.value }))} />
            </Field>
          )}

          {/* Tipo Documento */}
          <Field id="tipo_documento" label="Tipo de Documento" required error={errors.tipo_documento}>
            <Select value={form.tipo_documento} onValueChange={v => setFormState(prev => ({ ...prev, tipo_documento: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
              <SelectContent>
                {TIPOS_HONORARIO.map(t => (
                  <SelectItem key={t} value={t}>{t} — {TIPOS_HONORARIO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Producto / Servicio */}
          <Field id="producto_servicio" label="Producto / Servicio">
            <Input id="producto_servicio" placeholder="Descripción del servicio prestado"
              value={form.producto_servicio} maxLength={500}
              onChange={e => setField('producto_servicio', e.target.value)} />
          </Field>

          {/* ── Montos ── */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-navy uppercase tracking-wide">Montos</p>

            <Field id="monto_bruto" label="Monto Bruto ($)" required error={errors.monto_bruto}>
              <Input id="monto_bruto" type="number" min="0" placeholder="0"
                value={form.monto_bruto}
                onChange={e => handleBrutoChange(e.target.value)} />
            </Field>

            <Field id="monto_retenido" label={`Retención 10%${!editarRetencion ? ' (auto)' : ''}`}>
              <Input id="monto_retenido" type="number" min="0" placeholder="0"
                value={form.monto_retenido}
                onChange={e => handleRetencionChange(e.target.value)}
                readOnly={!editarRetencion}
                className={!editarRetencion ? 'bg-gray-light text-gray-text/70' : ''} />
            </Field>

            {!editarRetencion ? (
              <button type="button" className="text-xs text-periwinkle hover:underline"
                onClick={() => setEditarRetencion(true)}>
                Editar retención manualmente
              </button>
            ) : (
              <button type="button" className="text-xs text-periwinkle hover:underline"
                onClick={restaurarRetencionAuto}>
                Restaurar retención automática (10%)
              </button>
            )}

            {/* Monto Pagado (solo lectura) */}
            <div className="bg-periwinkle/5 rounded-lg p-3 flex justify-between items-center border border-periwinkle/20">
              <div>
                <span className="text-sm font-semibold text-navy">Monto Pagado</span>
                <p className="text-[10px] text-gray-text/60">Bruto − Retención</p>
              </div>
              <span className="text-base font-bold text-navy">
                ${pagado.toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          {/* Estado */}
          <Field id="estado" label="Estado" required>
            <Select value={form.estado} onValueChange={v => setFormState(prev => ({ ...prev, estado: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS_HONORARIO.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Fecha Anulación (solo si estado = Anulado) */}
          {form.estado === 'Anulado' && (
            <Field id="fecha_anulacion" label="Fecha de Anulación" required error={errors.fecha_anulacion}>
              <Input id="fecha_anulacion" type="date" value={form.fecha_anulacion}
                onChange={e => setFormState(prev => ({ ...prev, fecha_anulacion: e.target.value }))} />
            </Field>
          )}

          {/* ── Documento adjunto ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy uppercase tracking-wide flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Documento adjunto
            </p>
            {documentoUrl ? (
              <DocumentList
                url={documentoUrl}
                onDelete={handleDocDelete}
              />
            ) : (
              <DocumentUpload
                onUpload={handleDocUpload}
                uploading={uploading}
                disabled={!tenantId}
              />
            )}
            {uploadError && (
              <p className="text-xs text-red-500">{uploadError}</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 bg-magenta hover:bg-magenta/90 text-white"
              onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : editingMovimiento ? 'Actualizar Honorario' : 'Guardar Honorario'}
            </Button>
            <Button variant="outline" className="flex-1"
              onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Fuera del componente: fecha siempre dinámica ─────────────────────────────
function buildEmptyForm() {
  return {
    fecha_docto: new Date().toISOString().slice(0, 10),
    rut_prestador: '',
    nombre_prestador: '',
    tipo_documento: '',
    folio: '',
    monto_bruto: '',
    monto_retenido: '',
    monto_pagado: '0',
    estado: 'Vigente',
    fecha_anulacion: '',
    producto_servicio: '',
  };
}
