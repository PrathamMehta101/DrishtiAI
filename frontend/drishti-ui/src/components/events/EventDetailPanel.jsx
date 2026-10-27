import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, FileText, Crosshair, Shield, Activity, Target, MessageSquare
} from 'lucide-react';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import { formatTimecode, formatDuration, EVENT_TYPE_LABELS, REVIEW_STATUS_META } from '../../lib/utils';
import useAppStore from '../../store/useAppStore';
import { updateEventStatus } from '../../api/index';
import ForensicVarModal from '../forensics/ForensicVarModal';

export default function EventDetailPanel({ event, session }) {
  const { updateEventOverride, eventOverrides, forensicDossier, attachToDossier } = useAppStore();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const [varOpen, setVarOpen] = useState(false);

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 bg-white">
        <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-3">
          <FileText size={18} className="text-[#94A3B8]" />
        </div>
        <p className="text-xs font-bold text-[#1E293B] tracking-wide uppercase">No Event Selected</p>
        <p className="text-[11px] text-[#64748B] mt-1 max-w-[200px]">
          Select an event from the list or scrub the timeline to inspect evidence.
        </p>
      </div>
    );
  }

  const override = eventOverrides[event.id] ?? {};
  const currentStatus = override.reviewStatus ?? event.reviewStatus;
  const statusMeta = REVIEW_STATUS_META[currentStatus] || REVIEW_STATUS_META.pending;
  const duration = (event.timestampEnd ?? 0) - (event.timestampStart ?? 0);
  const inDossier = !!forensicDossier[event.id];

  const handleAction = async (action) => {
    setBusy(action);
    try {
      await updateEventStatus(event.id, event.sessionId, { reviewStatus: action, note });
      updateEventOverride(event.id, { reviewStatus: action, note });
    } finally {
      setBusy(null);
    }
  };

  const ACTIONS = [
    {
      key: 'reviewed',
      label: 'Mark Reviewed',
      icon: CheckCircle2,
      className: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50',
    },
    {
      key: 'dismissed',
      label: 'Dismiss',
      icon: XCircle,
      className: 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] bg-white',
    },
    {
      key: 'escalated',
      label: 'Escalate Priority',
      icon: AlertTriangle,
      className: 'border-rose-200 text-rose-700 hover:bg-rose-50 bg-rose-50/50',
    },
  ];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col h-full overflow-y-auto bg-white divide-y divide-[#E2E8F0]"
        >
          {/* Header */}
          <div className="p-4 flex-shrink-0 space-y-2.5 bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#64748B] font-bold tracking-wider">
                {event.id}
              </span>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1E293B] truncate">
                {EVENT_TYPE_LABELS[event.type] ?? event.type}
              </h2>
              <ConfidenceBadge confidence={event.confidence} type={event.type} />
            </div>

            {/* Timecode bar */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] bg-white px-2.5 py-1.5 rounded border border-[#E2E8F0] shadow-2xs font-semibold">
              <span>{formatTimecode(event.timestampStart)} → {formatTimecode(event.timestampEnd)}</span>
              <span className="text-[#94A3B8]">({formatDuration(Math.max(0.1, duration))})</span>
            </div>
          </div>

          {/* ── Forensic VAR Action Button ── */}
          <div className="p-3.5 bg-white">
            <button
              id="launch-var"
              onClick={() => setVarOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold tracking-wider uppercase transition-all duration-150 relative overflow-hidden group border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs"
            >
              <Crosshair size={13} className="text-rose-600" />
              <span>Launch VAR Deep-Dive</span>
              {inDossier && (
                <Shield size={12} className="text-emerald-600 ml-auto" />
              )}
            </button>
            {inDossier && (
              <p className="text-[10px] text-emerald-700 text-center mt-1 font-mono font-bold">
                ✓ Attached to Disciplinary Dossier
              </p>
            )}
          </div>

          {/* AI Explanation */}
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              <Activity size={11} className="text-[#243746]" />
              AI Model Explanation
            </div>
            <p className="text-xs text-[#1E293B] leading-relaxed bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
              {event.explanation}
            </p>
          </div>

          {/* Detected Objects */}
          {event.objectsDetected?.length > 0 && (
            <div className="p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                <Target size={11} className="text-[#64748B]" />
                Detected Objects
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.objectsDetected.map(obj => (
                  <span key={obj} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#1E293B] font-bold">
                    {obj.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ROI Telemetry */}
          {event.roi && (
            <div className="p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                Region of Interest (ROI)
              </span>
              <div className="grid grid-cols-4 gap-1.5 bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                {Object.entries(event.roi).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-[9px] text-[#64748B] uppercase font-bold">{k}</p>
                    <p className="font-mono text-xs font-bold text-[#1E293B]">{v}px</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigator Note */}
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              <MessageSquare size={11} className="text-[#64748B]" />
              Investigator Notes
            </div>
            <textarea
              id="event-note"
              rows={2}
              placeholder="Record forensic observations…"
              value={override.note ?? note}
              onChange={e => setNote(e.target.value)}
              className="input-field text-xs resize-none bg-white border-[#E2E8F0] text-[#1E293B] placeholder-[#94A3B8]"
            />
          </div>

          {/* Decision Actions */}
          <div className="p-3.5 space-y-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Forensic Disposition
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {ACTIONS.map(({ key, label, icon: Icon, className }) => {
                const isActive = currentStatus === key;
                return (
                  <button
                    key={key}
                    id={`action-${key}`}
                    onClick={() => handleAction(key)}
                    disabled={!!busy || isActive}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold
                                border transition-all duration-150 disabled:opacity-40
                                ${isActive ? 'ring-2 ring-[#243746] font-bold' : ''} ${className}`}
                  >
                    <Icon size={13} />
                    {busy === key ? 'Saving…' : label}
                    {isActive && <span className="ml-auto text-[9px] uppercase tracking-wider opacity-70">Current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* VAR Modal Portal */}
      {varOpen && (
        <ForensicVarModal
          event={event}
          session={session}
          isDossierAttached={inDossier}
          onClose={() => setVarOpen(false)}
          onAttachDossier={(evt) => attachToDossier(evt.id)}
        />
      )}
    </>
  );
}
