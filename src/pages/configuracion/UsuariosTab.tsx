import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { useTenantId } from '@/hooks/useTenantId';
import { getTenantUsers } from '@/lib/profile';
import { Badge } from '@/components/ui/badge';
import { displayFono } from '@/lib/formatters';

interface TenantUser {
  user_id: string;
  role: string;
  profile: {
    nombre: string | null;
    cargo: string | null;
    fono: string | null;
    foto_url: string | null;
    ultimo_acceso: string | null;
    activo: boolean | null;
  } | null;
}

function UserAvatar({ fotoUrl, nombre }: { fotoUrl: string | null; nombre: string | null }) {
  const initials = nombre
    ? nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';
  return fotoUrl ? (
    <img src={fotoUrl} alt={nombre ?? ''} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="h-9 w-9 rounded-full bg-periwinkle/20 flex items-center justify-center text-sm font-semibold text-periwinkle">
      {initials}
    </div>
  );
}

function formatAcceso(ts: string | null): string {
  if (!ts) return 'Nunca';
  return new Date(ts).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function UsuariosTab() {
  const tenantId = useTenantId();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getTenantUsers(tenantId)
      .then((data) => setUsers(data as TenantUser[]))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-periwinkle" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-text bg-muted rounded-lg px-4 py-3">
        <Info className="h-4 w-4 shrink-0" />
        <span>Para invitar nuevos usuarios, contacte a soporte.</span>
      </div>

      <div className="rounded-[10px] border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-gray-text">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-gray-text hidden sm:table-cell">Cargo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-text hidden md:table-cell">Último acceso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-text">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-text">Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar fotoUrl={u.profile?.foto_url ?? null} nombre={u.profile?.nombre ?? null} />
                    <div>
                      <p className="font-medium text-navy leading-tight">{u.profile?.nombre ?? 'Sin nombre'}</p>
                      {u.profile?.fono && (
                        <p className="text-xs text-gray-text">{displayFono(u.profile.fono)}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-text hidden sm:table-cell">
                  {u.profile?.cargo ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-text hidden md:table-cell">
                  {formatAcceso(u.profile?.ultimo_acceso ?? null)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.profile?.activo !== false ? 'default' : 'destructive'}>
                    {u.profile?.activo !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-text">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
