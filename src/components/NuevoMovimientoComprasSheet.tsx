import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tables } from '@/integrations/supabase/types';
import { Search, UserPlus, CheckCircle2, Loader2, ChevronRight, X, Paperclip } from 'lucide-react';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { escapeLikePattern } from '@/lib/sanitize';
import { validateRut as validateRutMod11, getRutError } from '@/lib/rut';
import RutInput from '@/components/RutInput';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { buildStoragePath, extractPathFromUrl } from '@/lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoDoc = Tables<'tipo_documento'>;

interface Proveedor {
  id: string;
  tenant_id: string;
  rut: string;
  nombre: string;
  productos_servicios: string | null;
  correo: string | null;
  fono: string | null;
  activo: boolean;
}

export interface EditingMovimientoCompras {
  id: string;
  fecha_docto: string;
  folio: number;
  rut_proveedor: string;
  razon_social: string;
  tipo_doc_id: number | null;
  tipo_compra: string | null;
  monto_exento: number | null;
  monto_neto: number | null;
  monto_iva: number | null;
  otro_impto: number | null;
  monto_total: number | null;
  documento_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string | null;
  editingMovimiento?: EditingMovimientoCompras | null;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: string): number {
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
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

export default function NuevoMovimientoComprasSheet({ open, onOpenChange, tenantId, editingMovimiento, onSuccess }: Props) {
  const { toast } = useToast();
  const { uploading, uploadError, upload, remove } = useDocumentUpload();

  // ── Catálogos
  const [tiposDocs, setTiposDocs] = useState<TipoDoc[]>([]);

  // ── Formulario principal
  const [form, setFormState] = useState(buildEmptyForm);
  const [autoIva, setAutoIva] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Búsqueda de proveedor
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Proveedor[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

  // ── Mini-formulario de creación de proveedor
  const [showMiniCreate, setShowMiniCreate] = useState(false);
  const [miniForm, setMiniForm] = useState({ nombre: '', correo: '', fono: '' });
  const [miniSaving, setMiniSaving] = useState(false);
  const [miniError, setMiniError] = useState('');

  // ── Documento adjunto
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [docKey] = useState<string>(() => crypto.randomUUID());

  // ── Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Cargar tipos de documento ──────────────────────────────────────────────
  useEffect(() => {
    supabase.from('tipo_documento').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setTiposDocs(data ?? []));
  }, []);

  // ─── Reset al abrir ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setErrors({});
      setResults([]);
      setShowDropdown(false);
      setShowMiniCreate(false);
      setMiniForm({ nombre: '', correo: '', fono: '' });
      setMiniError('');

      if (editingMovimiento) {
        setFormState({
          fecha_docto: editingMovimiento.fecha_docto,
          fecha_recepcion: '',
          fecha_acuse: '',
          fecha_reclamo: '',
          rut_proveedor: editingMovimiento.rut_proveedor,
          razon_social: editingMovimiento.razon_social,
          tipo_doc_id: editingMovimiento.tipo_doc_id ? String(editingMovimiento.tipo_doc_id) : '',
          tipo_compra: editingMovimiento.tipo_compra ?? '',
          folio: String(editingMovimiento.folio),
          monto_exento: editingMovimiento.monto_exento != null ? String(editingMovimiento.monto_exento) : '',
          monto_neto:   editingMovimiento.monto_neto   != null ? String(editingMovimiento.monto_neto)   : '',
          monto_iva:    editingMovimiento.monto_iva    != null ? String(editingMovimiento.monto_iva)    : '',
          otro_impto:   editingMovimiento.otro_impto   != null ? String(editingMovimiento.otro_impto)   : '',
          monto_total:  editingMovimiento.monto_total  != null ? String(editingMovimiento.monto_total)  : '',
          resultado: '',
          producto_servicio: '',
        });
        setAutoIva(false);
        setQuery(editingMovimiento.rut_proveedor);
        setSelectedProveedor(null);
        setDocumentoUrl(editingMovimiento.documento_url ?? null);
      } else {
        setFormState(buildEmptyForm());
        setAutoIva(true);
        setQuery('');
        setSelectedProveedor(null);
        setDocumentoUrl(null);
      }
    }
  }, [open, editingMovimiento]);

  // ─── Cerrar dropdown al hacer clic fuera ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Cleanup debounce al desmontar ──────────────────────────────────────────
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // ─── Búsqueda de proveedores ────────────────────────────────────────────────
  const buscarProveedores = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const term = q.trim().replace(/\./g, '');
      const safeTerm = escapeLikePattern(term);
      const { data } = await (supabase as any)
        .from('proveedores')
        .select('*')
        .or(`rut.ilike.%${safeTerm}%,nombre.ilike.%${safeTerm}%`)
        .order('nombre')
        .limit(8);
      setResults((data ?? []) as Proveedor[]);
      setShowDropdown(true);
      setSearching(false);
    }, 350);
  }, []);

  // ─── Seleccionar proveedor del dropdown ─────────────────────────────────────
  const handleSelectProveedor = (p: Proveedor) => {
    setSelectedProveedor(p);
    setQuery(p.rut);
    setShowDropdown(false);
    setShowMiniCreate(false);
    setFormState(prev => ({
      ...prev,
      rut_proveedor: p.rut,
      razon_social: p.nombre,
      producto_servicio: p.productos_servicios ?? prev.producto_servicio,
    }));
    setErrors(prev => ({ ...prev, rut_proveedor: '', razon_social: '' }));
  };

  // ─── Limpiar selección ──────────────────────────────────────────────────────
  const handleClearProveedor = () => {
    setSelectedProveedor(null);
    setQuery('');
    setResults([]);
    setShowMiniCreate(false);
    setFormState(prev => ({ ...prev, rut_proveedor: '', razon_social: '', producto_servicio: '' }));
  };

  // ─── Abrir mini-formulario de creación ──────────────────────────────────────
  const handleAbrirMiniCreate = () => {
    const esRut = /^[\d]{6,}-[\dkK]$/.test(query.trim()) || /^[\d]{7,}[\dkK]$/.test(query.trim().replace(/\./g, ''));
    setMiniForm({ nombre: '', correo: '', fono: '' });
    setFormState(prev => ({ ...prev, rut_proveedor: esRut ? normalizeRut(query) : '' }));
    setShowDropdown(false);
    setShowMiniCreate(true);
  };

  // ─── Guardar nuevo proveedor (mini-form) ─────────────────────────────────────
  const handleGuardarMiniProveedor = async () => {
    if (!miniForm.nombre.trim()) { setMiniError('El nombre es obligatorio'); return; }
    const rutErr = getRutError(form.rut_proveedor);
    if (rutErr) { setMiniError(rutErr); return; }

    setMiniSaving(true);
    const { data, error } = await (supabase as any)
      .from('proveedores')
      .insert({
        rut: normalizeRut(form.rut_proveedor),
        nombre: miniForm.nombre.trim(),
        correo: miniForm.correo.trim().toLowerCase() || null,
        fono: miniForm.fono.trim() ? normalizeFono(miniForm.fono) : null,
        activo: true,
      })
      .select()
      .single();

    if (error) {
      setMiniError(error.message.includes('unique') ? 'Este RUT ya está registrado' : 'Error al crear proveedor');
    } else if (data) {
      toast({ title: `Proveedor "${data.nombre}" creado correctamente` });
      handleSelectProveedor(data as Proveedor);
      setShowMiniCreate(false);
    }
    setMiniSaving(false);
  };

  // ─── Actualizar campo con recálculo de IVA/Total/Resultado ──────────────────
  const setField = useCallback((field: string, value: string) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };

      const neto   = num(field === 'monto_neto'   ? value : next.monto_neto);
      const exento = num(field === 'monto_exento' ? value : next.monto_exento);
      const otro   = num(field === 'otro_impto'   ? value : next.otro_impto);

      let iva = num(field === 'monto_iva' ? value : next.monto_iva);
      if (field === 'monto_neto') {
        iva = neto > 0 ? Math.round(neto * 0.19) : 0;
        next.monto_iva = neto > 0 ? String(iva) : '';
      }

      next.monto_total = String(exento + neto + iva + otro) || '';
      // resultado = exento + neto + otro_impto (sin IVA)
      next.resultado = String(exento + neto + otro) || '';
      return next;
    });
  }, []);

  const handleIvaChange = (v: string) => {
    setAutoIva(false);
    setField('monto_iva', v);
  };

  // ─── Validación ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fecha_docto) e.fecha_docto = 'La fecha es obligatoria';
    const rutErr = getRutError(form.rut_proveedor);
    if (rutErr) e.rut_proveedor = rutErr;
    if (!form.razon_social.trim()) e.razon_social = 'La razón social es obligatoria';
    if (!form.folio.trim()) {
      e.folio = 'El folio es obligatorio';
    } else if (isNaN(Number(form.folio)) || Number(form.folio) <= 0) {
      e.folio = 'El folio debe ser un número positivo';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Guardar movimiento ──────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);
    const [y, m] = form.fecha_docto.split('-').map(Number);
    const exento = form.monto_exento ? num(form.monto_exento) : null;
    const neto   = form.monto_neto   ? num(form.monto_neto)   : null;
    const otro   = form.otro_impto   ? num(form.otro_impto)   : null;
    const resultado = (exento ?? 0) + (neto ?? 0) + (otro ?? 0) || null;

    const payload = {
      fecha_docto: form.fecha_docto,
      fecha_recepcion: form.fecha_recepcion || null,
      fecha_acuse: form.fecha_acuse || null,
      fecha_reclamo: form.fecha_reclamo || null,
      anio: y,
      mes: m,
      rut_proveedor: normalizeRut(form.rut_proveedor),
      razon_social: form.razon_social.trim(),
      tipo_doc_id: form.tipo_doc_id ? Number(form.tipo_doc_id) : null,
      tipo_compra: form.tipo_compra.trim() || null,
      folio: Number(form.folio),
      monto_exento: exento,
      monto_neto:   neto,
      monto_iva:    form.monto_iva    ? num(form.monto_iva)     : null,
      otro_impto:   otro,
      monto_total:  form.monto_total  ? num(form.monto_total)   : null,
      resultado,
      producto_servicio: form.producto_servicio.trim() || null,
      documento_url: documentoUrl ?? null,
    };

    let error;
    if (editingMovimiento) {
      ({ error } = await (supabase as any)
        .from('movimientos_compra')
        .update(payload)
        .eq('id', editingMovimiento.id));
    } else {
      ({ error } = await (supabase as any)
        .from('movimientos_compra')
        .insert(payload));
    }

    if (error) {
      toast({ title: 'Error al guardar movimiento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingMovimiento ? 'Compra actualizada correctamente' : 'Movimiento de compra guardado correctamente' });
      onOpenChange(false);
      onSuccess();
    }
    setSaving(false);
  };

  // ─── Upload de documento ─────────────────────────────────────────────────────
  const handleDocUpload = async (file: File) => {
    if (!tenantId) return;
    const path = buildStoragePath(tenantId, 'movimientos_compra', docKey, file.name);
    const url = await upload(file, path);
    if (url) setDocumentoUrl(url);
  };

  const handleDocDelete = async () => {
    if (!documentoUrl) return;
    const path = extractPathFromUrl(documentoUrl);
    if (path) await remove(path);
    setDocumentoUrl(null);
  };

  // ─── Resultado calculado para display ────────────────────────────────────────
  const resultadoDisplay = num(form.resultado) || 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="text-navy text-lg font-bold">
            {editingMovimiento ? 'Editar Compra' : 'Nueva Compra'}
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

          {/* Fechas adicionales */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="fecha_recepcion" label="Fecha Recepción">
              <Input id="fecha_recepcion" type="date" value={form.fecha_recepcion}
                onChange={e => setField('fecha_recepcion', e.target.value)} />
            </Field>
            <Field id="fecha_acuse" label="Fecha Acuse">
              <Input id="fecha_acuse" type="date" value={form.fecha_acuse}
                onChange={e => setField('fecha_acuse', e.target.value)} />
            </Field>
          </div>

          {/* ── Búsqueda de proveedor ── */}
          <div className="space-y-1.5">
            <Label>
              Buscar Proveedor <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-text/60 ml-2">por RUT o nombre</span>
            </Label>

            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/40 pointer-events-none" />
                <Input
                  placeholder="Escribe RUT o nombre del proveedor..."
                  value={selectedProveedor ? `${selectedProveedor.rut} — ${selectedProveedor.nombre}` : query}
                  readOnly={!!selectedProveedor}
                  maxLength={100}
                  onChange={e => {
                    setQuery(e.target.value);
                    buscarProveedores(e.target.value);
                  }}
                  onFocus={() => { if (!selectedProveedor && results.length > 0) setShowDropdown(true); }}
                  className={`pl-9 pr-9 ${selectedProveedor ? 'bg-green-50 border-green-300 text-green-800' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searching && <Loader2 className="h-4 w-4 animate-spin text-gray-text/40" />}
                  {!searching && selectedProveedor && (
                    <button type="button" onClick={handleClearProveedor} title="Cambiar proveedor"
                      className="text-green-600 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {!searching && !selectedProveedor && query.length >= 2 && !showDropdown && (
                    <CheckCircle2 className="h-4 w-4 text-gray-text/30" />
                  )}
                </div>
              </div>

              {selectedProveedor && (
                <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Proveedor encontrado — haz clic en ✕ para cambiar
                </p>
              )}

              {showDropdown && !selectedProveedor && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-card z-50 overflow-hidden">
                  {results.length > 0 ? (
                    <>
                      <div className="py-1 max-h-52 overflow-y-auto">
                        {results.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProveedor(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-light transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <p className="text-sm font-medium text-navy">{p.nombre}</p>
                              <p className="text-xs text-gray-text/70">{p.rut}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-text/30 group-hover:text-periwinkle transition-colors" />
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-border">
                        <button
                          type="button"
                          onClick={handleAbrirMiniCreate}
                          className="w-full text-left px-3 py-2.5 text-xs text-periwinkle hover:bg-periwinkle/5 transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          No está en la lista — Crear nuevo proveedor
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="px-3 py-3 text-sm text-gray-text/60 text-center">
                        No se encontraron proveedores
                      </p>
                      <div className="border-t border-border">
                        <button
                          type="button"
                          onClick={handleAbrirMiniCreate}
                          className="w-full text-left px-3 py-2.5 text-xs text-periwinkle hover:bg-periwinkle/5 transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Crear nuevo proveedor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.rut_proveedor && <p className="text-xs text-red-500">{errors.rut_proveedor}</p>}
          </div>

          {/* ── Mini-formulario de creación de proveedor ── */}
          {showMiniCreate && (
            <div className="border border-periwinkle/30 bg-periwinkle/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-navy flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-periwinkle" />
                  Crear nuevo proveedor
                </p>
                <button type="button" onClick={() => setShowMiniCreate(false)}
                  className="text-gray-text/40 hover:text-gray-text">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <RutInput
                id="mini-rut-proveedor"
                label="RUT"
                value={form.rut_proveedor}
                onChange={v => setFormState(prev => ({ ...prev, rut_proveedor: v }))}
                required
                inputClassName="h-8 text-sm"
              />

              <div className="space-y-1">
                <Label className="text-xs">Nombre del Proveedor <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Razón social o nombre"
                  value={miniForm.nombre}
                  maxLength={200}
                  onChange={e => setMiniForm(p => ({ ...p, nombre: e.target.value }))}
                  className="h-8 text-sm"
                />
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

              {miniError && <p className="text-xs text-red-500">{miniError}</p>}

              <Button
                size="sm"
                className="w-full bg-periwinkle hover:bg-periwinkle/90 text-white h-8 text-xs"
                onClick={handleGuardarMiniProveedor}
                disabled={miniSaving}
              >
                {miniSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                {miniSaving ? 'Guardando...' : 'Guardar y usar este proveedor'}
              </Button>
            </div>
          )}

          {/* Razón Social (manual si no hay proveedor seleccionado) */}
          {!selectedProveedor && (
            <Field id="razon_social" label="Razón Social" required error={errors.razon_social}>
              <Input id="razon_social" placeholder="Ingrese la razón social manualmente"
                value={form.razon_social} maxLength={200}
                onChange={e => setFormState(prev => ({ ...prev, razon_social: e.target.value }))} />
            </Field>
          )}

          {/* Tipo Documento */}
          <Field id="tipo_doc" label="Tipo de Documento">
            <Select value={form.tipo_doc_id} onValueChange={v => setField('tipo_doc_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
              <SelectContent>
                {tiposDocs.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}{t.abreviacion ? ` (${t.abreviacion})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Tipo de Compra */}
          <Field id="tipo_compra" label="Tipo de Compra">
            <Input id="tipo_compra" placeholder="Ej: Servicios, Materiales, Insumos..."
              value={form.tipo_compra} maxLength={150}
              onChange={e => setField('tipo_compra', e.target.value)} />
          </Field>

          {/* Producto / Servicio */}
          <Field id="producto_servicio" label="Producto / Servicio">
            <Input id="producto_servicio" placeholder="Descripción del producto o servicio"
              value={form.producto_servicio} maxLength={500}
              onChange={e => setField('producto_servicio', e.target.value)} />
          </Field>

          {/* ── Montos ── */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-navy uppercase tracking-wide">Montos</p>

            <div className="grid grid-cols-2 gap-3">
              <Field id="monto_exento" label="Exento ($)">
                <Input id="monto_exento" type="number" min="0" placeholder="0"
                  value={form.monto_exento}
                  onChange={e => setField('monto_exento', e.target.value)} />
              </Field>
              <Field id="monto_neto" label="Neto ($)">
                <Input id="monto_neto" type="number" min="0" placeholder="0"
                  value={form.monto_neto}
                  onChange={e => setField('monto_neto', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field id="monto_iva" label={`IVA 19%${autoIva ? ' (auto)' : ''}`}>
                <Input id="monto_iva" type="number" min="0" placeholder="0"
                  value={form.monto_iva}
                  onChange={e => handleIvaChange(e.target.value)}
                  className={autoIva ? 'bg-gray-light text-gray-text/70' : ''} />
              </Field>
              <Field id="otro_impto" label="Otro Impto ($)">
                <Input id="otro_impto" type="number" min="0" placeholder="0"
                  value={form.otro_impto}
                  onChange={e => setField('otro_impto', e.target.value)} />
              </Field>
            </div>

            {/* Resultado (solo lectura) */}
            <div className="bg-periwinkle/5 rounded-lg p-3 flex justify-between items-center border border-periwinkle/20">
              <div>
                <span className="text-sm font-semibold text-navy">Resultado</span>
                <p className="text-[10px] text-gray-text/60">Exento + Neto + Otro Impto</p>
              </div>
              <span className="text-base font-bold text-navy">
                ${resultadoDisplay.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Total */}
            <div className="bg-navy/5 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-navy">Total</span>
              <span className="text-lg font-bold text-navy">
                ${(num(form.monto_total) || 0).toLocaleString('es-CL')}
              </span>
            </div>

            {autoIva ? (
              <button type="button" className="text-xs text-periwinkle hover:underline"
                onClick={() => setAutoIva(false)}>
                Editar IVA manualmente
              </button>
            ) : (
              <button type="button" className="text-xs text-periwinkle hover:underline"
                onClick={() => { setAutoIva(true); setField('monto_neto', form.monto_neto); }}>
                Restaurar cálculo automático de IVA
              </button>
            )}
          </div>

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
              {saving ? 'Guardando...' : editingMovimiento ? 'Actualizar Compra' : 'Guardar Compra'}
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
    fecha_recepcion: '',
    fecha_acuse: '',
    fecha_reclamo: '',
    rut_proveedor: '',
    razon_social: '',
    tipo_doc_id: '',
    tipo_compra: '',
    folio: '',
    monto_exento: '',
    monto_neto: '',
    monto_iva: '',
    otro_impto: '',
    monto_total: '',
    resultado: '',
    producto_servicio: '',
  };
}
