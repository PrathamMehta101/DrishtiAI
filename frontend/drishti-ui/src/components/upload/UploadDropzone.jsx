import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Film, X } from 'lucide-react';

export default function UploadDropzone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    onFileSelected?.(f);
  }, [onFileSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('video/')) handleFile(f);
  }, [handleFile]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div>
      <motion.label
        htmlFor="video-upload"
        animate={isDragging
          ? { borderColor: '#6D8196', backgroundColor: '#F1F5F9' }
          : { borderColor: '#D9E0E6', backgroundColor: '#F8FAFC' }
        }
        transition={{ duration: 0.15 }}
        className="relative flex flex-col items-center justify-center w-full h-44 rounded-lg
                   border-2 border-dashed cursor-pointer group transition-all duration-200"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          id="video-upload"
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={handleInputChange}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#D9E0E6] flex items-center justify-center text-[#26323D]">
              <Film size={18} />
            </div>
            <p className="text-sm text-[#26323D] font-bold">{file.name}</p>
            <p className="text-xs text-[#6B7785] font-mono">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="w-10 h-10 rounded-lg bg-white border border-[#D9E0E6] flex items-center justify-center shadow-xs"
            >
              <UploadCloud size={18} className="text-[#52677D] group-hover:text-[#26323D] transition-colors" />
            </motion.div>
            <div className="text-center">
              <p className="text-xs text-[#52677D] group-hover:text-[#26323D] transition-colors font-medium">
                Drag &amp; drop video footage, or{' '}
                <span className="text-[#26323D] font-bold underline">browse files</span>
              </p>
              <p className="text-[10px] text-[#A9B7C5] mt-1 font-mono">MP4, MOV, AVI up to 4 GB</p>
            </div>
          </div>
        )}
      </motion.label>

      {file && (
        <button
          onClick={() => { setFile(null); onFileSelected?.(null); }}
          className="mt-2 btn-ghost text-xs text-[#6B7785] hover:text-[#26323D]"
        >
          <X size={12} /> Remove file
        </button>
      )}
    </div>
  );
}
