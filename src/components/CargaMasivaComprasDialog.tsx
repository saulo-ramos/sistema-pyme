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
  CheckCircle2, XCircle, AlertTriangle, Loader2, X, UserPlus,
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { normalizeRut } from '@/lib/formatters';
import { validateRut } from '@/lib/rut';
import { validarFecha, insertBatch } from '@/lib/movimentos';
import ProveedorFormSheet from '@/components/ProveedorFormSheet';

type TipoDoc = Tables<'tipo_documento'>;

interface ValidatedRow {
  rowNum: number;
  anio: string;
  mes: string;
  nro: string;
  tipo_doc_nombre: string;
  rut_proveedor: string;
  razon_social: string;
  folio: string;
  fecha_docto: string;
  fecha_recepcion: string;
  fecha_acuse: string;
  fecha_reclamo: string;
  monto_exento: string;
  monto_neto: string;
  monto_iva: string;
  otro_impto: string;
  monto_total: string;
  tipo_compra: string;
  producto_servicio: string;
  documento_url: string;
  // Resueltos
  tipo_doc_id: number | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

const COLS_REQ = [
  'Anio', 'Mes', 'Nro', 'Tipo_Doc', 'Rut_Proveedor',
  'Razon_Social', 'Folio', 'Fecha_Docto',
  'Monto_Exento', 'Monto_Neto', 'Monto_IVA', 'Otro_Impto', 'Monto_Total',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CargaMasivaComprasDialog({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tiposDocs, setTiposDocs] = useState<TipoDoc[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, duplicados: 0, advertencias: 0 });

  // ── Registro de proveedor desde preview
  const [provSheetOpen, setProvSheetOpen] = useState(false);
  const [provSheetRut, setProvSheetRut] = useState('');

  useEffect(() => {
    supabase.from('tipo_documento').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setTiposDocs(data ?? []));
  }, []);

  // ─── Descargar plantilla ──────────────────────────────────────────────────

