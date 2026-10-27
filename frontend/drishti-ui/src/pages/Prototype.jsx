import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, FileSpreadsheet, FileText } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportTemplate from '../components/report/ReportTemplate';
import VideoPlayer from '../components/video/VideoPlayer';
import ActivityTimeline from '../components/video/ActivityTimeline';
import MotionTimeline from '../components/video/MotionTimeline';
import EventList from '../components/events/EventList';
import EventDetailPanel from '../components/events/EventDetailPanel';

const prototypeSession = {
  id: 'prototype_001',
  hallName: 'Prototype Room',
  examName: 'Demonstration',
  date: '2026-08-22',
  status: 'completed',
  videoUrl: '/demo.mp4',
  durationSeconds: 88,
  cameraId: 'CAM-PROTO',
  eventCount: 1,
  highRiskCount: 1,
  pendingReview: 0,
};

const prototypeEvent = {
  id: 'evt_proto',
  sessionId: 'prototype_001',
  timestampStart: 15,
  timestampEnd: 86,
  type: 'object_exchange', 
  objectsDetected: ['paper_chit'],
  confidence: 0.99,
  roi: { x: 5, y: 150, w: 70, h: 80 },
  reviewStatus: 'escalated',
  explanation: 'Candidate observed holding a piece of paper (chit) near the left edge for an extended duration.',
};

const prototypeMotion = {
  success: true,
  video_id: 'prototype_001',
  video: {
    width: 640,
    height: 360,
    fps: 30,
    total_frames: 2640,
    duration: 88,
  },
  motion_events: [
    {
      start_frame: 450,
      end_frame: 2580,
      start_time: 15,
      end_time: 86,
      start_timestamp: '00:15.00',
      end_timestamp: '01:26.00',
      duration: 71,
      detections: 2130,
      max_motion_score: 0.045,
      bbox: { x1: 5, y1: 150, x2: 75, y2: 230 },
      regions: [{ x1: 5, y1: 150, x2: 75, y2: 230, area: 5600 }],
    },
  ],
  motion_frames: [
    {
      frame: 450,
      timestamp: 15,
      timestamp_formatted: '00:15.00',
      motion: true,
      motion_score: 0.038,
      regions: [{ x1: 5, y1: 150, x2: 75, y2: 230, area: 5600 }],
    },
    {
      frame: 900,
      timestamp: 30,
      timestamp_formatted: '00:30.00',
      motion: true,
      motion_score: 0.045,
      regions: [{ x1: 5, y1: 150, x2: 75, y2: 230, area: 5600 }],
    },
    {
      frame: 1500,
      timestamp: 50,
      timestamp_formatted: '00:50.00',
      motion: true,
      motion_score: 0.042,
      regions: [{ x1: 5, y1: 150, x2: 75, y2: 230, area: 5600 }],
    },
  ],
};

export default function Prototype() {
  const { selectedEventId, setSelectedEventId } = useAppStore();
  const [selectedMotionEvent, setSelectedMotionEvent] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    setSelectedEventId(prototypeEvent.id);
    setTimeout(() => {
      playerRef.current?.seekTo(prototypeEvent.timestampStart);
    }, 300);
  }, [setSelectedEventId]);

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

  const selectedEvent = selectedEventId === prototypeEvent.id ? prototypeEvent : null;
  const events = [prototypeEvent];

  const handleExport = async (format) => {
    setExporting(format);
    await new Promise(r => setTimeout(r, 100));

    try {
      if (format === 'csv') {
        const headers = ['Event ID,Timestamp Start,Timestamp End,Risk Level,Event Type,Confidence'];
        const risk = prototypeEvent.confidence >= 0.80 ? 'High' : prototypeEvent.confidence >= 0.60 ? 'Medium' : 'Low';
        const row = `${prototypeEvent.id},${prototypeEvent.timestampStart},${prototypeEvent.timestampEnd},${risk},${prototypeEvent.type},${prototypeEvent.confidence}`;
        const csvContent = "data:text/csv;charset=utf-8," + headers.concat([row]).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `prototype_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        if (reportRef.current) {
          const canvas = await html2canvas(reportRef.current, {
            scale: 2.0,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = canvas.width / canvas.height;

          let renderWidth = pageWidth;
          let renderHeight = pageWidth / imgRatio;
          let offsetX = 0;
          let offsetY = 0;

          if (renderHeight > pageHeight) {
            renderHeight = pageHeight;
            renderWidth = pageHeight * imgRatio;
            offsetX = (pageWidth - renderWidth) / 2;
          }

          pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
          pdf.save(`drishti_report_prototype.pdf`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col h-full overflow-hidden bg-[#FAFAFA]"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D9E0E6] bg-white flex-shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#26323D] font-bold px-2 py-0.5 bg-[#F1F5F9] border border-[#D9E0E6] rounded">
            <Eye size={12} />
            <span>Prototype Demo</span>
          </div>
          <div className="w-px h-3.5 bg-[#D9E0E6]" />
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-xs font-bold text-[#26323D] truncate">{prototypeSession.hallName}</span>
            <span className="text-xs text-[#6B7785] truncate">— {prototypeSession.examName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#52677D] border border-[#D9E0E6]">
              {prototypeSession.cameraId}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            className="btn-outline text-xs gap-1.5 py-1 px-2.5"
          >
            <FileSpreadsheet size={13} />
            <span>{exporting === 'csv' ? 'Exporting…' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="btn-primary text-xs gap-1.5 py-1 px-2.5 font-bold"
          >
            <FileText size={13} />
            <span>{exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Three-panel layout mirroring SessionReview */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — Event list */}
        <div className="w-64 lg:w-72 flex-shrink-0 border-r border-[#D9E0E6] bg-white overflow-hidden flex flex-col">
          <EventList events={events} onEventClick={handleEventClick} />
        </div>

        {/* CENTER — Player + Timelines */}
        <div className="flex-1 flex flex-col min-w-0 p-3.5 gap-2.5 overflow-hidden bg-[#FAFAFA]">
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <VideoPlayer
              ref={playerRef}
              session={prototypeSession}
              events={events}
              selectedEvent={selectedEvent}
              motionData={prototypeMotion}
              selectedMotionEvent={selectedMotionEvent}
              onTimeUpdate={(t) => setCurrentTime(t)}
            />
          </div>
          <div className="panel px-3.5 py-2.5 flex-shrink-0 space-y-1.5 bg-white border-[#D9E0E6] shadow-xs">
            {/* YOLO Activity Timeline */}
            <ActivityTimeline
              events={events}
              duration={prototypeSession.durationSeconds}
              selectedEventId={selectedEventId}
              onEventClick={handleEventClick}
            />

            {/* OpenCV Motion Timeline with Scrubber */}
            <MotionTimeline
              motionData={prototypeMotion}
              duration={prototypeSession.durationSeconds}
              currentTime={currentTime}
              selectedMotionEventId={selectedMotionEvent?.id || null}
              onMotionEventClick={handleMotionEventClick}
              onSeek={(t) => playerRef.current?.seekTo(t)}
            />
          </div>
        </div>

        {/* RIGHT — Event detail */}
        <div className="w-72 lg:w-80 flex-shrink-0 border-l border-[#D9E0E6] bg-white overflow-hidden">
          <EventDetailPanel event={selectedEvent} session={prototypeSession} />
        </div>
      </div>

      {/* Hidden container for PDF rendering */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1000px' }}>
         <ReportTemplate ref={reportRef} session={prototypeSession} events={events} />
      </div>
    </motion.div>
  );
}
