import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Activity, Scissors, FileText, CheckCircle2 } from 'lucide-react';

const STAGES = [
  { key: 'extracting',        label: 'Extracting frames',  icon: Film },
  { key: 'motion_estimation', label: 'Motion estimation',  icon: Activity },
  { key: 'segmenting',        label: 'Segmenting events',  icon: Scissors },
  { key: 'generating',        label: 'Generating report',  icon: FileText },
];

export default function Processing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [percent, setPercent] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPercent(prev => {
        const next = prev + 1.2;
        if (next >= 100) {
          clearInterval(intervalRef.current);
          setTimeout(() => navigate(`/session/${id}`), 800);
          return 100;
        }
        setStageIndex(Math.min(3, Math.floor((next / 100) * 4)));
        return next;
      });
    }, 80);
    return () => clearInterval(intervalRef.current);
  }, [id, navigate]);

  const currentStage = STAGES[stageIndex];

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Activity size={20} className="text-accent animate-pulse" />
          </div>
          <h1 className="text-lg font-semibold text-white/95 mb-1">Analysing Footage</h1>
          <p className="text-sm text-white/40">Session ID: <span className="font-mono text-white/50">{id}</span></p>
        </div>

        {/* Progress */}
        <div className="panel px-5 py-5 mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>{currentStage.label}…</span>
            <span className="font-mono">{Math.round(percent)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden mb-5">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Stage steps */}
          <div className="space-y-2.5">
            {STAGES.map((stage, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all
                    ${done ? 'bg-status-completed/20 border border-status-completed/30'
                           : active ? 'bg-accent/15 border border-accent/30'
                           : 'bg-white/[0.04] border border-white/[0.08]'}`}>
                    {done
                      ? <CheckCircle2 size={12} className="text-status-completed" />
                      : <Icon size={12} className={active ? 'text-accent animate-pulse' : 'text-white/25'} />
                    }
                  </div>
                  <span className={`text-xs transition-colors ${done ? 'text-white/50 line-through' : active ? 'text-white/80' : 'text-white/30'}`}>
                    {stage.label}
                  </span>
                  {active && (
                    <span className="ml-auto text-[10px] text-accent/70 font-mono animate-pulse">running</span>
                  )}
                  {done && (
                    <span className="ml-auto text-[10px] text-status-completed/60 font-mono">done</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-white/25">
          {percent < 100
            ? 'This may take a few minutes. You can leave and return later.'
            : 'Analysis complete — redirecting to review…'}
        </p>
      </motion.div>
    </div>
  );
}