  const handleDescargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    // Hoja principal
    const data = [
      [...COLS_REQ, 'Tipo_Compra', 'Producto_Servicio', 'Fecha_Recepcion', 'Fecha_Acuse', 'Fecha_Reclamo', 'Documento_URL'],
      [2024, 1, 1, 'Factura Electrónica', '12345678-5', 'Proveedor Ejemplo SpA', 1234, '2024-01-15', 0, 100000, 19000, 0, 119000, 'Servicios', 'Servicios informáticos', '2024-01-16', '2024-01-17', '', 'https://ejemplo.com/doc.pdf'],
      [2024, 1, 2, 'Boleta Electrónica', '98765432-5', 'Proveedor Demo Ltda', 5678, '2024-01-20', 50000, 0, 0, 0, 50000, '', '', '', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 }, { wch: 5 }, { wch: 6 }, { wch: 24 }, { wch: 14 },
      { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');

    // Hoja de tipos de documento
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
      ['Anio', 'Sí', 'Año numérico (ej: 2024)'],
      ['Mes', 'Sí', 'Mes numérico 1–12'],
      ['Nro', 'Sí', 'Número correlativo del registro'],
      ['Tipo_Doc', 'Sí', 'Nombre exacto según hoja "Tipos de Documento"'],
      ['Rut_Proveedor', 'Sí', 'Con guión y dígito verificador (ej: 12345678-5)'],
      ['Razon_Social', 'Sí', 'Razón social del proveedor'],
      ['Folio', 'Sí', 'Número entero positivo'],
      ['Fecha_Docto', 'Sí', 'YYYY-MM-DD (ej: 2024-01-15)'],
      ['Monto_Exento', 'Sí', 'Número entero (0 si no aplica)'],
      ['Monto_Neto', 'Sí', 'Número entero (0 si no aplica)'],
      ['Monto_IVA', 'Sí', 'Número entero (normalmente Neto × 19%)'],
      ['Otro_Impto', 'Sí', 'Número entero (0 si no aplica)'],
      ['Monto_Total', 'Sí', 'Exento + Neto + IVA + Otro_Impto'],
      ['Tipo_Compra', 'No', 'Texto libre (ej: Servicios, Materiales)'],
      ['Producto_Servicio', 'No', 'Descripción del producto o servicio'],
      ['Fecha_Recepcion', 'No', 'YYYY-MM-DD'],
      ['Fecha_Acuse', 'No', 'YYYY-MM-DD'],
      ['Fecha_Reclamo', 'No', 'YYYY-MM-DD'],
      ['Documento_URL', 'No', 'Enlace directo al documento PDF/imagen'],
      ['Resultado', 'No', 'Se calcula automáticamente (Exento + Neto + Otro_Impto) — ignorar'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla_compras.xlsx');
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

    // Mapa de tipos de documento
    const tipoMap = new Map<string, number>();
    tiposDocs.forEach(t => tipoMap.set(t.nombre.toLowerCase().trim(), t.id));

    // Folios existentes en BD: clave = folio-tipo_doc_id-anio-mes
    const { data: existentes } = await (supabase as any)
      .from('movimientos_compra')
      .select('folio, tipo_doc_id, anio, mes');
    const foliosExistentes = new Set(
      ((existentes ?? []) as Array<{ folio: number; tipo_doc_id: number | null; anio: number; mes: number }>)
        .map(e => `${e.folio}-${e.tipo_doc_id ?? 'null'}-${e.anio}-${e.mes}`)
    );

    // RUTs de proveedores registrados
    const { data: provs } = await (supabase as any)
      .from('proveedores')
      .select('rut');
    const rutsProveedores = new Set(
      ((provs ?? []) as Array<{ rut: string }>).map(p => p.rut)
    );

    // Folios dentro del archivo
    const foliosEnArchivo = new Map<string, number>();

    const validadas: ValidatedRow[] = dataRows.map((row, i) => {
      const rowNum = i + 2;
      const get = (col: string) => String(row[idx(col)] ?? '').trim();

      const anio              = get('Anio');
      const mes               = get('Mes');
      const nro               = get('Nro');
      const tipo_doc_nombre   = get('Tipo_Doc');
      const rut_proveedor     = get('Rut_Proveedor');
      const razon_social      = get('Razon_Social');
      const folioStr          = get('Folio');
      const fecha_docto       = get('Fecha_Docto');
      const monto_exento      = get('Monto_Exento');
      const monto_neto        = get('Monto_Neto');
      const monto_iva         = get('Monto_IVA');
      const otro_impto        = get('Otro_Impto');
      const monto_total       = get('Monto_Total');
      const tipo_compra       = encabezados.includes('Tipo_Compra') ? get('Tipo_Compra') : '';
      const producto_servicio = encabezados.includes('Producto_Servicio') ? get('Producto_Servicio') : '';
      const fecha_recepcion   = encabezados.includes('Fecha_Recepcion') ? get('Fecha_Recepcion') : '';
      const fecha_acuse       = encabezados.includes('Fecha_Acuse') ? get('Fecha_Acuse') : '';
      const fecha_reclamo     = encabezados.includes('Fecha_Reclamo') ? get('Fecha_Reclamo') : '';
      const documento_url     = encabezados.includes('Documento_URL') ? get('Documento_URL') : '';

      const errores: string[] = [];
      const advertencias: string[] = [];

      // Año
      if (!anio) {
        errores.push('Año es obligatorio');
      } else if (isNaN(Number(anio)) || Number(anio) < 2000 || Number(anio) > 2100) {
        errores.push(`Año "${anio}" inválido`);
      }

      // Mes
      if (!mes) {
        errores.push('Mes es obligatorio');
      } else if (isNaN(Number(mes)) || Number(mes) < 1 || Number(mes) > 12) {
        errores.push(`Mes "${mes}" inválido (debe ser 1–12)`);
      }

      // Nro
      if (!nro) {
        errores.push('Nro es obligatorio');
      } else if (isNaN(Number(nro)) || Number(nro) <= 0) {
        errores.push(`Nro "${nro}" inválido`);
      }

      // Fecha
      if (!fecha_docto) {
        errores.push('Fecha Docto es obligatoria');
      } else if (!validarFecha(fecha_docto)) {
        errores.push(`Fecha "${fecha_docto}" inválida (use formato YYYY-MM-DD)`);
      }

      // RUT
      if (!rut_proveedor) {
        errores.push('RUT Proveedor es obligatorio');
      } else if (!validateRut(rut_proveedor)) {
        errores.push('RUT inválido (dígito verificador incorrecto)');
      } else {
        // Advertencia si no está registrado
        const rutNorm = normalizeRut(rut_proveedor);
        if (!rutsProveedores.has(rutNorm)) {
          advertencias.push(`RUT ${rut_proveedor} no está registrado como proveedor`);
        }
      }

      // Fechas opcionales
      if (fecha_recepcion && !validarFecha(fecha_recepcion)) errores.push(`Fecha_Recepcion "${fecha_recepcion}" inválida (YYYY-MM-DD)`);
      if (fecha_acuse && !validarFecha(fecha_acuse)) errores.push(`Fecha_Acuse "${fecha_acuse}" inválida (YYYY-MM-DD)`);
      if (fecha_reclamo && !validarFecha(fecha_reclamo)) errores.push(`Fecha_Reclamo "${fecha_reclamo}" inválida (YYYY-MM-DD)`);

      // Razón social
      if (!razon_social) errores.push('Razón Social es obligatoria');
      else if (razon_social.length > 200) errores.push('Razón Social supera 200 caracteres');

      // Longitud de campos de texto libres
      if (tipo_compra.length > 150) errores.push('Tipo_Compra supera 150 caracteres');
      if (producto_servicio.length > 500) errores.push('Producto_Servicio supera 500 caracteres');

      // Folio
      if (!folioStr) {
        errores.push('Folio es obligatorio');
      } else if (isNaN(Number(folioStr)) || Number(folioStr) <= 0) {
        errores.push(`Folio "${folioStr}" inválido (debe ser número positivo)`);
      }

      // Tipo de documento
      let tipo_doc_id: number | null = null;
      if (tipo_doc_nombre) {
        const found = tipoMap.get(tipo_doc_nombre.toLowerCase());
        if (found !== undefined) {
          tipo_doc_id = found;
        } else {
          errores.push(`Tipo de doc "${tipo_doc_nombre}" no encontrado (ver hoja "Tipos de Documento")`);
        }
      }

      // Montos
      [
        ['Monto_Exento', monto_exento], ['Monto_Neto', monto_neto],
        ['Monto_IVA', monto_iva], ['Otro_Impto', otro_impto], ['Monto_Total', monto_total],
      ].forEach(([label, val]) => {
        if (val && (isNaN(Number(val)) || Number(val) < 0)) {
          errores.push(`${label} "${val}" no es un número válido`);
        }
      });

      // Duplicado (folio + tipo_doc + anio + mes)
      let isDuplicate = false;
      const folioKey = `${folioStr}-${tipo_doc_id ?? 'null'}-${anio}-${mes}`;
      if (folioStr && !isNaN(Number(folioStr)) && anio && mes) {
        if (foliosEnArchivo.has(folioKey)) {
          errores.push(`Folio ${folioStr} duplicado en el archivo (fila ${foliosEnArchivo.get(folioKey)})`);
          isDuplicate = true;
        } else {
          foliosEnArchivo.set(folioKey, rowNum);
        }

        if (foliosExistentes.has(folioKey)) {
          errores.push(`Folio ${folioStr} ya existe en el sistema para este tipo doc/año/mes`);
          isDuplicate = true;
        }
      }

      return {
        rowNum, anio, mes, nro, tipo_doc_nombre, rut_proveedor, razon_social,
        folio: folioStr, fecha_docto, monto_exento, monto_neto, monto_iva,
        otro_impto, monto_total, tipo_compra, producto_servicio, tipo_doc_id,
        fecha_recepcion, fecha_acuse, fecha_reclamo, documento_url,
        valid: errores.length === 0,
        errors: errores,
        warnings: advertencias,
        isDuplicate,
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
      const exento = r.monto_exento ? Number(r.monto_exento) : null;
      const neto   = r.monto_neto   ? Number(r.monto_neto)   : null;
      const otro   = r.otro_impto   ? Number(r.otro_impto)   : null;

      return {
        tenant_id: tenantId,
        anio: Number(r.anio),
        mes: Number(r.mes),
        nro: Number(r.nro),
        fecha_docto: r.fecha_docto,
        rut_proveedor: normalizeRut(r.rut_proveedor),
        razon_social: r.razon_social,
        tipo_doc_id: r.tipo_doc_id,
        tipo_compra: r.tipo_compra || null,
        folio: Number(r.folio),
        monto_exento: exento,
        monto_neto:   neto,
        monto_iva:    r.monto_iva  ? Number(r.monto_iva)  : null,
        otro_impto:   otro,
        monto_total:  r.monto_total ? Number(r.monto_total) : null,
        producto_servicio: r.producto_servicio || null,
        fecha_recepcion: r.fecha_recepcion || null,
        fecha_acuse: r.fecha_acuse || null,
        fecha_reclamo: r.fecha_reclamo || null,
      };
    });

    const { success, failed } = await insertBatch('movimientos_compra', inserts);

    const duplicados = rows.filter(r => r.isDuplicate).length;
    const advertencias = validas.filter(r => r.warnings.length > 0).length;

    setImportResult({ success, failed, duplicados, advertencias });
    setStep('done');
    if (success > 0) { onSuccess(); toast({ title: `${success} compra(s) importada(s) correctamente` }); }
    if (failed > 0)  toast({ title: `${failed} registro(s) no pudieron importarse`, variant: 'destructive' });
  };

  const handleClose = () => {
    setStep('upload'); setFileName(''); setRows([]);
    setImportResult({ success: 0, failed: 0, duplicados: 0, advertencias: 0 });
    onOpenChange(false);
  };

  const markProveedorRegistered = (rut: string) => {
    const rutNorm = normalizeRut(rut);
    setRows(prev => prev.map(r => {
      if (normalizeRut(r.rut_proveedor) !== rutNorm) return r;
      return { ...r, warnings: r.warnings.filter(w => !w.includes('no está registrado')) };
    }));
  };

  const validas   = rows.filter(r => r.valid);
  const invalidas = rows.filter(r => !r.valid);
  const conAdvertencias = validas.filter(r => r.warnings.length > 0);

  const uniqueUnregisteredRuts = Array.from(
    new Set(conAdvertencias.map(r => normalizeRut(r.rut_proveedor)))
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-navy text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-periwinkle" />
            Carga Masiva de Compras
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Descarga la plantilla oficial. Incluye 3 hojas: Compras, Tipos de Documento e Instrucciones.</li>
                  <li>Completa la hoja "Compras" respetando el formato de cada columna.</li>
                  <li>Para el tipo de documento, usa el nombre exacto de la hoja "Tipos de Documento".</li>
                  <li>La columna Resultado se calcula automáticamente — no es necesario completarla.</li>
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
                {conAdvertencias.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-4 py-2 text-sm">
                    <AlertTriangle className="h-4 w-4" /><span><strong>{conAdvertencias.length}</strong> proveedor(es) no registrado(s)</span>
                  </div>
                )}
              </div>

              {invalidas.length > 0 && validas.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Las filas con errores <strong>no serán importadas</strong>. Puedes corregir el archivo y volver a subirlo, o importar solo las {validas.length} filas válidas.</p>
                </div>
              )}

              {uniqueUnregisteredRuts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      {uniqueUnregisteredRuts.length} proveedor(es) no registrado(s).{' '}
                      <strong>Se importarán igualmente</strong>, pero puedes registrarlos ahora:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {uniqueUnregisteredRuts.map(rut => (
                      <Button
                        key={rut}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                        onClick={() => { setProvSheetRut(rut); setProvSheetOpen(true); }}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Registrar {rut}
                      </Button>
                    ))}
                  </div>
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
                        <th className="px-3 py-2.5 text-left">Año/Mes</th>
                        <th className="px-3 py-2.5 text-left">RUT</th>
                        <th className="px-3 py-2.5 text-left">Proveedor</th>
                        <th className="px-3 py-2.5 text-left hidden sm:table-cell">Tipo Doc</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Folio</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Total</th>
                        <th className="px-3 py-2.5 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.rowNum}
                          className={`border-t border-border/50 ${row.valid ? i % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-gray-text/60">{row.rowNum}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.anio}/{row.mes}</td>
                          <td className="px-3 py-2 font-medium text-navy">{row.rut_proveedor || '—'}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate">{row.razon_social || '—'}</td>
                          <td className="px-3 py-2 hidden sm:table-cell max-w-[100px] truncate">{row.tipo_doc_nombre || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">{row.folio || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">{row.monto_total ? `$${Number(row.monto_total).toLocaleString('es-CL')}` : '—'}</td>
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-100 text-[10px]" style={{ borderRadius: '20px' }}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />OK
                                </Badge>
                                {row.warnings.map((w, wi) => (
                                  <p key={wi} className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" />{w}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <Badge className="bg-red-100 text-red-600 border border-red-300 hover:bg-red-100 text-[10px]" style={{ borderRadius: '20px' }}>
                                  <XCircle className="h-3 w-3 mr-1" />Error
                                </Badge>
                                {row.errors.map((e, ei) => (
                                  <p key={ei} className="text-[10px] text-red-600">{e}</p>
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
              <p className="font-semibold text-navy">Importando compras...</p>
              <p className="text-sm text-gray-text">Por favor espera, no cierres esta ventana</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-xl font-bold text-navy">¡Importación completada!</p>
                <p className="text-sm text-gray-text mt-1">Resumen del proceso</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {importResult.success > 0 && (
                  <div className="text-center bg-green-50 border border-green-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-xs text-green-700 mt-1">Registros importados</p>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="text-center bg-red-50 border border-red-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-red-500">{importResult.failed}</p>
                    <p className="text-xs text-red-600 mt-1">No pudieron importarse</p>
                  </div>
                )}
                {importResult.duplicados > 0 && (
                  <div className="text-center bg-gray-50 border border-gray-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-gray-500">{importResult.duplicados}</p>
                    <p className="text-xs text-gray-600 mt-1">Duplicados omitidos</p>
                  </div>
                )}
                {importResult.advertencias > 0 && (
                  <div className="text-center bg-amber-50 border border-amber-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-amber-600">{importResult.advertencias}</p>
                    <p className="text-xs text-amber-700 mt-1">Advertencias de proveedor</p>
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
                Importar {validas.length} compra{validas.length !== 1 ? 's' : ''}
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

    <ProveedorFormSheet
      open={provSheetOpen}
      onOpenChange={setProvSheetOpen}
      tenantId={tenantId}
      prefillRut={provSheetRut}
      onSuccess={(prov) => markProveedorRegistered(prov.rut)}
    />
  </>
  );
}
