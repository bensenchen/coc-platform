import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export function AdminSettingsPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 h-14 flex items-center gap-4">
        <Link to="/home"><Button variant="ghost" size="sm"><ArrowLeft size={14}/> Back</Button></Link>
        <h1 className="text-lg font-bold text-slate-900">Admin Settings</h1>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Workspace & Project Management</h2>
          <p className="text-sm text-slate-500">Phase 5 adds CRUD here.</p>
        </div>
      </main>
    </div>
  );
}
