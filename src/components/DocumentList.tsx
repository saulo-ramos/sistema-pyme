import { ExternalLink, Download, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  url: string;
  onDelete: () => void;
  deleting?: boolean;
}

export default function DocumentList({ url, onDelete, deleting = false }: Props) {
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'Documento');

  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <FileText className="h-7 w-7 text-green-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy truncate" title={filename}>{filename}</p>
        <p className="text-xs text-green-700">Documento adjunto</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-text hover:text-navy"
          title="Ver documento"
          asChild
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-text hover:text-navy"
          title="Descargar"
          asChild
        >
          <a href={url} download>
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
          disabled={deleting}
          title="Eliminar documento"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
