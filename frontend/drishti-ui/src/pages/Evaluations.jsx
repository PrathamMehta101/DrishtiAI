import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, Cpu, CheckCircle2, ArrowRight,
  Upload as UploadIcon, Film, Sparkles, RefreshCw
} from 'lucide-react';
import { storeLiveSessionData } from '../api/index';

const BACKEND = 'http://localhost:8000';

export default function Evaluations() {
  const [activeTask, setActiveTask] = useState(null);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch completed sessions from backend
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/sessions`);
      if (res.ok) {
        const data = await res.json();
        setCompletedSessions(data.sessions || []);
      }
    } catch {
      // ignore
    }
  };

  // Poll active task from localStorage and backend
  useEffect(() => {
    fetchSessions();

    const pollActiveTask = async () => {
      const raw = localStorage.getItem('drishti_active_task');
      if (!raw) {
        setActiveTask(null);
        setLoading(false);
        return;
      }

      try {
        const stored = JSON.parse(raw);
        if (!stored?.taskId) {
          setActiveTask(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`${BACKEND}/api/task/${stored.taskId}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();

        const merged = {
          ...stored,
          ...data,
        };
        setActiveTask(merged);
        setLoading(false);

        if (data.state === 'SUCCESS') {
          if (data.session && data.events) {
            storeLiveSessionData(data.video_id, data);
            fetchSessions();
          }
        }
      } catch (err) {
        setLoading(false);
      }
    };

    pollActiveTask();
    const interval = setInterval(pollActiveTask, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenSession = (videoId) => {
    localStorage.removeItem('drishti_active_task');
    navigate(`/session/${videoId}`);
  };

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#26323D]">Task Queue &amp; Worker Evaluations</h1>
          <p className="text-xs text-[#6B7785] mt-0.5">Real-time status of distributed Celery workers and video inference</p>
        </div>
        <Link
          to="/upload"
          className="btn-primary text-xs gap-1.5 py-1.5 px-3 font-semibold"
        >
          <UploadIcon size={13} />
          <span>Upload Recording</span>
        </Link>
      </motion.div>

      {/* Cluster Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Cpu size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#6B7785] uppercase tracking-wider font-semibold">Worker Node</p>
            <p className="text-xs font-bold text-[#26323D] truncate">Online (Local)</p>
          </div>
        </div>

        <div className="panel p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#F1F5F9] border border-[#D9E0E6] flex items-center justify-center text-[#26323D] flex-shrink-0">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#6B7785] uppercase tracking-wider font-semibold">Hardware Acceleration</p>
            <p className="text-xs font-bold text-[#26323D] font-mono truncate">RTX 3050 GPU</p>
          </div>
        </div>

        <div className="panel p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#F1F5F9] border border-[#D9E0E6] flex items-center justify-center text-[#52677D] flex-shrink-0">
            <Activity size={15} className={activeTask && activeTask.state !== 'SUCCESS' ? 'animate-pulse text-[#26323D]' : 'text-[#A9B7C5]'} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#6B7785] uppercase tracking-wider font-semibold">Queue Status</p>
            <p className="text-xs font-bold text-[#26323D] truncate">
              {activeTask && activeTask.state !== 'SUCCESS' ? '1 Active Job' : 'Idle (0 Queued)'}
            </p>
          </div>
        </div>

        <div className="panel p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#6B7785] uppercase tracking-wider font-semibold">Evaluated Sessions</p>
            <p className="text-xs font-bold text-[#26323D] font-mono">{completedSessions.length} Total</p>
          </div>
        </div>
      </div>

      {/* Active Evaluation Section */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold text-[#52677D] uppercase tracking-widest block">
          Active Video Evaluation
        </span>

        {activeTask ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel p-4 space-y-3.5 border-[#6D8196] bg-white shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#26323D] truncate">
                    {activeTask.examName || 'Exam Video Recording'}
                  </h3>
                  <span className={`text-[9px] font-semibold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                    activeTask.state === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : activeTask.state === 'FAILURE'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-[#F1F5F9] border-[#D9E0E6] text-[#26323D] animate-pulse'
                  }`}>
                    {activeTask.state === 'SUCCESS' ? 'Completed' : activeTask.state === 'FAILURE' ? 'Failed' : 'Processing'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7785] font-mono">
                  Hall: <span className="text-[#26323D] font-sans font-medium">{activeTask.hallName || 'Unknown Hall'}</span> · Camera: <span className="text-[#26323D]">{activeTask.cameraId || 'CAM-01'}</span> · ID: <span className="text-[#A9B7C5]">{activeTask.taskId?.slice(0, 8)}...</span>
                </p>
              </div>

              {activeTask.state === 'SUCCESS' && (
                <button
                  onClick={() => handleOpenSession(activeTask.video_id)}
                  className="btn-primary text-xs flex items-center gap-1.5 py-1 px-3 flex-shrink-0"
                >
                  <span>Open Session</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {/* Stage Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#6B7785]">
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#52677D] font-medium">
                  <Activity size={12} className="text-[#26323D] animate-pulse" />
                  {activeTask.stage || 'Analyzing frames with YOLO & OpenCV...'}
                </span>
                <span className="font-mono font-bold text-[#26323D]">{Math.round(activeTask.progress || 15)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <motion.div
                  className="h-full bg-[#26323D] rounded-full"
                  animate={{ width: `${activeTask.progress || 15}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Stages Badges */}
            <div className="flex gap-1.5 flex-wrap pt-0.5">
              {[
                { name: '1. Upload & Queue', thresh: 0 },
                { name: '2. Parallel YOLO GPU + Motion', thresh: 15 },
                { name: '3. Event Clustering & Heatmap', thresh: 75 },
                { name: '4. AI Summary', thresh: 90 },
              ].map((step) => {
                const currentPct = activeTask.progress || 15;
                const isDone = currentPct >= (step.thresh + 15) || activeTask.state === 'SUCCESS';
                const isActive = currentPct >= step.thresh && !isDone;
                return (
                  <span
                    key={step.name}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                      isDone
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                        : isActive
                        ? 'bg-[#F1F5F9] border-[#26323D] text-[#26323D] font-bold animate-pulse'
                        : 'bg-[#FAFAFA] border-[#D9E0E6] text-[#A9B7C5]'
                    }`}
                  >
                    {step.name}
                  </span>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="panel p-6 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#D9E0E6] flex items-center justify-center mx-auto text-[#A9B7C5]">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#26323D]">Worker Queues Idle</p>
              <p className="text-[11px] text-[#6B7785] mt-0.5">All background worker nodes are online and ready for new video recordings</p>
            </div>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1 text-xs text-[#52677D] hover:text-[#26323D] font-semibold underline pt-1"
            >
              Upload recording to start evaluation <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* Completed Sessions Table */}
      <div className="space-y-2.5 pt-1">
        <span className="text-[10px] font-bold text-[#52677D] uppercase tracking-widest block">Recently Evaluated Sessions</span>
        <div className="panel overflow-hidden">
          {completedSessions.length > 0 ? (
            <div className="divide-y divide-[#D9E0E6]/60">
              {completedSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/session/${s.id}`)}
                  className="p-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-[#F1F5F9] border border-[#D9E0E6] flex items-center justify-center text-[#52677D] flex-shrink-0">
                      <Film size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#26323D] truncate">{s.examName || 'Untitled Exam'}</p>
                      <p className="text-[10px] text-[#6B7785] font-mono">
                        {s.hallName} · {s.date} · {s.durationSeconds ? `${s.durationSeconds}s` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-[#26323D]">{s.totalDetections || 0} Detections</p>
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                        s.riskLevel === 'high'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        {s.riskLevel ? `${s.riskLevel.toUpperCase()} RISK` : 'COMPLETED'}
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-[#A9B7C5]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#6B7785]">
              No previous sessions recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
