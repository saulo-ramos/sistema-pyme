import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAvatar } from '@/lib/profile';

interface AvatarUploaderProps {
  fotoUrl: string | null;
  nombre: string | null;
  tenantId: string;
  userId: string;
  onUploaded: (url: string) => void;
}

export default function AvatarUploader({
  fotoUrl,
  nombre,
  tenantId,
  userId,
  onUploaded,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(fotoUrl);

  const initials = nombre
    ? nombre
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';

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
      const url = await uploadAvatar(file, tenantId, userId);
      setPreview(url);
      onUploaded(url);
      toast.success('Foto de perfil actualizada');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        className="relative group h-24 w-24 rounded-full overflow-hidden bg-periwinkle/20 border-2 border-periwinkle/40 hover:border-periwinkle transition-colors focus:outline-none focus:ring-2 focus:ring-periwinkle"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Cambiar foto de perfil"
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-semibold text-periwinkle">{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
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
      <p className="text-xs text-gray-text">Haz clic para cambiar la foto</p>
    </div>
  );
}
