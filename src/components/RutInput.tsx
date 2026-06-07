import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatRut, validateRut } from '@/lib/rut';

interface RutInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** true = empresa extranjera: deshabilita formateo y validación módulo 11 */
  extranjero?: boolean;
  /** Si se provee esta función, se muestra el checkbox "Empresa extranjera" */
  onExtranjeroChange?: (v: boolean) => void;
  id?: string;
  /** Clase adicional para el elemento <input> */
  inputClassName?: string;
}

/**
 * Campo de RUT chileno con:
 * - Formateo automático en tiempo real
 * - Ícono de check verde cuando el RUT es válido
 * - Ícono de X rojo cuando el RUT es inválido
 * - Mensaje de error en rojo debajo del campo
 * - Checkbox "Empresa extranjera" opcional que desactiva la validación módulo 11
 * - inputMode="numeric" para teclado numérico en mobile
 */
export default function RutInput({
  value,
  onChange,
  onBlur,
  error,
  label = 'RUT',
  placeholder = '12345678-9',
  required = false,
  disabled = false,
  extranjero = false,
  onExtranjeroChange,
  id = 'rut',
  inputClassName = '',
}: RutInputProps) {
  const hasValue = value.trim().length > 0;
  const isValid = hasValue && !error && (extranjero || validateRut(value));
  const isInvalid = hasValue && !extranjero && !validateRut(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(extranjero ? raw : formatRut(raw));
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={extranjero ? 'text' : 'numeric'}
          maxLength={extranjero ? undefined : 10}
          className={`pr-9 ${
            error
              ? 'border-red-400 focus-visible:ring-red-400'
              : isValid
              ? 'border-green-400 focus-visible:ring-green-400'
              : ''
          } ${inputClassName}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isValid  && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {isInvalid && !error && <XCircle className="h-4 w-4 text-red-400" />}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {onExtranjeroChange && (
        <div className="flex items-center gap-2 mt-1">
          <Checkbox
            id={`${id}-extranjero`}
            checked={extranjero}
            onCheckedChange={(checked) => onExtranjeroChange(!!checked)}
            disabled={disabled}
          />
          <label
            htmlFor={`${id}-extranjero`}
            className="text-xs text-gray-text cursor-pointer select-none"
          >
            Empresa extranjera 
          </label>
        </div>
      )}
    </div>
  );
}
