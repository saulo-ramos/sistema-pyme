import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLogo } from '@/lib/profile';

interface LogoUploaderProps {
  logoUrl: string | null;
  tenantId: string;
  onUploaded: (url: string) => void;
}

export default function LogoUploader({ logoUrl, tenantId, onUploaded }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 5 MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLogo(file, tenantId);
      setPreview(url);
      onUploaded(url);
      toast.success('Logo actualizado');
    } catch {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        className="relative group h-28 w-48 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-periwinkle transition-colors focus:outline-none focus:ring-2 focus:ring-periwinkle flex items-center justify-center"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Cambiar logo de empresa"
      >
        {preview ? (
          <img src={preview} alt="Logo empresa" className="max-h-24 max-w-44 object-contain" />
        ) : (
          <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <p className="text-xs text-gray-text">Haz clic para subir el logo (JPG, PNG, WEBP · máx. 5 MB)</p>
    </div>
  );
}
