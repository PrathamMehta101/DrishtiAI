import { motion } from 'framer-motion';
import { formatTimecode, EVENT_TYPE_LABELS, confidenceToRisk } from '../../lib/utils';

const RISK_BORDER = {
  high:   'border-l-rose-500',
  medium: 'border-l-amber-500',
  low:    'border-l-[#CBD5E1]',
};

const STATUS_BADGE = {
  escalated: 'text-rose-700 bg-rose-50 border border-rose-200',
  pending:   'text-amber-700 bg-amber-50 border border-amber-200',
  reviewed:  'text-emerald-700 bg-emerald-50 border border-emerald-200',
  dismissed: 'text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0]',
};

/**
 * EventCard — compact investigation card in the Light Slate System.
 */
export default function EventCard({ event, isSelected, onClick, override }) {
  const status = override?.reviewStatus ?? event.reviewStatus;
  const risk = confidenceToRisk(event.confidence, event.type);

  const borderColor = RISK_BORDER[risk] ?? RISK_BORDER.low;
  const badgeClass  = STATUS_BADGE[status] ?? STATUS_BADGE.pending;

  const pct = Math.round((event.confidence ?? 0) * 100);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick?.(event)}
      className={`w-full text-left rounded transition-all duration-150 border-l-3 group bg-white shadow-2xs mb-1.5
        ${isSelected
          ? `border border-[#243746] bg-[#F8FAFC] shadow-sm ${borderColor}`
          : `border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] ${borderColor}`}`}
    >
      {/* Top row: event ID + status badge */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="font-mono text-[10px] text-[#64748B] font-bold tracking-wider">
          {event.id ?? 'EVT_???'}
        </span>
        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded uppercase tracking-wider ${badgeClass}`}>
          {status ?? 'pending'}
        </span>
      </div>

      {/* Type + confidence */}
      <div className="flex items-center justify-between px-3 pb-1">
        <span className="text-xs font-bold text-[#1E293B] truncate leading-tight">
          {EVENT_TYPE_LABELS[event.type] ?? event.type}
        </span>
        <span className="font-mono text-[10px] font-bold text-[#243746] ml-2 flex-shrink-0">
          {pct}%
        </span>
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <span className="font-mono text-[10px] text-[#64748B]">
          {formatTimecode(event.timestampStart)} → {formatTimecode(event.timestampEnd)}
        </span>
      </div>

      {/* Object tags */}
      {event.objectsDetected?.length > 0 && (
        <div className="px-3 pb-2 flex gap-1 flex-wrap">
          {event.objectsDetected.map(obj => (
            <span
              key={obj}
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
            >
              {obj.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
