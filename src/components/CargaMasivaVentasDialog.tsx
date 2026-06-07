import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Download, Upload, FileSpreadsheet,
  CheckCircle2, XCircle, AlertTriangle, Loader2, X,
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { normalizeRut } from '@/lib/formatters';
import { validateRut } from '@/lib/rut';
import { validarFecha, insertBatch } from '@/lib/movimentos';

type TipoDoc = Tables<'tipo_documento'>;

interface ValidatedRow {
  rowNum: number;
  fecha_docto: string;
  rut_cliente: string;
  razon_social: string;
  tipo_documento_nombre: string;
  folio: string;
  nro: string;
  tipo_venta: string;
  fecha_recepcion: string;
  fecha_acuse: string;
  fecha_reclamo: string;
  monto_exento: string;
  monto_neto: string;
  monto_iva: string;
  otro_impto: string;
  monto_total: string;
  producto_servicio: string;
  // Resueltos
  tipo_doc_id: number | null;
  valid: boolean;
  errors: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

const COLS_REQ = [
  'Fecha', 'RUT_Cliente', 'Razon_Social', 'Tipo_Documento',
  'Folio', 'Exento', 'Neto', 'IVA', 'Otro_Impto', 'Total',
  'Producto_Servicio', 'Nro', 'Tipo_Venta', 'Fecha_Recepcion',
  'Fecha_Acuse', 'Fecha_Reclamo',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CargaMasivaVentasDialog({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tiposDocs, setTiposDocs] = useState<TipoDoc[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

  useEffect(() => {
    supabase.from('tipo_documento').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setTiposDocs(data ?? []));
  }, []);

  // ─── Descargar plantilla ──────────────────────────────────────────────────

  const handleDescargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    // Hoja principal
    const data = [
      COLS_REQ,
      ['2024-01-15', '12345678-5', 'Empresa Ejemplo SpA', 'Factura Electrónica', '1234', '0', '100000', '19000', '0', '119000', 'Servicios informáticos', '1', 'Venta de Servicios', '2024-01-16', '2024-01-17', ''],
      ['2024-01-20', '98765432-5', 'Cliente Demo Ltda', 'Boleta Electrónica', '5678', '50000', '0', '0', '0', '50000', '', '2', '', '', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    // Hoja de referencia de tipos de documento
    const tiposData = [
      ['Nombre (usar exactamente)', 'Abreviación'],
      ...tiposDocs.map(t => [t.nombre, t.abreviacion ?? '']),
    ];
    const wsTipos = XLSX.utils.aoa_to_sheet(tiposData);
    wsTipos['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTipos, 'Tipos de Documento');

    // Hoja de instrucciones
    const instrData = [
      ['Campo', 'Obligatorio', 'Formato / Valores válidos'],
      ['Fecha', 'Sí', 'YYYY-MM-DD (ej: 2024-01-15)'],
      ['RUT_Cliente', 'Sí', 'Con guión y dígito verificador (ej: 12345678-5)'],
      ['Razon_Social', 'Sí', 'Texto libre'],
      ['Tipo_Documento', 'No', 'Nombre exacto según hoja "Tipos de Documento"'],
      ['Folio', 'Sí', 'Número entero positivo'],
      ['Exento', 'No', 'Número entero (0 si no aplica)'],
      ['Neto', 'No', 'Número entero (0 si no aplica)'],
      ['IVA', 'No', 'Número entero (0 si no aplica, normalmente Neto × 19%)'],
      ['Otro_Impto', 'No', 'Número entero (0 si no aplica)'],
      ['Total', 'No', 'Suma de Exento + Neto + IVA + Otro_Impto'],
      ['Producto_Servicio', 'No', 'Texto libre'],
      ['Nro', 'No', 'Número correlativo'],
      ['Tipo_Venta', 'No', 'Texto libre (ej: Venta de mercaderías)'],
      ['Fecha_Recepcion', 'No', 'YYYY-MM-DD'],
      ['Fecha_Acuse', 'No', 'YYYY-MM-DD'],
      ['Fecha_Reclamo', 'No', 'YYYY-MM-DD'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla_ventas.xlsx');
  };

  // ─── Procesar archivo ─────────────────────────────────────────────────────

  const procesarArchivo = async (file: File) => {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

    if (raw.length < 2) {
      toast({ title: 'El archivo está vacío o no tiene datos', variant: 'destructive' });
      return;
    }

    const encabezados = (raw[0] as string[]).map(h => String(h).trim());
    const faltantes = COLS_REQ.filter(c => !encabezados.includes(c));
    if (faltantes.length > 0) {
      toast({
        title: `Columnas faltantes: ${faltantes.join(', ')}`,
        description: 'Descarga la plantilla oficial y vuelve a intentarlo.',
        variant: 'destructive',
      });
      return;
    }

    const idx = (col: string) => encabezados.indexOf(col);
    const dataRows = raw.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

    if (dataRows.length > 500) {
      toast({
        title: 'El archivo supera el límite de 500 registros',
        description: `El archivo tiene ${dataRows.length} filas. Divídelo en partes de máximo 500.`,
        variant: 'destructive',
      });
      return;
    }

    // Mapa de tipos de documento (nombre → id, case-insensitive)
    const tipoMap = new Map<string, number>();
    tiposDocs.forEach(t => tipoMap.set(t.nombre.toLowerCase().trim(), t.id));

    // Folios existentes en la BD (para detectar duplicados)
    const { data: existentes } = await supabase
      .from('movimientos_venta')
      .select('folio, tipo_doc_id');
    const foliosExistentes = new Set(
      (existentes ?? []).map(e => `${e.folio}-${e.tipo_doc_id ?? 'null'}`)
    );

    // Folios dentro del propio archivo
    const foliosEnArchivo = new Map<string, number>();

    const validadas: ValidatedRow[] = dataRows.map((row, i) => {
      const rowNum = i + 2;
      const get = (col: string) => String(row[idx(col)] ?? '').trim();

      const fecha_docto          = get('Fecha');
      const rut_cliente          = get('RUT_Cliente');
      const razon_social         = get('Razon_Social');
      const tipo_documento_nombre = get('Tipo_Documento');
      const folioStr             = get('Folio');
      const monto_exento         = get('Exento');
      const monto_neto           = get('Neto');
      const monto_iva            = get('IVA');
      const otro_impto           = get('Otro_Impto');
      const monto_total          = get('Total');
      const producto_servicio    = get('Producto_Servicio');
      const nro                  = encabezados.includes('Nro') ? get('Nro') : '';
      const tipo_venta           = encabezados.includes('Tipo_Venta') ? get('Tipo_Venta') : '';
      const fecha_recepcion      = encabezados.includes('Fecha_Recepcion') ? get('Fecha_Recepcion') : '';
      const fecha_acuse          = encabezados.includes('Fecha_Acuse') ? get('Fecha_Acuse') : '';
      const fecha_reclamo        = encabezados.includes('Fecha_Reclamo') ? get('Fecha_Reclamo') : '';

      const errores: string[] = [];

      // Fecha
      if (!fecha_docto) {
        errores.push('Fecha es obligatoria');
      } else if (!validarFecha(fecha_docto)) {
        errores.push(`Fecha inválida "${fecha_docto}" (use formato YYYY-MM-DD)`);
      }
      
      // Fechas opcionales
      if (fecha_recepcion && !validarFecha(fecha_recepcion)) errores.push(`Fecha Recepción "${fecha_recepcion}" inválida (YYYY-MM-DD)`);
      if (fecha_acuse && !validarFecha(fecha_acuse)) errores.push(`Fecha Acuse "${fecha_acuse}" inválida (YYYY-MM-DD)`);
      if (fecha_reclamo && !validarFecha(fecha_reclamo)) errores.push(`Fecha Reclamo "${fecha_reclamo}" inválida (YYYY-MM-DD)`);

      // RUT
      if (!rut_cliente) {
        errores.push('RUT es obligatorio');
      } else if (!validateRut(rut_cliente)) {
        errores.push('RUT inválido (dígito verificador incorrecto)');
      }

      // Razón social
      if (!razon_social) errores.push('Razón Social es obligatoria');
      else if (razon_social.length > 200) errores.push('Razón Social supera 200 caracteres');

      // Folio
      if (!folioStr) {
        errores.push('Folio es obligatorio');
      } else if (isNaN(Number(folioStr)) || Number(folioStr) <= 0) {
        errores.push(`Folio "${folioStr}" inválido (debe ser número positivo)`);
      }

      // Tipo de documento (opcional, pero si se ingresa debe existir)
      let tipo_doc_id: number | null = null;
      if (tipo_documento_nombre) {
        const found = tipoMap.get(tipo_documento_nombre.toLowerCase());
        if (found !== undefined) {
          tipo_doc_id = found;
        } else {
          errores.push(`Tipo de documento "${tipo_documento_nombre}" no encontrado (ver hoja "Tipos de Documento")`);
        }
      }

      // Longitud de campos de texto libres
      if (tipo_venta.length > 150) errores.push('Tipo_Venta supera 150 caracteres');
      if (producto_servicio.length > 500) errores.push('Producto_Servicio supera 500 caracteres');

      // Validar montos (deben ser números si se proveen)
      [['Exento', monto_exento], ['Neto', monto_neto], ['IVA', monto_iva],
       ['Otro_Impto', otro_impto], ['Total', monto_total]].forEach(([label, val]) => {
        if (val && (isNaN(Number(val)) || Number(val) < 0)) {
          errores.push(`${label} "${val}" no es un número válido`);
        }
      });

      // Duplicado en el archivo
      const folioKey = `${folioStr}-${tipo_doc_id ?? 'null'}`;
      if (folioStr && !isNaN(Number(folioStr))) {
        if (foliosEnArchivo.has(folioKey)) {
          errores.push(`Folio ${folioStr} duplicado en el archivo (fila ${foliosEnArchivo.get(folioKey)})`);
        } else {
          foliosEnArchivo.set(folioKey, rowNum);
        }

        // Duplicado en la BD
        if (foliosExistentes.has(folioKey)) {
          errores.push(`Folio ${folioStr} ya existe en el sistema para este tipo de documento`);
        }
      }

      return {
        rowNum, fecha_docto, rut_cliente, razon_social, tipo_documento_nombre,
        folio: folioStr, monto_exento, monto_neto, monto_iva, otro_impto, monto_total,
        producto_servicio, tipo_doc_id,
        nro, tipo_venta, fecha_recepcion, fecha_acuse, fecha_reclamo,
        valid: errores.length === 0,
        errors: errores,
      };
    });

    setRows(validadas);
    setStep('preview');
  };

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast({ title: 'Formato no permitido. Use .xlsx, .xls o .csv', variant: 'destructive' });
      return;
    }
    procesarArchivo(file);
  };

  // ─── Importar ─────────────────────────────────────────────────────────────

  const handleImportar = async () => {
    const validas = rows.filter(r => r.valid);
    if (!validas.length) return;
    setStep('importing');

    const inserts = validas.map(r => {
      const [y, m] = r.fecha_docto.split('-').map(Number);
      const exento = r.monto_exento ? Number(r.monto_exento) : null;
      const neto   = r.monto_neto   ? Number(r.monto_neto)   : null;
      const otro   = r.otro_impto   ? Number(r.otro_impto)   : null;

      return {
        fecha_docto: r.fecha_docto,
        anio: y,
        mes: m,
        nro: r.nro ? Number(r.nro) : null,
        tipo_venta: r.tipo_venta || null,
        rut_cliente: normalizeRut(r.rut_cliente),
        razon_social: r.razon_social,
        tipo_doc_id: r.tipo_doc_id,
        folio: Number(r.folio),
        monto_exento: exento,
        monto_neto:   neto,
        monto_iva:    r.monto_iva    ? Number(r.monto_iva)     : null,
        otro_impto:   otro,
        monto_total:  r.monto_total  ? Number(r.monto_total)   : null,
        producto_servicio: r.producto_servicio || null,
        fecha_recepcion: r.fecha_recepcion || null,
        fecha_acuse: r.fecha_acuse || null,
        fecha_reclamo: r.fecha_reclamo || null,
        tenant_id: tenantId,
      };
    });

    const { success, failed } = await insertBatch('movimientos_venta', inserts);

    setImportResult({ success, failed });
    setStep('done');
    if (success > 0) { onSuccess(); toast({ title: `${success} movimiento(s) importado(s) correctamente` }); }
    if (failed > 0)  toast({ title: `${failed} registro(s) no pudieron importarse`, variant: 'destructive' });
  };

  const handleClose = () => {
    setStep('upload'); setFileName(''); setRows([]); setImportResult({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  const validas   = rows.filter(r => r.valid);
  const invalidas = rows.filter(r => !r.valid);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-navy text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-periwinkle" />
            Carga Masiva de Ventas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Descarga la plantilla oficial. Incluye 3 hojas: Ventas, Tipos de Documento e Instrucciones.</li>
                  <li>Completa la hoja "Ventas" respetando el formato de cada columna.</li>
                  <li>Para el tipo de documento, usa el nombre exacto de la hoja "Tipos de Documento".</li>
                  <li>Sube el archivo — el sistema validará antes de importar.</li>
                </ol>
              </div>

              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div>
                  <p className="font-semibold text-navy text-sm">Plantilla oficial</p>
                  <p className="text-xs text-gray-text mt-0.5">
                    Incluye datos de ejemplo, tipos de documento disponibles e instrucciones
                  </p>
                </div>
                <Button variant="outline" className="border-navy text-navy hover:bg-navy hover:text-white shrink-0"
                  onClick={handleDescargarPlantilla} disabled={tiposDocs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                  ${dragging ? 'border-periwinkle bg-periwinkle/5' : 'border-border hover:border-periwinkle hover:bg-periwinkle/5'}`}
              >
                <Upload className="h-10 w-10 mx-auto text-gray-text/40 mb-3" />
                <p className="font-medium text-navy">Arrastra tu archivo aquí</p>
                <p className="text-sm text-gray-text mt-1">o haz clic para seleccionar</p>
                <p className="text-xs text-gray-text/60 mt-2">Formatos: .xlsx, .xls, .csv</p>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-gray-light rounded-lg px-4 py-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-navy" />
                  <span className="text-navy font-medium">{fileName}</span>
                  <button className="text-gray-text/50 hover:text-gray-text ml-1"
                    onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" /><span><strong>{validas.length}</strong> filas válidas</span>
                </div>
                {invalidas.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm">
                    <XCircle className="h-4 w-4" /><span><strong>{invalidas.length}</strong> filas con errores</span>
                  </div>
                )}
              </div>

              {invalidas.length > 0 && validas.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Las filas con errores <strong>no serán importadas</strong>. Puedes corregir el archivo y volver a subirlo, o importar solo las {validas.length} filas válidas.</p>
                </div>
              )}

              {validas.length === 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>No hay filas válidas. Corrige el archivo y vuelve a subirlo.</p>
                </div>
              )}

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-navy text-white">
                      <tr>
                        <th className="px-3 py-2.5 text-left w-8">#</th>
                        <th className="px-3 py-2.5 text-left">Fecha</th>
                        <th className="px-3 py-2.5 text-left">RUT</th>
                        <th className="px-3 py-2.5 text-left">Cliente</th>
                        <th className="px-3 py-2.5 text-left hidden sm:table-cell">Tipo Doc</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Folio</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Total</th>
                        <th className="px-3 py-2.5 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.rowNum}
                          className={`border-t border-border/50 ${row.valid ? idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-gray-text/60">{row.rowNum}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.fecha_docto || '—'}</td>
                          <td className="px-3 py-2 font-medium text-navy">{row.rut_cliente || '—'}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate">{row.razon_social || '—'}</td>
                          <td className="px-3 py-2 hidden sm:table-cell max-w-[100px] truncate">{row.tipo_documento_nombre || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">{row.folio || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">{row.monto_total ? `$${Number(row.monto_total).toLocaleString('es-CL')}` : '—'}</td>
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <Badge className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-100 text-[10px]" style={{ borderRadius: '20px' }}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />OK
                              </Badge>
                            ) : (
                              <div className="space-y-0.5">
                                <Badge className="bg-red-100 text-red-600 border border-red-300 hover:bg-red-100 text-[10px]" style={{ borderRadius: '20px' }}>
                                  <XCircle className="h-3 w-3 mr-1" />Error
                                </Badge>
                                {row.errors.map((e, i) => (
                                  <p key={i} className="text-[10px] text-red-600">{e}</p>
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

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 text-periwinkle animate-spin" />
              <p className="font-semibold text-navy">Importando movimientos...</p>
              <p className="text-sm text-gray-text">Por favor espera, no cierres esta ventana</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              {importResult.success > 0
                ? <CheckCircle2 className="h-16 w-16 text-green-500" />
                : <XCircle className="h-16 w-16 text-red-500" />}
              <div className="text-center">
                <p className="text-xl font-bold text-navy">
                  {importResult.success > 0 ? '¡Importación completada!' : 'Error en la importación'}
                </p>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-gray-light/50">
          {step === 'upload' && (
            <><p className="text-xs text-gray-text/60">Máximo 500 registros por carga</p>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button></>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}>← Volver</Button>
              <Button className="bg-magenta hover:bg-magenta/90 text-white" onClick={handleImportar} disabled={validas.length === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validas.length} movimiento{validas.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 'importing' && <div className="w-full text-center text-sm text-gray-text/60">Procesando...</div>}
          {step === 'done' && (
            <div className="w-full flex justify-end">
              <Button className="bg-navy hover:bg-navy/90 text-white" onClick={handleClose}>Cerrar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
