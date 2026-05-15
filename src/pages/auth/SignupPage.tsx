import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { signUpWithPassword } from '@/infrastructure/supabase/auth';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try { await signUpWithPassword(email, password, displayName); setDone(true); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-7">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create account</h1>
        <p className="text-sm text-slate-500 mb-5">Join the COC platform</p>

        {done ? (
          <div className="text-sm bg-green-50 text-green-800 p-3 rounded">
            Account created. Check your inbox to verify email, then <Link to="/login" className="underline">sign in</Link>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Spinner /> : 'Create account'}
            </Button>
          </form>
        )}

        <p className="text-xs text-slate-500 mt-5 text-center">
          Have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
