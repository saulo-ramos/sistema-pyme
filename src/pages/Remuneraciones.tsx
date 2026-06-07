import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2, Briefcase, DollarSign, Download,
  FileSpreadsheet, FileText, Pencil, Plus,
  Search, Trash2, Upload, UserPlus, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase }    from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useToast }    from '@/hooks/use-toast';
import { Button }      from '@/components/ui/button';
import { Input }       from '@/components/ui/input';
import { Badge }       from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PaginationControls, usePageSize } from '@/components/PaginationControls';
import FichaTrabajadorSheet              from '@/components/FichaTrabajadorSheet';
import CargaMasivaRemuneracionesDialog  from '@/components/CargaMasivaRemuneracionesDialog';
import DocumentRowAction                 from '@/components/DocumentRowAction';
import NuevoMovimientoRemuneracionSheet, { type TrabajadorBasico } from '@/components/NuevoMovimientoRemuneracionSheet';
import { formatCLP } from '@/lib/formatters';
import { CUR_YEAR, MESES, MESES_CORTOS, ANOS, CHART_COLORS, TOTALES_STYLE as TotalesStyle } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trabajador {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_ingreso: string | null;
  cargo: string | null;
  sucursal: string | null;
  tipo_contrato: string | null;
  afp: string | null;
  salud: string | null;
  activo: boolean;
}

