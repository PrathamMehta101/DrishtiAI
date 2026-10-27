import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import useAppStore from '../../store/useAppStore';

/**
 * VideoPlayer — Native HTML5 video player that jumps to event timestamps
 * and overlays real-time YOLO bounding boxes, merged OpenCV motion bounding boxes (1-2 big boxes),
 * and heatmaps.
 */
const VideoPlayer = forwardRef(function VideoPlayer(
  { session, events = [], selectedEvent, motionData, selectedMotionEvent, onTimeUpdate },
  ref
) {
  const videoRef = useRef(null);
  const { heatmapEnabled } = useAppStore();
  const [currentTime, setCurrentTime] = useState(0);

  // Video source from session (or fallback to demo.mp4)
  const videoSrc = session?.videoUrl ?? '/demo.mp4';

  // Expose seekTo for external callers
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch((e) => console.warn('Auto-play prevented:', e));
      }
    },
  }));

  // Track video time to auto-hide bounding boxes and notify parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  // Auto-seek and play when a YOLO event is selected
  useEffect(() => {
    if (selectedEvent && videoRef.current) {
      videoRef.current.currentTime = selectedEvent.timestampStart;
      videoRef.current.play().catch((e) => console.warn('Auto-play prevented:', e));
    }
  }, [selectedEvent]);

  // Auto-seek and play when a Motion event is selected
  useEffect(() => {
    if (selectedMotionEvent && videoRef.current) {
      videoRef.current.currentTime = selectedMotionEvent.start_time;
      videoRef.current.play().catch((e) => console.warn('Auto-play prevented:', e));
    }
  }, [selectedMotionEvent]);

  // Video resolution dimensions — strict intrinsic aspect ratio
  const vidW = session?.videoWidth ?? motionData?.video?.width ?? 848;
  const vidH = session?.videoHeight ?? motionData?.video?.height ?? 478;
  const aspectRatio = vidW && vidH ? `${vidW} / ${vidH}` : '16 / 9';

  // ── 1. YOLO Bounding Box ───────────────────────────────────────────────────
  const showYoloBbox = !!(
    selectedEvent?.roi &&
    currentTime >= selectedEvent.timestampStart &&
    currentTime <= selectedEvent.timestampEnd
  );

  let yoloBboxStyle = null;
  let yoloBboxLabel = '';

  if (showYoloBbox) {
    yoloBboxStyle = {
      left: `${(selectedEvent.roi.x / vidW) * 100}%`,
      top: `${(selectedEvent.roi.y / vidH) * 100}%`,
      width: `${(selectedEvent.roi.w / vidW) * 100}%`,
      height: `${(selectedEvent.roi.h / vidH) * 100}%`,
      boxShadow: '0 0 16px rgba(229,115,115,0.45)',
    };
    yoloBboxLabel =
      selectedEvent.objectsDetected?.[0]?.replace('_', ' ') ||
      selectedEvent.type?.replace('_', ' ') ||
      'FLAGGED';
  }

  // ── 2. Merged OpenCV Motion Bounding Box(es) (HIGH MOTION ONLY) ───────────
  const showMotionBbox = !!(
    selectedMotionEvent &&
    currentTime >= selectedMotionEvent.start_time - 0.05 &&
    currentTime <= selectedMotionEvent.end_time + 0.05
  );

  // Extract only genuine HIGH-MOTION regions (filtering out camera noise/low motion)
  const activeMotionRegions = useMemo(() => {
    if (!showMotionBbox) return [];

    const frames = motionData?.motion_frames || [];
    let closestFrame = null;
    let minDiff = 0.15;

    for (const f of frames) {
      const diff = Math.abs(f.timestamp - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = f;
      }
    }

    // Ignore frames with trivial motion score (background camera jitter / noise)
    if (closestFrame && closestFrame.motion_score !== undefined && closestFrame.motion_score < 0.0006) {
      return [];
    }

    const rawRegions =
      closestFrame?.regions && closestFrame.regions.length > 0
        ? closestFrame.regions
        : selectedMotionEvent.regions && selectedMotionEvent.regions.length > 0
        ? selectedMotionEvent.regions
        : selectedMotionEvent.bbox
        ? [selectedMotionEvent.bbox]
        : [];

    if (rawRegions.length === 0) return [];

    // STRICT HIGH-MOTION FILTERING:
    // 1. Calculate maximum region area in this frame
    const maxAreaInFrame = Math.max(
      ...rawRegions.map((r) => r.area || (r.x2 - r.x1) * (r.y2 - r.y1)),
      0
    );

    // If largest movement is tiny (< 450 px²), discard as background noise
    if (maxAreaInFrame < 450 && rawRegions.length > 1) {
      return [];
    }

    // 2. Only keep regions that represent significant motion (>= 500 px² and >= 35% of max area)
    const areaThreshold = Math.max(500, maxAreaInFrame * 0.35);
    const highMotionPool = rawRegions
      .filter((r) => (r.area || (r.x2 - r.x1) * (r.y2 - r.y1)) >= areaThreshold)
      .sort((a, b) => (b.area || 0) - (a.area || 0));

    if (highMotionPool.length === 0) return [];

    if (highMotionPool.length <= 2) {
      return highMotionPool;
    }

    // Cluster top high-motion regions if they are spatially distinct
    const minX = Math.min(...highMotionPool.map((r) => r.x1));
    const maxX = Math.max(...highMotionPool.map((r) => r.x2));
    const spanX = maxX - minX;

    const group1 = [];
    const group2 = [];

    // If spatial span across X is wide (> 35% of video width), split into 2 clusters; otherwise merge into 1 big box
    if (spanX > vidW * 0.35) {
      const midX = (minX + maxX) / 2;
      for (const r of highMotionPool) {
        const cx = (r.x1 + r.x2) / 2;
        if (cx < midX) group1.push(r);
        else group2.push(r);
      }
    } else {
      group1.push(...highMotionPool);
    }

    const mergedBoxes = [];
    for (const grp of [group1, group2]) {
      if (grp.length > 0) {
        const x1 = Math.max(0, Math.min(...grp.map((r) => r.x1)) - 4);
        const y1 = Math.max(0, Math.min(...grp.map((r) => r.y1)) - 4);
        const x2 = Math.min(vidW, Math.max(...grp.map((r) => r.x2)) + 4);
        const y2 = Math.min(vidH, Math.max(...grp.map((r) => r.y2)) + 4);
        const totalArea = grp.reduce(
          (acc, r) => acc + (r.area || (r.x2 - r.x1) * (r.y2 - r.y1)),
          0
        );
        mergedBoxes.push({ x1, y1, x2, y2, area: totalArea });
      }
    }

    return mergedBoxes.slice(0, 2);
  }, [showMotionBbox, motionData, currentTime, selectedMotionEvent, vidW, vidH]);

  return (
    <div className="relative w-full max-h-full flex items-center justify-center">
      {/* Aspect-ratio locked player frame */}
      <div
        className="relative w-full max-h-full bg-black rounded-lg overflow-hidden border border-white/[0.08] shadow-2xl"
        style={{ aspectRatio }}
      >
        {/* Native HTML5 Video Player */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-fill block"
          controls
          controlsList="nodownload"
        />

        {/* ── YOLO Bounding Box Overlay ─────────────────────────────────────── */}
        {showYoloBbox && yoloBboxStyle && (
          <div
            className="absolute border-2 border-risk-high rounded-sm pointer-events-none transition-all duration-150 z-20"
            style={yoloBboxStyle}
          >
            <div className="absolute -top-6 left-[-2px] bg-risk-high text-surface text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-sm uppercase tracking-wider shadow-md">
              {yoloBboxLabel}
            </div>
          </div>
        )}

        {/* ── Merged OpenCV Motion Bounding Box(es) Overlay (HIGH MOTION ONLY) ─── */}
        {showMotionBbox &&
          activeMotionRegions.map((region, idx) => {
            const widthPx = Math.max(16, region.x2 - region.x1);
            const heightPx = Math.max(16, region.y2 - region.y1);

            const style = {
              left: `${(region.x1 / vidW) * 100}%`,
              top: `${(region.y1 / vidH) * 100}%`,
              width: `${(widthPx / vidW) * 100}%`,
              height: `${(heightPx / vidH) * 100}%`,
              boxShadow:
                '0 0 22px rgba(34,211,238,0.7), inset 0 0 10px rgba(16,185,129,0.3)',
            };

            return (
              <div
                key={`motion_high_box_${idx}`}
                className="absolute border-2 border-cyan-400 bg-cyan-500/[0.15] rounded-md pointer-events-none transition-all duration-100 z-20 backdrop-blur-[0.5px]"
                style={style}
              >
                <div className="absolute -top-5 left-[-2px] bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 whitespace-nowrap rounded uppercase tracking-wider shadow-md">
                  HIGH MOTION {activeMotionRegions.length > 1 ? `#${idx + 1}` : ''}
                </div>
              </div>
            );
          })}

        {/* ── Live Heatmap Overlay ─────────────────────────────────────────── */}
        {heatmapEnabled &&
          (session?.heatmapUrl ? (
            <img
              src={session.heatmapUrl}
              alt="Heatmap Overlay"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-45 mix-blend-screen"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="absolute inset-0 pointer-events-none mix-blend-screen overflow-hidden">
              {events.map((evt, idx) => {
                if (!evt.roi) return null;
                return (
                  <div
                    key={idx}
                    className="absolute rounded-full bg-red-600/35 blur-xl animate-pulse"
                    style={{
                      left: `${((evt.roi.x + evt.roi.w / 2) / vidW) * 100}%`,
                      top: `${((evt.roi.y + evt.roi.h / 2) / vidH) * 100}%`,
                      width: `${Math.max(40, (evt.roi.w / vidW) * 200)}px`,
                      height: `${Math.max(40, (evt.roi.h / vidH) * 200)}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
});

export default VideoPlayer;