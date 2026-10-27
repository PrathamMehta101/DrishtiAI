import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ArrowLeft, Download, Film } from 'lucide-react';
import { getSession, getEvents, getMotion } from '../api/index';
import VideoPlayer from '../components/video/VideoPlayer';
import ActivityTimeline from '../components/video/ActivityTimeline';
import MotionTimeline from '../components/video/MotionTimeline';
import EventList from '../components/events/EventList';
import EventDetailPanel from '../components/events/EventDetailPanel';
import useAppStore from '../store/useAppStore';

export default function SessionReview() {
  const { id } = useParams();
  const { selectedEventId, setSelectedEventId, heatmapEnabled, toggleHeatmap } = useAppStore();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [motionData, setMotionData] = useState(null);
  const [selectedMotionEvent, setSelectedMotionEvent] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSession(id), getEvents(id), getMotion(id)])
      .then(([s, e, m]) => {
        setSession(s);
        setEvents(e);
        setMotionData(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const handleEventClick = (event) => {
    if (!event || selectedEventId === event.id) {
      setSelectedEventId(null);
    } else {
      setSelectedEventId(event.id);
      playerRef.current?.seekTo(event.timestampStart);
    }
  };

  const handleMotionEventClick = (mEvt) => {
    if (!mEvt || selectedMotionEvent?.id === mEvt.id) {
      setSelectedMotionEvent(null);
    } else {
      setSelectedMotionEvent(mEvt);
      playerRef.current?.seekTo(mEvt.start_time);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F7F9]">
        <div className="flex items-center gap-2 text-xs text-[#64748B] animate-pulse font-mono font-medium">
          <Film size={14} className="text-[#243746] animate-spin" />
          Loading forensic session telemetry…
        </div>
      </div>
    );
  }

  const duration = session?.durationSeconds || motionData?.video?.duration || 10;
  const vidW = session?.videoWidth || motionData?.video?.width || 848;
  const vidH = session?.videoHeight || motionData?.video?.height || 478;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col h-full overflow-hidden bg-[#F5F7F9]"
    >
      {/* Session header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2E8F0] bg-white flex-shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="btn-ghost text-xs gap-1.5 py-1 px-2.5 text-[#64748B] hover:text-[#1E293B]">
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </Link>

          <div className="w-px h-3.5 bg-[#E2E8F0]" />

          {/* Session Title & Metadata Tags */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold text-[#1E293B] truncate">
              {session?.hallName || 'Session Review'}
            </span>
            <span className="text-xs text-[#64748B] truncate hidden sm:inline">
              {session?.examName ? `— ${session.examName}` : ''}
            </span>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] font-semibold">
                {session?.cameraId || 'CAM-01'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] hidden md:inline">
                {vidW}×{vidH}
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                {session?.date}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            id="toggle-heatmap"
            onClick={toggleHeatmap}
            className={`btn-outline text-xs gap-1.5 py-1 px-2.5 transition-all
              ${heatmapEnabled ? 'border-amber-400 text-amber-800 bg-amber-50 shadow-2xs font-semibold' : 'text-[#64748B]'}`}
          >
            <Flame size={12} className={heatmapEnabled ? 'text-amber-600' : 'text-[#94A3B8]'} />
            <span>Heatmap {heatmapEnabled ? 'ON' : 'OFF'}</span>
          </button>
          
          <Link
            to={`/session/${id}/export`}
            id="session-export"
            className="btn-primary text-xs gap-1.5 py-1 px-2.5"
          >
            <Download size={12} />
            <span>Export Report</span>
          </Link>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — Event list */}
        <div className="w-64 lg:w-72 flex-shrink-0 border-r border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
          <EventList events={events} onEventClick={handleEventClick} />
        </div>

        {/* CENTER — Player + Timelines */}
        <div className="flex-1 flex flex-col min-w-0 p-3.5 gap-2.5 overflow-hidden bg-[#F5F7F9]">
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <VideoPlayer
              ref={playerRef}
              session={session}
              events={events}
              selectedEvent={selectedEvent}
              motionData={motionData}
              selectedMotionEvent={selectedMotionEvent}
              onTimeUpdate={(t) => setCurrentTime(t)}
            />
          </div>

          {/* Integrated Timelines Panel */}
          <div className="panel px-3.5 py-2.5 flex-shrink-0 space-y-1.5 bg-white border-[#E2E8F0] shadow-xs">
            {/* YOLO Activity Timeline */}
            <ActivityTimeline
              events={events}
              duration={duration}
              selectedEventId={selectedEventId}
              onEventClick={handleEventClick}
            />

            {/* OpenCV Motion Timeline with Scrubber */}
            <MotionTimeline
              motionData={motionData}
              duration={duration}
              currentTime={currentTime}
              selectedMotionEventId={selectedMotionEvent?.id || null}
              onMotionEventClick={handleMotionEventClick}
              onSeek={(t) => playerRef.current?.seekTo(t)}
            />
          </div>
        </div>

        {/* RIGHT — Event detail */}
        <div className="w-72 lg:w-80 flex-shrink-0 border-l border-[#E2E8F0] bg-white overflow-hidden">
          <EventDetailPanel event={selectedEvent} session={session} />
        </div>
      </div>
    </motion.div>
  );
}
