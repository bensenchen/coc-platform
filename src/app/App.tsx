import { Providers } from './providers';
import { AppRoutes } from './routes';
import { useAuth } from '@/hooks/useAuth';

function AppInner() {
  useAuth();
  return <AppRoutes />;
}

export function App() {
  return <Providers><AppInner /></Providers>;
}
