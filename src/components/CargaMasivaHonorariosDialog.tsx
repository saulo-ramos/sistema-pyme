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
import { normalizeRut } from '@/lib/formatters';
import { validateRut } from '@/lib/rut';
import { calcularRetencion, calcularPagado, TIPOS_HONORARIO } from '@/lib/honorarios';
import { validarFecha, insertBatch } from '@/lib/movimentos';

interface ValidatedRow {
  rowNum: number;
  anio: string;
  mes: string;
  nro: string;
  tipo_documento: string;
  folio: string;
  fecha_docto: string;
  estado: string;
  fecha_anulacion: string;
  rut_prestador: string;
  nombre_prestador: string;
  sociedad_prof: string;
  monto_bruto: string;
  monto_retenido: string;
  monto_pagado: string;
  producto_servicio: string;
  // Computed
  valid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string | null;
  onSuccess: () => void;
}

// Columnas requeridas del Excel (en orden según especificación)
const COLS_REQ = [
  'Año', 'Mes', 'Nro', 'Tipo Doc', 'N° Docto', 'Fecha', 'Estado',
  'Fecha Anulación', 'Rut', 'Nombre o Razón Social', 'Soc. Prof.',
  'Brutos', 'Retenido', 'Pagado', 'Resultado', 'Producto o Servicio',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizarEstado(raw: string): 'Vigente' | 'Anulado' | null {
  const up = raw.toUpperCase().trim();
  if (up === 'VIGENTE') return 'Vigente';
  if (up === 'ANULADO') return 'Anulado';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CargaMasivaHonorariosDialog({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState({
    success: 0, failed: 0, duplicados: 0, rutInvalidos: 0, tipoInvalido: 0,
  });

  // ─── Descargar plantilla ─────────────────────────────────────────────────────

  const handleDescargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    const data = [
      COLS_REQ,
      [2024, 1, 1, 'BH', 1001, '2024-01-15', 'Vigente', '', '12345678-5', 'Juan Pérez González', 'No', 500000, 50000, 450000, '', 'Consultoría'],
      [2024, 1, 2, 'BT', 1002, '2024-01-20', 'Vigente', '', '98765432-5', 'María López Soc. Prof.', 'Sí', 800000, 80000, 720000, '', 'Asesoría legal'],
      [2024, 1, 3, 'BH', 1003, '2024-01-25', 'Anulado', '2024-01-28', '11111111-1', 'Carlos Ruiz', 'No', 300000, 30000, 270000, '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 }, { wch: 5 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 28 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Honorarios');

    const instrData = [
      ['Campo', 'Obligatorio', 'Formato / Valores válidos'],
      ['Año', 'Sí', 'Año numérico (ej: 2024)'],
      ['Mes', 'Sí', 'Mes numérico 1–12'],
      ['Nro', 'Sí', 'Número correlativo del registro'],
      ['Tipo Doc', 'Sí', 'BH (Boleta de Honorarios) o BT (Boleta de Honorarios por Terceros)'],
      ['N° Docto', 'Sí', 'Número entero positivo (folio)'],
      ['Fecha', 'Sí', 'YYYY-MM-DD (ej: 2024-01-15)'],
      ['Estado', 'Sí', 'VIGENTE o ANULADO (case insensitive)'],
      ['Fecha Anulación', 'Condicional', 'YYYY-MM-DD — obligatorio si Estado = ANULADO'],
      ['Rut', 'Sí', 'Con guión y dígito verificador (ej: 12345678-5)'],
      ['Nombre o Razón Social', 'Sí', 'Nombre del prestador'],
      ['Soc. Prof.', 'No', 'Sí/No — indica si es sociedad profesional'],
      ['Brutos', 'Sí', 'Monto bruto en pesos (número entero)'],
      ['Retenido', 'No', 'Retención en pesos — si está vacío se calcula como 10% del bruto'],
      ['Pagado', 'No', 'Se calcula automáticamente (Bruto − Retenido) — ignorar'],
      ['Resultado', 'No', 'Se calcula automáticamente — ignorar'],
      ['Producto o Servicio', 'No', 'Descripción del servicio prestado'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla_honorarios.xlsx');
  };

  // ─── Procesar archivo ─────────────────────────────────────────────────────────

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
    // Verificar columnas mínimas requeridas
    const colsMinimas = ['Año', 'Mes', 'Tipo Doc', 'N° Docto', 'Fecha', 'Estado', 'Rut', 'Nombre o Razón Social', 'Brutos'];
    const faltantes = colsMinimas.filter(c => !encabezados.includes(c));
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

    // Existentes en BD para detectar duplicados
    const { data: existentes } = await (supabase as any)
      .from('movimientos_honorarios')
      .select('anio, mes, tipo_documento, folio, rut_prestador');
    const clavesExistentes = new Set(
      ((existentes ?? []) as Array<{ anio: number; mes: number; tipo_documento: string; folio: number; rut_prestador: string }>)
        .map(e => `${e.anio}-${e.mes}-${e.tipo_documento}-${e.folio}-${e.rut_prestador}`)
    );

    // Claves dentro del archivo (para detectar duplicados internos)
    const clavesEnArchivo = new Map<string, number>();

    const validadas: ValidatedRow[] = dataRows.map((row, i) => {
      const rowNum = i + 2;
      const get = (col: string) => String(row[idx(col)] ?? '').trim();

      const anio            = get('Año');
      const mes             = get('Mes');
      const nro             = idx('Nro') >= 0 ? get('Nro') : String(i + 1);
      const tipo_documento  = get('Tipo Doc');
      const folio           = get('N° Docto');
      const fecha_docto     = get('Fecha');
      const estadoRaw       = get('Estado');
      const fecha_anulacion = idx('Fecha Anulación') >= 0 ? get('Fecha Anulación') : '';
      const rut_prestador   = get('Rut');
      const nombre_prestador = get('Nombre o Razón Social');
      const sociedad_prof   = idx('Soc. Prof.') >= 0 ? get('Soc. Prof.') : '';
      const brutosRaw       = get('Brutos');
      const retenidoRaw     = idx('Retenido') >= 0 ? get('Retenido') : '';
      const pagadoRaw       = idx('Pagado') >= 0 ? get('Pagado') : '';
      const producto_servicio = idx('Producto o Servicio') >= 0 ? get('Producto o Servicio') : '';

      const errores: string[] = [];
      const advertencias: string[] = [];

      // Año
      if (!anio || isNaN(Number(anio)) || Number(anio) < 2000 || Number(anio) > 2100) {
        errores.push(!anio ? 'Año es obligatorio' : `Año "${anio}" inválido`);
      }

      // Mes
      if (!mes || isNaN(Number(mes)) || Number(mes) < 1 || Number(mes) > 12) {
        errores.push(!mes ? 'Mes es obligatorio' : `Mes "${mes}" inválido (debe ser 1–12)`);
      }

      // Fecha
      if (!fecha_docto) {
        errores.push('Fecha es obligatoria');
      } else if (!validarFecha(fecha_docto)) {
        errores.push(`Fecha "${fecha_docto}" inválida (use formato YYYY-MM-DD)`);
      }

      // Tipo Doc
      const tipoNorm = tipo_documento.toUpperCase() as typeof TIPOS_HONORARIO[number];
      if (!tipo_documento) {
        errores.push('Tipo Doc es obligatorio');
      } else if (!TIPOS_HONORARIO.includes(tipoNorm)) {
        errores.push(`Tipo Doc "${tipo_documento}" inválido — debe ser BH o BT`);
      }

      // Folio
      if (!folio || isNaN(Number(folio)) || Number(folio) <= 0) {
        errores.push(!folio ? 'N° Docto es obligatorio' : `N° Docto "${folio}" inválido`);
      }

      // RUT
      if (!rut_prestador) {
        errores.push('RUT es obligatorio');
      } else if (!validateRut(rut_prestador)) {
        errores.push('RUT inválido (dígito verificador incorrecto)');
      }

      // Nombre
      if (!nombre_prestador) errores.push('Nombre o Razón Social es obligatorio');
      else if (nombre_prestador.length > 200) errores.push('Nombre supera 200 caracteres');

      // Longitud de campos de texto libres
      if (producto_servicio.length > 500) errores.push('Producto o Servicio supera 500 caracteres');

      // Bruto
      if (brutosRaw === '' || brutosRaw === undefined) {
        errores.push('Brutos es obligatorio');
      } else if (isNaN(Number(brutosRaw)) || Number(brutosRaw) < 0) {
        errores.push(`Brutos "${brutosRaw}" no es un número válido`);
      }

      // Retenido (opcional)
      if (retenidoRaw && (isNaN(Number(retenidoRaw)) || Number(retenidoRaw) < 0)) {
        errores.push(`Retenido "${retenidoRaw}" no es un número válido`);
      }

      // Estado
      const estadoNorm = normalizarEstado(estadoRaw);
      if (!estadoRaw) {
        errores.push('Estado es obligatorio');
      } else if (!estadoNorm) {
        errores.push(`Estado "${estadoRaw}" inválido — debe ser VIGENTE o ANULADO`);
      }

      // Fecha Anulación
      if (estadoNorm === 'Anulado' && !fecha_anulacion) {
        advertencias.push('Estado ANULADO sin Fecha de Anulación');
      }
      if (fecha_anulacion && !validarFecha(fecha_anulacion)) {
        errores.push(`Fecha Anulación "${fecha_anulacion}" inválida (use YYYY-MM-DD)`);
      }

      // Duplicado
      let isDuplicate = false;
      const tipoKey = TIPOS_HONORARIO.includes(tipoNorm) ? tipoNorm : tipo_documento;
      const rutNorm = validateRut(rut_prestador) ? normalizeRut(rut_prestador) : rut_prestador;
      const claveKey = `${anio}-${mes}-${tipoKey}-${folio}-${rutNorm}`;

      if (anio && mes && folio && tipo_documento && rut_prestador) {
        if (clavesEnArchivo.has(claveKey)) {
          errores.push(`Duplicado en el archivo (fila ${clavesEnArchivo.get(claveKey)})`);
          isDuplicate = true;
        } else {
          clavesEnArchivo.set(claveKey, rowNum);
        }
        if (clavesExistentes.has(claveKey)) {
          errores.push('Ya existe en el sistema para este tipo doc/año/mes/prestador');
          isDuplicate = true;
        }
      }

      return {
        rowNum, anio, mes, nro, tipo_documento: tipoNorm || tipo_documento,
        folio, fecha_docto, estado: estadoNorm ?? estadoRaw, fecha_anulacion,
        rut_prestador, nombre_prestador, sociedad_prof, monto_bruto: brutosRaw,
        monto_retenido: retenidoRaw, monto_pagado: pagadoRaw, producto_servicio,
        valid: errores.length === 0, errors: errores, warnings: advertencias, isDuplicate,
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

  // ─── Importar ─────────────────────────────────────────────────────────────────

  const handleImportar = async () => {
    const validas = rows.filter(r => r.valid);
    if (!validas.length || !tenantId) return;
    setStep('importing');

    const inserts = validas.map(r => {
      const bruto = Number(r.monto_bruto) || 0;
      const retenido = r.monto_retenido ? Number(r.monto_retenido) : calcularRetencion(bruto);
      const estadoFinal = normalizarEstado(r.estado) ?? 'Vigente';
      return {
        tenant_id: tenantId,
        anio: Number(r.anio),
        mes: Number(r.mes),
        nro: Number(r.nro),
        fecha_docto: r.fecha_docto,
        tipo_documento: r.tipo_documento.toUpperCase(),
        folio: Number(r.folio),
        rut_prestador: normalizeRut(r.rut_prestador),
        nombre_prestador: r.nombre_prestador,
        sociedad_prof: r.sociedad_prof || null,
        monto_bruto: bruto,
        monto_retenido: retenido,
        estado: estadoFinal,
        fecha_anulacion: estadoFinal === 'Anulado' && r.fecha_anulacion ? r.fecha_anulacion : null,
        producto_servicio: r.producto_servicio || null,
      };
    });

    const { success, failed } = await insertBatch('movimientos_honorarios', inserts);

    const duplicados = rows.filter(r => r.isDuplicate).length;
    const rutInvalidos = rows.filter(r => r.errors.some(e => e.includes('RUT inválido'))).length;
    const tipoInvalido = rows.filter(r => r.errors.some(e => e.includes('Tipo Doc'))).length;

    setImportResult({ success, failed, duplicados, rutInvalidos, tipoInvalido });
    setStep('done');
    if (success > 0) {
      onSuccess();
      toast({ title: `${success} honorario(s) importado(s) correctamente` });
    }
    if (failed > 0) toast({ title: `${failed} registro(s) no pudieron importarse`, variant: 'destructive' });
  };

  const handleClose = () => {
    setStep('upload'); setFileName(''); setRows([]);
    setImportResult({ success: 0, failed: 0, duplicados: 0, rutInvalidos: 0, tipoInvalido: 0 });
    onOpenChange(false);
  };

  const validas   = rows.filter(r => r.valid);
  const invalidas = rows.filter(r => !r.valid);
  const conAdvertencias = validas.filter(r => r.warnings.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-navy text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-periwinkle" />
            Carga Masiva de Honorarios
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Descarga la plantilla oficial con el formato correcto.</li>
                  <li>Tipo Doc debe ser <strong>BH</strong> (Boleta de Honorarios) o <strong>BT</strong> (Boleta de Honorarios por Terceros).</li>
                  <li>Estado debe ser <strong>VIGENTE</strong> o <strong>ANULADO</strong>.</li>
                  <li>Las columnas Pagado y Resultado se calculan automáticamente — no las completes.</li>
                  <li>Sube el archivo — el sistema validará antes de importar.</li>
                </ol>
              </div>

              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div>
                  <p className="font-semibold text-navy text-sm">Plantilla oficial</p>
                  <p className="text-xs text-gray-text mt-0.5">Incluye datos de ejemplo e instrucciones</p>
                </div>
                <Button variant="outline" className="border-navy text-navy hover:bg-navy hover:text-white shrink-0"
                  onClick={handleDescargarPlantilla}>
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
                    <AlertTriangle className="h-4 w-4" /><span><strong>{conAdvertencias.length}</strong> advertencia(s)</span>
                  </div>
                )}
              </div>

              {invalidas.length > 0 && validas.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Las filas con errores <strong>no serán importadas</strong>. Puedes corregir el archivo o importar solo las {validas.length} filas válidas.</p>
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
                        <th className="px-3 py-2.5 text-left">Prestador</th>
                        <th className="px-3 py-2.5 text-left hidden sm:table-cell">Tipo</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Folio</th>
                        <th className="px-3 py-2.5 text-right hidden md:table-cell">Bruto</th>
                        <th className="px-3 py-2.5 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.rowNum}
                          className={`border-t border-border/50 ${row.valid ? i % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-gray-text/60">{row.rowNum}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.anio}/{row.mes}</td>
                          <td className="px-3 py-2 font-medium text-navy">{row.rut_prestador || '—'}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate">{row.nombre_prestador || '—'}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{row.tipo_documento || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">{row.folio || '—'}</td>
                          <td className="px-3 py-2 text-right hidden md:table-cell">
                            {row.monto_bruto ? `$${Number(row.monto_bruto).toLocaleString('es-CL')}` : '—'}
                          </td>
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
              <p className="font-semibold text-navy">Importando honorarios...</p>
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
                    <p className="text-xs text-green-700 mt-1">Importados</p>
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
                {importResult.rutInvalidos > 0 && (
                  <div className="text-center bg-amber-50 border border-amber-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-amber-600">{importResult.rutInvalidos}</p>
                    <p className="text-xs text-amber-700 mt-1">RUT inválidos</p>
                  </div>
                )}
                {importResult.tipoInvalido > 0 && (
                  <div className="text-center bg-orange-50 border border-orange-200 rounded-lg px-6 py-4">
                    <p className="text-3xl font-bold text-orange-600">{importResult.tipoInvalido}</p>
                    <p className="text-xs text-orange-700 mt-1">Tipo doc inválido</p>
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
              <Button className="bg-[#C501E2] hover:bg-[#C501E2]/90 text-white" onClick={handleImportar} disabled={validas.length === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validas.length} honorario{validas.length !== 1 ? 's' : ''}
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
