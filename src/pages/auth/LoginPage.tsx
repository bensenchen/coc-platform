import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { signInWithPassword, signInWithMagicLink, signInWithGoogle } from '@/infrastructure/supabase/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/home';

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try { await signInWithPassword(email, password); navigate(from, { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return; }
    setError(null); setLoading(true);
    try { await signInWithMagicLink(email); setMagicSent(true); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(null); setLoading(true);
    try { await signInWithGoogle(); }
    catch (err) { setError((err as Error).message); setLoading(false); }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-7">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">COC</h1>
        <p className="text-sm text-slate-500 mb-5">Sign in to your workspace</p>

        {magicSent ? (
          <div className="text-sm bg-green-50 text-green-800 p-3 rounded mb-4">
            Magic link sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Spinner /> : 'Sign in'}
            </Button>
          </form>
        )}

        <div className="flex items-center my-4 text-xs text-slate-400">
          <div className="flex-1 border-t border-slate-200"/> <span className="px-3">or</span> <div className="flex-1 border-t border-slate-200"/>
        </div>

        <div className="space-y-2">
          <Button variant="secondary" disabled={loading} onClick={handleMagicLink} className="w-full">
            Send magic link
          </Button>
          <Button variant="secondary" disabled={loading} onClick={handleGoogle} className="w-full">
            Continue with Google
          </Button>
        </div>

        <p className="text-xs text-slate-500 mt-5 text-center">
          No account? <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
