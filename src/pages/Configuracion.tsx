import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { supabase } from '@/integrations/supabase/client';
import MiCuentaTab from './configuracion/MiCuentaTab';
import MiEmpresaTab from './configuracion/MiEmpresaTab';
import UsuariosTab from './configuracion/UsuariosTab';

export default function Configuracion() {
  const { user } = useAuth();
  const tenantId = useTenantId();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user || !tenantId) return;
    supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'));
  }, [user, tenantId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Configuración</h1>

      <div className="bg-card rounded-[10px] shadow-card p-6">
        <Tabs defaultValue="cuenta">
          <TabsList className="mb-6">
            <TabsTrigger value="cuenta">Mi Cuenta</TabsTrigger>
            {isAdmin && <TabsTrigger value="empresa">Mi Empresa</TabsTrigger>}
            {isAdmin && <TabsTrigger value="usuarios">Usuarios</TabsTrigger>}
          </TabsList>

          <TabsContent value="cuenta">
            <MiCuentaTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="empresa">
              <MiEmpresaTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="usuarios">
              <UsuariosTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
