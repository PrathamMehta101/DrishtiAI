import { useRef, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { formatTimecode } from '../../lib/utils';

// High-contrast vibrant Cyan & Emerald neon aesthetic
const MOTION_CYAN = '#22D3EE';
const MOTION_TEAL = '#06B6D4';
const MOTION_EMERALD = '#10B981';

/**
 * Helper to normalize motion events from backend data.
 * If motion_events is missing, it clusters motion_frames into contiguous events.
 */
function extractMotionEvents(motionData, duration, fps = 30) {
  if (!motionData) return [];

  // If backend provided pre-built motion_events
  if (Array.isArray(motionData.motion_events) && motionData.motion_events.length > 0) {
    return motionData.motion_events.map((evt, idx) => ({
      id: `motion_evt_${idx}_${evt.start_frame || Math.round(evt.start_time * 30)}`,
      start_frame: evt.start_frame ?? Math.round(evt.start_time * fps),
      end_frame: evt.end_frame ?? Math.round(evt.end_time * fps),
      start_time: evt.start_time,
      end_time: evt.end_time,
      start_timestamp: evt.start_timestamp || formatTimecode(evt.start_time),
      end_timestamp: evt.end_timestamp || formatTimecode(evt.end_time),
      duration: evt.duration || evt.end_time - evt.start_time,
      detections: evt.detections ?? 0,
      max_motion_score: evt.max_motion_score ?? 0,
      bbox: evt.bbox ?? null,
      regions: evt.regions ?? [],
    }));
  }

  // If only motion_frames are provided, cluster consecutive frames (gap <= 6 frames)
  const frames = motionData.motion_frames || [];
  if (frames.length === 0) return [];

  const sortedFrames = [...frames].sort((a, b) => a.frame - b.frame);
  const clustered = [];
  let currentGroup = null;

  for (const f of sortedFrames) {
    if (!currentGroup) {
      currentGroup = {
        start_frame: f.frame,
        end_frame: f.frame,
        start_time: f.timestamp,
        end_time: f.timestamp,
        max_motion_score: f.motion_score || 0,
        detections: 1,
        regions: f.regions || [],
      };
    } else if (f.frame - currentGroup.end_frame <= 6) {
      currentGroup.end_frame = f.frame;
      currentGroup.end_time = f.timestamp;
      currentGroup.detections += 1;
      currentGroup.max_motion_score = Math.max(currentGroup.max_motion_score, f.motion_score || 0);
      if (f.regions) currentGroup.regions.push(...f.regions);
    } else {
      if (currentGroup.detections >= 2) {
        clustered.push(currentGroup);
      }
      currentGroup = {
        start_frame: f.frame,
        end_frame: f.frame,
        start_time: f.timestamp,
        end_time: f.timestamp,
        max_motion_score: f.motion_score || 0,
        detections: 1,
        regions: f.regions || [],
      };
    }
  }
  if (currentGroup && currentGroup.detections >= 2) {
    clustered.push(currentGroup);
  }

  return clustered.map((evt, idx) => ({
    id: `motion_evt_${idx}_${evt.start_frame}`,
    start_frame: evt.start_frame,
    end_frame: evt.end_frame,
    start_time: evt.start_time,
    end_time: evt.end_time,
    start_timestamp: formatTimecode(evt.start_time),
    end_timestamp: formatTimecode(evt.end_time),
    duration: Math.max(0.05, evt.end_time - evt.start_time),
    detections: evt.detections,
    max_motion_score: evt.max_motion_score,
    bbox: null,
    regions: evt.regions,
  }));
}

/**
 * MotionTimeline — Dedicated video-editor style timeline with CapCut scrubber needle,
 * glowing waveform graph, and click/drag playhead scrubbing.
 */
export default function MotionTimeline({
  motionData,
  duration = 10,
  currentTime = 0,
  selectedMotionEventId,
  onMotionEventClick,
  onSeek,
}) {
  const trackRef = useRef(null);
  const [hoverPct, setHoverPct] = useState(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [clickedLinePct, setClickedLinePct] = useState(null);

  const fps = motionData?.video?.fps || 30;

  const motionEvents = useMemo(() => {
    return extractMotionEvents(motionData, duration, fps);
  }, [motionData, duration, fps]);

  const motionFrames = motionData?.motion_frames || [];

  const getPercent = (seconds) => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (seconds / duration) * 100));
  };

  const handleTrackScrub = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const seconds = pct * duration;

      setClickedLinePct(pct * 100);
      onSeek?.(seconds);

      // Check if clicked near a motion event to activate it
      const threshold = Math.max(1.2, duration / 30);
      const nearest = motionEvents.find(
        (evt) => seconds >= evt.start_time - 0.2 && seconds <= evt.end_time + 0.2
      ) || motionEvents.reduce((prev, cur) => {
        if (!prev) return cur;
        return Math.abs(cur.start_time - seconds) < Math.abs(prev.start_time - seconds) ? cur : prev;
      }, null);

      if (nearest && Math.abs(nearest.start_time - seconds) <= threshold) {
        onMotionEventClick?.(nearest);
      }
    },
    [duration, motionEvents, onSeek, onMotionEventClick]
  );

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleTrackScrub(e.clientX);
  };

  const handleMouseMove = (e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverPct(pct * 100);
    setHoverTime(pct * duration);

    if (isDragging) {
      handleTrackScrub(e.clientX);
    }
  };

  const handleMouseLeave = () => {
    setHoverPct(null);
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Compute prominent glowing SVG waveform path points from motion_frames
  const waveformData = useMemo(() => {
    if (!motionFrames || motionFrames.length === 0 || !duration) return null;

    const buckets = 120;
    const bucketScores = new Array(buckets).fill(0);

    for (const f of motionFrames) {
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((f.timestamp / duration) * buckets)));
      bucketScores[idx] = Math.max(bucketScores[idx], f.motion_score || 0.001);
    }

    const maxScore = Math.max(...bucketScores, 0.0001);

    // Build curve points with smooth non-linear amplitude boost
    const points = bucketScores.map((score, i) => {
      const x = (i / (buckets - 1)) * 100;
      const normalized = Math.min(1, Math.pow(score / maxScore, 0.45));
      const y = score > 0 ? 32 - normalized * 26 : 32;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const pathLine = points.map((p, idx) => (idx === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const pathArea = `M 0,32 L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L 100,32 Z`;

    return {
      line: pathLine,
      area: pathArea,
    };
  }, [motionFrames, duration]);

  const totalFrames = motionData?.video?.total_frames || motionData?.motion?.total_motion_frames || motionFrames.length;

  // Current playhead position (% of duration)
  const activePlayheadPct = clickedLinePct !== null ? clickedLinePct : getPercent(currentTime);

  return (
    <div className="w-full px-0 pt-1.5 pb-0.5 border-t border-white/[0.05] select-none">
      {/* Subheader / Title */}
      <div className="flex items-center justify-between text-[10px] font-medium text-cyan-400/90 mb-1 px-1">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-cyan-400 animate-pulse" />
          <span className="tracking-wide uppercase text-[9px] font-bold text-cyan-300">
            Motion Waveform & Scrubber (CapCut Style)
          </span>
          <span className="text-[9px] text-white/30 font-mono">
            · {motionEvents.length} motion {motionEvents.length === 1 ? 'cluster' : 'clusters'}
          </span>
        </div>
        <div className="text-[9px] font-mono text-cyan-400/50 flex items-center gap-1">
          <span>Scrub timeline to seek & inspect</span>
        </div>
      </div>

      {/* Track — Custom Video Editor Cursor */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        className="relative w-full h-9 rounded bg-[#061118] border border-cyan-500/30 overflow-visible transition-colors hover:border-cyan-400/70 shadow-inner cursor-col-resize group"
        role="slider"
        aria-label="Motion activity timeline and playhead scrubber"
      >
        {/* Telemetry Grid Pattern */}
        <div
          className="absolute inset-0 rounded opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.08) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        />

        {/* High-Contrast Neon Waveform Graph */}
        {waveformData && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none rounded overflow-hidden"
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="popWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MOTION_CYAN} stopOpacity="0.7" />
                <stop offset="50%" stopColor={MOTION_TEAL} stopOpacity="0.35" />
                <stop offset="100%" stopColor={MOTION_EMERALD} stopOpacity="0.05" />
              </linearGradient>
            </defs>

            <path d={waveformData.area} fill="url(#popWaveGradient)" />
            <path
              d={waveformData.line}
              fill="none"
              stroke={MOTION_CYAN}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Motion Event Markers */}
        {motionEvents.map((evt) => {
          const left = getPercent(evt.start_time);
          const rawWidth = getPercent(evt.end_time - evt.start_time);
          const width = Math.max(1.2, rawWidth);
          const isSelected = evt.id === selectedMotionEventId;

          const tooltip = `Motion Cluster: Frame ${evt.start_frame} (${evt.start_timestamp}) – Frame ${evt.end_frame} (${evt.end_timestamp}) | Duration: ${evt.duration.toFixed(2)}s | Peak Score: ${(evt.max_motion_score * 100).toFixed(2)}%`;

          return (
            <div
              key={evt.id}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelected) {
                  onMotionEventClick?.(null);
                } else {
                  onMotionEventClick?.(evt);
                  onSeek?.(evt.start_time);
                  setClickedLinePct(getPercent(evt.start_time));
                }
              }}
              className={`absolute top-0 bottom-0 rounded-sm z-10 pointer-events-auto transition-colors ${
                isSelected
                  ? 'border border-cyan-300 bg-cyan-500/60'
                  : 'bg-cyan-600/40 hover:bg-cyan-500/50'
              }`}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.9)}%`,
              }}
              aria-label={tooltip}
              title={tooltip}
            />
          );
        })}

        {/* ── CapCut / Premiere Style Hover Scrubber Needle ───────────────── */}
        {hoverPct !== null && !isDragging && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-20"
            style={{ left: `${hoverPct}%` }}
          >
            {/* Scrubber Needle Line */}
            <div className="w-[1px] h-full bg-white/80" />
            {/* Floating Timecode Tooltip */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0c1a24] text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              {formatTimecode(hoverTime)}
            </div>
          </div>
        )}

        {/* ── CapCut Style Active Playhead Line (Clean Solid Line Through Clicked Part) ─── */}
        <div
          className="absolute -top-2 bottom-0 pointer-events-none z-30"
          style={{ left: `${activePlayheadPct}%` }}
        >
          {/* CapCut Playhead Diamond Top Marker */}
          <div className="relative -left-[4px] top-0 w-2.5 h-2.5 bg-cyan-300 rotate-45 rounded-[1px] border border-white" />

          {/* Clean Solid Vertical Needle Line */}
          <div className="w-[2px] h-[calc(100%+8px)] -mt-0.5 bg-cyan-400" />
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 font-medium">
          <span
            className="w-2.5 h-2.5 rounded-sm shadow-sm"
            style={{ background: `linear-gradient(135deg, ${MOTION_CYAN}, ${MOTION_EMERALD})` }}
          />
          Motion Activity ({motionEvents.length} clusters)
        </div>
        {selectedMotionEventId && (
          <div className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.2 rounded shadow-sm">
            Active: {motionEvents.find((e) => e.id === selectedMotionEventId)?.start_timestamp} – {motionEvents.find((e) => e.id === selectedMotionEventId)?.end_timestamp}
          </div>
        )}
        <div className="ml-auto text-[10px] font-mono text-cyan-400/50">
          Playhead: {formatTimecode(currentTime)} / {formatTimecode(duration)}
        </div>
      </div>
    </div>
  );
}
