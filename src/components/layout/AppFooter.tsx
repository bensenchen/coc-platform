import { Link } from 'react-router-dom';
export function AppFooter() { return <footer className="border-t border-slate-200 bg-white px-5 py-3 text-center text-xs text-slate-500">© {new Date().getFullYear()} COC Platform · <Link className="hover:text-indigo-600 hover:underline" to="/legal">Legal, copyright &amp; IP notice</Link></footer>; }
