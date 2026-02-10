
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole, BrandConfig, Outlet } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    resetOutletData, resetGlobalData,
    currentUser, outlets, brandConfig, updateBrandConfig,
    exportTableToCSV, exportSystemBackup, importSystemBackup,
    cloudConfig, updateCloudConfig, exportDatabaseSQL,
    externalDbConfig, updateExternalDbConfig
  } = useApp();
  
  const [targetOutletId, setTargetOutletId] = useState('');
  const [outletToWipe, setOutletToWipe] = useState<Outlet | null>(null);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const [tempBrand, setTempBrand] = useState<BrandConfig>({ 
    ...brandConfig, 
    primaryColor: brandConfig.primaryColor || '#f97316' 
  });

  const [tempCloudUrl, setTempCloudUrl] = useState(cloudConfig.url);
  const [tempCloudKey, setTempCloudKey] = useState(cloudConfig.key);

  // External DB Local State
  const [extDb, setExtDb] = useState({...externalDbConfig});

  useEffect(() => { 
    setTempBrand({ 
      ...brandConfig, 
      primaryColor: brandConfig.primaryColor || '#f97316' 
    }); 
  }, [brandConfig.name, brandConfig.tagline, brandConfig.logoUrl, brandConfig.primaryColor]);

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (currentUser?.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner">🚫</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Akses Terkunci</h3>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Khusus Owner</p>
      </div>
    );
  }

  const handleSaveBrand = async () => {
    if (isProcessing) return;
    if (!tempBrand.name.trim()) return setToast({ message: "Nama bisnis wajib diisi!", type: "error" });
    
    setIsProcessing(true);
    try {
      await updateBrandConfig(tempBrand);
      setToast({ message: "BRANDING DIPERBARUI! ✨", type: 'success' });
    } catch (e) {
      setToast({ message: "Gagal menyimpan branding. Pastikan koneksi DB aktif.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCloud = () => {
    if (!tempCloudUrl || !tempCloudKey) return setToast({ message: "URL dan Key wajib diisi!", type: 'error' });
    updateCloudConfig(tempCloudUrl, tempCloudKey);
    setToast({ message: "KONEKSI CLOUD DIPERBARUI! ⚡", type: 'success' });
  };

  const handleUpdateExternalDb = () => {
    updateExternalDbConfig({...extDb, status: 'CONFIGURED'});
    setToast({ message: "KONFIGURASI SERVER DISIMPAN! 🛠️", type: 'success' });
  };

  const handleGlobalWipe = async () => {
     setIsProcessing(true);
     await resetGlobalData();
     setIsProcessing(false);
     setShowGlobalResetConfirm(false);
     setToast({ message: "DATA GLOBAL DIBERSIHKAN!", type: 'success' });
  };

  const handleBranchWipe = async () => {
     if (!outletToWipe) return;
     setIsProcessing(true);
     await resetOutletData(outletToWipe.id);
     setIsProcessing(false);
     setOutletToWipe(null);
     setToast({ message: `WIPE CABANG ${outletToWipe.name} BERHASIL!`, type: 'success' });
  };

  const handleExportBackup = async () => {
    setIsProcessing(true);
    try {
      await exportSystemBackup();
      setToast({ message: "BACKUP BERHASIL!", type: 'success' });
    } catch (e) {
      setToast({ message: "Gagal backup.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("RESTORE DATA: Semua data cloud saat ini akan ditimpa. Lanjutkan?")) {
      e.target.value = '';
      return;
    }
    setIsProcessing(true);
    setRestoreProgress('Menyinkronkan Cloud...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const jsonString = event.target?.result as string;
      const result = await importSystemBackup(jsonString);
      if (result.success) setToast({ message: result.message, type: 'success' });
      else setToast({ message: result.message, type: 'error' });
      setIsProcessing(false);
      setRestoreProgress('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 relative">
      {/* TOAST NOTIFICATION */}
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-sm:px-4 px-4">
           <div className={`px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-rose-600 border-rose-400 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'success' ? '✅' : '❌'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Maintenance Notif</p>
                <p className="text-[11px] font-bold opacity-95 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      {/* COMPACT HEADER */}
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Maintenance Center</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Infrastruktur & Kontrol Aset</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[8px] font-black uppercase tracking-widest">Enterprise Core Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto">
        
        {/* CARD 1: IDENTITY & BRANDING (RESTORED COLOR PICKER) */}
        <div className="bg-white p-5 md:p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col lg:col-span-2">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-lg">🎨</div>
                 <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Business Identity</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Personalize your brand experience</p>
                 </div>
              </div>
              <button onClick={handleSaveBrand} disabled={isProcessing} className="px-8 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-slate-200">Save Identity 🚀</button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bisnis</label>
                 <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-[11px] text-slate-900 outline-none focus:border-orange-500 shadow-inner" value={tempBrand.name} onChange={e => setTempBrand({...tempBrand, name: e.target.value})} placeholder="Mozza Boy" />
              </div>
              
              <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tagline Bisnis</label>
                 <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-[11px] text-slate-900 outline-none focus:border-orange-500 shadow-inner" value={tempBrand.tagline} onChange={e => setTempBrand({...tempBrand, tagline: e.target.value})} placeholder="Premium Korean Street Food" />
              </div>

              <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Warna Utama (Theme)</label>
                 <div className="flex gap-2">
                    <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                       <input 
                          type="color" 
                          className="w-[150%] h-[150%] -m-[25%] cursor-pointer border-0 p-0" 
                          value={tempBrand.primaryColor} 
                          onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} 
                       />
                    </div>
                    <input 
                       type="text" 
                       className="flex-1 p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[11px] text-slate-900 outline-none focus:border-orange-500 shadow-inner uppercase" 
                       value={tempBrand.primaryColor} 
                       onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} 
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo URL (Icon)</label>
                 <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-medium text-[10px] text-slate-600 outline-none focus:border-orange-500 shadow-inner" value={tempBrand.logoUrl} onChange={e => setTempBrand({...tempBrand, logoUrl: e.target.value})} placeholder="https://link-to-your-logo.png" />
              </div>
           </div>
        </div>

        {/* CARD 2: EXTERNAL DATABASE SERVER CONFIGURATION */}
        <div className="bg-white p-5 md:p-6 rounded-[32px] border border-slate-100 shadow-sm lg:row-span-2">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg">🗄️</div>
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">External DB Gateway</h3>
              </div>
              <div className="flex items-center gap-2">
                 <div className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest ${extDb.status === 'CONFIGURED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {extDb.status === 'CONFIGURED' ? 'Ready' : 'Off'}
                 </div>
                 <button onClick={handleUpdateExternalDb} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase active:scale-95 shadow-lg shadow-indigo-100">Sync ⚙️</button>
              </div>
           </div>
           
           <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                 <label className="text-[8px] font-black text-indigo-600 uppercase mb-1.5 block ml-1">API Bridge Gateway URL (HTTP/HTTPS)</label>
                 <input type="text" className="w-full p-3 bg-white border border-indigo-200 rounded-xl font-mono text-[10px] text-slate-900 outline-none focus:border-indigo-500 shadow-inner" value={extDb.gatewayUrl} onChange={e => setExtDb({...extDb, gatewayUrl: e.target.value})} placeholder="Contoh: http://192.168.1.100:3000" />
                 <p className="text-[7px] text-indigo-400 mt-2 font-medium italic">*Input URL server jembatan Bapak agar PWA bisa menulis data ke Postgres.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">Host</label>
                    <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] text-slate-900 outline-none focus:border-indigo-500" value={extDb.host} onChange={e => setExtDb({...extDb, host: e.target.value})} placeholder="localhost" />
                 </div>
                 <div>
                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">Port</label>
                    <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] text-slate-900 outline-none focus:border-indigo-500" value={extDb.port} onChange={e => setExtDb({...extDb, port: e.target.value})} placeholder="5432" />
                 </div>
                 <div>
                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">User</label>
                    <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] text-slate-900 outline-none focus:border-indigo-500" value={extDb.user} onChange={e => setExtDb({...extDb, user: e.target.value})} placeholder="postgres" />
                 </div>
                 <div>
                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">Password</label>
                    <input type="password" title={extDb.password} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] text-slate-900 outline-none focus:border-indigo-500" value={extDb.password} onChange={e => setExtDb({...extDb, password: e.target.value})} placeholder="••••••••" />
                 </div>
              </div>
           </div>
        </div>

        {/* CARD 3: CLOUD SYNC CONFIG */}
        <div className="bg-slate-900 p-5 md:p-6 rounded-[32px] text-white shadow-xl flex flex-col">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-white/10 text-white rounded-xl flex items-center justify-center text-lg">☁️</div>
                 <h3 className="text-xs font-black uppercase tracking-tight">Active Cloud (Supabase)</h3>
              </div>
              <button onClick={handleUpdateCloud} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[8px] uppercase active:scale-95 shadow-lg shadow-indigo-900">Update Link ⚡</button>
           </div>
           <div className="space-y-3">
              <div>
                 <label className="text-[7px] font-black text-slate-500 uppercase mb-1 block ml-1">Project Endpoint</label>
                 <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px] text-white outline-none" value={tempCloudUrl} onChange={e => setTempCloudUrl(e.target.value)} />
              </div>
              <div>
                 <label className="text-[7px] font-black text-slate-500 uppercase mb-1 block ml-1">Anon Key (Public)</label>
                 <input type="password" title={tempCloudKey} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px] text-white outline-none" value={tempCloudKey} onChange={e => setTempCloudKey(e.target.value)} />
              </div>
           </div>
        </div>

        {/* CARD 4: EXPORT RAMPING */}
        <div className="bg-white p-5 md:p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg">📄</div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Data Integrity Export</h3>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'products', label: 'Produk', icon: '📜' },
                { id: 'inventory', label: 'Gudang', icon: '📦' },
                { id: 'staff', label: 'Crew', icon: '👥' },
                { id: 'outlets', label: 'Cabang', icon: '🏢' },
                { id: 'recipes', label: 'BOM', icon: '🧪' },
                { id: 'categories', label: 'Cat', icon: '🏷️' }
              ].map(item => (
                <button key={item.id} onClick={() => exportTableToCSV(item.id)} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-400 transition-all text-left group">
                   <span className="text-sm group-hover:scale-110 transition-transform">{item.icon}</span>
                   <span className="text-[8px] font-black uppercase text-slate-800 tracking-tighter">{item.label}</span>
                </button>
              ))}
           </div>
        </div>

        {/* CARD 5: DISASTER RECOVERY (JSON & SQL) */}
        <div className="bg-emerald-600 p-5 md:p-6 rounded-[32px] text-white shadow-xl flex flex-col">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-white/20 text-white rounded-xl flex items-center justify-center text-lg">💾</div>
              <h3 className="text-xs font-black uppercase tracking-tight">System Backup Protocol</h3>
           </div>
           <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={handleExportBackup} disabled={isProcessing} className="flex-1 py-3 bg-white text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg">Download JSON</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1 py-3 bg-emerald-700 text-white border border-emerald-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-800 transition-all">Restore Cloud</button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestoreFile} />
              </div>
              <button 
                onClick={exportDatabaseSQL}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                <span>🗄️</span> Export SQL Migration Dump
              </button>
           </div>
        </div>

        {/* CARD 6: WIPE PROTOCOL */}
        <div className="bg-white p-5 md:p-6 rounded-[32px] border border-rose-50 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center text-lg">⚠️</div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Reset Branch Activity</h3>
           </div>
           <div className="flex gap-2">
              <select className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-[10px] outline-none text-slate-900" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                 <option value="">-- PILIH CABANG --</option>
                 {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button 
                disabled={!targetOutletId || isProcessing}
                onClick={() => { const o = outlets.find(x => x.id === targetOutletId); if(o) setOutletToWipe(o); }}
                className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase active:scale-95 disabled:opacity-30"
              >
                WIPE 🗑️
              </button>
           </div>
        </div>

        {/* CARD 7: GLOBAL PURGE */}
        <div className="bg-rose-600 p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden flex items-center justify-between lg:col-span-2">
           <div className="relative z-10">
              <h4 className="text-[11px] font-black uppercase tracking-tighter">Emergency Global Reset</h4>
              <p className="text-[8px] font-black text-rose-200 uppercase mt-1 opacity-80">Menghapus seluruh log transaksi & absensi di SEMUA cabang secara permanen.</p>
           </div>
           <button 
              disabled={isProcessing}
              onClick={() => setShowGlobalResetConfirm(true)}
              className="relative z-10 px-8 py-4 bg-white text-rose-600 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 shadow-xl"
           >
              PURGE SYSTEM 💣
           </button>
           <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl">💀</div>
        </div>

      </div>

      {/* CONFIRMATION MODALS */}
      {outletToWipe && (
        <div className="fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-sm:p-8 p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-18 h-18 bg-rose-50 text-rose-500 rounded-[28px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-2 tracking-tighter">Wipe Cabang?</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Hapus total log data <span className="text-rose-600 font-black">"{outletToWipe.name}"</span>. Master menu aman.
              </p>
              <div className="flex flex-col gap-2">
                 <button onClick={handleBranchWipe} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all">IYA, HAPUS SEMUA 🗑️</button>
                 <button onClick={() => setOutletToWipe(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batal</button>
              </div>
           </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[600] bg-red-950/90 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-600 text-white rounded-[32px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl animate-pulse">💣</div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-4 tracking-tighter">GLOBAL PURGE!</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-10 px-4 leading-relaxed">
                 Tindakan ini akan menghapus <span className="text-red-600 font-black">SELURUH TRANSAKSI & ABSENSI</span> di semua cabang.
              </p>
              <div className="flex flex-col gap-2">
                 <button onClick={handleGlobalWipe} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95">YA, RESET GLOBAL 🚀</button>
                 <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest leading-none">Batalkan</button>
              </div>
           </div>
        </div>
      )}

      {isProcessing && restoreProgress && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-10">
           <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <h3 className="text-sm font-black uppercase tracking-widest">{restoreProgress}</h3>
        </div>
      )}
    </div>
  );
};
