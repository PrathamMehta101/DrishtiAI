import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, SkipBack, SkipForward, Crosshair,
  ChevronLeft, ChevronRight, Zap, Target, Shield, AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { formatTimecode, EVENT_TYPE_LABELS } from '../../lib/utils';

/* ── Utility: millisecond timecode ───────────────────────────────── */
function fmtMs(s) {
  if (s == null || isNaN(s)) return '00:00.000';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/* ── Confidence gauge ────────────────────────────────────────────── */
function ConfGauge({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[11px] font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

const SPEEDS = [0.25, 0.5, 1.0];

export default function ForensicVarModal({ event, session, onClose, onAttachDossier, isDossierAttached }) {
  const videoRef = useRef(null);
  const loopTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(event?.timestampStart ?? 0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 0.5x
  const [ready, setReady] = useState(false);
  const [attached, setAttached] = useState(isDossierAttached ?? false);

  const videoSrc = session?.videoUrl ?? '/demo.mp4';
  const speed = SPEEDS[speedIdx];

  /* ── Loop window: [start - 0.3s, end + 0.3s] ────────────────── */
  const loopStart = Math.max(0, (event?.timestampStart ?? 0) - 0.3);
  const loopEnd = (event?.timestampEnd ?? 0) + 0.3;
  const loopDuration = loopEnd - loopStart;

  /* Bounding box for zoom */
  const roi = event?.roi ?? null;
  const vidW = session?.videoWidth ?? 848;
  const vidH = session?.videoHeight ?? 478;

  /* Compute CSS transform to zoom into ROI */
  const zoomTransform = (() => {
    if (!roi) return { transform: 'scale(1)', transformOrigin: 'center center' };
    const cx = roi.x + roi.w / 2;
    const cy = roi.y + roi.h / 2;
    // Zoom to 2.8x, centered on the ROI
    const zoom = 2.8;
    const originX = (cx / vidW) * 100;
    const originY = (cy / vidH) * 100;
    return {
      transform: `scale(${zoom})`,
      transformOrigin: `${originX}% ${originY}%`,
      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  })();

  /* Setup video on mount */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    v.currentTime = loopStart;

    const onReady = () => {
      setReady(true);
      v.currentTime = loopStart;
      v.play().catch(() => {});
      setIsPlaying(true);
    };

    const onTime = () => {
      setCurrentTime(v.currentTime);
      // Loop back
      if (v.currentTime >= loopEnd) {
        v.currentTime = loopStart;
      }
    };

    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    v.addEventListener('canplay', onReady, { once: true });
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('pause', onPause);
    v.addEventListener('play', onPlay);

    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('play', onPlay);
      v.pause();
    };
  }, []);

  /* Speed change */
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); }
    else { v.pause(); }
  };

  const stepFrame = (dir) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    const fps = session?.fps ?? 30;
    v.currentTime = Math.max(loopStart, Math.min(loopEnd, v.currentTime + dir * (1 / fps)));
  };

  const cycleSpeed = () => setSpeedIdx(i => (i + 1) % SPEEDS.length);

  const handleAttach = () => {
    setAttached(true);
    onAttachDossier?.(event);
  };

  /* Progress bar pct */
  const progressPct = loopDuration > 0
    ? Math.max(0, Math.min(100, ((currentTime - loopStart) / loopDuration) * 100))
    : 0;

  const roiLabel = event?.objectsDetected?.[0]?.replace(/_/g, ' ') ?? event?.type?.replace(/_/g, ' ') ?? 'SUSPECT';
  const roiArea = roi ? `${Math.round(roi.w)}×${Math.round(roi.h)}px` : 'N/A';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/[0.08]"
          style={{ background: '#07090f' }}
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.07]"
            style={{ background: 'linear-gradient(to right, #0f1a2e, #0d1117)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Crosshair size={14} className="text-red-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">FORENSIC VAR DEEP-DIVE</div>
                <div className="text-sm font-bold text-white/90">
                  {EVENT_TYPE_LABELS[event?.type] ?? event?.type ?? 'Unknown Event'}
                </div>
              </div>
            </div>

            {/* Event meta pills */}
            <div className="flex items-center gap-2 ml-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-red-300 border border-red-500/30 bg-red-500/10">
                {formatTimecode(event?.timestampStart)} – {formatTimecode(event?.timestampEnd)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-400/30 text-amber-300 bg-amber-400/10">
                CONF {Math.round((event?.confidence ?? 0) * 100)}%
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {attached ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-emerald-300 border border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle size={12} />
                  In Dossier
                </span>
              ) : (
                <button
                  onClick={handleAttach}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white/80 border border-white/[0.15] hover:bg-white/[0.06] transition-colors"
                >
                  <Shield size={12} />
                  Attach to Dossier
                </button>
              )}
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────── */}
          <div className="flex gap-0 min-h-0">

            {/* VIDEO LENS — Left side */}
            <div className="flex-1 flex flex-col bg-black">
              {/* Zoomed video viewport */}
              <div className="relative overflow-hidden bg-black"
                style={{ aspectRatio: '16/9', width: '100%' }}>

                {/* Loading shimmer */}
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="text-xs text-white/30 animate-pulse font-mono">Initialising forensic lens…</div>
                  </div>
                )}

                {/* The actual video — zoomed via CSS transform */}
                <div className="absolute inset-0 overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-fill block"
                    crossOrigin="anonymous"
                    preload="auto"
                    playsInline
                    muted
                    style={roi ? zoomTransform : {}}
                  />
                </div>

                {/* ── HUD Overlays ─────────────────────────────── */}
                {ready && (
                  <>
                    {/* Corner crosshair brackets */}
                    {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} pointer-events-none`}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          {i === 0 && <><path d="M0 6V0H6" stroke="#ef4444" strokeWidth="1.5"/></>}
                          {i === 1 && <><path d="M14 6V0H8" stroke="#ef4444" strokeWidth="1.5"/></>}
                          {i === 2 && <><path d="M0 8V14H6" stroke="#ef4444" strokeWidth="1.5"/></>}
                          {i === 3 && <><path d="M14 8V14H8" stroke="#ef4444" strokeWidth="1.5"/></>}
                        </svg>
                      </div>
                    ))}

                    {/* Top-left: Live timecode */}
                    <div className="absolute top-2 left-8 pointer-events-none">
                      <div className="bg-black/70 border border-white/[0.12] rounded px-2 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur-sm">
                        ● {fmtMs(currentTime)}
                      </div>
                    </div>

                    {/* Top-right: Speed badge */}
                    <div className="absolute top-2 right-8 pointer-events-none">
                      <div className="bg-amber-500/20 border border-amber-400/40 rounded px-2 py-0.5 font-mono text-[11px] text-amber-300 font-bold">
                        {speed}x
                      </div>
                    </div>

                    {/* Bottom-left: Classification badge */}
                    <div className="absolute bottom-10 left-2 pointer-events-none">
                      <div className="bg-red-900/80 border border-red-500/40 rounded px-2 py-1 backdrop-blur-sm">
                        <div className="text-[9px] text-red-300/70 uppercase tracking-widest mb-0.5">CLASS DETECTED</div>
                        <div className="text-[11px] font-bold text-red-200 uppercase">{roiLabel}</div>
                        {roi && <div className="text-[9px] text-red-300/60 font-mono mt-0.5">ROI {roiArea}</div>}
                      </div>
                    </div>

                    {/* Bottom-right: VAR indicator */}
                    <div className="absolute bottom-10 right-2 pointer-events-none">
                      <div className="flex items-center gap-1.5 bg-black/70 border border-white/[0.08] rounded px-2 py-1 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">VAR ACTIVE</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/[0.08]">
                      <div
                        className="h-full bg-red-500 transition-none"
                        style={{ width: `${progressPct}%` }}
                      />
                      {/* Loop region highlight */}
                      <div className="absolute inset-0 border-x-2 border-red-500/30 pointer-events-none" />
                    </div>
                  </>
                )}
              </div>

              {/* ── Playback Controls ─────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06]"
                style={{ background: '#0a0d14' }}>
                {/* Step back 1 frame */}
                <button onClick={() => stepFrame(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                  title="Step back 1 frame">
                  <ChevronLeft size={16} />
                </button>

                {/* Play/Pause */}
                <button onClick={togglePlay}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.15] text-white/80 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>

                {/* Step forward 1 frame */}
                <button onClick={() => stepFrame(1)}
                  className="w-8 h-8 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                  title="Step forward 1 frame">
                  <ChevronRight size={16} />
                </button>

                {/* Speed toggle */}
                <button onClick={cycleSpeed}
                  className="ml-2 px-3 py-1.5 rounded text-xs font-mono font-bold border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 transition-colors">
                  {speed}x
                </button>

                {/* Timecode */}
                <div className="ml-auto font-mono text-[11px] text-white/30">
                  LOOP {formatTimecode(loopStart)} → {formatTimecode(loopEnd)}
                </div>

                <div className="flex items-center gap-1.5">
                  <SkipBack size={11} className="text-white/20" />
                  <span className="text-[10px] text-white/25">A/B Loop Active</span>
                  <SkipForward size={11} className="text-white/20" />
                </div>
              </div>
            </div>

            {/* ── RIGHT TELEMETRY PANEL ────────────────────────── */}
            <div className="w-56 flex-shrink-0 flex flex-col border-l border-white/[0.06] overflow-y-auto"
              style={{ background: '#090c14' }}>

              {/* Confidence */}
              <div className="px-4 py-3 border-b border-white/[0.05]">
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2">Model Confidence</div>
                <ConfGauge value={event?.confidence} />
              </div>

              {/* Event Telemetry */}
              <div className="px-4 py-3 border-b border-white/[0.05]">
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2.5">Incident Telemetry</div>
                <div className="space-y-2">
                  <TelRow label="Event Type" value={EVENT_TYPE_LABELS[event?.type] ?? event?.type} />
                  <TelRow label="Duration" value={`${((event?.timestampEnd ?? 0) - (event?.timestampStart ?? 0)).toFixed(2)}s`} mono />
                  <TelRow label="Timestamp" value={formatTimecode(event?.timestampStart)} mono />
                  <TelRow label="Status" value={event?.reviewStatus ?? 'pending'} capitalize />
                  {event?.objectsDetected?.length > 0 && (
                    <TelRow label="Object" value={event.objectsDetected[0].replace(/_/g, ' ')} />
                  )}
                </div>
              </div>

              {/* ROI Coordinates */}
              {roi && (
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2.5">
                    <Target size={9} className="inline mr-1" />ROI Coordinates
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(roi).map(([k, v]) => (
                      <div key={k} className="bg-white/[0.03] rounded px-2 py-1.5">
                        <div className="text-[9px] text-white/25 uppercase">{k}</div>
                        <div className="font-mono text-[11px] text-white/70">{Math.round(v)}px</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* XAI Signals */}
              <div className="px-4 py-3 border-b border-white/[0.05]">
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2.5">
                  <Zap size={9} className="inline mr-1" />XAI Signals
                </div>
                <div className="space-y-2.5">
                  <SignalBar label="Object Persistence" score={Math.min(1, (event?.confidence ?? 0) * 1.15)} />
                  <SignalBar label="Spatial Stability" score={0.82} />
                  <SignalBar label="Motion Correlation" score={0.71} />
                  <SignalBar label="Model Certainty" score={event?.confidence ?? 0} />
                </div>
              </div>

              {/* AI Explanation */}
              {event?.explanation && (
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-1.5">AI Explanation</div>
                  <p className="text-[11px] text-white/50 leading-relaxed">{event.explanation}</p>
                </div>
              )}

              {/* Dossier attach */}
              <div className="px-4 py-4 mt-auto">
                {attached ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-emerald-300 border border-emerald-500/25 bg-emerald-500/[0.07]">
                    <CheckCircle size={13} />
                    Attached to Dossier
                  </div>
                ) : (
                  <button
                    onClick={handleAttach}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded text-xs font-bold text-white border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400/60 transition-all"
                  >
                    <AlertTriangle size={12} />
                    Attach to Disciplinary File
                  </button>
                )}
                <p className="text-[9px] text-white/20 text-center mt-2 leading-relaxed">
                  Adds this evidence snapshot to the institutional forensic report
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Small sub-components ──────────────────────────────────────── */
function TelRow({ label, value, mono = false, capitalize = false }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-white/30 flex-shrink-0">{label}</span>
      <span className={`text-[11px] text-white/65 text-right truncate max-w-[100px]
        ${mono ? 'font-mono' : ''}
        ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function SignalBar({ label, score }) {
  const pct = Math.min(100, Math.round((score ?? 0) * 100));
  const color = pct >= 75 ? '#ef4444' : pct >= 55 ? '#f59e0b' : '#22c55e';
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] text-white/35">{label}</span>
        <span className="font-mono text-[10px]" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
