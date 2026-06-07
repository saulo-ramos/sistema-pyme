import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Plus, Trash2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useToast } from '@/hooks/use-toast';
import { buildStoragePath, extractPathFromUrl } from '@/lib/storage';
import { CATEGORIAS_GASTO, calcularTotal, generarNumero } from '@/lib/rendiciones';
import { formatCLP } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemForm {
  _key: string;
  id: string | null;
  fecha_gasto: string;
  categoria: string;
  comercio: string;
  rut_comercio: string;
  descripcion: string;
  monto: string;
  documento_url: string | null;
  orden: number;
}

interface RendicionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  numero: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  editingId: string | null;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEmptyItem(orden = 0): ItemForm {
  return {
    _key: crypto.randomUUID(),
    id: null,
    fecha_gasto: new Date().toISOString().slice(0, 10),
    categoria: '',
    comercio: '',
    rut_comercio: '',
    descripcion: '',
    monto: '',
    documento_url: null,
    orden,
  };
}

function Field({
  id, label, required, error, children,
}: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-navy/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RendicionFormSheet({
  open, onOpenChange, tenantId, editingId, onSuccess,
}: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { upload, remove } = useDocumentUpload();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState<ItemForm[]>([buildEmptyItem(0)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isEdit = !!editingId;

  // ─── Load existing rendicion ───────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      setTitulo('');
      setDescripcion('');
      setItems([buildEmptyItem(0)]);
      setErrors({});
      return;
    }
    if (!editingId) return;

    const load = async () => {
      const [{ data: r }, { data: its }] = await Promise.all([
        (supabase as any).from('rendiciones').select('titulo, descripcion').eq('id', editingId).single(),
        (supabase as any).from('rendicion_items').select('*').eq('rendicion_id', editingId).order('orden').order('created_at'),
      ]);
      if (r) {
        setTitulo(r.titulo ?? '');
        setDescripcion(r.descripcion ?? '');
      }
      if (its && its.length > 0) {
        setItems(its.map((i: any, idx: number) => ({
          _key: crypto.randomUUID(),
          id: i.id,
          fecha_gasto: i.fecha_gasto,
          categoria: i.categoria,
          comercio: i.comercio,
          rut_comercio: i.rut_comercio ?? '',
          descripcion: i.descripcion,
          monto: String(i.monto ?? ''),
          documento_url: i.documento_url,
          orden: i.orden ?? idx,
        })));
      } else {
        setItems([buildEmptyItem(0)]);
      }
    };
    load();
  }, [open, editingId]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!titulo.trim()) errs.titulo = 'El título es requerido';
    items.forEach((item, idx) => {
      if (!item.fecha_gasto) errs[`item_${idx}_fecha`] = 'Requerido';
      if (!item.categoria) errs[`item_${idx}_categoria`] = 'Requerido';
      if (!item.comercio.trim()) errs[`item_${idx}_comercio`] = 'Requerido';
      if (!item.descripcion.trim()) errs[`item_${idx}_descripcion`] = 'Requerido';
      const m = parseFloat(item.monto);
      if (!item.monto || isNaN(m) || m <= 0) errs[`item_${idx}_monto`] = 'Monto inválido';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Upload doc per item ───────────────────────────────────────────────────

  const handleItemFile = async (key: string, file: File) => {
    const item = items.find(i => i._key === key);
    if (!item) return;

    if (item.documento_url) {
      const oldPath = extractPathFromUrl(item.documento_url);
      if (oldPath) await remove(oldPath);
    }

    setUploadingKey(key);
    const docId = item.id ?? `tmp-${key}`;
    const path = buildStoragePath(tenantId, 'rendicion_items', docId, file.name);
    const url = await upload(file, path);
    setUploadingKey(null);

    if (url) {
      setItems(prev => prev.map(i => i._key === key ? { ...i, documento_url: url } : i));
      if (item.id) {
        await (supabase as any).from('rendicion_items').update({ documento_url: url }).eq('id', item.id);
      }
      sonnerToast.success('Documento subido', { description: file.name });
    } else {
      sonnerToast.error('Error al subir documento');
    }
  };

  const handleRemoveDoc = async (key: string) => {
    const item = items.find(i => i._key === key);
    if (!item?.documento_url) return;
    const path = extractPathFromUrl(item.documento_url);
    if (path) await remove(path);
    setItems(prev => prev.map(i => i._key === key ? { ...i, documento_url: null } : i));
    if (item.id) {
      await (supabase as any).from('rendicion_items').update({ documento_url: null }).eq('id', item.id);
    }
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleGuardar = async (enviar = false) => {
    if (!validate()) return;
    if (!user) return;
    setSaving(true);

    try {
      let rendicionId = editingId;

      if (!isEdit) {
        // Generar número correlativo por tenant
        const { data: last } = await (supabase as any)
          .from('rendiciones')
          .select('numero')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let correlativo = 1;
        if (last?.numero) {
          const parts = last.numero.split('-');
          const n = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(n)) correlativo = n + 1;
        }

        const numero = generarNumero(correlativo, new Date().getFullYear());
        const solicitanteNombre =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          'Sin nombre';

        const { data: newR, error: errR } = await (supabase as any)
          .from('rendiciones')
          .insert({
            tenant_id: tenantId,
            numero,
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
            solicitante_id: user.id,
            solicitante_nombre: solicitanteNombre,
            estado: enviar ? 'Enviada' : 'Borrador',
            fecha_envio: enviar ? new Date().toISOString().slice(0, 10) : null,
          })
          .select('id')
          .single();

        if (errR || !newR) throw new Error(errR?.message ?? 'Error al crear rendición');
        rendicionId = newR.id;
      } else {
        const updateData: Record<string, unknown> = {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          updated_at: new Date().toISOString(),
        };
        if (enviar) {
          updateData.estado = 'Enviada';
          updateData.fecha_envio = new Date().toISOString().slice(0, 10);
          updateData.motivo_rechazo = null;
        }
        const { error: errU } = await (supabase as any)
          .from('rendiciones')
          .update(updateData)
          .eq('id', rendicionId);
        if (errU) throw new Error(errU.message);
      }

      // Upsert items
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const monto = parseFloat(item.monto);
        const itemData = {
          tenant_id: tenantId,
          rendicion_id: rendicionId,
          fecha_gasto: item.fecha_gasto,
          categoria: item.categoria,
          comercio: item.comercio.trim(),
          rut_comercio: item.rut_comercio.trim() || null,
          descripcion: item.descripcion.trim(),
          monto,
          documento_url: item.documento_url,
          orden: idx,
        };

        if (item.id) {
          await (supabase as any).from('rendicion_items').update(itemData).eq('id', item.id);
        } else {
          const { data: newItem } = await (supabase as any)
            .from('rendicion_items')
            .insert(itemData)
            .select('id')
            .single();

          // Re-upload doc with real item id if it was temp
          if (newItem?.id && item.documento_url?.includes('tmp-')) {
            const path = buildStoragePath(tenantId, 'rendicion_items', newItem.id, 'doc');
            sonnerToast.info('Reasignando documento...');
          }
        }
      }

      // Delete removed items (only on edit)
      if (isEdit) {
        const existingIds = items.filter(i => i.id).map(i => i.id);
        const { data: allItems } = await (supabase as any)
          .from('rendicion_items')
          .select('id')
          .eq('rendicion_id', rendicionId);
        if (allItems) {
          const toDelete = allItems.filter((i: any) => !existingIds.includes(i.id));
          for (const d of toDelete) {
            await (supabase as any).from('rendicion_items').delete().eq('id', d.id);
          }
        }
      }

      toast({ title: enviar ? 'Rendición enviada' : isEdit ? 'Rendición actualizada' : 'Rendición creada' });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const totalPreview = calcularTotal(
    items.map(i => ({ monto: parseFloat(i.monto) || 0 })),
  );

  return (
    <Sheet open={open} onOpenChange={v => { if (!saving) onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-navy">
            {isEdit ? 'Editar rendición' : 'Nueva rendición'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Cabecera */}
          <Field id="titulo" label="Título" required error={errors.titulo}>
            <Input
              id="titulo"
              placeholder="Ej: Viaje a Concepción Marzo 2026"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </Field>

          <Field id="descripcion" label="Descripción">
            <Textarea
              id="descripcion"
              placeholder="Descripción opcional..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </Field>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-navy">
                Ítems de gasto ({items.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white h-7"
                onClick={() => setItems(prev => [...prev, buildEmptyItem(prev.length)])}
              >
                <Plus className="h-3 w-3 mr-1" />Agregar ítem
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={item._key} className="border border-border rounded-lg p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-navy/70">Ítem {idx + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive/70"
                        onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field id={`fecha-${idx}`} label="Fecha" required error={errors[`item_${idx}_fecha`]}>
                      <Input
                        id={`fecha-${idx}`}
                        type="date"
                        value={item.fecha_gasto}
                        onChange={e => setItems(prev => prev.map(i => i._key === item._key ? { ...i, fecha_gasto: e.target.value } : i))}
                      />
                    </Field>

                    <Field id={`cat-${idx}`} label="Categoría" required error={errors[`item_${idx}_categoria`]}>
                      <Select
                        value={item.categoria}
                        onValueChange={v => setItems(prev => prev.map(i => i._key === item._key ? { ...i, categoria: v } : i))}
                      >
                        <SelectTrigger id={`cat-${idx}`}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_GASTO.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field id={`comercio-${idx}`} label="Comercio" required error={errors[`item_${idx}_comercio`]}>
                      <Input
                        id={`comercio-${idx}`}
                        placeholder="Nombre del comercio"
                        value={item.comercio}
                        onChange={e => setItems(prev => prev.map(i => i._key === item._key ? { ...i, comercio: e.target.value } : i))}
                      />
                    </Field>

                    <Field id={`rut-${idx}`} label="RUT comercio">
                      <Input
                        id={`rut-${idx}`}
                        placeholder="Opcional"
                        value={item.rut_comercio}
                        onChange={e => setItems(prev => prev.map(i => i._key === item._key ? { ...i, rut_comercio: e.target.value } : i))}
                      />
                    </Field>
                  </div>

                  <Field id={`desc-${idx}`} label="Descripción" required error={errors[`item_${idx}_descripcion`]}>
                    <Input
                      id={`desc-${idx}`}
                      placeholder="Detalle del gasto"
                      value={item.descripcion}
                      onChange={e => setItems(prev => prev.map(i => i._key === item._key ? { ...i, descripcion: e.target.value } : i))}
                    />
                  </Field>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Field id={`monto-${idx}`} label="Monto ($)" required error={errors[`item_${idx}_monto`]}>
                        <Input
                          id={`monto-${idx}`}
                          type="number"
                          min="1"
                          placeholder="0"
                          value={item.monto}
                          onChange={e => setItems(prev => prev.map(i => i._key === item._key ? { ...i, monto: e.target.value } : i))}
                        />
                      </Field>
                    </div>

                    {/* Doc upload */}
                    <div className="shrink-0 pb-0.5">
                      <input
                        ref={el => { fileRefs.current[item._key] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) handleItemFile(item._key, e.target.files[0]);
                          e.target.value = '';
                        }}
                      />
                      {uploadingKey === item._key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-periwinkle" />
                      ) : item.documento_url ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-green-600 font-medium">Doc. adjunto</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive/70"
                            title="Quitar documento"
                            onClick={() => handleRemoveDoc(item._key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-periwinkle"
                          title="Adjuntar documento"
                          onClick={() => fileRefs.current[item._key]?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total preview */}
            <div className="mt-3 flex justify-between items-center bg-[#263578]/5 border border-[#263578]/20 rounded-lg p-3">
              <span className="text-sm font-semibold text-navy">Total estimado</span>
              <span className="text-sm font-bold text-navy">{formatCLP(totalPreview)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={() => handleGuardar(false)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEdit ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-navy hover:bg-navy/90 text-white"
              disabled={saving}
              onClick={() => handleGuardar(true)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar y enviar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
