import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

/**
 * EmptyState — shown when there is no data to display.
 */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-3 text-[#94A3B8] shadow-2xs">
        <Icon size={20} />
      </div>
      <h3 className="text-xs font-bold text-[#1E293B] mb-1 uppercase tracking-wider">{title}</h3>
      {description && (
        <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
