import { Link } from 'react-router-dom';

export function LegalPage() {
  return <div className="min-h-full bg-slate-50 text-slate-800">
    <header className="border-b border-slate-200 bg-white px-6 py-4"><Link to="/home" className="font-bold text-indigo-600">COC Platform</Link></header>
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-950">Legal, copyright &amp; intellectual property notice</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated September 9, 2026</p>
      <div className="mt-8 space-y-7 leading-7">
        <section><h2 className="text-lg font-semibold">Copyright</h2><p>Unless otherwise identified, the COC Platform application, brand, interface, and documentation are protected by applicable copyright and intellectual property laws. All rights are reserved by their respective owners.</p></section>
        <section><h2 className="text-lg font-semibold">Your content</h2><p>You retain ownership of content you submit. You are responsible for ensuring that you have the rights and permissions required to upload, share, and process that content.</p></section>
        <section><h2 className="text-lg font-semibold">Acceptable use and third-party rights</h2><p>Do not use the service to infringe copyrights, trademarks, patents, trade secrets, privacy rights, or other rights. Third-party names and marks remain the property of their respective owners.</p></section>
        <section><h2 className="text-lg font-semibold">Not legal advice</h2><p>This notice is general information and is not legal advice. Contact your organization’s legal representative with questions about licensing, ownership, or infringement.</p></section>
      </div>
    </main>
  </div>;
}
