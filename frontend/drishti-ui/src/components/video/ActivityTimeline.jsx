import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatTimecode } from '../../lib/utils';

// Flagged detections use the forensic rose token
const FLAG_RED = '#f43f5e';

/**
 * ActivityTimeline — horizontal scrubable bar with event markers.
 * @param {{ events: Event[], duration: number, selectedEventId: string,
 *            onEventClick: (event) => void }} props
 */
export default function ActivityTimeline({ events = [], duration = 5400, selectedEventId, onEventClick }) {
  const trackRef = useRef(null);

  const getPercent = (seconds) => (seconds / duration) * 100;

  const handleTrackClick = useCallback((e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = (e.clientX - rect.left) / rect.width;
    const seconds = Math.round(pct * duration);
    // Snap to nearest event within 30s window
    const nearest = events.reduce((prev, cur) => {
      return Math.abs(cur.timestampStart - seconds) < Math.abs(prev.timestampStart - seconds) ? cur : prev;
    }, events[0]);
    if (nearest && Math.abs(nearest.timestampStart - seconds) < 60) {
      onEventClick?.(nearest);
    }
  }, [events, duration, onEventClick]);

  return (
    <div className="w-full px-0 py-1.5 select-none">
      {/* Time labels */}
      <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1 px-1">
        <span>00:00:00</span>
        <span>{formatTimecode(Math.round(duration / 4))}</span>
        <span>{formatTimecode(Math.round(duration / 2))}</span>
        <span>{formatTimecode(Math.round(duration * 3 / 4))}</span>
        <span>{formatTimecode(duration)}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative w-full h-7 rounded cursor-pointer bg-[#020617] border border-[#1e293b] overflow-visible shadow-inner"
        role="slider"
        aria-label="Activity timeline"
      >
        {/* Density bar (subtle background gradient) */}
        <div className="absolute inset-0 rounded opacity-25 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(37,99,235,0.12), transparent)',
          }}
        />

        {/* Event markers */}
        {events.map((evt) => {
          const left = getPercent(evt.timestampStart);
          const rawWidth = getPercent(evt.timestampEnd - evt.timestampStart);
          const width = Math.max(1.0, rawWidth);
          const isSelected = evt.id === selectedEventId;

          return (
            <motion.button
              key={evt.id}
              onClick={(e) => { e.stopPropagation(); onEventClick?.(evt); }}
              initial={false}
              animate={{ scaleY: isSelected ? 1.4 : 1 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 bottom-0 rounded-sm marker-hover z-10 focus-visible:outline-none"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.6)}%`,
                background: FLAG_RED,
                opacity: isSelected ? 1 : 0.7,
                boxShadow: isSelected ? `0 0 10px ${FLAG_RED}` : undefined,
              }}
              aria-label={`Event at ${formatTimecode(evt.timestampStart)}`}
              title={`${evt.type?.replace(/_/g, ' ')} — ${formatTimecode(evt.timestampStart)}`}
            />
          );
        })}

        {/* Selected event marker indicator */}
        {selectedEventId && (() => {
          const evt = events.find(e => e.id === selectedEventId);
          if (!evt) return null;
          return (
            <motion.div
              key={selectedEventId}
              className="absolute top-0 bottom-0 rounded-sm pointer-events-none z-20"
              style={{ left: `${getPercent(evt.timestampStart)}%`, width: '2px', background: '#ffffff', opacity: 1, boxShadow: `0 0 8px #ffffff` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.15 }}
            />
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1.5 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-sm" style={{ background: FLAG_RED }} />
          Flagged Activity ({events.length})
        </div>
        <div className="ml-auto text-[10px] font-mono text-slate-500">
          Duration: {formatTimecode(duration)}
        </div>
      </div>
    </div>
  );
}
