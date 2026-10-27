import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, AlertTriangle, Clock, Film,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { getSessions } from '../api/index';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';

const STAT_CONFIGS = [
  { key: 'totalSessions',  label: 'Total Sessions',   icon: Film,          color: 'text-[#1E293B]', border: 'border-l-[#1E293B]' },
  { key: 'totalEvents',    label: 'Events Flagged',    icon: AlertTriangle,  color: 'text-[#64748B]', border: 'border-l-[#64748B]' },
  { key: 'highRisk',       label: 'High Risk',         icon: AlertTriangle,  color: 'text-rose-600',  border: 'border-l-rose-500' },
  { key: 'pendingReview',  label: 'Pending Review',    icon: Clock,         color: 'text-amber-600', border: 'border-l-amber-500' },
];

function buildStats(sessions) {
  return {
    totalSessions: sessions.length,
    totalEvents: sessions.reduce((s, x) => s + (x.eventCount ?? 0), 0),
    highRisk: sessions.reduce((s, x) => s + (x.highRiskCount ?? 0), 0),
    pendingReview: sessions.reduce((s, x) => s + (x.pendingReview ?? 0), 0),
  };
}

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const stats = buildStats(sessions);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5 bg-[#F5F7F9]">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#1E293B]">Investigation Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Exam session overview &amp; video recording management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="refresh-sessions"
            onClick={fetchSessions}
            className="btn-ghost text-xs"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <Link to="/upload" id="upload-cta" className="btn-primary text-xs">
            <Upload size={12} />
            Upload Recording
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {STAT_CONFIGS.map(({ key, label, icon: Icon, color, border }) => (
          <div key={key} className={`panel px-4 py-3.5 border-l-3 ${border} shadow-[0_1px_3px_rgba(15,23,42,0.06)]`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">{label}</span>
              <Icon size={13} className={color} />
            </div>
            <p className={`text-2xl font-bold tracking-tight font-mono ${color}`}>
              {loading ? '—' : stats[key]}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Sessions table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.10 }}
        className="panel overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
      >
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Exam Sessions</span>
          <span className="text-[10px] font-mono text-[#94A3B8]">{sessions.length} sessions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw size={14} className="text-[#94A3B8] animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No sessions yet"
            description="Upload your first exam recording to get started."
            action={<Link to="/upload" className="btn-primary text-xs">Upload Recording</Link>}
          />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_64px_72px_80px_24px] gap-3 px-4 py-2 bg-[#F8FAFC] text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
              {['Hall', 'Exam', 'Date', 'Events', 'High Risk', 'Status', ''].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>

            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[2fr_2fr_1fr_64px_72px_80px_24px] gap-3 px-4 py-3
                           hover:bg-[#F8FAFC] transition-colors group items-center cursor-pointer"
                onClick={() =>
                  session.status === 'completed'
                    ? navigate(`/session/${session.id}`)
                    : session.status === 'processing'
                    ? navigate(`/session/${session.id}/processing`)
                    : null
                }
              >
                <span className="text-xs font-semibold text-[#1E293B] truncate">{session.hallName}</span>
                <span className="text-xs text-[#64748B] truncate">{session.examName}</span>
                <span className="text-[11px] text-[#94A3B8] font-mono">{session.date}</span>
                <span className="text-xs font-mono font-medium text-[#1E293B]">{session.eventCount ?? '—'}</span>
                <span className={`text-xs font-mono font-semibold ${session.highRiskCount > 0 ? 'text-rose-600' : 'text-[#94A3B8]'}`}>
                  {session.highRiskCount ?? '—'}
                </span>
                <StatusPill status={session.status} />
                <ChevronRight
                  size={12}
                  className="text-[#CBD5E1] group-hover:text-[#1E293B] transition-colors ml-auto"
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
