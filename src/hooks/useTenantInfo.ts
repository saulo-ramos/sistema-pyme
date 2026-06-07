import { useEffect, useState, useCallback } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { getTenantInfo, TenantInfo } from '@/lib/profile';

interface UseTenantInfoReturn {
  tenant: TenantInfo | null;
  loading: boolean;
  refresh: () => void;
}

export function useTenantInfo(): UseTenantInfoReturn {
  const tenantId = useTenantId();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    getTenantInfo(tenantId)
      .then(setTenant)
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, [tenantId, tick]);

  return { tenant, loading, refresh };
}
