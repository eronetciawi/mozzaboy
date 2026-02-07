
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole, BrandConfig } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    resetOutletData, resetGlobalData, 
    currentUser, outlets, brandConfig, updateBrandConfig,
    exportTableToCSV, isDbConnected
  } = useApp();
  
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const [tempBrand, setTempBrand] = useState<BrandConfig>(brandConfig);

  useEffect(() => { setTempBrand(brandConfig); }, [brandConfig]);

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (currentUser?.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🚫</div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Akses Terkunci</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Hanya Owner yang dapat mengakses System Maintenance.</p>
      </div>
    );
  }

  const handleSaveBrand = async () => {
    setIsProcessing(true);
    try {
      await updateBrandConfig(tempBrand);
      setToast({ message: "IDENTITAS BISNIS DIPERBARUI!", type: 'success' });
    } catch (e) {
      setToast({ message: "Gagal menyimpan branding.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGlobalWipe = async () => {
     setIsProcessing(true);
     await resetGlobalData();
     setIsProcessing(false);
     setShowGlobalResetConfirm(false);
     setToast({ message: "SISTEM TELAH BERSIH!", type: 'success' });
  };

  const handleBranchWipe = async () => {
     setIsProcessing(true);
     await resetOutletData(targetOutletId);
     setIsProcessing(false);
     setShowOutletResetConfirm(false);
     setToast({ message: "DATA CABANG DIBERSIHKAN!", type: 'success' });
  };

  const ExportButton = ({ label, table }: { label: string; table: string }) => (
    <div className="flex gap-1">
      <button 
        onClick={() => exportTableToCSV(table)} 
        className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest text-left flex justify-between items-center group transition-all hover:bg-slate-900 hover:text-white"
      >
        <span>{label}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">↓ EXPORT</span>
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-40">
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⏳'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">System Audit</p>
                <p className="text-[11px] font-bold opacity-90 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">System Maintenance</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Infrastructure & Data Control</p>
        </div>

        {/* PERMANENT CLOUD STATUS */}
        <div className="bg-slate-900 p-8 md:p-12 rounded-[56px] shadow-2xl relative overflow-hidden text-white border border-white/5">
           <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-[32px] flex items-center justify-center text-4xl shadow-inner animate-pulse">
                    ⚡
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2">System Connectivity</p>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Enterprise Cloud Engine: Active</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Database Terhubung Secara Permanen ke Cloud Global</p>
                    </div>
                 </div>
              </div>
              <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Infrastructure</p>
                 <p className="text-[10px] font-mono text-emerald-400">qpawptimafvxhppeuqel.supabase.co</p>
              </div>
           </div>
        </div>

        {/* WHITE LABEL SETTINGS */}
        <div className="bg-white p-8 md:p-10 rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden relative">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ color: brandConfig.primaryColor }}>🎨</div>
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Business Identity</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kustomisasi Nama & Logo Internal</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Perusahaan</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.name} onChange={e => setTempBrand({...tempBrand, name: e.target.value})} placeholder="Contoh: Mozza Boy" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Tagline Bisnis</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.tagline} onChange={e => setTempBrand({...tempBrand, tagline: e.target.value})} placeholder="Contoh: Modern Cafe System" />
                 </div>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Logo URL (PNG/SVG)</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.logoUrl} onChange={e => setTempBrand({...tempBrand, logoUrl: e.target.value})} placeholder="https://link-to-your-logo.png" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Warna Utama (Hex)</label>
                    <div className="flex gap-4">
                       <input type="color" className="w-16 h-14 bg-transparent cursor-pointer" value={tempBrand.primaryColor} onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} />
                       <input type="text" className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl font-mono font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.primaryColor} onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-10 pt-8 border-t border-slate-50">
              <button 
                disabled={isProcessing}
                onClick={handleSaveBrand}
                className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'MENYIMPAN...' : 'UPDATE IDENTITAS 🚀'}
              </button>
           </div>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🏢</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Master Data</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Daftar Cabang" table="outlets" />
                 <ExportButton label="Database Staff" table="staff" />
                 <ExportButton label="Katalog Produk" table="products" />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📦</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Supply Logs</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Stok Gudang" table="inventory" />
                 <ExportButton label="Riwayat Belanja" table="purchases" />
                 <ExportButton label="Log Mutasi" table="stock_transfers" />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📈</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Sales Logs</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Semua Transaksi" table="transactions" />
                 <ExportButton label="Rekap Tutup Shift" table="daily_closings" />
              </div>
           </div>
        </div>

        {/* DANGER ZONE */}
        <div className="pt-10 border-t border-slate-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[32px] border-2 border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-slate-800">Reset Data Cabang</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Wipe seluruh log transaksi per outlet.</p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                    <select className="flex-1 p-3 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                       <option value="">Pilih Cabang</option>
                       {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button disabled={!targetOutletId || isProcessing} onClick={() => setShowOutletResetConfirm(true)} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase disabled:opacity-30">WIPE 🧨</button>
                 </div>
              </div>
              
              <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-red-600">Factory Reset Global</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Kosongkan seluruh database transaksi sistem.</p>
                 </div>
                 <button disabled={isProcessing} onClick={() => setShowGlobalResetConfirm(true)} className="w-full md:w-auto px-10 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg disabled:opacity-30">SYSTEM RESET 🧨</button>
              </div>
           </div>
        </div>
      </div>

      {/* CONFIRMS */}
      {showOutletResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧹</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Reset Cabang?</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4">Menghapus seluruh transaksi cabang: <span className="text-orange-600">{outlets.find(o=>o.id===targetOutletId)?.name}</span></p>
             <div className="flex flex-col gap-3 mt-12">
                <button disabled={isProcessing} onClick={handleBranchWipe} className="w-full py-6 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl">IYA, WIPE DATA</button>
                <button onClick={() => setShowOutletResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATAL</button>
             </div>
          </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-red-600/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧨</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Factory Reset</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4">Tindakan ini akan mengosongkan SELURUH isi database transaksi (Kecuali Akun Staff).</p>
             <div className="flex flex-col gap-3 mt-12">
                <button disabled={isProcessing} onClick={handleGlobalWipe} className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl">NUCLEAR WIPE GLOBAL</button>
                <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATALKAN</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
