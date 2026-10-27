import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Camera, CalendarDays, BookOpen, Building2,
  Upload as UploadIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import UploadDropzone from '../components/upload/UploadDropzone';
import { uploadAndAnalyze, storeLiveSessionData } from '../api/index';

const PHASES = [
  { threshold: 0,  label: 'Preparing upload…' },
  { threshold: 5,  label: 'Uploading footage…' },
  { threshold: 60, label: 'Running YOLO detection…' },
  { threshold: 75, label: 'Clustering detections into events…' },
  { threshold: 85, label: 'Generating motion heatmap…' },
  { threshold: 92, label: 'Generating AI summary…' },
  { threshold: 98, label: 'Finalising session…' },
];

function getPhaseLabel(pct) {
  let label = PHASES[0].label;
  for (const p of PHASES) {
    if (pct >= p.threshold) label = p.label;
  }
  return label;
}

export default function Upload() {
  const [file, setFile]     = useState(null);
  const [form, setForm]     = useState({ hallName: '', examName: '', date: '', cameraId: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  // Re-attach to any active background task when navigating back to /upload
  useEffect(() => {
    const raw = localStorage.getItem('drishti_active_task');
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      if (!stored?.taskId) return;

      setLoading(true);
      setProgress(stored.progress || 15);
      setCurrentStage(stored.stage || 'Processing video in background…');
      if (stored.form) setForm(stored.form);

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/task/${stored.taskId}`);
          if (!res.ok) return;
          const task = await res.json();

          if (task.state === 'PROCESSING' || task.state === 'STARTED') {
            if (task.progress !== undefined) {
              setProgress(task.progress);
              setCurrentStage(task.stage || 'Processing video...');
            }
          } else if (task.state === 'SUCCESS') {
            clearInterval(pollInterval);
            setProgress(100);
            setCurrentStage('Analysis Completed!');
            localStorage.removeItem('drishti_active_task');
            storeLiveSessionData(task.video_id, task);
            await new Promise(r => setTimeout(r, 600));
            navigate(`/session/${task.video_id}`);
          } else if (task.state === 'FAILURE') {
            clearInterval(pollInterval);
            setError(task.error || 'Background video analysis failed');
            setLoading(false);
            localStorage.removeItem('drishti_active_task');
          }
        } catch {
          // ignore transient poll error
        }
      }, 1000);

      return () => clearInterval(pollInterval);
    } catch {
      // ignore
    }
  }, [navigate]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a video file.'); return; }
    setError(null);
    setLoading(true);
    setProgress(0);
    setCurrentStage('Uploading video to background queue…');

    try {
      const result = await uploadAndAnalyze(
        file,
        form,
        (pct, stage) => {
          setProgress(pct);
          if (stage) setCurrentStage(stage);
        },
      );

      // Store session + events for SessionReview to pick up
      storeLiveSessionData(result.session.id, result);
      localStorage.removeItem('drishti_active_task');

      setProgress(100);
      setCurrentStage('Completed!');
      await new Promise(r => setTimeout(r, 500));
      navigate(`/session/${result.session.id}`);

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setLoading(false);
      setProgress(0);
      localStorage.removeItem('drishti_active_task');
    }
  };

  const isValid = form.hallName && form.examName && form.date && file;

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-5">
          <h1 className="text-base font-bold tracking-tight text-[#26323D]">Upload Recording for Analysis</h1>
          <p className="text-xs text-[#6B7785] mt-0.5">Submit surveillance footage for automated YOLO object &amp; motion event detection</p>
        </div>

        <form id="upload-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div className="panel p-4">
            <span className="text-[10px] font-bold text-[#6D8196] uppercase tracking-widest mb-2.5 block">Video Footage</span>
            <UploadDropzone onFileSelected={setFile} />
            {file && (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-[#26323D] bg-[#F1F5F9] p-2 rounded border border-[#D9E0E6]">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span className="truncate font-semibold">{file.name}</span>
                <span className="text-[#6B7785] ml-auto flex-shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            )}
          </div>

          {/* Session metadata */}
          <div className="panel p-4 space-y-3">
            <span className="text-[10px] font-bold text-[#6D8196] uppercase tracking-widest block">Session Metadata</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="hall-name" className="label text-[10px]">
                  <Building2 size={11} className="inline mr-1 text-[#6B7785]" />Hall / Room Name
                </label>
                <input
                  id="hall-name" name="hallName" type="text"
                  placeholder="e.g. Exam Hall A" value={form.hallName}
                  onChange={handleChange} className="input-field text-xs h-8" required
                />
              </div>
              <div>
                <label htmlFor="exam-name" className="label text-[10px]">
                  <BookOpen size={11} className="inline mr-1 text-[#6B7785]" />Exam / Course Name
                </label>
                <input
                  id="exam-name" name="examName" type="text"
                  placeholder="e.g. Semester 5 - DBMS" value={form.examName}
                  onChange={handleChange} className="input-field text-xs h-8" required
                />
              </div>
              <div>
                <label htmlFor="exam-date" className="label text-[10px]">
                  <CalendarDays size={11} className="inline mr-1 text-[#6B7785]" />Date of Session
                </label>
                <input
                  id="exam-date" name="date" type="date"
                  value={form.date} onChange={handleChange}
                  className="input-field text-xs h-8 text-[#26323D]" required
                />
              </div>
              <div>
                <label htmlFor="camera-id" className="label text-[10px]">
                  <Camera size={11} className="inline mr-1 text-[#6B7785]" />Camera ID
                  <span className="text-[#A9B7C5] ml-1">(optional)</span>
                </label>
                <input
                  id="camera-id" name="cameraId" type="text"
                  placeholder="CAM-01" value={form.cameraId}
                  onChange={handleChange} className="input-field text-xs h-8 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Progress bar — visible while uploading/processing */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="panel p-4 overflow-hidden space-y-2.5 border-[#6D8196] bg-white shadow-xs"
              >
                <div className="flex justify-between text-xs text-[#6B7785]">
                  <span className="animate-pulse font-mono text-[#26323D] font-semibold">{currentStage || getPhaseLabel(progress)}</span>
                  <span className="font-mono font-bold text-[#26323D]">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#26323D]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {['Upload', 'YOLO & Motion', 'Cluster', 'Heatmap', 'AI Summary'].map((step, i) => {
                    const thresholds = [0, 15, 75, 85, 92];
                    const done   = progress >= (thresholds[i + 1] ?? 100);
                    const active = progress >= thresholds[i] && !done;
                    return (
                      <span key={step} className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all
                        ${done   ? 'border-emerald-200 text-emerald-700 bg-emerald-50 font-bold'
                        : active ? 'border-[#26323D] text-[#26323D] bg-[#F1F5F9] font-bold animate-pulse'
                                 : 'border-[#D9E0E6] text-[#A9B7C5] bg-[#FAFAFA]'}`}>
                        {step}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium"
              >
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            id="submit-upload"
            disabled={loading || !isValid}
            className="btn-primary w-full justify-center py-2 text-xs font-bold disabled:opacity-40"
          >
            {loading ? (
              <><UploadIcon size={13} className="animate-pulse" /><span>Processing Inference Pipeline…</span></>
            ) : (
              <><span>Submit for Forensic Analysis</span><ArrowRight size={13} /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
