import { useEffect, useState } from 'react';
import { Pencil, ToggleLeft, ToggleRight, Plus, Upload, Users, UserCheck, UserX, Search, Trash2 } from 'lucide-react';
import CargaMasivaDialog from '@/components/CargaMasivaDialog';
import ClienteFormSheet from '@/components/ClienteFormSheet';
import { PaginationControls, usePageSize } from '@/components/PaginationControls';
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
import { displayFono } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type Cliente = Tables<'clientes'>;


export default function Clientes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { initialPageSize, persist: persistPageSize } = usePageSize('clientes', 10);

  const [tenantId, setTenantId] = useState<string | null>(null);
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

  // Obtener tenant_id del usuario
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        setTenantId(data.tenant_id);
      });
  }, [user]);

  // Cargar clientes
  const fetchClientes = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('id, rut, nombre, productos_servicios, vencimiento, correo, fono, activo, updated_at, created_at, tenant_id')
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

  // Filtro de búsqueda
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

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Resumen
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

  // Activar / Desactivar cliente
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
      toast({
        title: nuevoEstado ? 'Cliente activado' : 'Cliente desactivado',
      });
      fetchClientes();
    }
  };

  // Eliminar cliente
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

  const formatFono = displayFono;

  const vencimientoLabel = (v: number | null) => {
    if (v === null) return '—';
    if (v === 0) return 'Sin vencimiento';
    return `${v} días`;
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy">Clientes</h1>
        <p className="text-xs md:text-sm text-gray-text mt-1">Gestión de clientes del sistema</p>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-card rounded-[10px] shadow-card p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="p-2 sm:p-3 rounded-lg bg-gray-light text-navy">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-text">Total</p>
            <p className="text-lg sm:text-2xl font-bold text-navy">{totalClientes}</p>
          </div>
        </div>
        <div className="bg-card rounded-[10px] shadow-card p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="p-2 sm:p-3 rounded-lg bg-green-50 text-green-600">
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-text">Activos</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{activos}</p>
          </div>
        </div>
        <div className="bg-card rounded-[10px] shadow-card p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="p-2 sm:p-3 rounded-lg bg-red-50 text-red-500">
            <UserX className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-text">Inactivos</p>
            <p className="text-lg sm:text-2xl font-bold text-red-500">{inactivos}</p>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-card rounded-[10px] shadow-card p-3 sm:p-5">
        <div className="flex flex-col gap-3 mb-4 sm:mb-5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text/50" />
            <Input
              placeholder="Buscar por RUT o Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-periwinkle text-periwinkle hover:bg-periwinkle hover:text-white text-xs sm:text-sm"
              onClick={() => setCargaMasivaOpen(true)}
              disabled={!tenantId}
            >
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carga Masiva</span>
              <span className="sm:hidden">Masiva</span>
            </Button>
            <Button
              className="flex-1 sm:flex-none bg-magenta hover:bg-magenta/90 text-white text-xs sm:text-sm"
              onClick={handleNuevo}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Cliente</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Tabla / Cards mobile */}
        {loading ? (
          <div className="py-16 text-center text-gray-text/60">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-text/60">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay clientes registrados aún</p>
          </div>
        ) : (
          <>
            {/* Vista de tabla para pantallas medianas+ */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    <TableHead className="text-white font-semibold">RUT</TableHead>
                    <TableHead className="text-white font-semibold">Nombre</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Correo</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Teléfono</TableHead>
                    <TableHead className="text-white font-semibold">Vencimiento</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((cliente, idx) => (
                    <TableRow
                      key={cliente.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F6F9]'}
                    >
                      <TableCell className="font-medium text-navy">{cliente.rut}</TableCell>
                      <TableCell>{cliente.nombre}</TableCell>
                      <TableCell className="text-gray-text/70 hidden lg:table-cell">{cliente.correo ?? '—'}</TableCell>
                      <TableCell className="text-gray-text/70 hidden lg:table-cell">{formatFono(cliente.fono)}</TableCell>
                      <TableCell>{vencimientoLabel(cliente.vencimiento)}</TableCell>
                      <TableCell>
                        {cliente.activo ? (
                          <Badge
                            className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-100"
                            style={{ borderRadius: '20px' }}
                          >
                            Activo
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-red-100 text-red-600 border border-red-300 hover:bg-red-100"
                            style={{ borderRadius: '20px' }}
                          >
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-periwinkle hover:text-periwinkle hover:bg-periwinkle/10"
                            onClick={() => handleEditar(cliente)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${cliente.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            onClick={() => handleToggleActivo(cliente)}
                            title={cliente.activo ? 'Desactivar' : 'Activar'}
                          >
                            {cliente.activo ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-text/40 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(cliente)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Vista de cards para mobile */}
            <div className="md:hidden space-y-3">
              {paginated.map((cliente) => (
                <div
                  key={cliente.id}
                  className="bg-white border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy text-sm truncate">{cliente.nombre}</p>
                      <p className="text-xs text-gray-text mt-0.5">{cliente.rut}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {cliente.activo ? (
                        <Badge
                          className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-100 text-[10px] px-2 py-0.5"
                          style={{ borderRadius: '20px' }}
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-red-100 text-red-600 border border-red-300 hover:bg-red-100 text-[10px] px-2 py-0.5"
                          style={{ borderRadius: '20px' }}
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-text">
                    {cliente.correo && (
                      <div className="truncate">
                        <span className="font-medium text-navy/70">Correo: </span>
                        {cliente.correo}
                      </div>
                    )}
                    {cliente.fono && (
                      <div className="truncate">
                        <span className="font-medium text-navy/70">Fono: </span>
                        {formatFono(cliente.fono)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-navy/70">Venc: </span>
                      {vencimientoLabel(cliente.vencimiento)}
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 border-t border-border/50 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-periwinkle hover:text-periwinkle hover:bg-periwinkle/10"
                      onClick={() => handleEditar(cliente)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs ${cliente.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      onClick={() => handleToggleActivo(cliente)}
                    >
                      {cliente.activo ? (
                        <>
                          <ToggleRight className="h-3.5 w-3.5 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3.5 w-3.5 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-text/40 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(cliente)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
                persistPageSize(size);
              }}
            />
          </>
        )}
      </div>

      {/* Sheet Nuevo / Editar Cliente */}
      {tenantId && (
        <ClienteFormSheet
          open={sheetOpen}
          onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditingCliente(null); }}
          tenantId={tenantId}
          editingCliente={editingCliente}
          onSuccess={() => fetchClientes()}
        />
      )}

      {/* Dialog Carga Masiva */}
      {tenantId && (
        <CargaMasivaDialog
          open={cargaMasivaOpen}
          onOpenChange={setCargaMasivaOpen}
          tenantId={tenantId}
          onSuccess={fetchClientes}
        />
      )}

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a{' '}
              <span className="font-semibold text-navy">{deleteTarget?.nombre}</span>{' '}
              ({deleteTarget?.rut}). No se puede deshacer.
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
