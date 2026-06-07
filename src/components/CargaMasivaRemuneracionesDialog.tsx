import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Upload, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { insertBatch } from '@/lib/movimentos';
import { cleanRut }    from '@/lib/rut';
import {
  calcularTotalImponible, calcularTotalHaberes,
  calcularTotalDescuentos, calcularLiquido, calcularCostoTotal,
} from '@/lib/remuneraciones';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrabajadorBasico { id: string; rut: string; nombre: string; apellido_paterno: string; }

interface ParsedRow {
  // Raw strings from Excel
  rut: string;
  anio: string;
  mes: string;
  dias_trabajados: string;
  sueldo_base: string;
  gratificacion: string;
  horas_extras: string;
  bono_1: string; bono_2: string; bono_3: string;
  total_imponible: string;
  asig_familiar: string; movilizacion: string; colacion: string; viatico: string;
  total_haberes: string;
  afp: string; salud: string; seguro: string; impuesto: string; otros_descuentos: string;
  total_descuentos: string;
  liquido: string;
  sis: string; aporte: string; vida: string; isl: string;
  mipe: string; corfo: string; otro: string;
  costo_total: string;
  // Resolved
  trabajador_id: string | null;
  nombre_trabajador: string;
  // QA
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

// ─── Column names (must match the Excel template headers exactly) ─────────────

const COLS_REQ = ['RUT', 'Año', 'Mes'];
const ALL_COLS = [
  'RUT','Año','Mes','Días Trabajados',
  'Sueldo Base','Gratificación','Horas Extras','Bono 1','Bono 2','Bono 3','Total Imponible',
  'Asig. Familiar','Movilización','Colación','Viático','Total Haberes',
  'AFP','Salud','Seg. Cesantía','Impuesto 2a Cat.','Otros Desc.','Total Descuentos','Líquido',
  'SIS','Aporte Empresa','Vida','ISL','MIPE','CORFO','Otro','Costo Total',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const numOrNull = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = Number(String(v).replace(/[$.,\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

const num0 = (v: string): number => numOrNull(v) ?? 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CargaMasivaRemuneracionesDialog({
  open, onOpenChange, tenantId, onSuccess,
}: Props) {
  const { toast } = useToast();
  const inputRef  = useRef<HTMLInputElement>(null);

  type Step = 'upload' | 'preview' | 'importing' | 'done';
  const [step, setStep]         = useState<Step>('upload');
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [result, setResult]     = useState({ success: 0, failed: 0 });
  const [trabajadores, setTrabajadores] = useState<TrabajadorBasico[]>([]);

  // Load trabajadores when dialog opens
  useEffect(() => {
    if (open && tenantId) {
      (supabase as any)
        .from('trabajadores')
        .select('id, rut, nombre, apellido_paterno')
        .eq('tenant_id', tenantId)
        .eq('activo', true)
        .then(({ data }: { data: TrabajadorBasico[] | null }) => {
          setTrabajadores(data ?? []);
        });
    }
  }, [open, tenantId]);

  // Reset on close
  const handleOpenChange = (v: boolean) => {
    if (!v) { setStep('upload'); setRows([]); setResult({ success: 0, failed: 0 }); }
    onOpenChange(v);
  };

  // ── Generate Excel Template ────────────────────────────────────────────────
  const handleDescargarTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: data
    const header = ALL_COLS;
    const example = [
      '12345678-9', 2025, 4, 30,
      800000, 66666, 0, 0, 0, 0, 866666,
      0, 50000, 50000, 0, 966666,
      90999, 60666, 5200, 0, 0, 156865, 809801,
      13000, 20800, 0, 8666, 0, 0, 0, 1009267,
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    ws['!cols'] = header.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Remuneraciones');

    // Sheet 2: instructions
    const instrData = [
      ['Columna', 'Obligatorio', 'Descripción'],
      ['RUT', 'Sí', 'RUT del trabajador (debe existir en la nómina). Ej: 12345678-9'],
      ['Año', 'Sí', 'Año del período. Ej: 2025'],
      ['Mes', 'Sí', 'Mes del período (1-12). Ej: 4'],
      ['Días Trabajados', 'No', 'Días efectivamente trabajados'],
      ['Sueldo Base', 'No', 'Sueldo base mensual (sin $)'],
      ['Gratificación', 'No', 'Gratificación legal mensual'],
      ['Horas Extras', 'No', 'Valor total de horas extras'],
      ['Bono 1/2/3', 'No', 'Bonos variables'],
      ['Total Imponible', 'No', 'Si vacío, se calcula automáticamente'],
      ['Asig. Familiar/Movilización/Colación/Viático', 'No', 'Haberes no imponibles'],
      ['Total Haberes', 'No', 'Si vacío, se calcula automáticamente'],
      ['AFP', 'No', 'Descuento por cotización AFP'],
      ['Salud', 'No', 'Descuento por cotización de salud'],
      ['Seg. Cesantía', 'No', 'Descuento seguro de cesantía trabajador (0.6%)'],
      ['Impuesto 2a Cat.', 'No', 'Retención impuesto segunda categoría'],
      ['Otros Desc.', 'No', 'Otros descuentos (anticipos, préstamos, etc.)'],
      ['Total Descuentos', 'No', 'Si vacío, se calcula automáticamente'],
      ['Líquido', 'No', 'Si vacío, se calcula automáticamente'],
      ['SIS', 'No', 'Seguro Invalidez y Sobrevivencia (aporte empresa 1.5%)'],
      ['Aporte Empresa', 'No', 'Aporte empresa seguro cesantía (2.4%)'],
      ['Vida', 'No', 'Seguro de vida (aporte empresa)'],
      ['ISL', 'No', 'ISL / Mutual de Seguridad (tasa variable)'],
      ['MIPE', 'No', 'Programa MIPE (si aplica)'],
      ['CORFO', 'No', 'Subsidio CORFO (si aplica)'],
      ['Otro', 'No', 'Otros aportes o subsidios empresa'],
      ['Costo Total', 'No', 'Si vacío, se calcula automáticamente'],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instrData);
    wsI['!cols'] = [{ wch: 38 }, { wch: 14 }, { wch: 64 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones');

    XLSX.writeFile(wb, 'PlantillaLibroRemuneraciones.xlsx');
  };

  // ── Parse Excel ────────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb  = XLSX.read(e.target?.result, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (!raw.length) {
        toast({ title: 'Arquivo vacío', variant: 'destructive' });
        return;
      }

      // Check required columns
      const headers = Object.keys(raw[0]);
      const missing = COLS_REQ.filter(c => !headers.includes(c));
      if (missing.length) {
        toast({
          title: 'Columnas obligatorias faltantes',
          description: missing.join(', '),
          variant: 'destructive',
        });
        return;
      }

      // Build lookup set for duplicate detection
      const periodos = new Set<string>();

      const parsed: ParsedRow[] = raw.map(row => {
        const get = (col: string) => String(row[col] ?? '').trim();

        const rutRaw = get('RUT');
        const anio   = get('Año');
        const mes    = get('Mes');

        const errors:   string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!rutRaw) errors.push('RUT vacío');
        if (!anio || isNaN(Number(anio))) errors.push('Año inválido');
        if (!mes  || isNaN(Number(mes)) || Number(mes) < 1 || Number(mes) > 12)
          errors.push('Mes inválido (1-12)');

        // Lookup trabajador by RUT
        let trabajador_id: string | null = null;
        let nombre_trabajador = '';
        if (rutRaw) {
          const found = trabajadores.find(t => cleanRut(t.rut) === cleanRut(rutRaw));
          if (found) {
            trabajador_id   = found.id;
            nombre_trabajador = `${found.nombre} ${found.apellido_paterno}`;
          } else {
            errors.push(`RUT ${rutRaw} no encontrado en la nómina`);
          }
        }

        // Duplicate detection
        const dupeKey = `${cleanRut(rutRaw)}-${anio}-${mes}`;
        const isDuplicate = periodos.has(dupeKey);
        if (!isDuplicate) periodos.add(dupeKey);
        if (isDuplicate) warnings.push('Período duplicado en el archivo');

        return {
          rut: rutRaw,
          anio,
          mes,
          dias_trabajados:  get('Días Trabajados'),
          sueldo_base:      get('Sueldo Base'),
          gratificacion:    get('Gratificación'),
          horas_extras:     get('Horas Extras'),
          bono_1:           get('Bono 1'),
          bono_2:           get('Bono 2'),
          bono_3:           get('Bono 3'),
          total_imponible:  get('Total Imponible'),
          asig_familiar:    get('Asig. Familiar'),
          movilizacion:     get('Movilización'),
          colacion:         get('Colación'),
          viatico:          get('Viático'),
          total_haberes:    get('Total Haberes'),
          afp:              get('AFP'),
          salud:            get('Salud'),
          seguro:           get('Seg. Cesantía'),
          impuesto:         get('Impuesto 2a Cat.'),
          otros_descuentos: get('Otros Desc.'),
          total_descuentos: get('Total Descuentos'),
          liquido:          get('Líquido'),
          sis:              get('SIS'),
          aporte:           get('Aporte Empresa'),
          vida:             get('Vida'),
          isl:              get('ISL'),
          mipe:             get('MIPE'),
          corfo:            get('CORFO'),
          otro:             get('Otro'),
          costo_total:      get('Costo Total'),
          trabajador_id,
          nombre_trabajador,
          valid: errors.length === 0,
          errors,
          warnings,
          isDuplicate,
        };
      });

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImportar = async () => {
    const validas = rows.filter(r => r.valid);
    if (!validas.length || !tenantId) return;
    setStep('importing');

    const inserts = validas.map(r => {
      // Auto-calculate totals if not provided
      const sueldoBase   = num0(r.sueldo_base);
      const gratificacion = num0(r.gratificacion);
      const horasExtras   = num0(r.horas_extras);
      const bono1 = num0(r.bono_1); const bono2 = num0(r.bono_2); const bono3 = num0(r.bono_3);
      const asigFam  = num0(r.asig_familiar);
      const moviliz  = num0(r.movilizacion);
      const colacion = num0(r.colacion);
      const viatico  = num0(r.viatico);
      const afp      = num0(r.afp);
      const salud    = num0(r.salud);
      const seguro   = num0(r.seguro);
      const impuesto = num0(r.impuesto);
      const otrosDsc = num0(r.otros_descuentos);
      const sis      = num0(r.sis);
      const aporte   = num0(r.aporte);
      const vida     = num0(r.vida);
      const isl      = num0(r.isl);
      const mipe     = num0(r.mipe);
      const corfo    = num0(r.corfo);
      const otro     = num0(r.otro);

      const totalImp = numOrNull(r.total_imponible)
        ?? calcularTotalImponible(sueldoBase, gratificacion, horasExtras, bono1, bono2, bono3);
      const totalHab = numOrNull(r.total_haberes)
        ?? calcularTotalHaberes(totalImp, asigFam, moviliz, colacion, viatico);
      const totalDsc = numOrNull(r.total_descuentos)
        ?? calcularTotalDescuentos(afp, salud, seguro, impuesto, otrosDsc);
      const liquido  = numOrNull(r.liquido) ?? calcularLiquido(totalHab, totalDsc);
      const costoTotal = numOrNull(r.costo_total)
        ?? calcularCostoTotal(totalHab, sis, aporte, vida, isl, mipe, corfo, otro);

      return {
        tenant_id:        tenantId,
        trabajador_id:    r.trabajador_id!,
        anio:             Number(r.anio),
        mes:              Number(r.mes),
        dias_trabajados:  numOrNull(r.dias_trabajados),
        sueldo_base:      numOrNull(r.sueldo_base),
        gratificacion:    numOrNull(r.gratificacion),
        horas_extras:     numOrNull(r.horas_extras),
        bono_1: numOrNull(r.bono_1), bono_2: numOrNull(r.bono_2), bono_3: numOrNull(r.bono_3),
        total_imponible:  totalImp,
        asig_familiar:    numOrNull(r.asig_familiar),
        movilizacion:     numOrNull(r.movilizacion),
        colacion:         numOrNull(r.colacion),
        viatico:          numOrNull(r.viatico),
        total_haberes:    totalHab,
        afp:              numOrNull(r.afp),
        salud:            numOrNull(r.salud),
        seguro:           numOrNull(r.seguro),
        impuesto:         numOrNull(r.impuesto),
        otros_descuentos: numOrNull(r.otros_descuentos),
        total_descuentos: totalDsc,
        liquido,
        sis:              numOrNull(r.sis),
        aporte:           numOrNull(r.aporte),
        vida:             numOrNull(r.vida),
        isl:              numOrNull(r.isl),
        mipe:             numOrNull(r.mipe),
        corfo:            numOrNull(r.corfo),
        otro:             numOrNull(r.otro),
        costo_total:      costoTotal,
      };
    });

    const res = await insertBatch('movimientos_remuneracion', inserts, 50);
    setResult(res);
    setStep('done');
    if (res.success > 0) onSuccess();
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total   = rows.length;
  const validas = rows.filter(r => r.valid).length;
  const errores = rows.filter(r => !r.valid).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-navy text-lg font-bold">
            Carga Masiva — Libro de Remuneraciones
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP: upload ── */}
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-text">
              Sube el Excel con el libro de remuneraciones. Los trabajadores deben estar registrados previamente.
            </p>
            <Button
              variant="outline"
              className="border-navy text-navy w-fit"
              onClick={handleDescargarTemplate}
            >
              <Download className="h-4 w-4 mr-2" /> Descargar Plantilla Excel
            </Button>

            {trabajadores.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No hay trabajadores activos en la nómina. Agrega trabajadores antes de hacer la carga masiva.
              </div>
            )}

            <div
              className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 text-gray-text/60 cursor-pointer hover:border-navy/40 hover:bg-gray-light/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-10 w-10 opacity-40" />
              <p className="text-sm text-center">
                Arrastra el archivo aquí o <span className="text-navy font-medium underline">haz clic para seleccionar</span>
              </p>
              <p className="text-xs">.xlsx / .xls</p>
            </div>
            <input
              ref={inputRef} type="file" accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </div>
        )}

        {/* ── STEP: preview ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4 min-h-0">
            {/* Summary bar */}
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-navy text-white">{total} filas</Badge>
              <Badge className="bg-green-100 text-green-700 border border-green-300">{validas} válidas</Badge>
              {errores > 0 && (
                <Badge className="bg-red-100 text-red-600 border border-red-300">{errores} con errores</Badge>
              )}
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 border border-border rounded-lg text-xs">
              <table className="min-w-full">
                <thead className="bg-navy text-white text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">RUT</th>
                    <th className="px-3 py-2 font-semibold">Trabajador</th>
                    <th className="px-3 py-2 font-semibold">Año</th>
                    <th className="px-3 py-2 font-semibold">Mes</th>
                    <th className="px-3 py-2 font-semibold">Imponible</th>
                    <th className="px-3 py-2 font-semibold">Líquido</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-border ${r.valid ? (i % 2 === 0 ? 'bg-white' : 'bg-gray-50') : 'bg-red-50'}`}>
                      <td className="px-3 py-1.5 text-gray-text/60">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-navy">{r.rut}</td>
                      <td className="px-3 py-1.5 max-w-[140px] truncate">{r.nombre_trabajador || '—'}</td>
                      <td className="px-3 py-1.5">{r.anio}</td>
                      <td className="px-3 py-1.5">{r.mes}</td>
                      <td className="px-3 py-1.5 text-right">{r.total_imponible || '—'}</td>
                      <td className="px-3 py-1.5 text-right">{r.liquido || '—'}</td>
                      <td className="px-3 py-1.5">
                        {r.valid ? (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium flex items-center gap-1 whitespace-nowrap">
                            <X className="h-3 w-3" /> {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button
                className="flex-1 bg-navy hover:bg-navy/90 text-white"
                disabled={validas === 0 || !tenantId}
                onClick={handleImportar}
              >
                Importar {validas} registros
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: importing ── */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-navy" />
            <p className="text-sm text-gray-text">Importando registros...</p>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-4 rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-navy">Importación completada</p>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-gray-text">Importados</p>
              </div>
              {result.failed > 0 && (
                <div>
                  <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                  <p className="text-xs text-gray-text">Fallidos</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }}>
                Nueva carga
              </Button>
              <Button className="bg-navy hover:bg-navy/90 text-white" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
