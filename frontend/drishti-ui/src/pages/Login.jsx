import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, ArrowRight, Lock, Mail } from 'lucide-react';
import useAppStore from '../store/useAppStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your credentials.'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // mock latency
    login(email, password);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#26323D 1px, transparent 1px), linear-gradient(90deg, #26323D 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#26323D] flex items-center justify-center mb-3 text-white shadow-md">
            <Eye size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26323D] mb-0.5">DEXIT</h1>
          <p className="text-xs text-[#6B7785] text-center leading-snug font-medium">
            Video Forensics &amp; Investigation Platform
          </p>
        </div>

        {/* Card */}
        <div className="panel px-6 py-6 shadow-sm border-[#D9E0E6] bg-white">
          <p className="text-xs text-[#52677D] mb-5 text-center font-semibold uppercase tracking-wider">Sign In to Console</p>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label text-[10px]">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9B7C5]" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="investigator@institution.edu"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="label text-[10px]">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9B7C5]" />
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-8 text-xs"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-60 font-bold"
            >
              {loading ? 'Authenticating…' : (
                <><span>Sign In</span><ArrowRight size={14} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#A9B7C5] mt-6 font-mono">
          InvigEye · Institutional Video Intelligence
        </p>
      </motion.div>
    </div>
  );
}