interface LibroRow {
  id: string;
  tenant_id: string;
  trabajador_id: string;
  anio: number;
  mes: number;
  rut: string;
  nombre_completo: string;
  cargo: string | null;
  total_imponible: number | null;
  total_haberes: number | null;
  total_descuentos: number | null;
  liquido: number | null;
  costo_total: number | null;
  documento_url: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CUR_MES  = new Date().getMonth() + 1;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Remuneraciones() {
  const { toast } = useToast();
  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Remuneraciones</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Gestión de nómina y libro de remuneraciones</p>
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="bg-gray-light border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="trabajadores" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <Users className="h-3.5 w-3.5 mr-1.5" />Trabajadores
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Movimientos
          </TabsTrigger>
          <TabsTrigger value="libro" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Libro de Remuneraciones
          </TabsTrigger>
          <TabsTrigger value="graficas" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gráficas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trabajadores" className="mt-4">
          <TabTrabajadores toast={toast} />
        </TabsContent>
        <TabsContent value="movimientos" className="mt-4">
          <TabMovimientos toast={toast} />
        </TabsContent>
        <TabsContent value="libro" className="mt-4">
          <TabLibro toast={toast} />
        </TabsContent>
        <TabsContent value="graficas" className="mt-4">
          <TabGraficas />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — TRABAJADORES
// ═══════════════════════════════════════════════════════════════════════════════

function TabTrabajadores({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [data, setData]           = useState<Trabajador[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [cargaOpen, setCargaOpen]   = useState(false);
  const [editing, setEditing]       = useState<Trabajador | null>(null);
  const [deleting, setDeleting]     = useState<Trabajador | null>(null);
  const { initialPageSize, persist } = usePageSize('rem-trabajadores', 20);
  const [pageSize, setPageSize]     = useState(initialPageSize);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('trabajadores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('apellido_paterno', { ascending: true });
      if (error) toast({ title: 'Error al cargar trabajadores', variant: 'destructive' });
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
      r.nombre.toLowerCase().includes(t) ||
      r.apellido_paterno.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activos   = data.filter(r => r.activo).length;
  const inactivos = data.filter(r => !r.activo).length;

  const handleToggleActivo = async (t: Trabajador) => {
    const { error } = await (supabase as any)
      .from('trabajadores').update({ activo: !t.activo }).eq('id', t.id);
    if (error) toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    else onSuccess();
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any)
      .from('trabajadores').delete().eq('id', deleting.id);
    if (error) {
      toast({ title: 'No se puede eliminar', description: 'El trabajador tiene remuneraciones registradas.', variant: 'destructive' });
    } else {
      toast({ title: 'Trabajador eliminado' });
      onSuccess();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card icon={Users}    label="Total Trabajadores" value={String(data.length)}  iconClass="text-navy" />
        <Card icon={Briefcase} label="Activos"           value={String(activos)}      iconClass="text-periwinkle" />
        <Card icon={FileText} label="Inactivos"          value={String(inactivos)}    iconClass="text-magenta" />
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
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setCargaOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carga Masiva</span>
              <span className="sm:hidden">Masiva</span>
            </Button>
            <Button
              className="bg-navy hover:bg-navy/90 text-white text-xs sm:text-sm"
              onClick={() => { setEditing(null); setSheetOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Trabajador</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay trabajadores registrados</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['RUT','Nombre','Cargo','AFP','Salud','Tipo Contrato','Estado','Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((t, idx) => (
                    <TableRow key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{t.rut}</TableCell>
                      <TableCell className="text-xs">{t.nombre} {t.apellido_paterno} {t.apellido_materno ?? ''}</TableCell>
                      <TableCell className="text-xs">{t.cargo ?? '—'}</TableCell>
                      <TableCell className="text-xs">{t.afp ?? '—'}</TableCell>
                      <TableCell className="text-xs">{t.salud ?? '—'}</TableCell>
                      <TableCell className="text-xs">{t.tipo_contrato ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          className={t.activo
                            ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100'
                            : 'bg-red-100 text-red-600 border border-red-300 hover:bg-red-100'}
                          style={{ borderRadius: 20 }}
                        >
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                            title="Editar"
                            onClick={() => { setEditing(t); setSheetOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={`h-7 w-7 ${t.activo ? 'text-amber-500 hover:text-amber-600' : 'text-green-600 hover:text-green-700'}`}
                            title={t.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleActivo(t)}
                          >
                            {t.activo ? <Users className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70"
                            title="Eliminar"
                            onClick={() => setDeleting(t)}
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
              {paginated.map(t => (
                <div key={t.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">
                        {t.nombre} {t.apellido_paterno}
                      </p>
                      <p className="text-xs text-gray-text mt-0.5">{t.rut} · {t.cargo ?? 'Sin cargo'}</p>
                    </div>
                    <Badge
                      className={`shrink-0 ml-2 text-[10px] ${t.activo
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-600 border border-red-300'}`}
                      style={{ borderRadius: 20 }}
                    >
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">AFP: </span>{t.afp ?? '—'}</div>
                    <div><span className="font-medium text-navy/70">Salud: </span>{t.salud ?? '—'}</div>
                    <div><span className="font-medium text-navy/70">Contrato: </span>{t.tipo_contrato ?? '—'}</div>
                    {t.fecha_ingreso && (
                      <div><span className="font-medium text-navy/70">Ingreso: </span>{t.fecha_ingreso}</div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => { setEditing(t); setSheetOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40"
                      onClick={() => setDeleting(t)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              page={page} totalPages={totalPages} pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={s => { setPageSize(s); persist(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {tenantId && (
        <>
          <FichaTrabajadorSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            tenantId={tenantId}
            editingTrabajador={editing}
            onSuccess={onSuccess}
          />
          <CargaMasivaRemuneracionesDialog
            open={cargaOpen}
            onOpenChange={setCargaOpen}
            tenantId={tenantId}
            onSuccess={onSuccess}
          />
        </>
      )}

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar trabajador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleting?.nombre} {deleting?.apellido_paterno}</strong> ({deleting?.rut}).
              Esta acción no se puede deshacer. Si tiene remuneraciones registradas, no podrá eliminarse.
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════

function TabMovimientos({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [anio, setAnio]       = useState(CUR_YEAR);
  const [mes, setMes]         = useState(CUR_MES);
  const [search, setSearch]   = useState('');
  const [data, setData]       = useState<LibroRow[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorBasico[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<LibroRow | null>(null);
  const [cargaOpen, setCargaOpen]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { initialPageSize, persist } = usePageSize('rem-movimientos', 20);
  const [pageSize, setPageSize]     = useState(initialPageSize);
  const [trabajadorSheetOpen, setTrabajadorSheetOpen] = useState(false);

  const onSuccess = () => setRefreshKey(k => k + 1);

  // Carga trabajadores activos para el sheet
  useEffect(() => {
    if (!tenantId) return;
    (supabase as any)
      .from('trabajadores')
      .select('id, rut, nombre, apellido_paterno')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('apellido_paterno')
      .then(({ data: rows }: any) => setTrabajadores(rows ?? []));
  }, [tenantId, refreshKey]);

  // Carga movimientos del período
  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('libro_remuneraciones')
        .select('id, tenant_id, trabajador_id, anio, mes, rut, nombre_completo, cargo, total_imponible, total_haberes, total_descuentos, liquido, costo_total, documento_url')
        .eq('anio', anio)
        .eq('mes', mes)
        .order('nombre_completo', { ascending: true });
      if (error) toast({ title: 'Error al cargar movimientos', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [tenantId, anio, mes, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut.toLowerCase().includes(t) ||
      r.nombre_completo.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totales = useMemo(() => ({
    imponible:  filtered.reduce((s, r) => s + (r.total_imponible ?? 0), 0),
    haberes:    filtered.reduce((s, r) => s + (r.total_haberes ?? 0), 0),
    descuentos: filtered.reduce((s, r) => s + (r.total_descuentos ?? 0), 0),
    liquido:    filtered.reduce((s, r) => s + (r.liquido ?? 0), 0),
    costo:      filtered.reduce((s, r) => s + (r.costo_total ?? 0), 0),
  }), [filtered]);

  const handleDocChange = (id: string, url: string | null) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, documento_url: url } : r));
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any)
      .from('movimientos_remuneracion')
      .delete()
      .eq('id', deleting.id);
    if (error) {
      toast({ title: 'Error al eliminar movimiento', variant: 'destructive' });
    } else {
      toast({ title: 'Movimiento eliminado' });
      onSuccess();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={Users}      label="Trabajadores"    value={String(filtered.length)}      iconClass="text-navy" />
        <Card icon={DollarSign} label="Total Imponible" value={formatCLP(totales.imponible)} iconClass="text-periwinkle" />
        <Card icon={DollarSign} label="Total Líquido"   value={formatCLP(totales.liquido)}   iconClass="text-navy" />
        <Card icon={Briefcase}  label="Costo Empresa"   value={formatCLP(totales.costo)}     iconClass="text-magenta" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Filtros + Acciones */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar RUT o nombre..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setTrabajadorSheetOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Trabajador</span>
              <span className="sm:hidden">Trabajador</span>
            </Button>
            <Button
              variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setCargaOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carga Masiva</span>
              <span className="sm:hidden">Masiva</span>
            </Button>
            <Button
              className="bg-navy hover:bg-navy/90 text-white text-xs sm:text-sm"
              onClick={() => { setEditingId(null); setSheetOpen(true); }}
            >
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
            <p className="text-sm">No hay movimientos para el período seleccionado</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['RUT','Trabajador','Cargo','Imponible','Haberes','Descuentos','Líquido','Costo Total','Doc.','Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{r.rut}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{r.nombre_completo}</TableCell>
                      <TableCell className="text-xs">{r.cargo ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.total_imponible)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.total_haberes)}</TableCell>
                      <TableCell className="text-xs text-right text-magenta">{formatCLP(r.total_descuentos)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCLP(r.liquido)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.costo_total)}</TableCell>
                      <TableCell>
                        <DocumentRowAction
                          rowId={r.id}
                          tabla="movimientos_remuneracion"
                          tenantId={tenantId ?? null}
                          documentoUrl={r.documento_url}
                          onDocumentoChange={handleDocChange}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                            title="Editar"
                            onClick={() => { setEditingId(r.id); setSheetOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70"
                            title="Eliminar"
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={3} className="text-xs font-bold">TOTALES ({filtered.length} trabajadores)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.imponible)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.haberes)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.descuentos)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.liquido)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.costo)}</TableCell>
                    <TableCell /><TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.map(r => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_completo}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut} · {r.cargo ?? 'Sin cargo'}</p>
                    </div>
                    <p className="text-sm font-bold text-navy ml-2 shrink-0">{formatCLP(r.liquido)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Imponible: </span>{formatCLP(r.total_imponible)}</div>
                    <div><span className="font-medium text-navy/70">Descuentos: </span><span className="text-magenta">{formatCLP(r.total_descuentos)}</span></div>
                    <div><span className="font-medium text-navy/70">Haberes: </span>{formatCLP(r.total_haberes)}</div>
                    <div><span className="font-medium text-navy/70">Costo: </span>{formatCLP(r.costo_total)}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => { setEditingId(r.id); setSheetOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40"
                      onClick={() => setDeleting(r)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={s => { setPageSize(s); persist(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {tenantId && (
        <>
          <NuevoMovimientoRemuneracionSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            tenantId={tenantId}
            trabajadores={trabajadores}
            editingId={editingId}
            defaultAnio={anio}
            defaultMes={mes}
            onSuccess={onSuccess}
          />
          <FichaTrabajadorSheet
            open={trabajadorSheetOpen}
            onOpenChange={setTrabajadorSheetOpen}
            tenantId={tenantId}
            onSuccess={() => {
              setTrabajadorSheetOpen(false);
              onSuccess();
            }}
          />
          <CargaMasivaRemuneracionesDialog
            open={cargaOpen}
            onOpenChange={setCargaOpen}
            tenantId={tenantId}
            onSuccess={onSuccess}
          />
        </>
      )}

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de <strong>{deleting?.nombre_completo}</strong> para{' '}
              {deleting ? MESES[deleting.mes - 1].l : ''} {deleting?.anio}.
              Esta acción no se puede deshacer.
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — LIBRO DE REMUNERACIONES
// ═══════════════════════════════════════════════════════════════════════════════

function TabLibro({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const [anio, setAnio]       = useState(CUR_YEAR);
  const [mes, setMes]         = useState(CUR_MES);
  const [search, setSearch]   = useState('');
  const [data, setData]       = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [cargaOpen, setCargaOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { initialPageSize, persist } = usePageSize('rem-libro', 20);
  const [pageSize, setPageSize]     = useState(initialPageSize);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('libro_remuneraciones')
        .select('id, tenant_id, trabajador_id, anio, mes, rut, nombre_completo, cargo, total_imponible, total_haberes, total_descuentos, liquido, costo_total, documento_url')
        .eq('anio', anio)
        .eq('mes', mes)
        .order('nombre_completo', { ascending: true });
      if (error) toast({ title: 'Error al cargar libro de remuneraciones', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [anio, mes, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.rut.toLowerCase().includes(t) ||
      r.nombre_completo.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totales = useMemo(() => ({
    imponible:   filtered.reduce((s, r) => s + (r.total_imponible ?? 0), 0),
    haberes:     filtered.reduce((s, r) => s + (r.total_haberes ?? 0), 0),
    descuentos:  filtered.reduce((s, r) => s + (r.total_descuentos ?? 0), 0),
    liquido:     filtered.reduce((s, r) => s + (r.liquido ?? 0), 0),
    costo:       filtered.reduce((s, r) => s + (r.costo_total ?? 0), 0),
  }), [filtered]);

  const handleDocChange = (id: string, url: string | null) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, documento_url: url } : r));
  };

  const handleExportar = () => {
    const cols = ['RUT','Nombre','Cargo','Total Imponible','Total Haberes','Total Descuentos','Líquido','Costo Total'];
    const rowsData = filtered.map(r => [
      r.rut, r.nombre_completo, r.cargo,
      r.total_imponible, r.total_haberes, r.total_descuentos, r.liquido, r.costo_total,
    ]);
    rowsData.push(['','','TOTALES', totales.imponible, totales.haberes, totales.descuentos, totales.liquido, totales.costo]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rowsData]);
    ws['!cols'] = [{ wch: 14 },{ wch: 30 },{ wch: 20 },{ wch: 16 },{ wch: 16 },{ wch: 16 },{ wch: 16 },{ wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Libro Remuneraciones');
    XLSX.writeFile(wb, `LibroRemuneraciones_${MESES[mes - 1].l}_${anio}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={Users}      label="Trabajadores"   value={String(filtered.length)} iconClass="text-navy" />
        <Card icon={DollarSign} label="Total Imponible" value={formatCLP(totales.imponible)} iconClass="text-periwinkle" />
        <Card icon={DollarSign} label="Total Líquido"  value={formatCLP(totales.liquido)}    iconClass="text-navy" />
        <Card icon={Briefcase}  label="Costo Empresa"  value={formatCLP(totales.costo)}      iconClass="text-magenta" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar RUT o nombre..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setCargaOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carga Masiva</span>
              <span className="sm:hidden">Masiva</span>
            </Button>
            <Button
              className="bg-[#263578] hover:bg-[#263578]/90 text-white shrink-0 text-xs sm:text-sm"
              onClick={handleExportar}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
          </div>
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
                    {['RUT','Trabajador','Cargo','Imponible','Haberes','Descuentos','Líquido','Costo Total','Doc.'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{r.rut}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{r.nombre_completo}</TableCell>
                      <TableCell className="text-xs">{r.cargo ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.total_imponible)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.total_haberes)}</TableCell>
                      <TableCell className="text-xs text-right text-magenta">{formatCLP(r.total_descuentos)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCLP(r.liquido)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCLP(r.costo_total)}</TableCell>
                      <TableCell>
                        <DocumentRowAction
                          rowId={r.id}
                          tabla="movimientos_remuneracion"
                          tenantId={tenantId ?? null}
                          documentoUrl={r.documento_url}
                          onDocumentoChange={handleDocChange}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={3} className="text-xs font-bold">TOTALES ({filtered.length} trabajadores)</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.imponible)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.haberes)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.descuentos)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.liquido)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totales.costo)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.map(r => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{r.nombre_completo}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.rut} · {r.cargo ?? 'Sin cargo'}</p>
                    </div>
                    <p className="text-sm font-bold text-navy ml-2 shrink-0">{formatCLP(r.liquido)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-text">
                    <div><span className="font-medium text-navy/70">Imponible: </span>{formatCLP(r.total_imponible)}</div>
                    <div><span className="font-medium text-navy/70">Descuentos: </span><span className="text-magenta">{formatCLP(r.total_descuentos)}</span></div>
                    <div><span className="font-medium text-navy/70">Haberes: </span>{formatCLP(r.total_haberes)}</div>
                    <div><span className="font-medium text-navy/70">Costo: </span>{formatCLP(r.costo_total)}</div>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs font-bold text-navy mb-1">TOTALES ({filtered.length} trabajadores)</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-text">Imponible: </span><span className="font-semibold">{formatCLP(totales.imponible)}</span></div>
                  <div><span className="text-gray-text">Desc.: </span><span className="font-semibold">{formatCLP(totales.descuentos)}</span></div>
                  <div><span className="text-gray-text">Líquido: </span><span className="font-bold text-navy">{formatCLP(totales.liquido)}</span></div>
                  <div><span className="text-gray-text">Costo: </span><span className="font-semibold">{formatCLP(totales.costo)}</span></div>
                </div>
              </div>
            </div>

            <PaginationControls
              page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={s => { setPageSize(s); persist(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {tenantId && (
        <CargaMasivaRemuneracionesDialog
          open={cargaOpen}
          onOpenChange={setCargaOpen}
          tenantId={tenantId}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — GRÁFICAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabGraficas() {
  const [anio, setAnio]       = useState(CUR_YEAR);
  const [data, setData]       = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rows } = await (supabase as any)
        .from('libro_remuneraciones')
        .select('anio, mes, rut, nombre_completo, total_imponible, total_haberes, total_descuentos, liquido, costo_total')
        .eq('anio', anio);
      setData(rows ?? []);
      setLoading(false);
    };
    fetch();
  }, [anio]);

  // Gráfico 1: Líquido + Costo por mes
  const mensual = useMemo(() =>
    MESES_CORTOS.map((m, idx) => {
      const rows = data.filter(r => r.mes === idx + 1);
      return {
        mes: m,
        liquido: rows.reduce((s, r) => s + (r.liquido ?? 0), 0),
        costo:   rows.reduce((s, r) => s + (r.costo_total ?? 0), 0),
      };
    }), [data]);

  // Gráfico 2: Imponible vs Costo por mes
  const imponibleVsCosto = useMemo(() =>
    MESES_CORTOS.map((m, idx) => {
      const rows = data.filter(r => r.mes === idx + 1);
      return {
        mes: m,
        imponible: rows.reduce((s, r) => s + (r.total_imponible ?? 0), 0),
        costo:     rows.reduce((s, r) => s + (r.costo_total ?? 0), 0),
      };
    }), [data]);

  // Gráfico 3: Top 10 trabajadores por líquido (PieChart)
  const topTrabajadores = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const key = r.nombre_completo || r.rut;
      map.set(key, (map.get(key) ?? 0) + (r.liquido ?? 0));
    });
    return Array.from(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, value }));
  }, [data]);

  // Gráfico 4: Composición (haberes/descuentos/costo) por mes — stacked
  const composicion = useMemo(() =>
    MESES_CORTOS.map((m, idx) => {
      const rows = data.filter(r => r.mes === idx + 1);
      return {
        mes: m,
        haberes:    rows.reduce((s, r) => s + (r.total_haberes ?? 0), 0),
        descuentos: rows.reduce((s, r) => s + (r.total_descuentos ?? 0), 0),
        liquido:    rows.reduce((s, r) => s + (r.liquido ?? 0), 0),
      };
    }), [data]);

  const ejeClp = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  const tooltipFmt = (v: number) => [formatCLP(v), ''];

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-navy mb-4">{title}</h3>
      {children}
    </div>
  );

  if (loading) return <div className="py-20 text-center text-gray-text/60 text-sm">Cargando gráficas...</div>;

  return (
    <div className="space-y-4">
      {/* Año selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-text font-medium">Año:</span>
        <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-text/60">
          <BarChart2 className="h-12 w-12 opacity-30" />
          <p className="text-sm">No hay datos de remuneraciones para {anio}</p>
        </div>
      ) : (
        <>
          {/* Fila 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Líquido vs Costo Empresa por Mes">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mensual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={tooltipFmt} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="liquido" name="Líquido" fill="#263578" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costo"   name="Costo Empresa" fill="#C501E2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Imponible vs Costo Empresa por Mes">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={imponibleVsCosto} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={tooltipFmt} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="imponible" name="Imponible" fill="#676FF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costo"     name="Costo Total" fill="#263578" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Top 10 Trabajadores por Líquido">
              {topTrabajadores.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={topTrabajadores} dataKey="value" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {topTrabajadores.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCLP(v), '']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="py-10 text-center text-gray-text/50 text-sm">Sin datos</div>}
            </ChartCard>

            <ChartCard title="Composición Mensual (Haberes / Descuentos / Líquido)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={composicion} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={tooltipFmt} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="haberes"    stackId="a" name="Haberes"    fill="#676FF8" />
                  <Bar dataKey="descuentos" stackId="a" name="Descuentos" fill="#C501E2" />
                  <Bar dataKey="liquido"    stackId="a" name="Líquido"    fill="#263578" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
