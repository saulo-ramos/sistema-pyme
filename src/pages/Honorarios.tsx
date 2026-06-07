import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2, DollarSign, Download, FileSpreadsheet,
  FileText, Pencil, Plus, Search, Trash2, Upload, UserPlus, Users,
} from 'lucide-react';
import NuevoMovimientoHonorariosSheet, { EditingMovimientoHonorarios } from '@/components/NuevoMovimientoHonorariosSheet';
import PrestadorFormSheet from '@/components/PrestadorFormSheet';
import DocumentRowAction from '@/components/DocumentRowAction';
import { useTenantId } from '@/hooks/useTenantId';
import CargaMasivaHonorariosDialog from '@/components/CargaMasivaHonorariosDialog';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CUR_YEAR, MESES, MESES_CORTOS, ANOS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MovimientoHonorariosRow {
  id: string;
  fecha_docto: string;
  folio: number;
  tipo_documento: string;
  rut_prestador: string;
  nombre_prestador: string;
  monto_bruto: number;
  monto_retenido: number;
  monto_pagado: number | null;
  estado: string;
  fecha_anulacion: string | null;
  producto_servicio: string | null;
  documento_url: string | null;
}

interface LibroHonorariosRow {
  nro_documento: number | null;
  fecha: string | null;
  tipo_documento: string | null;
  rut: string | null;
  nombre_prestador: string | null;
  bruto: number | null;
  retencion: number | null;
  pagado: number | null;
  estado: string | null;
  periodo: string | null;
  tenant_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CUR_MES  = new Date().getMonth() + 1;
const PAGE_SIZE = 15;
const CHART_COLORS = ['#263578', '#727BFD', '#C501E2', '#676FF8', '#4A4A6A', '#9B6FF8'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clp = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toLocaleString('es-CL')}`;

const ejeClp = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const padMes = (m: number) => String(m).padStart(2, '0');

// ─── Shared sub-components ────────────────────────────────────────────────────

function Card({ icon: Icon, label, value, iconClass = 'text-navy' }: {
  icon: React.ElementType; label: string; value: string; iconClass?: string;
}) {
  return (
    <div className="bg-card rounded-[10px] shadow-card p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg bg-gray-light ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] text-gray-text leading-tight">{label}</p>
        <p className={`text-base font-bold ${iconClass}`}>{value}</p>
      </div>
    </div>
  );
}

function Paginacion({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-text flex-wrap gap-2">
      <span className="text-xs">
        Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
      </span>
      <div className="flex gap-1 flex-wrap">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>Ant</Button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
            className={`text-xs min-w-[30px] ${p === page ? 'bg-navy text-white hover:bg-navy/90' : ''}`}
            onClick={() => onPage(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Sig</Button>
      </div>
    </div>
  );
}

const TotalesStyle = 'bg-[#263578] text-white font-bold';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Honorarios() {
  const { toast } = useToast();

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Honorarios</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Registro de boletas de honorarios</p>
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="bg-gray-light border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="prestadores" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <Users className="h-3.5 w-3.5 mr-1.5" />Prestadores
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Movimientos
          </TabsTrigger>
          <TabsTrigger value="libro" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Libro de Honorarios
          </TabsTrigger>
          <TabsTrigger value="graficas" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gráficas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prestadores" className="mt-4">
          <TabPrestadores toast={toast} />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <TabMovimientos toast={toast} />
        </TabsContent>

        <TabsContent value="libro" className="mt-4">
          <TabLibroHonorarios toast={toast} />
        </TabsContent>

        <TabsContent value="graficas" className="mt-4">
          <TabGraficas />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════

function TabMovimientos({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [anio, setAnio]   = useState<number | 'all'>('all');
  const [mes, setMes]     = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [data, setData]   = useState<MovimientoHonorariosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]   = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<EditingMovimientoHonorarios | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoHonorariosRow | null>(null);
  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [nuevoPrestadorOpen, setNuevoPrestadorOpen] = useState(false);

  const handleSuccess = () => setRefreshKey(k => k + 1);

  const handleEditar = (r: MovimientoHonorariosRow) => {
    setEditingMovimiento(r);
    setSheetOpen(true);
  };

  const handleEliminarMovimiento = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any)
      .from('movimientos_honorarios')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Honorario eliminado' });
      handleSuccess();
    }
    setDeleteTarget(null);
  };

  const handleDocumentoChange = (id: string, url: string | null) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, documento_url: url } : r));
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any)
        .from('movimientos_honorarios')
        .select('id, fecha_docto, folio, tipo_documento, rut_prestador, nombre_prestador, monto_bruto, monto_retenido, monto_pagado, estado, fecha_anulacion, producto_servicio, documento_url')
        .order('fecha_docto', { ascending: true });
      if (anio !== 'all') q = q.eq('anio', anio);
      if (mes  !== 'all') q = q.eq('mes',  mes);
      const { data: rows, error } = await q;
      if (error) toast({ title: 'Error al cargar honorarios', variant: 'destructive' });
      else setData((rows ?? []) as MovimientoHonorariosRow[]);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut_prestador.toLowerCase().includes(t) || r.nombre_prestador.toLowerCase().includes(t)
    );
  }, [data, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totales = useMemo(() => ({
    bruto:    filtered.reduce((s, r) => s + (r.monto_bruto ?? 0), 0),
    retenido: filtered.reduce((s, r) => s + (r.monto_retenido ?? 0), 0),
    pagado:   filtered.reduce((s, r) => s + (r.monto_pagado ?? 0), 0),
  }), [filtered]);

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={FileText}   label="Total Documentos" value={String(filtered.length)}  iconClass="text-navy" />
        <Card icon={DollarSign} label="Total Bruto"      value={clp(totales.bruto)}       iconClass="text-periwinkle" />
        <Card icon={DollarSign} label="Total Retenido"   value={clp(totales.retenido)}    iconClass="text-magenta" />
        <Card icon={DollarSign} label="Total Pagado"     value={clp(totales.pagado)}      iconClass="text-navy" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Filtros + Acciones */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={String(anio)} onValueChange={v => setAnio(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-24"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(mes)} onValueChange={v => setMes(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar por RUT o Prestador..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setCargaMasivaOpen(true)}>
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carga Masiva</span>
              <span className="sm:hidden">Masiva</span>
            </Button>
            <Button variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setNuevoPrestadorOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Prestador</span>
              <span className="sm:hidden">Prestador</span>
            </Button>
            <Button className="bg-[#C501E2] hover:bg-[#C501E2]/90 text-white text-xs sm:text-sm"
              onClick={() => { setEditingMovimiento(null); setSheetOpen(true); }}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <FileText className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay honorarios para el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Fecha','Tipo','Folio','RUT','Prestador','Bruto','Retenido','Pagado','Estado'].map((h, i) => (
                      <TableHead key={i} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-white font-semibold text-xs w-[40px]">Doc.</TableHead>
                    <TableHead className="text-white font-semibold text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs whitespace-nowrap">{r.fecha_docto}</TableCell>
                      <TableCell className="text-xs font-medium">{r.tipo_documento}</TableCell>
                      <TableCell className="text-xs">{r.folio}</TableCell>
                      <TableCell className="text-xs font-medium text-navy">{r.rut_prestador}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{r.nombre_prestador}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_bruto)}</TableCell>
                      <TableCell className="text-xs text-right text-magenta">{clp(r.monto_retenido)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{clp(r.monto_pagado)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          className={r.estado === 'Vigente'
                            ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                            : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}
                          style={{ borderRadius: '20px' }}
                        >
                          {r.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DocumentRowAction
                          rowId={r.id}
                          tabla="movimientos_honorarios"
                          tenantId={tenantId}
                          documentoUrl={r.documento_url}
                          onDocumentoChange={handleDocumentoChange}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                            title="Editar" onClick={() => handleEditar(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70"
                            title="Eliminar" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={5} className="text-xs font-bold">TOTALES ({filtered.length} documentos)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.bruto)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.retenido)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.pagado)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.map((r) => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_prestador}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut_prestador} · {r.tipo_documento} · Folio {r.folio}</p>
                    </div>
                    <Badge
                      className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 ${r.estado === 'Vigente'
                        ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                        : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}`}
                      style={{ borderRadius: '20px' }}
                    >
                      {r.estado}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Fecha: </span>{r.fecha_docto}</div>
                    <div><span className="font-medium text-navy/70">Bruto: </span>{clp(r.monto_bruto)}</div>
                    <div><span className="font-medium text-navy/70">Retenido: </span><span className="text-magenta">{clp(r.monto_retenido)}</span></div>
                    <div><span className="font-medium text-navy/70">Pagado: </span><span className="font-semibold">{clp(r.monto_pagado)}</span></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => handleEditar(r)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40"
                      onClick={() => setDeleteTarget(r)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs font-bold text-navy mb-1">TOTALES ({filtered.length} documentos)</p>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div><span className="text-gray-text">Bruto: </span><span className="font-semibold">{clp(totales.bruto)}</span></div>
                  <div><span className="text-gray-text">Retenido: </span><span className="font-semibold">{clp(totales.retenido)}</span></div>
                  <div><span className="text-gray-text">Pagado: </span><span className="font-bold text-navy">{clp(totales.pagado)}</span></div>
                </div>
              </div>
            </div>
            <Paginacion page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      <NuevoMovimientoHonorariosSheet
        open={sheetOpen}
        onOpenChange={v => { setSheetOpen(v); if (!v) setEditingMovimiento(null); }}
        tenantId={tenantId}
        editingMovimiento={editingMovimiento}
        onSuccess={handleSuccess}
      />
      {tenantId && (
        <PrestadorFormSheet
          open={nuevoPrestadorOpen}
          onOpenChange={setNuevoPrestadorOpen}
          tenantId={tenantId}
          onSuccess={() => {
            setNuevoPrestadorOpen(false);
            handleSuccess();
          }}
        />
      )}
      <CargaMasivaHonorariosDialog
        open={cargaMasivaOpen}
        onOpenChange={setCargaMasivaOpen}
        tenantId={tenantId}
        onSuccess={handleSuccess}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar honorario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el honorario de <strong>{deleteTarget?.nombre_prestador}</strong> (Folio {deleteTarget?.folio}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={handleEliminarMovimiento}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — LIBRO DE HONORARIOS
// ═══════════════════════════════════════════════════════════════════════════════

function TabLibroHonorarios({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const [anio, setAnio]   = useState<number | 'all'>('all');
  const [mes, setMes]     = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [data, setData]   = useState<LibroHonorariosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]   = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any).from('libro_honorarios').select('*').order('nombre_prestador', { ascending: true });
      if (anio !== 'all' && mes !== 'all') {
        q = q.eq('periodo', `${anio}-${padMes(Number(mes))}`);
      } else if (anio !== 'all') {
        q = q.ilike('periodo', `${anio}-%`);
      } else if (mes !== 'all') {
        q = q.ilike('periodo', `%-${padMes(Number(mes))}`);
      }
      const { data: rows, error } = await q;
      if (error) toast({ title: 'Error al cargar libro de honorarios', variant: 'destructive' });
      else setData((rows ?? []) as LibroHonorariosRow[]);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      (r.rut ?? '').toLowerCase().includes(t) ||
      (r.nombre_prestador ?? '').toLowerCase().includes(t)
    );
  }, [data, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totales = useMemo(() => ({
    docs:     filtered.length,
    bruto:    filtered.reduce((s, r) => s + (r.bruto ?? 0), 0),
    retenido: filtered.reduce((s, r) => s + (r.retencion ?? 0), 0),
    pagado:   filtered.reduce((s, r) => s + (r.pagado ?? 0), 0),
  }), [filtered]);

  const handleExportar = () => {
    const cols = ['Fecha','Tipo','Folio','RUT','Prestador','Bruto','Retención','Pagado','Estado'];
    const rowsData = filtered.map(r => [
      r.fecha, r.tipo_documento, r.nro_documento, r.rut, r.nombre_prestador,
      r.bruto, r.retencion, r.pagado, r.estado,
    ]);
    rowsData.push(['', '', '', '', 'TOTAL', totales.bruto, totales.retenido, totales.pagado, '']);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rowsData]);
    ws['!cols'] = [{ wch: 12 },{ wch: 6 },{ wch: 10 },{ wch: 14 },{ wch: 30 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Libro de Honorarios');
    const periodoExport = (anio === 'all' && mes === 'all') ? 'Completo' : (mes === 'all' ? String(anio) : `${MESES[Number(mes) - 1].l}_${anio}`);
    XLSX.writeFile(wb, `LibroHonorarios_${periodoExport}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Filtros + Exportar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={String(anio)} onValueChange={v => setAnio(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-24"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(mes)} onValueChange={v => setMes(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar RUT o Prestador..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <Button
            className="bg-[#676FF8] hover:bg-[#676FF8]/90 text-white shrink-0"
            onClick={handleExportar}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <FileSpreadsheet className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay registros para el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Fecha','Tipo','Folio','RUT','Prestador','Bruto','Retención','Pagado','Estado'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={`${r.rut}-${r.nro_documento}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs whitespace-nowrap">{r.fecha}</TableCell>
                      <TableCell className="text-xs font-medium">{r.tipo_documento}</TableCell>
                      <TableCell className="text-xs">{r.nro_documento}</TableCell>
                      <TableCell className="text-xs font-medium text-navy">{r.rut}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{r.nombre_prestador}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.bruto)}</TableCell>
                      <TableCell className="text-xs text-right text-magenta">{clp(r.retencion)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{clp(r.pagado)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          className={r.estado === 'Vigente'
                            ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                            : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}
                          style={{ borderRadius: '20px' }}
                        >
                          {r.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={5} className="text-xs font-bold">TOTALES ({filtered.length} registros)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.bruto)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.retenido)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.pagado)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.map((r, idx) => (
                <div key={`${r.rut}-${r.nro_documento}-${idx}`} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_prestador}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut} · {r.tipo_documento} · Folio {r.nro_documento}</p>
                    </div>
                    <Badge
                      className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 ${r.estado === 'Vigente'
                        ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                        : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}`}
                      style={{ borderRadius: '20px' }}
                    >
                      {r.estado}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Fecha: </span>{r.fecha}</div>
                    <div><span className="font-medium text-navy/70">Bruto: </span>{clp(r.bruto)}</div>
                    <div><span className="font-medium text-navy/70">Retención: </span><span className="text-magenta">{clp(r.retencion)}</span></div>
                    <div><span className="font-medium text-navy/70">Pagado: </span><span className="font-semibold">{clp(r.pagado)}</span></div>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs font-bold text-navy mb-1">TOTALES ({filtered.length} registros)</p>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div><span className="text-gray-text">Bruto: </span><span className="font-semibold">{clp(totales.bruto)}</span></div>
                  <div><span className="text-gray-text">Retención: </span><span className="font-semibold">{clp(totales.retenido)}</span></div>
                  <div><span className="text-gray-text">Pagado: </span><span className="font-bold text-navy">{clp(totales.pagado)}</span></div>
                </div>
              </div>
            </div>
            <Paginacion page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — GRÁFICAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabGraficas() {
  const [anio, setAnio]   = useState<number | 'all'>('all');
  const [data, setData]   = useState<MovimientoHonorariosRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any)
        .from('movimientos_honorarios')
        .select('fecha_docto, monto_bruto, monto_retenido, monto_pagado, nombre_prestador, rut_prestador')
        .eq('estado', 'Vigente');
      if (anio !== 'all') q = q.gte('fecha_docto', `${anio}-01-01`).lte('fecha_docto', `${anio}-12-31`);
      const { data: rows } = await q;
      setData((rows ?? []) as MovimientoHonorariosRow[]);
      setLoading(false);
    };
    fetch();
  }, [anio]);

  const mesFromFecha = (f: string) => parseInt(f.substring(5, 7), 10);

  // Gráfico 1: Bruto vs Retenido por mes
  const mensual = useMemo(() =>
    MESES_CORTOS.map((mes, idx) => {
      const rows = data.filter(r => r.fecha_docto && mesFromFecha(r.fecha_docto) === idx + 1);
      return {
        mes,
        bruto:    rows.reduce((s, r) => s + (r.monto_bruto ?? 0), 0),
        retenido: rows.reduce((s, r) => s + (r.monto_retenido ?? 0), 0),
      };
    }), [data]);

  // Gráfico 2: Top 10 prestadores por bruto (PieChart)
  const porPrestadorPie = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const key = r.nombre_prestador || r.rut_prestador;
      map.set(key, (map.get(key) ?? 0) + (r.monto_bruto ?? 0));
    });
    return Array.from(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // Gráfico 3: Top 10 prestadores ranking horizontal
  const topPrestadores = useMemo(() => {
    const map = new Map<string, { bruto: number; retenido: number }>();
    data.forEach(r => {
      const key = r.nombre_prestador || r.rut_prestador;
      const cur = map.get(key) ?? { bruto: 0, retenido: 0 };
      map.set(key, { bruto: cur.bruto + (r.monto_bruto ?? 0), retenido: cur.retenido + (r.monto_retenido ?? 0) });
    });
    return Array.from(map).sort((a, b) => b[1].bruto - a[1].bruto).slice(0, 10)
      .map(([name, v]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, ...v }));
  }, [data]);

  if (loading) return <div className="py-16 text-center text-gray-text/60 text-sm">Cargando gráficas...</div>;

  return (
    <div className="space-y-6">
      {/* Filtro año */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-navy">Año:</span>
        <Select value={String(anio)} onValueChange={v => setAnio(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
          <BarChart2 className="h-12 w-12 opacity-30" />
          <p className="text-sm">No hay datos de honorarios{anio !== 'all' ? ` para ${anio}` : ''}</p>
        </div>
      ) : (
        <>
          {/* Gráfico 1: Bruto vs Retenido mensual */}
          <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
            <h3 className="text-sm font-bold text-navy mb-4">Bruto vs Retenido por Mes</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mensual} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fontFamily: 'Poppins' }} />
                <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fontFamily: 'Poppins' }} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-CL')}`, '']} labelStyle={{ fontFamily: 'Poppins' }} />
                <Legend wrapperStyle={{ fontFamily: 'Poppins', fontSize: 12 }} />
                <Bar dataKey="bruto" name="Bruto" fill="#263578" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retenido" name="Retenido" fill="#C501E2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 2: PieChart Top 10 prestadores */}
            <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
              <h3 className="text-sm font-bold text-navy mb-4">Top 10 Prestadores por Bruto</h3>
              {porPrestadorPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={porPrestadorPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}>
                      {porPrestadorPie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-CL')}`, 'Bruto']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-10 text-center text-gray-text/50 text-sm">Sin datos</div>
              )}
            </div>

            {/* Gráfico 3: Ranking horizontal */}
            <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
              <h3 className="text-sm font-bold text-navy mb-4">Top 10 Prestadores (Ranking)</h3>
              {topPrestadores.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topPrestadores} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tickFormatter={ejeClp} tick={{ fontSize: 10, fontFamily: 'Poppins' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontFamily: 'Poppins' }} width={75} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-CL')}`, '']} />
                    <Bar dataKey="bruto" name="Bruto" fill="#263578" radius={[0, 4, 4, 0]}>
                      {topPrestadores.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-10 text-center text-gray-text/50 text-sm">Sin datos</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — PRESTADORES
// ═══════════════════════════════════════════════════════════════════════════════

interface PrestadorRow {
  id: string;
  rut: string;
  nombre: string;
  correo: string | null;
  fono: string | null;
  activo: boolean;
  sociedad_prof: boolean;
}

function TabPrestadores({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [data, setData]             = useState<PrestadorRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editing, setEditing]       = useState<PrestadorRow | null>(null);
  const [deleting, setDeleting]     = useState<PrestadorRow | null>(null);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('prestadores')
        .select('id, rut, nombre, correo, fono, activo, sociedad_prof')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true });
      if (error) toast({ title: 'Error al cargar prestadores', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [tenantId, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut.toLowerCase().includes(t) ||
      r.nombre.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activos   = data.filter(r => r.activo).length;
  const inactivos = data.filter(r => !r.activo).length;

  const handleToggleActivo = async (p: PrestadorRow) => {
    const { error } = await (supabase as any)
      .from('prestadores')
      .update({ activo: !p.activo })
      .eq('id', p.id);
    if (error) toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    else onSuccess();
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any)
      .from('prestadores')
      .delete()
      .eq('id', deleting.id);
    if (error) {
      toast({ title: 'No se puede eliminar', description: 'El prestador tiene honorarios registrados.', variant: 'destructive' });
    } else {
      toast({ title: 'Prestador eliminado' });
      onSuccess();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card icon={Users}    label="Total Prestadores" value={String(data.length)} iconClass="text-navy" />
        <Card icon={DollarSign} label="Activos"         value={String(activos)}     iconClass="text-periwinkle" />
        <Card icon={FileText} label="Inactivos"         value={String(inactivos)}   iconClass="text-magenta" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Busca */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
            <Input
              placeholder="Buscar por RUT o nombre..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Button
            className="bg-navy hover:bg-navy/90 text-white text-xs sm:text-sm shrink-0"
            onClick={() => { setEditing(null); setSheetOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Prestador</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay prestadores registrados</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['RUT', 'Nombre', 'Correo', 'Teléfono', 'Soc. Prof.', 'Estado', 'Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((p, idx) => (
                    <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{p.rut}</TableCell>
                      <TableCell className="text-xs">{p.nombre}</TableCell>
                      <TableCell className="text-xs">{p.correo ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.fono ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {p.sociedad_prof
                          ? <Badge className="bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-100 text-[10px]" style={{ borderRadius: 20 }}>Sí</Badge>
                          : <span className="text-gray-text/50">No</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={p.activo
                            ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                            : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}
                          style={{ borderRadius: 20 }}
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                            title="Editar"
                            onClick={() => { setEditing(p); setSheetOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={`h-7 w-7 ${p.activo ? 'text-amber-500 hover:text-amber-600' : 'text-green-600 hover:text-green-700'}`}
                            title={p.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleActivo(p)}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70"
                            title="Eliminar"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.map(p => (
                <div key={p.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-text mt-0.5">
                        {p.rut}{p.sociedad_prof ? ' · Soc. Prof.' : ''}
                      </p>
                    </div>
                    <Badge
                      className={`shrink-0 ml-2 text-[10px] ${p.activo
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-600 border border-red-300'}`}
                      style={{ borderRadius: 20 }}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    {p.correo && <div><span className="font-medium text-navy/70">Correo: </span>{p.correo}</div>}
                    {p.fono && <div><span className="font-medium text-navy/70">Tel: </span>{p.fono}</div>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => { setEditing(p); setSheetOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40"
                      onClick={() => setDeleting(p)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Paginacion page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      {tenantId && (
        <PrestadorFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tenantId={tenantId}
          editingPrestador={editing ? { ...editing, tenant_id: tenantId } : null}
          onSuccess={() => {
            setSheetOpen(false);
            onSuccess();
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar prestador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleting?.nombre}</strong> ({deleting?.rut}).
              Esta acción no se puede deshacer. Si tiene honorarios registrados, no podrá eliminarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={handleEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
