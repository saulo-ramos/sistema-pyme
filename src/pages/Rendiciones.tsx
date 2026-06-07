import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2, CheckCircle2, DollarSign, Download,
  Eye, FileSpreadsheet, FileText, Pencil, Plus,
  Receipt, Search, Trash2, XCircle,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import RendicionFormSheet from '@/components/RendicionFormSheet';
import AprobarRechazarDialog from '@/components/AprobarRechazarDialog';
import DetalleRendicionDialog from '@/components/DetalleRendicionDialog';
import {
  BADGE_COLORS, ESTADOS_RENDICION,
  puedeAprobar, puedeEditar,
} from '@/lib/rendiciones';
import { formatCLP } from '@/lib/formatters';
import { CUR_YEAR, ANOS, MESES_CORTOS, CHART_COLORS, TOTALES_STYLE as TotalesStyle } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LibroRow {
  id: string;
  tenant_id: string;
  numero: string;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_aprobacion: string | null;
  titulo: string;
  descripcion: string | null;
  estado: string;
  motivo_rechazo: string | null;
  total: number;
  solicitante_id: string;
  solicitante_nombre: string;
  aprobado_por: string | null;
  aprobado_por_nombre: string | null;
  cantidad_items: number;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────


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

export default function Rendiciones() {
  const { toast } = useToast();
  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Rendiciones</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Gestión de gastos y rendiciones de cuentas</p>
      </div>
      <Tabs defaultValue="mis" className="w-full">
        <TabsList className="bg-gray-light border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="mis" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Mis Rendiciones
          </TabsTrigger>
          <TabsTrigger value="aprobar" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Por Aprobar
          </TabsTrigger>
          <TabsTrigger value="libro" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Libro de Rendiciones
          </TabsTrigger>
          <TabsTrigger value="graficas" className="data-[state=active]:bg-navy data-[state=active]:text-white text-xs sm:text-sm px-3 py-1.5 rounded">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gráficas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mis" className="mt-4"><TabMisRendiciones toast={toast} /></TabsContent>
        <TabsContent value="aprobar" className="mt-4"><TabPorAprobar toast={toast} /></TabsContent>
        <TabsContent value="libro" className="mt-4"><TabLibro toast={toast} /></TabsContent>
        <TabsContent value="graficas" className="mt-4"><TabGraficas /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — MIS RENDICIONES
// ═══════════════════════════════════════════════════════════════════════════════

function TabMisRendiciones({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const [data, setData] = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [deleting, setDeleting] = useState<LibroRow | null>(null);
  const { initialPageSize, persist } = usePageSize('rend-mis', 15);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!tenantId || !user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('libro_rendiciones')
        .select('*')
        .eq('solicitante_id', user.id)
        .order('created_at', { ascending: false });
      if (error) toast({ title: 'Error al cargar rendiciones', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [tenantId, user, refreshKey]);

  const filtered = useMemo(() => {
    let rows = data;
    if (estadoFiltro !== 'todos') rows = rows.filter(r => r.estado === estadoFiltro);
    const t = search.toLowerCase();
    if (t) rows = rows.filter(r =>
      r.numero.toLowerCase().includes(t) ||
      r.titulo.toLowerCase().includes(t)
    );
    return rows;
  }, [data, estadoFiltro, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleEliminar = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any).from('rendiciones').delete().eq('id', deleting.id);
    if (error) toast({ title: 'Error al eliminar', variant: 'destructive' });
    else { toast({ title: 'Rendición eliminada' }); onSuccess(); }
    setDeleting(null);
  };

  const handleEnviar = async (r: LibroRow) => {
    const { error } = await (supabase as any).from('rendiciones').update({
      estado: 'Enviada',
      fecha_envio: new Date().toISOString().slice(0, 10),
      motivo_rechazo: null,
    }).eq('id', r.id);
    if (error) toast({ title: 'Error al enviar', variant: 'destructive' });
    else { toast({ title: 'Rendición enviada para aprobación' }); onSuccess(); }
  };

  const totalMonto = useMemo(() => filtered.reduce((s, r) => s + (r.total || 0), 0), [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={FileText}    label="Total rendiciones"  value={String(data.length)}                                     iconClass="text-navy" />
        <Card icon={Receipt}     label="Borradores"         value={String(data.filter(r => r.estado === 'Borrador').length)} iconClass="text-gray-500" />
        <Card icon={CheckCircle2} label="Aprobadas"         value={String(data.filter(r => r.estado === 'Aprobada').length)} iconClass="text-green-600" />
        <Card icon={DollarSign}  label="Total monto"        value={formatCLP(totalMonto)}                                   iconClass="text-periwinkle" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={estadoFiltro} onValueChange={v => { setEstadoFiltro(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADOS_RENDICION.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar número o título..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <Button
            className="bg-navy hover:bg-navy/90 text-white text-xs sm:text-sm shrink-0"
            onClick={() => { setEditingId(null); setSheetOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Rendición</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Receipt className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay rendiciones registradas</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Número','Título','Fecha','Estado','Ítems','Total','Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{r.numero}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.titulo}</TableCell>
                      <TableCell className="text-xs">{r.fecha_creacion}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${BADGE_COLORS[r.estado] ?? ''}`} style={{ borderRadius: 20 }}>
                          {r.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">{r.cantidad_items}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCLP(r.total)}</TableCell>
                      <TableCell>
                        <RendicionActions
                          r={r} userId={user?.id ?? ''} isAdmin={false}
                          onDetalle={() => { setDetalleId(r.id); setDetalleOpen(true); }}
                          onEditar={() => { setEditingId(r.id); setSheetOpen(true); }}
                          onEnviar={() => handleEnviar(r)}
                          onEliminar={() => setDeleting(r)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={5} className="text-xs font-bold">TOTALES ({filtered.length})</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totalMonto)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {paginated.map(r => (
                <MobileCard key={r.id} r={r} userId={user?.id ?? ''} isAdmin={false}
                  onDetalle={() => { setDetalleId(r.id); setDetalleOpen(true); }}
                  onEditar={() => { setEditingId(r.id); setSheetOpen(true); }}
                  onEnviar={() => handleEnviar(r)}
                  onEliminar={() => setDeleting(r)}
                />
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

      {tenantId && (
        <RendicionFormSheet
          open={sheetOpen} onOpenChange={setSheetOpen}
          tenantId={tenantId} editingId={editingId} onSuccess={onSuccess}
        />
      )}

      <DetalleRendicionDialog open={detalleOpen} onOpenChange={setDetalleOpen} rendicionId={detalleId} />

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rendición?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleting?.numero}</strong> — {deleting?.titulo}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={handleEliminar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — POR APROBAR
// ═══════════════════════════════════════════════════════════════════════════════

function TabPorAprobar({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [dialogTarget, setDialogTarget] = useState<LibroRow | null>(null);
  const { initialPageSize, persist } = usePageSize('rend-aprobar', 15);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const onSuccess = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!tenantId || !user) return;
    (supabase as any).from('user_tenants').select('role').eq('user_id', user.id).eq('tenant_id', tenantId).single()
      .then(({ data: ut }: any) => setUserRole(ut?.role ?? null));
  }, [tenantId, user]);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase as any)
        .from('libro_rendiciones')
        .select('*')
        .eq('estado', 'Enviada')
        .order('fecha_envio', { ascending: true });
      if (error) toast({ title: 'Error al cargar rendiciones', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [tenantId, refreshKey]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return !t ? data : data.filter(r =>
      r.numero.toLowerCase().includes(t) ||
      r.titulo.toLowerCase().includes(t) ||
      r.solicitante_nombre.toLowerCase().includes(t)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleAprobarRechazar = async (motivoRechazo?: string) => {
    if (!dialogTarget || !user) return;
    const isAprobar = dialogMode === 'aprobar';
    const aprobadorNombre =
      user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Admin';

    const updateData: Record<string, unknown> = isAprobar
      ? {
          estado: 'Aprobada',
          aprobado_por: user.id,
          aprobado_por_nombre: aprobadorNombre,
          fecha_aprobacion: new Date().toISOString().slice(0, 10),
        }
      : {
          estado: 'Rechazada',
          motivo_rechazo: motivoRechazo,
        };

    const { error } = await (supabase as any).from('rendiciones').update(updateData).eq('id', dialogTarget.id);
    if (error) toast({ title: `Error al ${isAprobar ? 'aprobar' : 'rechazar'}`, variant: 'destructive' });
    else {
      toast({ title: isAprobar ? 'Rendición aprobada' : 'Rendición rechazada' });
      onSuccess();
    }
    setDialogOpen(false);
  };

  if (!puedeAprobar(userRole)) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-gray-text/60">
        <CheckCircle2 className="h-12 w-12 opacity-30" />
        <p className="text-sm">Solo administradores y aprobadores pueden ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card icon={Receipt}   label="En espera"  value={String(data.length)} iconClass="text-blue-600" />
        <Card icon={DollarSign} label="Monto total" value={formatCLP(data.reduce((s, r) => s + (r.total || 0), 0))} iconClass="text-periwinkle" />
        <Card icon={FileText} label="Solicitantes" value={String(new Set(data.map(r => r.solicitante_id)).size)} iconClass="text-navy" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
            <Input placeholder="Buscar número, título o solicitante..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <CheckCircle2 className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay rendiciones pendientes de aprobación</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Número','Título','Solicitante','Enviada','Ítems','Total','Acciones'].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{r.numero}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{r.titulo}</TableCell>
                      <TableCell className="text-xs">{r.solicitante_nombre}</TableCell>
                      <TableCell className="text-xs">{r.fecha_envio ?? '—'}</TableCell>
                      <TableCell className="text-xs text-center">{r.cantidad_items}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCLP(r.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                            title="Ver detalle" onClick={() => { setDetalleId(r.id); setDetalleOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700"
                            title="Aprobar" onClick={() => { setDialogTarget(r); setDialogMode('aprobar'); setDialogOpen(true); }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70"
                            title="Rechazar" onClick={() => { setDialogTarget(r); setDialogMode('rechazar'); setDialogOpen(true); }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {paginated.map(r => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-navy text-sm">{r.numero}</p>
                      <p className="text-xs text-gray-text truncate max-w-[200px]">{r.titulo}</p>
                      <p className="text-xs text-gray-text mt-0.5">{r.solicitante_nombre}</p>
                    </div>
                    <p className="font-bold text-navy text-sm">{formatCLP(r.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setDetalleId(r.id); setDetalleOpen(true); }}>
                      <Eye className="h-3 w-3 mr-1" /> Ver
                    </Button>
                    <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { setDialogTarget(r); setDialogMode('aprobar'); setDialogOpen(true); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Aprobar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40"
                      onClick={() => { setDialogTarget(r); setDialogMode('rechazar'); setDialogOpen(true); }}>
                      <XCircle className="h-3 w-3 mr-1" /> Rechazar
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

      <DetalleRendicionDialog open={detalleOpen} onOpenChange={setDetalleOpen} rendicionId={detalleId} />
      <AprobarRechazarDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        mode={dialogMode}
        numero={dialogTarget?.numero ?? ''}
        onConfirm={handleAprobarRechazar}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — LIBRO DE RENDICIONES
// ═══════════════════════════════════════════════════════════════════════════════

function TabLibro({ toast }: { toast: ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'] }) {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<LibroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [anioFiltro, setAnioFiltro] = useState(String(CUR_YEAR));
  const [page, setPage] = useState(1);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const { initialPageSize, persist } = usePageSize('rend-libro', 20);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    if (!tenantId || !user) return;
    (supabase as any).from('user_tenants').select('role').eq('user_id', user.id).eq('tenant_id', tenantId).single()
      .then(({ data: ut }: any) => setUserRole(ut?.role ?? null));
  }, [tenantId, user]);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      let q = (supabase as any).from('libro_rendiciones').select('*')
        .gte('fecha_creacion', `${anioFiltro}-01-01`)
        .lte('fecha_creacion', `${anioFiltro}-12-31`)
        .order('fecha_creacion', { ascending: false });
      const { data: rows, error } = await q;
      if (error) toast({ title: 'Error al cargar libro', variant: 'destructive' });
      else setData(rows ?? []);
      setLoading(false);
      setPage(1);
    };
    fetch();
  }, [tenantId, anioFiltro]);

  const filtered = useMemo(() => {
    let rows = data;
    if (estadoFiltro !== 'todos') rows = rows.filter(r => r.estado === estadoFiltro);
    const t = search.toLowerCase();
    if (t) rows = rows.filter(r =>
      r.numero.toLowerCase().includes(t) ||
      r.titulo.toLowerCase().includes(t) ||
      r.solicitante_nombre.toLowerCase().includes(t)
    );
    return rows;
  }, [data, estadoFiltro, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalMonto = useMemo(() => filtered.reduce((s, r) => s + (r.total || 0), 0), [filtered]);

  const handleExportar = () => {
    const cols = ['Número','Título','Solicitante','Fecha Creación','Fecha Envío','Fecha Aprobación','Estado','Ítems','Total'];
    const rows = filtered.map(r => [
      r.numero, r.titulo, r.solicitante_nombre,
      r.fecha_creacion, r.fecha_envio ?? '', r.fecha_aprobacion ?? '',
      r.estado, r.cantidad_items, r.total,
    ]);
    rows.push(['','','','','','','TOTAL', '', totalMonto]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
    ws['!cols'] = [{ wch: 16 },{ wch: 30 },{ wch: 25 },{ wch: 14 },{ wch: 14 },{ wch: 16 },{ wch: 12 },{ wch: 8 },{ wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Libro Rendiciones');
    XLSX.writeFile(wb, `LibroRendiciones_${anioFiltro}.xlsx`);
  };

  if (!puedeAprobar(userRole)) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-gray-text/60">
        <FileSpreadsheet className="h-12 w-12 opacity-30" />
        <p className="text-sm">Solo administradores y aprobadores pueden ver el libro completo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card icon={FileText}    label="Total"     value={String(filtered.length)}                                            iconClass="text-navy" />
        <Card icon={CheckCircle2} label="Aprobadas" value={String(filtered.filter(r => r.estado === 'Aprobada').length)}      iconClass="text-green-600" />
        <Card icon={XCircle}     label="Rechazadas" value={String(filtered.filter(r => r.estado === 'Rechazada').length)}     iconClass="text-destructive" />
        <Card icon={DollarSign}  label="Monto total" value={formatCLP(totalMonto)}                                            iconClass="text-periwinkle" />
      </div>

      <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={anioFiltro} onValueChange={v => setAnioFiltro(v)}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={estadoFiltro} onValueChange={v => { setEstadoFiltro(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ESTADOS_RENDICION.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
              <Input placeholder="Buscar..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
          <Button
            className="bg-[#263578] hover:bg-[#263578]/90 text-white shrink-0 text-xs sm:text-sm"
            onClick={handleExportar} disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-text/60 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <FileSpreadsheet className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay rendiciones para el período seleccionado</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-lg overflow-hidden border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    {['Número','Título','Solicitante','Fecha','Estado','Ítems','Total',''].map(h => (
                      <TableHead key={h} className="text-white font-semibold whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}>
                      <TableCell className="text-xs font-medium text-navy">{r.numero}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{r.titulo}</TableCell>
                      <TableCell className="text-xs">{r.solicitante_nombre}</TableCell>
                      <TableCell className="text-xs">{r.fecha_creacion}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${BADGE_COLORS[r.estado] ?? ''}`} style={{ borderRadius: 20 }}>
                          {r.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">{r.cantidad_items}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCLP(r.total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70"
                          onClick={() => { setDetalleId(r.id); setDetalleOpen(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TotalesStyle}>
                    <TableCell colSpan={6} className="text-xs font-bold">TOTALES ({filtered.length})</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCLP(totalMonto)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {paginated.map(r => (
                <div key={r.id} className="bg-white border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-navy text-sm">{r.numero}</p>
                      <p className="text-xs text-gray-text">{r.titulo}</p>
                      <p className="text-xs text-gray-text">{r.solicitante_nombre}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-bold text-navy text-sm">{formatCLP(r.total)}</p>
                      <Badge className={`text-[10px] ${BADGE_COLORS[r.estado] ?? ''}`} style={{ borderRadius: 20 }}>{r.estado}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7 w-full"
                    onClick={() => { setDetalleId(r.id); setDetalleOpen(true); }}>
                    <Eye className="h-3 w-3 mr-1" /> Ver detalle
                  </Button>
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

      <DetalleRendicionDialog open={detalleOpen} onOpenChange={setDetalleOpen} rendicionId={detalleId} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — GRÁFICAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabGraficas() {
  const [anio, setAnio] = useState(CUR_YEAR);
  const [data, setData] = useState<LibroRow[]>([]);
  const [itemsData, setItemsData] = useState<{ categoria: string; monto: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: rends }, { data: items }] = await Promise.all([
        (supabase as any).from('libro_rendiciones').select('*')
          .gte('fecha_creacion', `${anio}-01-01`).lte('fecha_creacion', `${anio}-12-31`),
        (supabase as any).from('rendicion_items').select('categoria, monto, rendicion_id')
          .in('rendicion_id',
            ((await (supabase as any).from('rendiciones').select('id').gte('fecha_creacion', `${anio}-01-01`).lte('fecha_creacion', `${anio}-12-31`)).data ?? []).map((r: any) => r.id)
          ),
      ]);
      setData(rends ?? []);
      setItemsData(items ?? []);
      setLoading(false);
    };
    fetch();
  }, [anio]);

  // Por estado
  const porEstado = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(r => { map[r.estado] = (map[r.estado] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Por categoría
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    itemsData.forEach(i => { map[i.categoria] = (map[i.categoria] || 0) + i.monto; });
    return Object.entries(map).map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [itemsData]);

  // Evolución mensual
  const mensual = useMemo(() =>
    MESES_CORTOS.map((m, idx) => {
      const rows = data.filter(r => r.fecha_creacion?.startsWith(`${anio}-${String(idx + 1).padStart(2, '0')}`));
      return { mes: m, total: rows.reduce((s, r) => s + (r.total || 0), 0), cantidad: rows.length };
    }), [data, anio]);

  // Top solicitantes
  const topSolicitantes = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => { map.set(r.solicitante_nombre, (map.get(r.solicitante_nombre) || 0) + r.total); });
    return Array.from(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([nombre, total]) => ({ nombre: nombre.length > 22 ? nombre.slice(0, 20) + '…' : nombre, total }));
  }, [data]);

  const ejeClp = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-[10px] shadow-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-navy mb-4">{title}</h3>
      {children}
    </div>
  );

  if (loading) return <div className="py-20 text-center text-gray-text/60 text-sm">Cargando gráficas...</div>;

  return (
    <div className="space-y-4">
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
          <p className="text-sm">No hay datos de rendiciones para {anio}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Rendiciones por estado">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={porEstado} dataKey="value" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {porEstado.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Total por categoría de gasto">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porCategoria} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip formatter={(v: number) => [formatCLP(v), '']} />
                  <Bar dataKey="total" fill="#263578" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Evolución mensual de montos">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mensual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={(v: number) => [formatCLP(v), '']} />
                  <Bar dataKey="total" name="Total" fill="#676FF8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top solicitantes por monto">
              {topSolicitantes.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topSolicitantes} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={ejeClp} tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(v: number) => [formatCLP(v), '']} />
                    <Bar dataKey="total" fill="#C501E2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="py-10 text-center text-gray-text/50 text-sm">Sin datos</div>}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared inline components
// ═══════════════════════════════════════════════════════════════════════════════

function RendicionActions({ r, userId, isAdmin, onDetalle, onEditar, onEnviar, onEliminar }: {
  r: LibroRow; userId: string; isAdmin: boolean;
  onDetalle: () => void; onEditar: () => void; onEnviar: () => void; onEliminar: () => void;
}) {
  const canEdit = puedeEditar(r, userId) || (r.estado === 'Rechazada' && r.solicitante_id === userId);
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70" title="Ver detalle" onClick={onDetalle}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {canEdit && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-navy hover:text-navy/70" title="Editar" onClick={onEditar}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {(r.estado === 'Borrador' || r.estado === 'Rechazada') && r.solicitante_id === userId && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" title="Enviar para aprobación" onClick={onEnviar}>
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {r.estado === 'Borrador' && r.solicitante_id === userId && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/70" title="Eliminar" onClick={onEliminar}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function MobileCard({ r, userId, isAdmin, onDetalle, onEditar, onEnviar, onEliminar }: {
  r: LibroRow; userId: string; isAdmin: boolean;
  onDetalle: () => void; onEditar: () => void; onEnviar: () => void; onEliminar: () => void;
}) {
  const canEdit = puedeEditar(r, userId) || (r.estado === 'Rechazada' && r.solicitante_id === userId);
  return (
    <div className="bg-white border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy text-sm">{r.numero}</p>
          <p className="text-xs text-gray-text truncate">{r.titulo}</p>
          <p className="text-xs text-gray-text mt-0.5">{r.fecha_creacion}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2">
          <p className="font-bold text-navy text-sm">{formatCLP(r.total)}</p>
          <Badge className={`text-[10px] ${BADGE_COLORS[r.estado] ?? ''}`} style={{ borderRadius: 20 }}>{r.estado}</Badge>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={onDetalle}>
          <Eye className="h-3 w-3 mr-1" /> Ver
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={onEditar}>
            <Pencil className="h-3 w-3 mr-1" /> Editar
          </Button>
        )}
        {(r.estado === 'Borrador' || r.estado === 'Rechazada') && r.solicitante_id === userId && (
          <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white" onClick={onEnviar}>
            Enviar
          </Button>
        )}
        {r.estado === 'Borrador' && r.solicitante_id === userId && (
          <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/40" onClick={onEliminar}>
            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
