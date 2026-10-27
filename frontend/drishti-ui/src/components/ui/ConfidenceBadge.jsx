import { confidenceToRisk, RISK_COLORS } from '../../lib/utils';

/**
 * ConfidenceBadge — maps confidence (0–1) to a risk-colored pill.
 */
export default function ConfidenceBadge({ confidence, type, showLabel = true }) {
  const risk = confidenceToRisk(confidence, type);
  const colors = RISK_COLORS[risk];
  const pct = Math.round(confidence * 100);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border
        ${colors.text} ${colors.bg} ${colors.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {showLabel ? `${pct}% ${risk}` : `${pct}%`}
    </span>
  );
}
