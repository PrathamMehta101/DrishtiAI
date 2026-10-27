import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, CheckCircle2, AlertCircle, ArrowRight, X } from 'lucide-react';
import { storeLiveSessionData } from '../../api/index';

const BACKEND = 'http://localhost:8000';

export default function BackgroundTaskBanner() {
  const [task, setTask] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveTask = async () => {
      const raw = localStorage.getItem('drishti_active_task');
      if (!raw) {
        setTask(null);
        return;
      }

      try {
        const stored = JSON.parse(raw);
        if (!stored?.taskId) return;

        const res = await fetch(`${BACKEND}/api/task/${stored.taskId}`);
        if (!res.ok) return;
        const data = await res.json();

        setTask({
          ...stored,
          ...data,
        });

        if (data.state === 'SUCCESS') {
          if (data.session && data.events) {
            storeLiveSessionData(data.video_id, data);
          }
        }
      } catch (err) {
        // Ignore network blip
      }
    };

    checkActiveTask();
    const interval = setInterval(checkActiveTask, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!task || dismissed) return null;

  const isCompleted = task.state === 'SUCCESS';
  const isFailed = task.state === 'FAILURE';
  const isRunning = task.state === 'PROCESSING' || task.state === 'STARTED' || task.state === 'PENDING';

  const handleDismiss = () => {
    setDismissed(true);
    if (isCompleted || isFailed) {
      localStorage.removeItem('drishti_active_task');
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button.dismiss-btn')) return;

    if (isCompleted && task.video_id) {
      localStorage.removeItem('drishti_active_task');
      navigate(`/session/${task.video_id}`);
    } else {
      navigate('/evaluations');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        onClick={handleCardClick}
        className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white border border-[#D9E0E6] shadow-xl rounded-lg p-4 text-[#26323D] cursor-pointer hover:border-[#6D8196] transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : isFailed
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-[#F1F5F9] text-[#26323D] border border-[#D9E0E6] animate-pulse'
            }`}>
              {isCompleted ? <CheckCircle2 size={15} /> : isFailed ? <AlertCircle size={15} /> : <Cpu size={15} />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-[#26323D] group-hover:text-[#52677D] transition-colors">
                  {isCompleted ? 'Analysis Completed' : isFailed ? 'Analysis Failed' : 'Background Task Active'}
                </p>
              </div>
              <p className="text-[10px] text-[#6B7785] font-mono truncate max-w-[200px] mt-0.5">
                {task.stage || (isRunning ? 'Processing video…' : 'Finalised')}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="dismiss-btn text-[#A9B7C5] hover:text-[#26323D] transition-colors p-1"
          >
            <X size={13} />
          </button>
        </div>

        {isRunning && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-[#6B7785] mb-1.5 font-mono font-medium">
              <span className="truncate max-w-[160px]">{task.examName || 'Exam Video'}</span>
              <span className="text-[#26323D] font-bold">{Math.round(task.progress || 15)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#26323D] rounded-full"
                animate={{ width: `${task.progress || 15}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#52677D] font-bold">
            <ArrowRight size={11} />
            <span>Click to open session results</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
