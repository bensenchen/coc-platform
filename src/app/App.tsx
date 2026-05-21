import { Providers } from './providers';
import { AppRoutes } from './routes';
import { useAuthInit } from '@/hooks/useAuth';

function AppInner() {
  useAuthInit();
  return <AppRoutes />;
}

export function App() {
  return <Providers><AppInner /></Providers>;
}
