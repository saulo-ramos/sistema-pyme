import { useState } from 'react';
import { formatRut, validateRut, getRutError } from '@/lib/rut';

interface UseRutInputReturn {
  value: string;
  error: string | null;
  extranjero: boolean;
  handleChange: (newValue: string) => void;
  handleBlur: () => void;
  isValid: boolean;
  reset: () => void;
  setExtranjero: (v: boolean) => void;
}

/**
 * Hook que encapsula toda la lógica de un campo RUT.
 *
 * Uso:
 *   const rut = useRutInput();
 *   <RutInput
 *     value={rut.value}
 *     onChange={rut.handleChange}
 *     onBlur={rut.handleBlur}
 *     error={rut.error}
 *     extranjero={rut.extranjero}
 *     onExtranjeroChange={rut.setExtranjero}
 *   />
 */
export function useRutInput(initialValue = ''): UseRutInputReturn {
  const [value, setValue] = useState(() =>
    initialValue ? formatRut(initialValue) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [extranjero, setExtranjeroState] = useState(false);

  const handleChange = (newValue: string) => {
    const formatted = extranjero ? newValue : formatRut(newValue);
    setValue(formatted);
    if (error) setError(null); // limpiar error mientras escribe
  };

  const handleBlur = () => {
    if (!extranjero) {
      setError(getRutError(value));
    } else {
      setError(value.trim() ? null : 'El RUT es obligatorio');
    }
  };

  const isValid = extranjero
    ? value.trim().length > 0
    : validateRut(value);

  const reset = () => {
    setValue('');
    setError(null);
    setExtranjeroState(false);
  };

  const setExtranjero = (v: boolean) => {
    setExtranjeroState(v);
    setError(null);
    if (!v) setValue(formatRut(value)); // re-formatear al desactivar
  };

  return { value, error, extranjero, handleChange, handleBlur, isValid, reset, setExtranjero };
}
