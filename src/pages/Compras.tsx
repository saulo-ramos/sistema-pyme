import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2, DollarSign, Download, FileSpreadsheet,
  FileText, Pencil, Plus, Search, ShoppingCart, Trash2, Upload, UserPlus, Users,
} from 'lucide-react';
import NuevoMovimientoComprasSheet, { EditingMovimientoCompras } from '@/components/NuevoMovimientoComprasSheet';
import DocumentRowAction from '@/components/DocumentRowAction';
import { useTenantId } from '@/hooks/useTenantId';
import { CUR_YEAR, MESES, MESES_CORTOS, ANOS, CHART_COLORS, TOTALES_STYLE as TotalesStyle } from '@/lib/constants';
import CargaMasivaComprasDialog from '@/components/CargaMasivaComprasDialog';
import ProveedorFormSheet from '@/components/ProveedorFormSheet';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LibroComprasRow {
  fecha: string | null;
  periodo: string | null;
  rut: string | null;
  nombre_proveedor: string | null;
  tipo_documento: string | null;
  nro_documento: number | null;
  exento: number | null;
  neto: number | null;
  iva: number | null;
  otro_impto: number | null;
  total: number | null;
  tenant_id: string | null;
}

interface MovimientoComprasRow {
  id: string;
  fecha_docto: string;
  folio: number;
  nro: number | null;
  rut_proveedor: string;
  razon_social: string;
  monto_exento: number | null;
  monto_neto: number | null;
  documento_url: string | null;
  monto_iva: number | null;
  otro_impto: number | null;
  monto_total: number | null;
  tipo_doc_id: number | null;
  tipo_documento: { nombre: string } | null;
  tipo_compra: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CUR_MES  = new Date().getMonth() + 1;
const PAGE_SIZE = 20;

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


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Compras() {
  const { toast } = useToast();

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Compras</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Registro de movimientos de compra</p>
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="bg-gray-light border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="proveedores" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <Users className="h-3.5 w-3.5 mr-1.5" />Proveedores
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Movimientos
          </TabsTrigger>
          <TabsTrigger value="libro" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Libro de Compras
          </TabsTrigger>
          <TabsTrigger value="graficas" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gráficas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proveedores" className="mt-4">
          <TabProveedores toast={toast} />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <TabMovimientos toast={toast} />
        </TabsContent>

        <TabsContent value="libro" className="mt-4">
          <TabLibroCompras toast={toast} />
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
  const [data, setData]   = useState<MovimientoComprasRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]   = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<EditingMovimientoCompras | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoComprasRow | null>(null);
  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [nuevoProveedorOpen, setNuevoProveedorOpen] = useState(false);

  const handleSuccess = () => setRefreshKey(k => k + 1);

  const handleEditar = (r: MovimientoComprasRow) => {
    setEditingMovimiento({
      id: r.id,
      fecha_docto: r.fecha_docto,
      folio: r.folio,
      rut_proveedor: r.rut_proveedor,
      razon_social: r.razon_social,
      tipo_doc_id: r.tipo_doc_id ?? null,
      tipo_compra: r.tipo_compra ?? null,
      monto_exento: r.monto_exento,
      monto_neto: r.monto_neto,
      monto_iva: r.monto_iva,
      otro_impto: r.otro_impto,
      monto_total: r.monto_total,
      documento_url: r.documento_url,
    });
    setSheetOpen(true);
  };

