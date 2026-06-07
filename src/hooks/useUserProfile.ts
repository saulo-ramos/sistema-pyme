import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { getMyProfile, upsertMyProfile, UserProfile } from '@/lib/profile';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => void;
  save: (updates: Partial<Omit<UserProfile, 'id' | 'tenant_id'>>) => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const tenantId = useTenantId();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getMyProfile(user.id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user, tick]);

  const save = useCallback(
    async (updates: Partial<Omit<UserProfile, 'id' | 'tenant_id'>>) => {
      if (!user || !tenantId) throw new Error('Usuario o tenant no disponible');
      await upsertMyProfile(user.id, tenantId, updates);
      refresh();
    },
    [user, tenantId, refresh]
  );

  return { profile, loading, refresh, save };
}
