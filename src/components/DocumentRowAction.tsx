import { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { buildStoragePath, extractPathFromUrl, STORAGE_BUCKET } from '@/lib/storage';
import DocumentPreviewDialog from '@/components/DocumentPreviewDialog';
import { toast } from 'sonner';

interface Props {
  rowId: string;
  tabla: string;
  tenantId: string | null;
  documentoUrl: string | null;
  onDocumentoChange: (id: string, url: string | null) => void;
}

export default function DocumentRowAction({
  rowId,
  tabla,
  tenantId,
  documentoUrl,
  onDocumentoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { uploading, status, uploadError, upload, remove, resetStatus } = useDocumentUpload();

  const getSignedUrl = async (): Promise<string | null> => {
    if (!documentoUrl) return null;
    const path = extractPathFromUrl(documentoUrl);
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast.error('Não foi possível gerar o link do documento');
      return null;
    }
    return data.signedUrl;
  };

  const ALLOWED_TABLES = ['movimientos_venta', 'movimientos_compra', 'movimientos_honorarios', 'movimientos_remuneracion', 'rendicion_items'];

  const persistUrl = async (url: string | null) => {
    if (!ALLOWED_TABLES.includes(tabla)) return;
    await (supabase as any).from(tabla).update({ documento_url: url }).eq('id', rowId);
  };

  const handleFile = async (file: File) => {
    if (!tenantId) return;

    // If replacing, delete old file first
    if (documentoUrl) {
      const oldPath = extractPathFromUrl(documentoUrl);
      if (oldPath) await remove(oldPath);
    }

    const path = buildStoragePath(tenantId, tabla, rowId, file.name);
    const url = await upload(file, path);
    if (url) {
      await persistUrl(url);
      onDocumentoChange(rowId, url);
      toast.success('Documento subido correctamente', {
        description: file.name,
      });
      setTimeout(() => resetStatus(), 2500);
    } else {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo demasiado grande', {
          description: 'El límite es 10 MB.',
        });
      } else if (!allowed.includes(ext)) {
        toast.error('Formato no permitido', {
          description: 'Use PDF, JPG, PNG o WEBP.',
        });
      } else {
        toast.error('Error al subir documento', {
          description: uploadError ?? 'Intente nuevamente.',
        });
      }
    }
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!documentoUrl) return;
    const path = extractPathFromUrl(documentoUrl);
    if (path) await remove(path);
    await persistUrl(null);
    onDocumentoChange(rowId, null);
    toast.success('Documento eliminado');
    setOpen(false);
    setConfirmDelete(false);
  };

  // ── Uploading state
  if (uploading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-periwinkle" />;
  }

  // ── Just-uploaded success flash
  if (status === 'success' && documentoUrl) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  }

  // ── Hidden file input (shared)
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,.webp"
      className="hidden"
      onChange={(e) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
        e.target.value = '';
      }}
    />
  );

  // ── Sin documento: botón gris
  if (!documentoUrl) {
    return (
      <>
        <button
          type="button"
          title="Adjuntar documento"
          disabled={!tenantId}
          onClick={() => inputRef.current?.click()}
          className="p-1 rounded text-muted-foreground/40 hover:text-periwinkle hover:bg-periwinkle/10 transition-colors disabled:cursor-not-allowed"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        {fileInput}
      </>
    );
  }

  // ── Con documento: botón con indicador visual
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Documento adjunto — clic para opciones"
            className="relative p-1 rounded text-periwinkle hover:bg-periwinkle/10 transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-white" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5" align="end" side="left">
          <button
            type="button"
            disabled={loadingUrl}
            onClick={async () => {
              setOpen(false);
              setLoadingUrl(true);
              const signed = await getSignedUrl();
              setLoadingUrl(false);
              if (signed) { setPreviewUrl(signed); setPreviewOpen(true); }
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-foreground w-full transition-colors disabled:opacity-50"
          >
            {loadingUrl ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
            Vista previa
          </button>
          <button
            type="button"
            disabled={loadingUrl}
            onClick={async () => {
              setOpen(false);
              setLoadingUrl(true);
              const signed = await getSignedUrl();
              setLoadingUrl(false);
              if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-foreground w-full transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Abrir en nueva pestaña
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setConfirmReplace(true); }}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent text-foreground w-full transition-colors"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            Reemplazar
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setConfirmDelete(true); }}
            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-destructive/10 text-destructive w-full transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Eliminar
          </button>
          {uploadError && (
            <p className="text-[10px] text-destructive mt-1 px-2">{uploadError}</p>
          )}
        </PopoverContent>
      </Popover>

      {fileInput}

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={(v) => { setPreviewOpen(v); if (!v) setPreviewUrl(null); }}
        url={previewUrl ?? ''}
      />

      {/* Confirmación de reemplazo */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reemplazar documento</AlertDialogTitle>
            <AlertDialogDescription>
              El documento actual será eliminado y reemplazado por el nuevo archivo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmReplace(false); setTimeout(() => inputRef.current?.click(), 50); }}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar este documento? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
