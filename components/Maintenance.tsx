import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    exportData, importData, resetOutletData, resetGlobalData, 
    currentUser, outlets, supabaseConfig, updateSupabaseConfig, 
    isCloudConnected, syncToCloud 
  } = useApp();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  
  // Supabase Form State
  const [localSbUrl, setLocalSbUrl] = useState(supabaseConfig.url);
  const [localSbKey, setLocalSbKey] = useState(supabaseConfig.key);

  const selectedOutlet = outlets.find(o => o.id === targetOutletId);

  if (currentUser?.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🚫</div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Akses Ditolak</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Hanya Pemilik (Owner) yang dapat mengakses fitur Maintenance Sistem.</p>
      </div>
    );
  }

  const handleSaveCloud = () => {
    updateSupabaseConfig({
      url: localSbUrl,
      key: localSbKey,
      isEnabled: !!localSbUrl && !!localSbKey
    });
    alert("Konfigurasi Cloud diperbarui. Sistem akan mencoba menyambung ulang.");
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="max-w-6xl mx-auto pb-20">
        <div className="mb-10">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Infrastructure Management</h2>
          <p className="text-slate-500 font-medium text-xs italic">Kelola sinkronisasi cloud Supabase dan pembersihan data audit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SUPABASE CLOUD CONNECTOR */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-8">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isCloudConnected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                     {isCloudConnected ? '☁️' : '🔌'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Supabase Cloud Connector</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <div className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isCloudConnected ? 'Connected & Live Sync' : 'Standalone Mode'}</p>
                    </div>
                  </div>
               </div>
               {isCloudConnected && (
                 <button 
                  onClick={syncToCloud}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                 >Sync Force 🚀</button>
               )}
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">
               Hubungkan aplikasi POS Anda ke database Supabase untuk mengaktifkan sinkronisasi lintas perangkat (Owner di rumah, Kasir di toko). 
               Pastikan tabel <b>transactions</b>, <b>inventory</b>, dan <b>staff</b> sudah tersedia di Supabase Anda.
            </p>

            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase Project URL</label>
                     <input 
                        type="text" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-indigo-500 outline-none transition-all"
                        placeholder="https://xyz.supabase.co"
                        value={localSbUrl}
                        onChange={e => setLocalSbUrl(e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase Anon Key (API Key)</label>
                     <input 
                        type="password" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-indigo-500 outline-none transition-all"
                        placeholder="eyJhbGci..."
                        value={localSbKey}
                        onChange={e => setLocalSbKey(e.target.value)}
                     />
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={handleSaveCloud}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
                  >
                    Simpan & Hubungkan Cloud
                  </button>
                  {supabaseConfig.isEnabled && (
                    <button 
                      onClick={() => updateSupabaseConfig({ ...supabaseConfig, isEnabled: false })}
                      className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase border border-red-100"
                    >Putuskan</button>
                  )}
               </div>
            </div>
          </div>

          {/* BACKUP & RESTORE */}
          <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm flex flex-col">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner">💾</div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Offline Backup</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10">
              Amankan data secara manual jika Anda tidak menggunakan Cloud.
            </p>
            <div className="space-y-4 mt-auto">
              <button onClick={exportData} className="w-full py-4 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest">Unduh .json</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase">Upload Backup</button>
              <input type="file" ref={fileInputRef} onChange={e => {
                const reader = new FileReader();
                reader.onload = (ev) => { if (importData(ev.target?.result as string)) alert("Restore Sukses!"); };
                if (e.target.files?.[0]) reader.readAsText(e.target.files[0]);
              }} className="hidden" accept=".json" />
            </div>
          </div>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-4xl">🧹</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Pembersihan Data Cabang</h3>
              <p className="text-xs text-slate-400 font-medium mb-8">Hapus log transaksi coba-coba di satu cabang saja.</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                 <select className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-xs outline-none" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                    <option value="">-- Pilih Cabang --</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                 </select>
              </div>

              <button disabled={!targetOutletId} onClick={() => setShowOutletResetConfirm(true)} className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${!targetOutletId ? 'bg-slate-100 text-slate-300' : 'bg-orange-500 text-white shadow-xl'}`}>
                 Hapus Data {selectedOutlet?.name || ''}
              </button>
           </div>

           <div className="bg-red-50 p-10 rounded-[48px] border-2 border-red-100 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-red-600 text-4xl">🚨</div>
              <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter mb-2">Factory Global Reset</h3>
              <p className="text-xs text-red-800/60 font-medium mb-10">Hapus seluruh isi database Mozza Boy (Semua Cabang).</p>
              <button onClick={() => setShowGlobalResetConfirm(true)} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-red-600/20">Wipe All Database</button>
           </div>
        </div>
      </div>

      {/* CONFIRMATION MODALS (REUSED) */}
      {showOutletResetConfirm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-12 shadow-2xl text-center">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Konfirmasi Pembersihan</h3>
            <p className="text-slate-500 text-sm mt-6 mb-10 leading-relaxed">Anda akan menghapus permanen data di cabang <b>{selectedOutlet?.name}</b>. Data Master dan cabang lain aman.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { resetOutletData(targetOutletId); setShowOutletResetConfirm(false); setTargetOutletId(''); alert('Dibersihkan!'); }} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">YA, BERSIHKAN</button>
              <button onClick={() => setShowOutletResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-xs">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[200] bg-red-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-12 shadow-2xl text-center">
            <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter">HAPUS TOTAL?</h3>
            <p className="text-slate-500 text-sm mt-8 mb-10">Seluruh data semua cabang akan hilang selamanya.</p>
            <div className="flex flex-col gap-3">
               <button onClick={resetGlobalData} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">IYA, HAPUS SEMUANYA</button>
               <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-xs">JANGAN HAPUS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};