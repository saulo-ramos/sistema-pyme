import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
  onUpload: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
}

export default function DocumentUpload({ onUpload, uploading = false, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && !uploading && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      className={[
        'border-2 border-dashed rounded-lg p-5 text-center transition-colors',
        disabled || uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        dragging
          ? 'border-periwinkle bg-periwinkle/5'
          : 'border-border hover:border-periwinkle hover:bg-periwinkle/5',
      ].join(' ')}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 text-periwinkle animate-spin" />
          <p className="text-sm text-gray-text">Subiendo documento...</p>
        </div>
      ) : (
        <>
          <Upload className="h-7 w-7 mx-auto text-gray-text/40 mb-2" />
          <p className="text-sm font-medium text-navy">Arrastra el documento aquí</p>
          <p className="text-xs text-gray-text/60 mt-1">o haz clic para seleccionar</p>
          <p className="text-xs text-gray-text/40 mt-1">PDF, JPG, PNG · Máx 10 MB</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
      />
    </div>
  );
}
