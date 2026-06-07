import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_BUCKET, getPublicUrl } from '@/lib/storage';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UseDocumentUploadReturn {
  uploading: boolean;
  status: UploadStatus;
  uploadError: string | null;
  upload: (file: File, path: string) => Promise<string | null>;
  remove: (path: string) => Promise<boolean>;
  resetStatus: () => void;
}

export function useDocumentUpload(): UseDocumentUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetStatus = () => {
    setStatus('idle');
    setUploadError(null);
  };

  const upload = async (file: File, path: string): Promise<string | null> => {
    setUploadError(null);

    if (file.size > MAX_SIZE_BYTES) {
      const msg = 'El archivo no puede superar los 10 MB';
      setUploadError(msg);
      setStatus('error');
      return null;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.includes(ext)) {
      const msg = 'Formato no permitido. Use PDF, JPG, PNG o WEBP';
      setUploadError(msg);
      setStatus('error');
      return null;
    }

    setStatus('uploading');
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setStatus('error');
      return null;
    }

    setStatus('success');
    return getPublicUrl(path);
  };

  const remove = async (path: string): Promise<boolean> => {
    setUploadError(null);
    const { error: removeErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    if (removeErr) {
      setUploadError(removeErr.message);
      setStatus('error');
      return false;
    }
    setStatus('idle');
    return true;
  };

  return { uploading: status === 'uploading', status, uploadError, upload, remove, resetStatus };
}
