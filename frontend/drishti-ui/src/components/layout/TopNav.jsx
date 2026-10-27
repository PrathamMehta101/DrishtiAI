import { useLocation, Link } from 'react-router-dom';

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  upload: 'Upload Recording',
  session: 'Session Review',
  export: 'Export',
  evaluations: 'Task Queue & Status',
  prototype: 'Check Prototype',
};

function buildCrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((part, i) => ({
    label: ROUTE_LABELS[part] ?? (part.startsWith('sess_') ? part : part),
    to: '/' + parts.slice(0, i + 1).join('/'),
  }));
}

export default function TopNav() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="glass h-11 flex items-center px-5 gap-3 flex-shrink-0 z-10 bg-white/95 border-b border-[#E2E8F0]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#64748B]" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-[#1E293B] transition-colors font-bold text-[#1E293B]">InvigEye</Link>
        {crumbs.map((crumb, i) => (
          <span key={crumb.to} className="flex items-center gap-1.5">
            <span className="text-[#CBD5E1]">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-[#64748B] font-semibold">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-[#1E293B] transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System status */}
      <div className="flex items-center gap-3 text-xs text-[#64748B]">
        <span className="font-mono text-[10px] text-[#94A3B8]">v3.0-PRO</span>
        <div className="w-px h-3 bg-[#E2E8F0]" />
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block pulse-dot" />
          <span className="text-[#64748B] font-medium">System online</span>
        </div>
      </div>
    </header>
  );
}
