import { useEffect, useState } from 'react';
import { ExternalLink, Eye, FileText, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BADGE_COLORS } from '@/lib/rendiciones';
import { formatCLP } from '@/lib/formatters';
import { buildStoragePath, extractPathFromUrl, STORAGE_BUCKET } from '@/lib/storage';
import DocumentPreviewDialog from '@/components/DocumentPreviewDialog';
import { toast } from 'sonner';

interface RendicionItem {
  id: string;
  fecha_gasto: string;
  categoria: string;
  comercio: string;
  rut_comercio: string | null;
  descripcion: string;
  monto: number;
  documento_url: string | null;
  orden: number;
}

interface Rendicion {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  motivo_rechazo: string | null;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_aprobacion: string | null;
  solicitante_nombre: string;
  aprobado_por_nombre: string | null;
  total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rendicionId: string | null;
}

export default function DetalleRendicionDialog({ open, onOpenChange, rendicionId }: Props) {
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [items, setItems] = useState<RendicionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !rendicionId) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: r }, { data: its }] = await Promise.all([
        (supabase as any).from('rendiciones').select('*').eq('id', rendicionId).single(),
        (supabase as any).from('rendicion_items').select('*').eq('rendicion_id', rendicionId).order('orden').order('created_at'),
      ]);
      setRendicion(r ?? null);
      setItems(its ?? []);
      setLoading(false);
    };
    fetch();
  }, [open, rendicionId]);

  const handleVerDoc = async (url: string, itemId: string) => {
    setLoadingDoc(itemId);
    const path = extractPathFromUrl(url);
    if (!path) { setLoadingDoc(null); return; }
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    setLoadingDoc(null);
    if (error || !data?.signedUrl) {
      toast.error('No se pudo cargar el documento');
      return;
    }
    setPreviewUrl(data.signedUrl);
    setPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-navy" />
              {rendicion ? `${rendicion.numero} — ${rendicion.titulo}` : 'Detalle de rendición'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : rendicion ? (
            <div className="space-y-4">
              {/* Cabecera */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-text text-xs">Estado</span>
                  <div className="mt-0.5">
                    <Badge className={`text-[11px] ${BADGE_COLORS[rendicion.estado] ?? ''}`} style={{ borderRadius: 20 }}>
                      {rendicion.estado}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-text text-xs">Total</span>
                  <p className="font-bold text-navy">{formatCLP(rendicion.total)}</p>
                </div>
                <div>
                  <span className="text-gray-text text-xs">Solicitante</span>
                  <p className="font-medium">{rendicion.solicitante_nombre}</p>
                </div>
                <div>
                  <span className="text-gray-text text-xs">Fecha creación</span>
                  <p>{rendicion.fecha_creacion}</p>
                </div>
                {rendicion.fecha_envio && (
                  <div>
                    <span className="text-gray-text text-xs">Fecha envío</span>
                    <p>{rendicion.fecha_envio}</p>
                  </div>
                )}
                {rendicion.fecha_aprobacion && (
                  <div>
                    <span className="text-gray-text text-xs">Fecha aprobación</span>
                    <p>{rendicion.fecha_aprobacion}</p>
                  </div>
                )}
                {rendicion.aprobado_por_nombre && (
                  <div>
                    <span className="text-gray-text text-xs">Aprobado por</span>
                    <p>{rendicion.aprobado_por_nombre}</p>
                  </div>
                )}
              </div>

              {rendicion.descripcion && (
                <div className="text-sm">
                  <span className="text-gray-text text-xs">Descripción</span>
                  <p className="mt-0.5">{rendicion.descripcion}</p>
                </div>
              )}

              {rendicion.estado === 'Rechazada' && rendicion.motivo_rechazo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-red-700 mb-1">Motivo de rechazo</p>
                  <p className="text-red-600">{rendicion.motivo_rechazo}</p>
                </div>
              )}

              {/* Ítems */}
              <div>
                <h3 className="text-sm font-semibold text-navy mb-2">
                  Ítems de gasto ({items.length})
                </h3>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-text/60 py-4 text-center">Sin ítems registrados</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className={`rounded-lg border border-border p-3 text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="text-[10px] bg-periwinkle/10 text-periwinkle border border-periwinkle/20" style={{ borderRadius: 20 }}>
                                {item.categoria}
                              </Badge>
                              <span className="text-xs text-gray-text">{item.fecha_gasto}</span>
                            </div>
                            <p className="font-medium text-navy mt-1">{item.comercio}</p>
                            {item.rut_comercio && (
                              <p className="text-xs text-gray-text">RUT: {item.rut_comercio}</p>
                            )}
                            <p className="text-xs text-gray-text mt-0.5">{item.descripcion}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <p className="font-bold text-navy">{formatCLP(item.monto)}</p>
                            {item.documento_url && (
                              <button
                                type="button"
                                disabled={loadingDoc === item.id}
                                onClick={() => handleVerDoc(item.documento_url!, item.id)}
                                className="flex items-center gap-1 text-[11px] text-periwinkle hover:underline disabled:opacity-50"
                              >
                                {loadingDoc === item.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Eye className="h-3 w-3" />}
                                Ver doc.
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="bg-[#263578] text-white rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm font-bold">TOTAL ({items.length} ítems)</span>
                      <span className="text-sm font-bold">{formatCLP(rendicion.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-text/60 text-sm">No se pudo cargar la rendición</div>
          )}
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={v => { setPreviewOpen(v); if (!v) setPreviewUrl(null); }}
        url={previewUrl ?? ''}
      />
    </>
  );
}
