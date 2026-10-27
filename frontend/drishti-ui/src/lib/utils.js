// ── Utility helpers ──────────────────────────────────────────────────

/**
 * Format seconds into HH:MM:SS timecode.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimecode(seconds) {
  if (seconds == null || isNaN(seconds)) return '--:--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/**
 * Format a short duration, e.g. "16s" or "2m 4s".
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// Every event type the model can flag is a potential policy violation.
const ALWAYS_HIGH_RISK_TYPES = new Set([
  'phone_use', 'hand_movement', 'gaze_shift', 'object_exchange',
]);

/**
 * Map confidence (0–1) to a risk label.
 * All detectable event types are treated as high risk — any suspicious
 * activity caught by the model warrants immediate review.
 */
export function confidenceToRisk(confidence, type) {
  if (type && ALWAYS_HIGH_RISK_TYPES.has(type)) return 'high';
  if (confidence >= 0.80) return 'high';
  if (confidence >= 0.60) return 'medium';
  return 'low';
}

/**
 * Map risk label to Tailwind color classes in the Slate Color System.
 */
export const RISK_COLORS = {
  high: {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  medium: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  low: {
    text: 'text-[#6B7785]',
    bg: 'bg-slate-50',
    border: 'border-[#D9E0E6]',
    dot: 'bg-[#6B7785]',
  },
};

/**
 * Map status to display label and color.
 */
export const STATUS_META = {
  queued:     { label: 'Queued',     color: 'text-[#6B7785] bg-[#F1F5F9] border border-[#D9E0E6]' },
  processing: { label: 'Processing', color: 'text-[#26323D] bg-[#D9E0E6]/50 border border-[#A9B7C5]' },
  completed:  { label: 'Completed',  color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
  failed:     { label: 'Failed',     color: 'text-rose-700 bg-rose-50 border border-rose-200' },
};

/**
 * Human-readable event type labels.
 */
export const EVENT_TYPE_LABELS = {
  hand_movement:  'Hand Movement',
  phone_use:      'Phone Use',
  gaze_shift:     'Gaze Shift',
  object_exchange:'Object Exchange',
};

/**
 * Review status display.
 */
export const REVIEW_STATUS_META = {
  pending:   { label: 'Pending',    color: 'text-amber-700 bg-amber-50 border border-amber-200' },
  reviewed:  { label: 'Reviewed',   color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
  dismissed: { label: 'Dismissed',  color: 'text-[#6B7785] bg-[#F1F5F9] border border-[#D9E0E6]' },
  escalated: { label: 'Escalated',  color: 'text-rose-700 bg-rose-50 border border-rose-200' },
};

/**
 * Clamp a number between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
