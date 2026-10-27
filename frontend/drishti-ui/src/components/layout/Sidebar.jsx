import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogOut,
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Recording' },
  { to: '/evaluations', icon: Activity, label: 'Task Queue & Status' },
  { to: '/prototype', icon: Eye, label: 'Check Prototype' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col flex-shrink-0 h-full bg-white border-r border-[#E2E8F0] overflow-hidden select-none z-20 shadow-xs"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-[#243746] flex-shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-[#E2E8F0] flex-shrink-0">
        <div className="w-7 h-7 rounded bg-[#243746] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <Eye size={14} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-sm font-bold tracking-widest text-[#1E293B] whitespace-nowrap leading-none">
                InvigEye
              </span>
              <span className="text-[9px] text-[#64748B] tracking-wider uppercase whitespace-nowrap leading-none mt-0.5 font-semibold">
                Forensics
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-all duration-150 group
               ${isActive
                ? 'bg-[#F1F5F9] text-[#1E293B] font-bold border border-[#E2E8F0] shadow-2xs'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] border border-transparent'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#1E293B]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-[#E2E8F0] space-y-0.5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded text-xs text-[#64748B]
                     hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-all duration-150 group"
        >
          <LogOut size={15} className="flex-shrink-0 text-[#94A3B8] group-hover:text-[#64748B] transition-colors" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full
                   bg-white border border-[#E2E8F0] flex items-center justify-center
                   text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]
                   transition-all duration-150 z-10 shadow-sm"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed
          ? <ChevronRight size={11} />
          : <ChevronLeft size={11} />}
      </button>
    </motion.aside>
  );
}
