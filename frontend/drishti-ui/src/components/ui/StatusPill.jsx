import { STATUS_META } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * StatusPill — shows session processing status in the Slate Color System.
 * @param {{ status: 'queued'|'processing'|'completed'|'failed' }} props
 */
export default function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.queued;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${meta.color}`}
    >
      {status === 'processing' && (
        <Loader2 size={10} className="animate-spin text-[#26323D]" />
      )}
      {status === 'queued' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B7785] inline-block" />
      )}
      {status === 'completed' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
      )}
      {status === 'failed' && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
      )}
      {meta.label}
    </span>
  );
}
