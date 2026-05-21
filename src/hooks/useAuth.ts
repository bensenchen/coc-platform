import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getSession, onAuthStateChange, signOut as supabaseSignOut } from '@/infrastructure/supabase/auth';

/**
 * Call this ONCE at the root of the app.
 * Initializes the session and subscribes to auth state changes.
 */
export function useAuthInit() {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((s) => { if (mounted) { setSession(s); setInitialized(true); } })
      .catch(() => { if (mounted) setInitialized(true); });

    const { data: sub } = onAuthStateChange((s) => { if (mounted) setSession(s); });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [setSession, setInitialized]);
}

/**
 * Read auth state from anywhere in the app.
 */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return {
    session,
    user,
    isInitialized,
    isAuthenticated: !!session,
    signOut: supabaseSignOut,
  };
}
