import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isInitialized, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    navigate(isAuthenticated ? '/home' : '/login', { replace: true });
  }, [isInitialized, isAuthenticated, navigate]);

  return (
    <div className="min-h-full flex items-center justify-center">
      <Spinner className="h-6 w-6 text-slate-400" />
    </div>
  );
}
