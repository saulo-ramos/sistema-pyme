import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { normalizeRut, normalizeFono } from '@/lib/formatters';
import { validateRut } from '@/lib/rut';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface RawRow {
  rut: string;
  nombre: string;
  productos_servicios: string;
  vencimiento: string;
  correo: string;
  fono: string;
}

interface ValidatedRow extends RawRow {
  rowNum: number;
  valid: boolean;
  errors: string[];
}

interface CargaMasivaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const VENCIMIENTO_VALIDOS = [0, 15, 30, 60, 90, 120];
const COLUMNAS_REQUERIDAS = ['RUT', 'Nombre', 'Productos_Servicios', 'Vencimiento', 'Correo', 'Telefono'];

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------
function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function CargaMasivaDialog({
  open,
  onOpenChange,
  tenantId,
  onSuccess,
}: CargaMasivaDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

  // -------------------------------------------------------------------------
  // Descargar plantilla
  // -------------------------------------------------------------------------
  const handleDescargarPlantilla = () => {
    const datos = [
      COLUMNAS_REQUERIDAS,
      ['12345678-5', 'Empresa Ejemplo SpA', 'Consultoría, Soporte', '30', 'contacto@empresa.cl', '+56 9 1234 5678'],
      ['98765432-5', 'Cliente Demo Ltda', '', '0', '', ''],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datos);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 35 }, { wch: 13 }, { wch: 28 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx');
  };

  // -------------------------------------------------------------------------
  // Parsear y validar archivo
  // -------------------------------------------------------------------------
  const procesarArchivo = async (file: File) => {
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (raw.length < 2) {
      toast({ title: 'El archivo está vacío o no tiene datos', variant: 'destructive' });
      return;
    }

    // Verificar encabezados
    const encabezados = (raw[0] as string[]).map((h) => String(h).trim());
    const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !encabezados.includes(c));
    if (faltantes.length > 0) {
      toast({
        title: `Columnas faltantes: ${faltantes.join(', ')}`,
        description: 'Descarga la plantilla oficial y vuelve a intentarlo.',
        variant: 'destructive',
      });
      return;
    }

    const idxRut = encabezados.indexOf('RUT');
    const idxNombre = encabezados.indexOf('Nombre');
    const idxProd = encabezados.indexOf('Productos_Servicios');
    const idxVenc = encabezados.indexOf('Vencimiento');
    const idxCorreo = encabezados.indexOf('Correo');
    const idxFono = encabezados.indexOf('Telefono');

    const dataRows = raw.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));

    const MAX_ROWS = 500;
    if (dataRows.length > MAX_ROWS) {
      toast({
        title: `Máximo ${MAX_ROWS} registros por carga`,
        description: `El archivo tiene ${dataRows.length} filas. Divídelo en partes más pequeñas.`,
        variant: 'destructive',
      });
      return;
    }

    // Verificar duplicados dentro del propio archivo
    const rutsEnArchivo = new Map<string, number>();

    // Verificar RUTs ya existentes en la base de datos
    const { data: existentes } = await supabase
      .from('clientes')
      .select('rut');
    const rutsExistentes = new Set((existentes ?? []).map((e) => normalizeRut(e.rut)));

    const validadas: ValidatedRow[] = dataRows.map((row, i) => {
      const rowNum = i + 2; // +2 por encabezado y 0-index
      const rut = String(row[idxRut] ?? '').trim();
      const nombre = String(row[idxNombre] ?? '').trim();
      const productos_servicios = String(row[idxProd] ?? '').trim();
      const vencimientoRaw = String(row[idxVenc] ?? '').trim();
      const correo = String(row[idxCorreo] ?? '').trim();
      const fono = String(row[idxFono] ?? '').trim();

      const errores: string[] = [];

      // RUT
      if (!rut) {
        errores.push('RUT es obligatorio');
      } else if (!validateRut(rut)) {
        errores.push('RUT inválido (formato incorrecto o dígito verificador erróneo)');
      } else {
        const rutNorm = normalizeRut(rut);
        if (rutsExistentes.has(rutNorm)) {
          errores.push('RUT ya existe en el sistema');
        }
        if (rutsEnArchivo.has(rutNorm)) {
          errores.push(`RUT duplicado en el archivo (fila ${rutsEnArchivo.get(rutNorm)})`);
        } else {
          rutsEnArchivo.set(rutNorm, rowNum);
        }
      }

      // Nombre
      if (!nombre) errores.push('Nombre es obligatorio');

      // Vencimiento
      if (vencimientoRaw !== '') {
        const vNum = Number(vencimientoRaw);
        if (isNaN(vNum) || !VENCIMIENTO_VALIDOS.includes(vNum)) {
          errores.push(`Vencimiento inválido "${vencimientoRaw}". Valores permitidos: ${VENCIMIENTO_VALIDOS.join(', ')}`);
        }
      }

      // Correo
      if (correo && !validarEmail(correo)) {
        errores.push('Correo electrónico con formato inválido');
      }

      return {
        rowNum,
        rut,
        nombre,
        productos_servicios,
        vencimiento: vencimientoRaw,
        correo,
        fono,
        valid: errores.length === 0,
        errors: errores,
      };
    });

    setRows(validadas);
    setStep('preview');
  };

  const handleFile = (file: File) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Archivo demasiado grande. Máximo 5MB.', variant: 'destructive' });
      return;
    }

    const ALLOWED_TYPES = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      '', // alguns browsers não informam MIME para csv — fallback para extensão
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '') || (!ALLOWED_TYPES.includes(file.type) && file.type !== '')) {
      toast({ title: 'Formato no permitido. Use .xlsx, .xls o .csv', variant: 'destructive' });
      return;
    }

    procesarArchivo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // -------------------------------------------------------------------------
  // Importar registros válidos
  // -------------------------------------------------------------------------
  const handleImportar = async () => {
    const validas = rows.filter((r) => r.valid);
    if (validas.length === 0) return;

    setStep('importing');

    const inserts = validas.map((r) => ({
      rut: normalizeRut(r.rut),
      nombre: r.nombre,
      productos_servicios: r.productos_servicios || null,
      vencimiento: r.vencimiento !== '' ? Number(r.vencimiento) : null,
      correo: r.correo ? r.correo.trim().toLowerCase() : null,
      fono: r.fono ? normalizeFono(r.fono) : null,
      activo: true,
      updated_at: new Date().toISOString(),
      tenant_id: tenantId,
    }));

    // Insertar en lotes de 50
    let success = 0;
    let failed = 0;
    const BATCH = 50;

    for (let i = 0; i < inserts.length; i += BATCH) {
      const batch = inserts.slice(i, i + BATCH);
      const { error } = await supabase.from('clientes').insert(batch);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    setImportResult({ success, failed });
    setStep('done');

    if (success > 0) {
      onSuccess();
      toast({ title: `${success} cliente(s) importado(s) correctamente` });
    }
    if (failed > 0) {
      toast({ title: `${failed} registro(s) no pudieron importarse`, variant: 'destructive' });
    }
  };

  // -------------------------------------------------------------------------
  // Reset al cerrar
  // -------------------------------------------------------------------------
  const handleClose = () => {
    setStep('upload');
    setFileName('');
    setRows([]);
    setImportResult({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  const validas = rows.filter((r) => r.valid);
  const invalidas = rows.filter((r) => !r.valid);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-navy text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-periwinkle" />
            Carga Masiva de Clientes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ================================================================
              PASO 1: Upload
          ================================================================ */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Descarga la plantilla oficial de Excel.</li>
                  <li>Completa los datos respetando el formato de cada columna.</li>
                  <li>Sube el archivo — el sistema validará antes de importar.</li>
                  <li>Solo se importarán las filas sin errores.</li>
                </ol>
              </div>

              {/* Descargar plantilla */}
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div>
                  <p className="font-semibold text-navy text-sm">Plantilla oficial</p>
                  <p className="text-xs text-gray-text mt-0.5">
                    Formato correcto con columnas requeridas y datos de ejemplo
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-navy text-navy hover:bg-navy hover:text-white shrink-0"
                  onClick={handleDescargarPlantilla}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>

              {/* Zona de drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                  ${dragging
                    ? 'border-periwinkle bg-periwinkle/5'
                    : 'border-border hover:border-periwinkle hover:bg-periwinkle/5'
                  }
                `}
              >
                <Upload className="h-10 w-10 mx-auto text-gray-text/40 mb-3" />
                <p className="font-medium text-navy">Arrastra tu archivo aquí</p>
                <p className="text-sm text-gray-text mt-1">o haz clic para seleccionar</p>
                <p className="text-xs text-gray-text/60 mt-2">Formatos aceptados: .xlsx, .xls, .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>
            </div>
          )}

          {/* ================================================================
              PASO 2: Preview / Validación
          ================================================================ */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-gray-light rounded-lg px-4 py-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-navy" />
                  <span className="text-navy font-medium">{fileName}</span>
                  <button
                    className="text-gray-text/50 hover:text-gray-text ml-1"
                    onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span><strong>{validas.length}</strong> filas válidas</span>
                </div>
                {invalidas.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span><strong>{invalidas.length}</strong> filas con errores</span>
                  </div>
                )}
              </div>

              {invalidas.length > 0 && validas.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Las filas con errores <strong>no serán importadas</strong>.
                    Puedes corregir el archivo y volver a subirlo, o continuar importando solo las {validas.length} filas válidas.
                  </p>
                </div>
              )}

              {validas.length === 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>No hay filas válidas para importar. Corrige el archivo y vuelve a subirlo.</p>
                </div>
              )}

              {/* Tabla de preview */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-navy text-white">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold w-10">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold">RUT</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
                        <th className="px-3 py-2.5 text-left font-semibold hidden sm:table-cell">Venc.</th>
                        <th className="px-3 py-2.5 text-left font-semibold hidden md:table-cell">Correo</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr
                          key={row.rowNum}
                          className={`border-t border-border/50 ${
                            row.valid
                              ? idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'
                              : 'bg-red-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-text/60">{row.rowNum}</td>
                          <td className="px-3 py-2 font-medium text-navy">{row.rut || '—'}</td>
                          <td className="px-3 py-2 max-w-[160px] truncate">{row.nombre || '—'}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            {row.vencimiento !== '' ? `${row.vencimiento === '0' ? 'Sin venc.' : row.vencimiento + ' días'}` : '—'}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell max-w-[160px] truncate text-gray-text/70">
                            {row.correo || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <Badge
                                className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-100 text-[10px]"
                                style={{ borderRadius: '20px' }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            ) : (
                              <div className="space-y-0.5">
                                <Badge
                                  className="bg-red-100 text-red-600 border border-red-300 hover:bg-red-100 text-[10px]"
                                  style={{ borderRadius: '20px' }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Error
                                </Badge>
                                {row.errors.map((e, i) => (
                                  <p key={i} className="text-[10px] text-red-600 mt-0.5">{e}</p>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PASO 3: Importando
          ================================================================ */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 text-periwinkle animate-spin" />
              <p className="font-semibold text-navy">Importando clientes...</p>
              <p className="text-sm text-gray-text">Por favor espera, no cierres esta ventana</p>
            </div>
          )}

          {/* ================================================================
              PASO 4: Resultado
          ================================================================ */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-xl font-bold text-navy">¡Importación completada!</p>
                <p className="text-sm text-gray-text mt-1">Resumen del proceso</p>
              </div>
              <div className="flex gap-4">
                {importResult.success > 0 && (
                  <div className="text-center bg-green-50 border border-green-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-xs text-green-700 mt-1">Importados correctamente</p>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="text-center bg-red-50 border border-red-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-red-500">{importResult.failed}</p>
                    <p className="text-xs text-red-600 mt-1">No pudieron importarse</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            Footer con acciones
        ================================================================ */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-gray-light/50">
          {step === 'upload' && (
            <>
              <p className="text-xs text-gray-text/60">Máximo 500 registros por carga</p>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
              >
                ← Volver
              </Button>
              <Button
                className="bg-magenta hover:bg-magenta/90 text-white"
                onClick={handleImportar}
                disabled={validas.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {validas.length} cliente{validas.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}

          {step === 'importing' && (
            <div className="w-full text-center text-sm text-gray-text/60">
              Procesando...
            </div>
          )}

          {step === 'done' && (
            <div className="w-full flex justify-end">
              <Button
                className="bg-navy hover:bg-navy/90 text-white"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
