import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getSession, onAuthStateChange, signOut as supabaseSignOut } from '@/infrastructure/supabase/auth';

export function useAuth() {
  const { session, user, isInitialized, setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) return;
    let mounted = true;

    getSession()
      .then((s) => { if (mounted) { setSession(s); setInitialized(true); } })
      .catch(() => { if (mounted) setInitialized(true); });

    const { data: sub } = onAuthStateChange((s) => { if (mounted) setSession(s); });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [isInitialized, setSession, setInitialized]);

  return { session, user, isInitialized, isAuthenticated: !!session, signOut: supabaseSignOut };
}
