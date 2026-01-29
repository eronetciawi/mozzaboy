
import React, { useState } from 'react';
import { useApp } from '../store';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.success) {
      setError(result.message || 'Kredensial tidak valid. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
          <div className="p-8 pb-4 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-6 shadow-lg shadow-orange-500/20">
              M
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Mozza Boy
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Fast Food Smart System
            </p>
          </div>

          <div className="px-8 pb-10">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-bold text-center mb-6 border border-red-100 animate-pulse">
                {error}
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
                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300 placeholder:font-normal"
                    placeholder="Masukkan username"
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
                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300 placeholder:font-normal"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white font-black text-[11px] rounded-xl shadow-xl shadow-slate-900/10 hover:bg-orange-600 hover:shadow-orange-500/20 transition-all transform active:scale-[0.98] uppercase tracking-[0.2em]"
                >
                  Masuk ke Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Food Operating System By Qinoi
          </p>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-slate-800"></span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">FOS V0.1 dibuat sambi ngopi</span>
            <span className="h-px w-8 bg-slate-800"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
