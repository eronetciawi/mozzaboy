
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
  
  const [outletToWipe, setOutletToWipe] = useState<Outlet | null>(null);
  const [selectedOutletIdForWipe, setSelectedOutletIdForWipe] = useState<string>("");
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Temp states
  const [tempBrand, setTempBrand] = useState<BrandConfig>({...brandConfig});
  const [tempCloudUrl, setTempCloudUrl] = useState(cloudConfig.url);
  const [tempCloudKey, setTempCloudKey] = useState(cloudConfig.key);
  const [tempDbConfig, setTempDbConfig] = useState({...externalDbConfig});

  useEffect(() => { setTempBrand({...brandConfig}); }, [brandConfig]);
  useEffect(() => { setTempCloudUrl(cloudConfig.url); setTempCloudKey(cloudConfig.key); }, [cloudConfig]);
  useEffect(() => { setTempDbConfig({...externalDbConfig}); }, [externalDbConfig]);

  // Logic untuk cek koneksi database secara berkala
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${cloudConfig.url}/rest/v1/brand_config?select=id`, {
          headers: {
            'apikey': cloudConfig.key,
            'Authorization': `Bearer ${cloudConfig.key}`
          }
        });
        if (response.ok) setDbStatus('ONLINE');
        else setDbStatus('OFFLINE');
      } catch (e) {
        setDbStatus('OFFLINE');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); 
    return () => clearInterval(interval);
  }, [cloudConfig]);

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
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Akses Khusus Owner</h3>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Izin diperlukan untuk mengakses infrastruktur inti.</p>
      </div>
    );
  }

  const handleSaveBrand = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await updateBrandConfig(tempBrand);
      setToast({ message: "Konfigurasi Brand Sinkron! ✨", type: 'success' });
    } finally { setIsProcessing(false); }
  };

  const handleUpdateCloud = () => {
    if (!tempCloudUrl.trim() || !tempCloudKey.trim()) return alert("URL/Key Kosong!");
    if (confirm("GANTI DATABASE UTAMA: Sesi Anda akan terputus dan aplikasi memuat ulang. Lanjutkan?")) {
       updateCloudConfig(tempCloudUrl, tempCloudKey);
    }
  };

  const handleSaveSelfHosted = () => {
     updateExternalDbConfig(tempDbConfig);
     setToast({ message: "Self-Hosted Engine Disimpan!", type: 'success' });
  };

  const prepareOutletWipe = () => {
    const target = outlets.find(o => o.id === selectedOutletIdForWipe);
    if (target) {
      setOutletToWipe(target);
    }
  };

  const handleOutletWipe = async () => {
    if (!outletToWipe) return;
    setIsProcessing(true);
    try {
       await resetOutletData(outletToWipe.id);
       setToast({ message: `Cabang ${outletToWipe.name} BERHASIL DIBERSIHKAN! 🧹`, type: 'success' });
       setOutletToWipe(null);
       setSelectedOutletIdForWipe("");
    } finally { setIsProcessing(false); }
  };

  const handleGlobalWipe = async () => {
    setIsProcessing(true);
    try {
       await resetGlobalData();
       setToast({ message: "DATA TRANSAKSI GLOBAL BERHASIL DIHAPUS!", type: 'success' });
       setShowGlobalResetConfirm(false);
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar bg-[#f8fafc] pb-24 relative">
      {/* TOAST SYSTEM */}
      {toast.type && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full px-4 max-w-sm">
           <div className={`px-6 py-3 rounded-[24px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-rose-600 border-rose-400 text-white'
           }`}>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm shrink-0">
                {toast.type === 'success' ? '✅' : '❌'}
              </div>
              <p className="text-[10px] font-black uppercase leading-tight">{toast.message}</p>
           </div>
        </div>
      )}

      {/* COMPACT HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 text-sm">🛠️</div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">System Admin</h2>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Infrastructure & Database Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
           <div className={`w-2 h-2 rounded-full ${
             dbStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 
             dbStatus === 'OFFLINE' ? 'bg-rose-600' : 'bg-slate-300'
           }`}></div>
           <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase leading-none">DB STATUS</span>
              <span className={`text-[9px] font-black uppercase leading-none mt-1 ${
                dbStatus === 'ONLINE' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {dbStatus === 'ONLINE' ? 'CONNECTED' : dbStatus === 'OFFLINE' ? 'OFFLINE' : 'CHECKING'}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-w-7xl mx-auto">
        
        {/* BRAND IDENTITY - COMPACTED */}
        <div className="xl:col-span-12 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
           <div className="flex flex-col md:flex-row items-center justify-between mb-6 relative z-10 gap-4">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-lg flex items-center justify-center shrink-0">
                    {tempBrand.logoUrl ? (
                      <img src={tempBrand.logoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-slate-300">{tempBrand.name.charAt(0)}</span>
                    )}
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 leading-none">Branding Profile</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest leading-none">POS Identity Settings</p>
                 </div>
              </div>
              <button onClick={handleSaveBrand} className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95">
                Update Brand 🚀
              </button>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                 <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-[10px] outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" value={tempBrand.name} onChange={e => setTempBrand({...tempBrand, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Slogan</label>
                 <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-[10px] outline-none" value={tempBrand.tagline} onChange={e => setTempBrand({...tempBrand, tagline: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Theme Color</label>
                 <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <input type="color" className="w-8 h-6 rounded-lg cursor-pointer border-none" value={tempBrand.primaryColor} onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} />
                    <span className="text-[9px] font-mono font-black uppercase text-slate-500">{tempBrand.primaryColor}</span>
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo URL</label>
                 <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[9px] outline-none" value={tempBrand.logoUrl} onChange={e => setTempBrand({...tempBrand, logoUrl: e.target.value})} placeholder="https://..." />
              </div>
           </div>
        </div>

        {/* CLOUD DB - COMPACT */}
        <div className="xl:col-span-6 bg-[#0f172a] p-5 rounded-[32px] text-white shadow-xl flex flex-col relative overflow-hidden">
           <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Enterprise Cloud Cluster</h3>
              <button onClick={handleUpdateCloud} className="px-4 py-1.5 bg-orange-600 text-white rounded-lg font-black text-[8px] uppercase active:scale-95 transition-all">Migrate Cluster ⚡</button>
           </div>
           <div className="grid grid-cols-1 gap-3 relative z-10">
              <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Endpoint (URL)</label>
                 <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px] text-orange-200 outline-none focus:bg-white/10" value={tempCloudUrl} onChange={e => setTempCloudUrl(e.target.value)} />
              </div>
              <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Secret Access Key</label>
                 <input type="password" title={tempCloudKey} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px] text-orange-200 outline-none focus:bg-white/10" value={tempCloudKey} onChange={e => setTempCloudKey(e.target.value)} />
              </div>
           </div>
        </div>

        {/* SELF-HOSTED DB - COMPACT */}
        <div className="xl:col-span-6 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Local / Hybrid Node</h3>
              <button onClick={handleSaveSelfHosted} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[8px] uppercase active:scale-95">Save Local 🛠️</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Gateway URL</label>
                 <input type="text" className="w-full p-2 bg-slate-50 border rounded-xl font-mono text-[9px]" value={tempDbConfig.gatewayUrl} onChange={e => setTempDbConfig({...tempDbConfig, gatewayUrl: e.target.value})} placeholder="http://192.168..." />
              </div>
              <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">User</label>
                 <input type="text" className="w-full p-2 bg-slate-50 border rounded-xl font-mono text-[9px]" value={tempDbConfig.user} onChange={e => setTempDbConfig({...tempDbConfig, user: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pass</label>
                 <input type="password" title={tempDbConfig.password} className="w-full p-2 bg-slate-50 border rounded-xl font-mono text-[9px]" value={tempDbConfig.password} onChange={e => setTempDbConfig({...tempDbConfig, password: e.target.value})} />
              </div>
           </div>
        </div>

        {/* DATA TOOLS - COMPACTED BUTTONS */}
        <div className="xl:col-span-12 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">📤</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Data Portability Tools</h3>
           </div>

           <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { id: 'products', label: 'Menu', color: 'bg-slate-900' },
                { id: 'inventory', label: 'Stok', color: 'bg-slate-900' },
                { id: 'staff', label: 'Staff', color: 'bg-slate-900' },
                { id: 'transactions', label: 'Sales', color: 'bg-indigo-600' },
                { id: 'expenses', label: 'Cost', color: 'bg-rose-600' },
                { id: 'json', label: 'Backup', color: 'bg-emerald-600', isSpecial: true }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => item.isSpecial ? exportSystemBackup() : exportTableToCSV(item.id)}
                  className={`${item.color} text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm`}
                >
                   <span className="text-[8px] font-black uppercase text-center leading-none">{item.label}</span>
                </button>
              ))}
           </div>

           <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={exportDatabaseSQL} className="py-3 bg-white border border-indigo-600 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2">🗄️ SQL DUMP</button>
              <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2">📦 RESTORE</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if(file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                       const res = await importSystemBackup(ev.target?.result as string);
                       if(res.success) alert(res.message);
                    };
                    reader.readAsText(file);
                 }
              }} />
           </div>
        </div>

        {/* NUCLEAR MANAGEMENT - REDESIGNED TO BE COMPACT SINGLE ROW */}
        <div className="xl:col-span-12 bg-rose-50 p-6 rounded-[40px] border border-rose-100 shadow-md relative overflow-hidden">
           <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 shrink-0">
                 <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">⚠️</div>
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-rose-600 leading-none">Security Protocol</h3>
                    <p className="text-[7px] font-bold text-rose-400 uppercase mt-1 tracking-widest">Permanent Data Removal</p>
                 </div>
              </div>
              
              <div className="flex flex-1 flex-col md:flex-row items-center gap-3 w-full">
                  <div className="flex flex-1 gap-2 w-full">
                      <select 
                        className="flex-1 p-3 bg-white border border-rose-100 rounded-xl font-black text-[10px] text-slate-800 outline-none"
                        value={selectedOutletIdForWipe}
                        onChange={e => setSelectedOutletIdForWipe(e.target.value)}
                      >
                         <option value="">SELECT BRANCH...</option>
                         {outlets.map(o => (
                           <option key={o.id} value={o.id}>{o.name.toUpperCase()}</option>
                         ))}
                      </select>
                      <button 
                        disabled={!selectedOutletIdForWipe || isProcessing}
                        onClick={prepareOutletWipe}
                        className="px-6 py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg disabled:opacity-30 active:scale-95 shrink-0"
                      >
                         🧹 WIPE BRANCH
                      </button>
                  </div>
                  <div className="h-px w-10 bg-rose-200 hidden lg:block shrink-0"></div>
                  <button 
                      disabled={isProcessing}
                      onClick={() => setShowGlobalResetConfirm(true)}
                      className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg active:scale-95 border-b-4 border-slate-700 shrink-0"
                  >
                     ☢️ GLOBAL PURGE
                  </button>
              </div>
           </div>
        </div>
      </div>

      {/* CONFIRMATION MODALS (STAYING CLEAN) */}
      {outletToWipe && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">☢️</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Nuclear Confirm</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed mb-8 px-4">
                 Wipe ALL operational records for <span className="text-red-600 font-black">"{outletToWipe.name}"</span>?
              </p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleOutletWipe} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">I AM SURE, EXECUTE</button>
                 <button onClick={() => setOutletToWipe(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">CANCEL</button>
              </div>
           </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-slate-900 rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl border-2 border-rose-600/20">
              <h3 className="text-lg font-black text-white uppercase mb-2">System Purge</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed mb-8">Wipe ALL records across ALL branches? Irreversible.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleGlobalWipe} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">EXECUTE GLOBAL RESET</button>
                 <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">CANCEL</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
