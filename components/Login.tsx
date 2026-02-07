
import React, { useState } from 'react';
import { useApp } from '../store';

export const Login: React.FC = () => {
  const { login, brandConfig } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandConfig.primaryColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100">
          <div className="p-10 pb-4 text-center">
            {brandConfig.logoUrl ? (
              <img src={brandConfig.logoUrl} className="w-24 h-24 object-contain mx-auto mb-6" alt="Brand Logo" />
            ) : (
              <div className="w-24 h-24 rounded-[32px] flex items-center justify-center text-white font-black text-5xl mx-auto mb-6 shadow-2xl transform -rotate-3 animate-in zoom-in duration-700 select-none" style={{ backgroundColor: brandConfig.primaryColor, boxShadow: `0 20px 40px ${brandConfig.primaryColor}33` }}>
                {brandConfig.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {brandConfig.name}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              {brandConfig.tagline}
            </p>
          </div>

          <div className="px-10 pb-10">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-bold text-center mb-6 border border-red-100 animate-in shake">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-sm">👤</span>
                  <input 
                    type="text" 
                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300"
                    style={{ '--tw-ring-color': `${brandConfig.primaryColor}1a` } as any}
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-sm">🔑</span>
                  <input 
                    type="password" 
                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300"
                    style={{ '--tw-ring-color': `${brandConfig.primaryColor}1a` } as any}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 text-white font-black text-[11px] rounded-xl shadow-xl transition-all transform active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                  style={{ backgroundColor: brandConfig.primaryColor, boxShadow: `0 10px 20px ${brandConfig.primaryColor}33` }}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : 'Login to Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Enterprise Cloud Operating System
          </p>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-slate-800"></span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Verified Mozza Boy Integrity ✓</span>
            <span className="h-px w-8 bg-slate-800"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