  const handleEliminarMovimiento = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any)
      .from('movimientos_compra')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Movimiento eliminado' });
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
        .from('movimientos_compra')
        .select('id, fecha_docto, folio, nro, rut_proveedor, razon_social, monto_exento, monto_neto, monto_iva, otro_impto, monto_total, tipo_compra, tipo_doc_id, documento_url, tipo_documento:tipo_doc_id(nombre)')
        .order('fecha_docto', { ascending: true });
      if (anio !== 'all') q = q.eq('anio', anio);
      if (mes  !== 'all') q = q.eq('mes',  mes);
      const { data: rows, error } = await q;
      if (error) toast({ title: 'Error al cargar movimientos', variant: 'destructive' });
      else setData((rows ?? []) as MovimientoComprasRow[]);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut_proveedor.toLowerCase().includes(t) || r.razon_social.toLowerCase().includes(t)
    );
  }, [data, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <Card icon={FileText}    label="Total Documentos" value={String(filtered.length)} iconClass="text-navy" />
        <Card icon={DollarSign}  label="Total Neto"  value={clp(totales.neto)}  iconClass="text-periwinkle" />
        <Card icon={ShoppingCart} label="Total IVA"   value={clp(totales.iva)}   iconClass="text-magenta" />
        <Card icon={DollarSign}  label="Total"       value={clp(totales.total)} iconClass="text-navy" />
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
              <Input placeholder="Buscar por RUT o Proveedor..." value={search}
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
              onClick={() => setNuevoProveedorOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Proveedor</span>
              <span className="sm:hidden">Proveedor</span>
            </Button>
            <Button className="bg-magenta hover:bg-magenta/90 text-white text-xs sm:text-sm"
              onClick={() => { setEditingMovimiento(null); setSheetOpen(true); }}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Compra</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <ShoppingCart className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay movimientos para el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Fecha','Folio','RUT','Proveedor','Tipo Doc','Exento','Neto','IVA','Otro Impto','Total'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                    <TableHead className="text-white font-semibold text-xs w-[40px]">Doc.</TableHead>
                    <TableHead className="text-white font-semibold text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs whitespace-nowrap">{r.fecha_docto}</TableCell>
                      <TableCell className="text-xs">{r.folio}</TableCell>
                      <TableCell className="text-xs font-medium text-navy">{r.rut_proveedor}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{r.razon_social}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.tipo_documento?.nombre ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_exento)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_neto)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.monto_iva)}</TableCell>
                      <TableCell className="text-xs text-right">{clp(r.otro_impto)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{clp(r.monto_total)}</TableCell>
                      <TableCell>
                        <DocumentRowAction
                          rowId={r.id}
                          tabla="movimientos_compra"
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
                    <TableCell className="text-xs text-right font-bold">{clp(totales.exento)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.neto)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.iva)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.otro)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{clp(totales.total)}</TableCell>
                    <TableCell />
                    <TableCell />
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
                      <p className="font-semibold text-navy text-sm truncate">{r.razon_social}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut_proveedor} · Folio {r.folio}</p>
                    </div>
                    <p className="text-sm font-bold text-navy ml-2 shrink-0">{clp(r.monto_total)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Fecha: </span>{r.fecha_docto}</div>
                    <div><span className="font-medium text-navy/70">Tipo: </span>{r.tipo_documento?.nombre ?? '—'}</div>
                    <div><span className="font-medium text-navy/70">Neto: </span>{clp(r.monto_neto)}</div>
                    <div><span className="font-medium text-navy/70">IVA: </span>{clp(r.monto_iva)}</div>
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
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-text">Neto: </span><span className="font-semibold">{clp(totales.neto)}</span></div>
                  <div><span className="text-gray-text">IVA: </span><span className="font-semibold">{clp(totales.iva)}</span></div>
                  <div><span className="text-gray-text">Exento: </span><span className="font-semibold">{clp(totales.exento)}</span></div>
                  <div><span className="text-gray-text">Total: </span><span className="font-bold text-navy">{clp(totales.total)}</span></div>
                </div>
              </div>
            </div>
            <Paginacion page={page} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      <NuevoMovimientoComprasSheet
        open={sheetOpen}
        onOpenChange={v => { setSheetOpen(v); if (!v) setEditingMovimiento(null); }}
        tenantId={tenantId}
        editingMovimiento={editingMovimiento}
        onSuccess={handleSuccess}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el movimiento de <strong>{deleteTarget?.razon_social}</strong> (Folio {deleteTarget?.folio}).
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
      <CargaMasivaComprasDialog
        open={cargaMasivaOpen}
        onOpenChange={setCargaMasivaOpen}
        tenantId={tenantId ?? ''}
        onSuccess={handleSuccess}
      />
      <ProveedorFormSheet
        open={nuevoProveedorOpen}
        onOpenChange={setNuevoProveedorOpen}
        tenantId={tenantId ?? ''}
        onSuccess={() => {}}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — LIBRO DE COMPRAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabLibroCompras({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const [anio, setAnio]     = useState<number | 'all'>('all');
  const [mes, setMes]       = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [data, setData]     = useState<LibroComprasRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]     = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any).from('libro_compras').select('*').order('fecha', { ascending: true });
      if (anio !== 'all' && mes !== 'all') {
        q = q.gte('fecha', `${anio}-${padMes(Number(mes))}-01`).lte('fecha', `${anio}-${padMes(Number(mes))}-${lastDay(Number(anio), Number(mes))}`);
      } else if (anio !== 'all') {
        q = q.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
      } else if (mes !== 'all') {
        q = q.ilike('periodo', `%-${padMes(Number(mes))}`);
      }
      const { data: rows, error } = await q;
      if (error) toast({ title: 'Error al cargar libro de compras', variant: 'destructive' });
      else setData((rows ?? []) as LibroComprasRow[]);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      (r.rut ?? '').toLowerCase().includes(t) ||
      (r.nombre_proveedor ?? '').toLowerCase().includes(t)
    );
  }, [data, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totales = useMemo(() => ({
    exento: filtered.reduce((s, r) => s + (r.exento ?? 0), 0),
    neto:   filtered.reduce((s, r) => s + (r.neto ?? 0), 0),
    iva:    filtered.reduce((s, r) => s + (r.iva ?? 0), 0),
    otro:   filtered.reduce((s, r) => s + (r.otro_impto ?? 0), 0),
    total:  filtered.reduce((s, r) => s + (r.total ?? 0), 0),
  }), [filtered]);

  const handleExportar = () => {
    const cols = ['Fecha','Período','RUT','Nombre Proveedor','Tipo Documento','N° Documento','Exento','Neto','IVA','Otro Impto','Total'];
    const rowsData = filtered.map(r => [
      r.fecha, r.periodo, r.rut, r.nombre_proveedor, r.tipo_documento,
      r.nro_documento, r.exento, r.neto, r.iva, r.otro_impto, r.total,
    ]);
    rowsData.push(['', '', '', '', '', 'TOTAL', totales.exento, totales.neto, totales.iva, totales.otro, totales.total]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rowsData]);
    ws['!cols'] = [{ wch: 12 },{ wch: 10 },{ wch: 14 },{ wch: 28 },{ wch: 22 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Libro de Compras');
    const periodoExport = (anio === 'all' && mes === 'all') ? 'Completo' : (mes === 'all' ? String(anio) : `${MESES[Number(mes) - 1].l}_${anio}`);
    XLSX.writeFile(wb, `LibroCompras_${periodoExport}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card icon={FileText}    label="Total Documentos" value={String(filtered.length)} iconClass="text-navy" />
        <Card icon={DollarSign}  label="Total Exento"  value={clp(totales.exento)} iconClass="text-gray-text" />
        <Card icon={DollarSign}  label="Total Neto"    value={clp(totales.neto)}   iconClass="text-periwinkle" />
        <Card icon={ShoppingCart} label="Total IVA"     value={clp(totales.iva)}    iconClass="text-magenta" />
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
              <Input placeholder="Buscar RUT o Proveedor..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <Button
            className="bg-[#263578] hover:bg-[#263578]/90 text-white shrink-0"
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
                    {['Fecha','Período','RUT','Nombre Proveedor','Tipo Documento','N° Doc','Exento','Neto','IVA','Otro Impto','Total'].map(h => (
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
                      <TableCell className="text-xs max-w-[140px] truncate">{r.nombre_proveedor}</TableCell>
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
            <div className="md:hidden space-y-3">
              {paginated.map((r, idx) => (
                <div key={`${r.rut}-${r.nro_documento}-${idx}`} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_proveedor}</p>
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
  const [data, setData]   = useState<LibroComprasRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any).from('libro_compras').select('*');
      if (anio !== 'all') q = q.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
      const { data: rows } = await q;
      setData((rows ?? []) as LibroComprasRow[]);
      setLoading(false);
    };
    fetch();
  }, [anio]);

  // Gráfico 1: Compras Mensuales
  const mensual = useMemo(() =>
    MESES_CORTOS.map((mes, idx) => {
      const rows = data.filter(r => r.fecha && mesFromFecha(r.fecha) === idx + 1);
      return { mes, total: rows.reduce((s, r) => s + (r.total ?? 0), 0), docs: rows.length };
    }), [data]);

  // Gráfico 2: Por tipo de documento
  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const t = r.tipo_documento ?? 'Sin tipo';
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    return Array.from(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Gráfico 3: Composición mensual
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

  // Gráfico 4: Top 10 Proveedores
  const top10 = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const n = r.nombre_proveedor ?? 'Sin nombre';
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
          {/* Fila 1: Compras mensuales + Por tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Compras Mensuales">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mensual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<TooltipClp />} formatter={(v: number) => [clp(v), 'Total']} />
                  <Bar dataKey="total" fill="#727BFD" radius={[4, 4, 0, 0]} name="Total" />
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

          {/* Fila 2: Composición + Top 10 Proveedores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Composición de Compras por Mes">
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

            <ChartCard title="Top 10 Proveedores">
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
// TAB — PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProveedorRow {
  id: string;
  rut: string;
  nombre: string;
  productos_servicios: string | null;
  correo: string | null;
  fono: string | null;
  activo: boolean | null;
}

function TabProveedores({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [data, setData]             = useState<ProveedorRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editing, setEditing]       = useState<ProveedorRow | null>(null);
  const [deleting, setDeleting]     = useState<ProveedorRow | null>(null);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('proveedores')
        .select('id, rut, nombre, productos_servicios, correo, fono, activo')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true });
      if (error) toast({ title: 'Error al cargar proveedores', variant: 'destructive' });
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

  const handleToggleActivo = async (p: ProveedorRow) => {
    const { error } = await (supabase as any)
      .from('proveedores')
      .update({ activo: !p.activo })
      .eq('id', p.id);
    if (error) toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    else onSuccess();
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any)
      .from('proveedores')
      .delete()
      .eq('id', deleting.id);
    if (error) {
      toast({ title: 'No se puede eliminar', description: 'El proveedor tiene movimientos registrados.', variant: 'destructive' });
    } else {
      toast({ title: 'Proveedor eliminado' });
      onSuccess();
    }
    setDeleting(null);
  };

  const toProveedorEdit = (p: ProveedorRow) => ({
    ...p,
    activo: p.activo ?? true,
    tenant_id: tenantId ?? '',
  });

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card icon={Users}      label="Total Proveedores" value={String(data.length)} iconClass="text-navy" />
        <Card icon={ShoppingCart} label="Activos"         value={String(activos)}     iconClass="text-periwinkle" />
        <Card icon={FileText}   label="Inactivos"         value={String(inactivos)}   iconClass="text-magenta" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Filtros + Acciones */}
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
            <span className="hidden sm:inline">Nuevo Proveedor</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay proveedores registrados</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['RUT', 'Nombre', 'Productos / Servicios', 'Correo', 'Teléfono', 'Estado', 'Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((p, idx) => (
                    <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{p.rut}</TableCell>
                      <TableCell className="text-xs">{p.nombre}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{p.productos_servicios ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.correo ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.fono ?? '—'}</TableCell>
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
                      <p className="text-xs text-gray-text mt-0.5">{p.rut}</p>
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
                  {p.productos_servicios && (
                    <p className="text-xs text-gray-text/70 truncate">{p.productos_servicios}</p>
                  )}
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
        <ProveedorFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tenantId={tenantId}
          editingProveedor={editing ? toProveedorEdit(editing) : null}
          onSuccess={() => { setSheetOpen(false); onSuccess(); }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleting?.nombre}</strong> ({deleting?.rut}).
              Esta acción no se puede deshacer. Si tiene movimientos registrados, no podrá eliminarse.
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
