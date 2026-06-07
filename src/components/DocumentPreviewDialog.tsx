import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
}

export default function DocumentPreviewDialog({ open, onOpenChange, url }: Props) {
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'Documento');
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate text-sm">{filename}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto rounded border bg-muted/30">
          {isImage ? (
            <img
              src={url}
              alt={filename}
              className="w-full h-auto object-contain max-h-[65vh] mx-auto"
            />
          ) : (
            <iframe
              src={url}
              title={filename}
              className="w-full h-[65vh] border-0"
            />
          )}
        </div>

        <div className="flex items-center gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" asChild>
            <a href={url} download>
              <Download className="h-3.5 w-3.5 mr-1" />
              Descargar
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Abrir en nueva pestaña
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
