import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2, DollarSign, Download, FileSpreadsheet,
  FileText, Pencil, Plus, Search, ToggleLeft, ToggleRight, Trash2, TrendingUp, 
  Upload, UserCheck, UserPlus, UserX, Users,
} from 'lucide-react';
import NuevoMovimientoSheet, { EditingMovimiento } from '@/components/NuevoMovimientoSheet';
import DocumentRowAction from '@/components/DocumentRowAction';
import CargaMasivaVentasDialog from '@/components/CargaMasivaVentasDialog';
import CargaMasivaDialog from '@/components/CargaMasivaDialog';
import ClienteFormSheet from '@/components/ClienteFormSheet';
import { Badge } from '@/components/ui/badge';
import { displayFono } from '@/lib/formatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tables } from '@/integrations/supabase/types';
import { displayDate } from '@/lib/formatters';
import { PaginationControls, usePageSize } from '@/components/PaginationControls';
import { useTenantId } from '@/hooks/useTenantId';
import { CUR_YEAR, MESES, MESES_CORTOS, ANOS, CHART_COLORS, TOTALES_STYLE as TotalesStyle } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

type LibroRow = Tables<'libro_ventas'>;

type MovimientoRow = {
  id: string;
  fecha_docto: string;
  folio: number;
  rut_cliente: string;
  razon_social: string;
  monto_exento: number | null;
  monto_neto: number | null;
  monto_iva: number | null;
  otro_impto: number | null;
  monto_total: number | null;
  tipo_documento: { nombre: string } | null;
  documento_url: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CUR_MES  = new Date().getMonth() + 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clp = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toLocaleString('es-CL')}`;

const ejeClp = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const mesFromFecha = (f: string) => parseInt(f.substring(5, 7), 10);
const padMes = (m: number) => String(m).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

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


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Ventas() {
  const { toast } = useToast();

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Ventas</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Control de ventas del sistema</p>
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="bg-gray-light border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="clientes" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <Users className="h-3.5 w-3.5 mr-1.5" />Clientes
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Movimientos
          </TabsTrigger>
          <TabsTrigger value="libro" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Libro de Ventas
          </TabsTrigger>
          <TabsTrigger value="graficas" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gráficas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <TabClientes toast={toast} />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <TabMovimientos toast={toast} />
        </TabsContent>

        <TabsContent value="libro" className="mt-4">
          <TabLibroVentas toast={toast} />
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
  const { initialPageSize, persist: persistPageSize } = usePageSize('ventas-movimientos', 20);

  const [anio, setAnio]   = useState<number | 'all'>('all');
  const [mes, setMes]     = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [data, setData]   = useState<MovimientoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]   = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<EditingMovimiento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false);

  const handleSuccess = () => setRefreshKey(k => k + 1);

  const handleDocumentoChange = (id: string, url: string | null) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, documento_url: url } : r));
  };

  const handleEditar = (row: MovimientoRow) => {
    setEditingMovimiento({
      id: row.id,
      fecha_docto: row.fecha_docto,
      folio: row.folio,
      rut_cliente: row.rut_cliente,
      razon_social: row.razon_social,
      monto_exento: row.monto_exento,
      monto_neto: row.monto_neto,
      monto_iva: row.monto_iva,
      otro_impto: row.otro_impto,
      monto_total: row.monto_total,
      documento_url: row.documento_url,
    });
    setSheetOpen(true);
  };

  const handleEliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('movimientos_venta')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error al eliminar movimiento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Movimiento folio ${deleteTarget.folio} eliminado` });
      setRefreshKey(k => k + 1);
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('movimientos_venta')
        .select('id, fecha_docto, folio, rut_cliente, razon_social, monto_exento, monto_neto, monto_iva, otro_impto, monto_total, documento_url, tipo_documento:tipo_doc_id(nombre)')
        .order('fecha_docto', { ascending: false });

      if (anio !== 'all') query = query.eq('anio', anio);
      if (mes  !== 'all') query = query.eq('mes',  mes);

      const { data: rows, error } = await query;
      if (error) toast({ title: 'Error al cargar movimientos', variant: 'destructive' });
      else setData((rows ?? []) as unknown as MovimientoRow[]);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut_cliente.toLowerCase().includes(t) || r.razon_social.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totales = useMemo(() => ({
    exento: filtered.reduce((s, r) => s + (r.monto_exento ?? 0), 0),
    neto:   filtered.reduce((s, r) => s + (r.monto_neto ?? 0), 0),
    iva:    filtered.reduce((s, r) => s + (r.monto_iva ?? 0), 0),
    otro:   filtered.reduce((s, r) => s + (r.otro_impto ?? 0), 0),
    total:  filtered.reduce((s, r) => s + (r.monto_total ?? 0), 0),
  }), [filtered]);

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={FileText}   label="Total Documentos" value={String(filtered.length)} iconClass="text-navy" />
        <Card icon={DollarSign} label="Total Neto"  value={clp(totales.neto)}  iconClass="text-periwinkle" />
        <Card icon={TrendingUp} label="Total IVA"   value={clp(totales.iva)}   iconClass="text-magenta" />
        <Card icon={DollarSign} label="Total"       value={clp(totales.total)} iconClass="text-navy" />
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
              <Input placeholder="Buscar por RUT o Nombre..." value={search}
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
              onClick={() => setNuevoClienteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Cliente</span>
              <span className="sm:hidden">Cliente</span>
            </Button>
            <Button className="bg-magenta hover:bg-magenta/90 text-white text-xs sm:text-sm"
              onClick={() => setSheetOpen(true)}>
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
            <TrendingUp className="h-12 w-12 opacity-30" />
            <p className="text-sm">No se han encontrado movimientos</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Fecha','Folio','RUT','Cliente','Tipo Doc','Exento','Neto','IVA','Otro Impto','Total'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-white font-semibold text-xs w-[96px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs whitespace-nowrap">{displayDate(r.fecha_docto)}</TableCell>
                      <TableCell className="text-xs">{r.folio}</TableCell>
                      <TableCell className="text-xs font-medium text-navy">{r.rut_cliente}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{r.razon_social}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.tipo_documento?.nombre ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_exento)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_neto)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_iva)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.otro_impto)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{clp(r.monto_total)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          <button type="button" onClick={() => handleEditar(r)} title="Editar"
                            className="p-1 rounded text-periwinkle hover:bg-periwinkle/10 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(r)} title="Eliminar"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <DocumentRowAction
                            rowId={r.id}
                            tabla="movimientos_venta"
                            tenantId={tenantId}
                            documentoUrl={r.documento_url}
                            onDocumentoChange={handleDocumentoChange}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={5} className="text-xs font-bold">TOTALES ({filtered.length} documentos)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.exento)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.neto)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.iva)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.otro)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {paginated.map((r) => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.razon_social}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut_cliente} · Folio {r.folio}</p>
                    </div>
                    <p className="text-sm font-bold text-navy ml-2 shrink-0">{clp(r.monto_total)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Fecha: </span>{displayDate(r.fecha_docto)}</div>
                    <div><span className="font-medium text-navy/70">Tipo: </span>{r.tipo_documento?.nombre ?? '—'}</div>
                    <div><span className="font-medium text-navy/70">Neto: </span>{clp(r.monto_neto)}</div>
                    <div><span className="font-medium text-navy/70">IVA: </span>{clp(r.monto_iva)}</div>
                  </div>
                  <div className="flex justify-end gap-1 border-t border-border/50 pt-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-periwinkle hover:bg-periwinkle/10" onClick={() => handleEditar(r)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-text/40 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
                    </Button>
                    <DocumentRowAction
                      rowId={r.id}
                      tabla="movimientos_venta"
                      tenantId={tenantId}
                      documentoUrl={r.documento_url}
                      onDocumentoChange={handleDocumentoChange}
                    />
                  </div>
                </div>
              ))}
              {/* Totales mobile */}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs font-bold text-navy mb-1">TOTALES ({filtered.length} documentos)</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-text">Neto: </span><span className="font-semibold">{clp(totales.neto)}</span></div>
                  <div><span className="text-gray-text">IVA: </span><span className="font-semibold">{clp(totales.iva)}</span></div>
                  <div><span className="text-gray-text">Exento: </span><span className="font-semibold">{clp(totales.exento)}</span></div>
                  <div><span className="text-gray-text">Total: </span><span className="font-bold text-navy">{clp(totales.total)}</span></div>
                </div>
              </div>
            </div>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); persistPageSize(size); }}
            />
          </>
        )}
      </div>

      {tenantId && (
        <NuevoMovimientoSheet
          open={sheetOpen}
          onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditingMovimiento(null); }}
          tenantId={tenantId}
          editingMovimiento={editingMovimiento}
          onSuccess={handleSuccess}
        />
      )}
      {tenantId && (
        <CargaMasivaVentasDialog
          open={cargaMasivaOpen}
          onOpenChange={setCargaMasivaOpen}
          tenantId={tenantId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Sheet Nuevo Cliente */}
      {tenantId && (
        <ClienteFormSheet
          open={nuevoClienteOpen}
          onOpenChange={setNuevoClienteOpen}
          tenantId={tenantId}
          onSuccess={() => setNuevoClienteOpen(false)}
        />
      )}

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el folio{' '}
              <span className="font-semibold text-navy">{deleteTarget?.folio}</span>{' '}
              de {deleteTarget?.razon_social} del Libro de Ventas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEliminar}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — LIBRO DE VENTAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabLibroVentas({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const { initialPageSize, persist: persistPageSize } = usePageSize('ventas-libro', 20);

  const [anio, setAnio]     = useState<number | 'all'>('all');
  const [mes, setMes]       = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [data, setData]     = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('libro_ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (anio !== 'all' && mes !== 'all') {
        const inicio = `${anio}-${padMes(Number(mes))}-01`;
        const fin    = `${anio}-${padMes(Number(mes))}-${lastDay(Number(anio), Number(mes))}`;
        query = query.gte('fecha', inicio).lte('fecha', fin);
      } else if (anio !== 'all') {
        query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
      } else if (mes !== 'all') {
        query = query.ilike('periodo', `%-${padMes(Number(mes))}`);
      }

      const { data: rows, error } = await query;
      if (error) toast({ title: 'Error al cargar libro de ventas', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      (r.rut ?? '').toLowerCase().includes(t) ||
      (r.nombre_cliente ?? '').toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPagesLibro = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totales = useMemo(() => ({
    exento: filtered.reduce((s, r) => s + (r.exento ?? 0), 0),
    neto:   filtered.reduce((s, r) => s + (r.neto ?? 0), 0),
    iva:    filtered.reduce((s, r) => s + (r.iva ?? 0), 0),
    otro:   filtered.reduce((s, r) => s + (r.otro_impto ?? 0), 0),
    total:  filtered.reduce((s, r) => s + (r.total ?? 0), 0),
  }), [filtered]);

  const handleExportar = () => {
    const cols = ['Fecha','Período','RUT','Nombre Cliente','Tipo Documento','N° Documento','Exento','Neto','IVA','Otro Impto','Total'];
    const rows = filtered.map(r => [
      r.fecha, r.periodo, r.rut, r.nombre_cliente, r.tipo_documento,
      r.nro_documento, r.exento, r.neto, r.iva, r.otro_impto, r.total,
    ]);
    rows.push(['', '', '', '', '', 'TOTAL', totales.exento, totales.neto, totales.iva, totales.otro, totales.total]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
    ws['!cols'] = [{ wch: 12 },{ wch: 10 },{ wch: 14 },{ wch: 28 },{ wch: 22 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Libro de Ventas');
    const periodoExport = (anio === 'all' && mes === 'all') ? 'Completo' : (mes === 'all' ? String(anio) : `${MESES[Number(mes) - 1].l}_${anio}`);
    XLSX.writeFile(wb, `LibroVentas_${periodoExport}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card icon={FileText}    label="Total Documentos" value={String(filtered.length)} iconClass="text-navy" />
        <Card icon={DollarSign}  label="Total Exento"  value={clp(totales.exento)} iconClass="text-gray-text" />
        <Card icon={DollarSign}  label="Total Neto"    value={clp(totales.neto)}   iconClass="text-periwinkle" />
        <Card icon={TrendingUp}  label="Total IVA"     value={clp(totales.iva)}    iconClass="text-magenta" />
        <Card icon={DollarSign}  label="Total General" value={clp(totales.total)}  iconClass="text-navy" />
      </div>

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
              <Input placeholder="Buscar RUT o Nombre..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <Button
            className="bg-periwinkle hover:bg-periwinkle/90 text-white shrink-0"
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
            <p className="text-sm">No se han encontrado registros</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Fecha','Período','RUT','Nombre Cliente','Tipo Documento','N° Doc','Exento','Neto','IVA','Otro Impto','Total'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={`${r.rut}-${r.nro_documento}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs whitespace-nowrap">{r.fecha}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.periodo}</TableCell>
                      <TableCell className="text-xs font-medium text-navy">{r.rut}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{r.nombre_cliente}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.tipo_documento}</TableCell>
                      <TableCell className="text-xs text-right">{r.nro_documento}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.exento)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.neto)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.iva)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.otro_impto)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{clp(r.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={6} className="text-xs font-bold">TOTALES ({filtered.length} documentos)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.exento)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.neto)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.iva)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.otro)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {paginated.map((r, idx) => (
                <div key={`${r.rut}-${r.nro_documento}-${idx}`} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_cliente}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut} · {r.tipo_documento ?? '—'}</p>
                    </div>
                    <p className="text-sm font-bold text-navy ml-2 shrink-0">{clp(r.total)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Fecha: </span>{r.fecha}</div>
                    <div><span className="font-medium text-navy/70">N° Doc: </span>{r.nro_documento}</div>
                    <div><span className="font-medium text-navy/70">Neto: </span>{clp(r.neto)}</div>
                    <div><span className="font-medium text-navy/70">IVA: </span>{clp(r.iva)}</div>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs font-bold text-navy mb-1">TOTALES ({filtered.length} documentos)</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-text">Neto: </span><span className="font-semibold">{clp(totales.neto)}</span></div>
                  <div><span className="text-gray-text">IVA: </span><span className="font-semibold">{clp(totales.iva)}</span></div>
                  <div><span className="text-gray-text">Exento: </span><span className="font-semibold">{clp(totales.exento)}</span></div>
                  <div><span className="text-gray-text">Total: </span><span className="font-bold text-navy">{clp(totales.total)}</span></div>
                </div>
              </div>
            </div>
            <PaginationControls
              page={page}
              totalPages={totalPagesLibro}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); persistPageSize(size); }}
            />
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
  const [data, setData]   = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from('libro_ventas').select('*');
      if (anio !== 'all') query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
      const { data: rows } = await query;
      setData(rows ?? []);
      setLoading(false);
    };
    fetch();
  }, [anio]);

  // Datos para gráfico 1: Ventas mensuales
  const mensual = useMemo(() =>
    MESES_CORTOS.map((mes, idx) => {
      const rows = data.filter(r => r.fecha && mesFromFecha(r.fecha) === idx + 1);
      return { mes, total: rows.reduce((s, r) => s + (r.total ?? 0), 0), docs: rows.length };
    }), [data]);

  // Datos para gráfico 2: Por tipo de documento
  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const t = r.tipo_documento ?? 'Sin tipo';
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    return Array.from(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Datos para gráfico 3: Composición mensual
  const composicion = useMemo(() =>
    MESES_CORTOS.map((mes, idx) => {
      const rows = data.filter(r => r.fecha && mesFromFecha(r.fecha) === idx + 1);
      return {
        mes,
        exento: rows.reduce((s, r) => s + (r.exento ?? 0), 0),
        neto:   rows.reduce((s, r) => s + (r.neto ?? 0), 0),
        iva:    rows.reduce((s, r) => s + (r.iva ?? 0), 0),
      };
    }), [data]);

  // Datos para gráfico 4: Top 10 clientes
  const top10 = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const n = r.nombre_cliente ?? 'Sin nombre';
      map.set(n, (map.get(n) ?? 0) + (r.total ?? 0));
    });
    return Array.from(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([fullName, total]) => ({
        name: fullName.length > 22 ? fullName.slice(0, 22) + '…' : fullName,
        fullName,
        total,
      }));
  }, [data]);

  const tieneData = data.length > 0;

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-navy mb-4">{title}</h3>
      {children}
    </div>
  );

  const TooltipClp = ({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-card p-3 text-xs">
        <p className="font-semibold text-navy mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {clp(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selector año */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-text font-medium">Año:</span>
        <Select value={String(anio)} onValueChange={v => setAnio(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-text/60 text-sm">Cargando gráficas...</div>
      ) : !tieneData ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-text/60">
          <BarChart2 className="h-12 w-12 opacity-30" />
          <p className="text-sm">No hay datos para el año seleccionado</p>
        </div>
      ) : (
        <>
          {/* Fila 1: Ventas mensuales + Por tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Ventas Mensuales">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mensual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<TooltipClp />} formatter={(v: number) => [clp(v), 'Total']} />
                  <Bar dataKey="total" fill="#676FF8" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Documentos por Tipo">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={porTipo}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {porTipo.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} documentos`, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Fila 2: Composición + Top 10 clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Composición de Ventas por Mes">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={composicion} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<TooltipClp />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="exento" stackId="a" fill="#676FF8" name="Exento" />
                  <Bar dataKey="neto"   stackId="a" fill="#263578" name="Neto" />
                  <Bar dataKey="iva"    stackId="a" fill="#C501E2" name="IVA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Clientes">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={top10}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number, _: string, props: { payload?: { fullName?: string } }) => [clp(v), props.payload?.fullName ?? '']}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey="total" fill="#263578" radius={[0, 4, 4, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════

type Cliente = Tables<'clientes'>;

function TabClientes({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const { initialPageSize, persist: persistPageSize } = usePageSize('ventas-clientes', 10);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClientes = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nombre', { ascending: true });

    if (error) {
      toast({ title: 'Error al cargar clientes', variant: 'destructive' });
    } else {
      setClientes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) fetchClientes();
  }, [tenantId]);

  useEffect(() => {
    const term = search.toLowerCase();
    const result = clientes.filter(
      (c) =>
        c.rut.toLowerCase().includes(term) ||
        c.nombre.toLowerCase().includes(term)
    );
    setFiltered(result);
    setPage(1);
  }, [search, clientes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalClientes = clientes.length;
  const activos = clientes.filter((c) => c.activo).length;
  const inactivos = clientes.filter((c) => !c.activo).length;

  const handleNuevo = () => {
    setEditingCliente(null);
    setSheetOpen(true);
  };

  const handleEditar = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setSheetOpen(true);
  };

  const handleToggleActivo = async (cliente: Cliente) => {
    if (!tenantId) return;
    const nuevoEstado = !cliente.activo;
    const { error } = await supabase
      .from('clientes')
      .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', cliente.id)
      .eq('tenant_id', tenantId);

    if (error) {
      toast({ title: 'Error al cambiar estado', variant: 'destructive' });
    } else {
      toast({ title: nuevoEstado ? 'Cliente activado' : 'Cliente desactivado' });
      fetchClientes();
    }
  };

  const handleEliminar = async () => {
    if (!deleteTarget || !tenantId) return;
    setDeleting(true);
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('tenant_id', tenantId);

    if (error) {
      toast({ title: 'Error al eliminar cliente', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Cliente "${deleteTarget.nombre}" eliminado` });
      fetchClientes();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const vencimientoLabel = (v: number | null) => {
    if (v === null) return '—';
    if (v === 0) return 'Sin vencimiento';
    return `${v} días`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card icon={Users} label="Total" value={String(totalClientes)} />
        <Card icon={UserCheck} label="Activos" value={String(activos)} iconClass="text-green-600" />
        <Card icon={UserX} label="Inactivos" value={String(inactivos)} iconClass="text-red-500" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
            <Input placeholder="Buscar por RUT o Nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm" onClick={() => setCargaMasivaOpen(true)}>
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span>Carga Masiva</span>
            </Button>
            <Button className="bg-magenta hover:bg-magenta/90 text-white text-xs sm:text-sm" onClick={handleNuevo}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span>Nuevo Cliente</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay clientes registrados</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-lg overflow-hidden border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    <TableHead className="text-white font-semibold text-xs">RUT</TableHead>
                    <TableHead className="text-white font-semibold text-xs">Nombre</TableHead>
                    <TableHead className="text-white font-semibold text-xs hidden lg:table-cell">Correo</TableHead>
                    <TableHead className="text-white font-semibold text-xs">Vencimiento</TableHead>
                    <TableHead className="text-white font-semibold text-xs">Estado</TableHead>
                    <TableHead className="text-white font-semibold text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((cliente, idx) => (
                    <TableRow key={cliente.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{cliente.rut}</TableCell>
                      <TableCell className="text-xs">{cliente.nombre}</TableCell>
                      <TableCell className="text-xs text-gray-text/70 hidden lg:table-cell">{cliente.correo ?? '—'}</TableCell>
                      <TableCell className="text-xs">{vencimientoLabel(cliente.vencimiento)}</TableCell>
                      <TableCell>
                        <Badge className={cliente.activo ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-600 border-red-300'} style={{ borderRadius: '20px' }}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-periwinkle" onClick={() => handleEditar(cliente)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className={`h-7 w-7 ${cliente.activo ? 'text-amber-500' : 'text-green-600'}`} onClick={() => handleToggleActivo(cliente)}>
                            {cliente.activo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-text/40 hover:text-red-600" onClick={() => setDeleteTarget(cliente)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {paginated.map((cliente) => (
                <div key={cliente.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{cliente.nombre}</p>
                      <p className="text-xs text-gray-text">{cliente.rut}</p>
                    </div>
                    <Badge className={cliente.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'} style={{ borderRadius: '20px' }}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEditar(cliente)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => setDeleteTarget(cliente)}><Trash2 className="h-3 w-3 mr-1" /> Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); persistPageSize(size); }}
            />
          </>
        )}
      </div>

      {tenantId && (
        <ClienteFormSheet
          open={sheetOpen}
          onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditingCliente(null); }}
          tenantId={tenantId}
          editingCliente={editingCliente}
          onSuccess={() => fetchClientes()}
        />
      )}

      {tenantId && (
        <CargaMasivaDialog
          open={cargaMasivaOpen}
          onOpenChange={setCargaMasivaOpen}
          tenantId={tenantId}
          onSuccess={fetchClientes}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleteTarget?.nombre}</strong>. Esta ação não se pode deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white" onClick={handleEliminar} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
