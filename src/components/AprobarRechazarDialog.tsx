import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'aprobar' | 'rechazar';
  numero: string;
  onConfirm: (motivoRechazo?: string) => Promise<void>;
}

export default function AprobarRechazarDialog({
  open, onOpenChange, mode, numero, onConfirm,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (mode === 'rechazar' && !motivo.trim()) return;
    setSaving(true);
    await onConfirm(mode === 'rechazar' ? motivo.trim() : undefined);
    setSaving(false);
    setMotivo('');
  };

  const handleClose = (v: boolean) => {
    if (!saving) {
      setMotivo('');
      onOpenChange(v);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'aprobar' ? 'Aprobar rendición' : 'Rechazar rendición'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'aprobar'
              ? `¿Confirma la aprobación de la rendición ${numero}? Esta acción no se puede deshacer.`
              : `Ingrese el motivo de rechazo para la rendición ${numero}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mode === 'rechazar' && (
          <div className="space-y-2 px-1">
            <Label htmlFor="motivo-rechazo" className="text-sm font-medium">
              Motivo de rechazo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo-rechazo"
              placeholder="Describa el motivo..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {motivo.trim() === '' && (
              <p className="text-xs text-destructive">El motivo es requerido para rechazar.</p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving || (mode === 'rechazar' && !motivo.trim())}
            onClick={handleConfirm}
            className={mode === 'rechazar' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {saving ? 'Guardando...' : mode === 'aprobar' ? 'Aprobar' : 'Rechazar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
