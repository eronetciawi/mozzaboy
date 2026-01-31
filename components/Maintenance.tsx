
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    exportData, importData, resetOutletData, resetGlobalData, 
    currentUser, outlets, supabaseConfig, updateSupabaseConfig, 
    isCloudConnected, syncToCloud, cloneOutletSetup, isSaving,
    exportTableToCSV, importCSVToTable
  } = useApp();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // CSV Import State
  const [activeImportTable, setActiveImportTable] = useState<'products' | 'inventory' | 'categories' | 'outlets' | 'staff' | 'wip_recipes' | null>(null);

  // Clone State
  const [cloneFromId, setCloneFromId] = useState('');
  const [cloneToId, setCloneToId] = useState('');
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);

  // Supabase Form State
  const [localSbUrl, setLocalSbUrl] = useState(supabaseConfig.url);
  const [localSbKey, setLocalSbKey] = useState(supabaseConfig.key);

  const selectedOutlet = outlets.find(o => o.id === targetOutletId);

  // Auto hide toast
  useEffect(() => {
    if (toast.type && toast.type !== 'info') {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (currentUser?.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🚫</div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Akses Ditolak</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Hanya Pemilik (Owner) yang dapat mengakses fitur Maintenance Sistem.</p>
      </div>
    );
  }

  const handleCSVImportClick = (table: any) => {
    setActiveImportTable(table);
    if (csvInputRef.current) csvInputRef.current.value = '';
    csvInputRef.current?.click();
  };

  const onCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportTable) return;

    setToast({ message: `Mempersiapkan data ${file.name}...`, type: 'info' });

    const reader = new FileReader();
    reader.onload = async (ev) => {
       const content = ev.target?.result as string;
       if (!content || content.trim().length === 0) {
         setToast({ message: "File kosong atau tidak terbaca.", type: 'error' });
         return;
       }

       setToast({ message: `Membersihkan data lama & mengunggah ke Cloud...`, type: 'info' });
       
       try {
         const success = await importCSVToTable(activeImportTable, content);
         if (success) {
           setToast({ message: `Misi Berhasil! Tabel ${activeImportTable} telah diperbarui.`, type: 'success' });
         } else {
           setToast({ message: `Gagal. Cek format CSV atau hak akses tabel.`, type: 'error' });
         }
       } catch (err) {
         console.error(err);
         setToast({ message: `Koneksi Terputus atau Format Baris Salah.`, type: 'error' });
       }
    };
    reader.onerror = () => setToast({ message: "Sistem gagal membuka file.", type: 'error' });
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClone = async () => {
     if (!cloneFromId || !cloneToId || cloneFromId === cloneToId) return;
     setToast({ message: "Meresmikan replikasi infrastruktur...", type: 'info' });
     await cloneOutletSetup(cloneFromId, cloneToId);
     setShowCloneConfirm(false);
     setCloneFromId('');
     setCloneToId('');
     setToast({ message: "Konfigurasi Cabang Berhasil Direplikasi!", type: 'success' });
  };

  const handleGlobalReset = async () => {
    setIsResetting(true);
    setToast({ message: "Membersihkan database global...", type: 'info' });
    await resetGlobalData();
    setIsResetting(false);
    setShowGlobalResetConfirm(false);
    setToast({ message: "DATABASE BERHASIL DIBERSIHKAN TOTAL!", type: 'success' });
  };

  const handleSaveCloud = () => {
    updateSupabaseConfig({
      url: localSbUrl,
      key: localSbKey,
      isEnabled: !!localSbUrl && !!localSbKey
    });
    setToast({ message: "Konfigurasi Cloud diperbarui.", type: 'success' });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 relative">
      
      {/* GLOBAL MAINTENANCE TOAST (FIXED VISIBILITY) */}
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 
             'bg-slate-900 border-slate-700 text-white'
           }`}>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shrink-0 shadow-inner">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⏳'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-1">System Audit</p>
                <p className="text-[11px] font-bold opacity-90 uppercase leading-tight">{toast.message}</p>
              </div>
              <button onClick={() => setToast({ message: '', type: null })} className="ml-2 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-xs font-black">✕</button>
           </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto pb-24">
        
        {/* CSV MASTER DATA CONTROL SECTION */}
        <div className="mb-12">
           <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Master CSV Control</h2>
                <p className="text-slate-500 font-medium text-xs italic">Maintenance Data Massal via Spreadsheet (Excel/Google Sheets)</p>
              </div>
              <div className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">ENGINE V1.2 ROBUST</div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'outlets', label: 'Daftar Cabang', icon: '🏢' },
                { id: 'staff', label: 'Data Karyawan', icon: '👥' },
                { id: 'categories', label: 'Kategori Menu', icon: '🏷️' },
                { id: 'inventory', label: 'Stok Gudang', icon: '📦' },
                { id: 'products', label: 'Produk & BOM', icon: '📜' },
                { id: 'wip_recipes', label: 'Resep Mixing', icon: '🧪' },
              ].map(table => (
                <div key={table.id} className="bg-white p-6 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col gap-5 hover:border-indigo-400 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">{table.icon}</div>
                      <div>
                        <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{table.label}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Tabel: {table.id}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => exportTableToCSV(table.id as any)}
                        className="py-3 bg-slate-50 text-slate-600 rounded-2xl text-[9px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                      >
                        Backup CSV
                      </button>
                      <button 
                        onClick={() => handleCSVImportClick(table.id as any)}
                        className="py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                      >
                        Restore CSV
                      </button>
                   </div>
                </div>
              ))}
           </div>
           <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={onCSVFileChange} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* BRANCH SETUP REPLICATOR */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[56px] border-2 border-orange-100 shadow-xl shadow-orange-500/5 relative overflow-hidden flex flex-col">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl grayscale">⚡</div>
             <div className="relative z-10 mb-8">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Branch Replicator</h3>
                <p className="text-[11px] font-black text-orange-600 uppercase tracking-[0.3em] mt-2">Duplikasi Struktur Menu & Inventory ke Cabang Baru</p>
             </div>
             
             <p className="text-xs text-slate-500 font-medium leading-relaxed mb-10 relative z-10 max-w-lg uppercase">
                Fitur ini menyalin daftar <b>Bahan Baku (Inventory)</b> dan <b>Setting Regional Menu</b> (Harga & Ketersediaan) dari satu cabang ke cabang lainnya secara instan.
             </p>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-1 tracking-widest">Dari Cabang (Sumber)</label>
                   <select 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-black text-sm text-slate-800 outline-none focus:border-orange-500 transition-all cursor-pointer shadow-inner" 
                      value={cloneFromId} 
                      onChange={e => setCloneFromId(e.target.value)}
                   >
                      <option value="">-- Pilih Sumber --</option>
                      {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-1 tracking-widest">Ke Cabang (Target)</label>
                   <select 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-black text-sm text-slate-800 outline-none focus:border-orange-500 transition-all cursor-pointer shadow-inner" 
                      value={cloneToId} 
                      onChange={e => setCloneToId(e.target.value)}
                   >
                      <option value="">-- Pilih Tujuan --</option>
                      {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                   </select>
                </div>
             </div>

             <button 
                disabled={!cloneFromId || !cloneToId || cloneFromId === cloneToId || isSaving}
                onClick={() => setShowCloneConfirm(true)}
                className={`w-full py-8 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] transition-all relative z-10 shadow-2xl ${(!cloneFromId || !cloneToId || cloneFromId === cloneToId) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-orange-600 shadow-orange-900/20 active:scale-[0.98]'}`}
             >
                {isSaving ? 'SEDANG MEREPLIKASI DATA...' : 'EKSEKUSI REPLIKASI INFRASTRUKTUR 🚀'}
             </button>
          </div>

          {/* BACKUP & RESTORE / MASTER DATA IMPORT */}
          <div className="bg-white p-10 rounded-[56px] border-2 border-slate-100 shadow-sm flex flex-col">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-[28px] flex items-center justify-center text-3xl mb-8 shadow-inner">📦</div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-3 leading-none">Full Master <br/>(Mode JSON)</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-12 uppercase tracking-widest">
              Backup seluruh ekosistem (termasuk relasi kompleks & pengaturan global) dalam satu paket file terenskripsi JSON.
            </p>
            <div className="space-y-4 mt-auto">
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Impor Master JSON</button>
              <button onClick={exportData} className="w-full py-5 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] hover:text-slate-800 transition-all border-2 border-dashed border-slate-200 rounded-3xl">Unduh Backup JSON 💾</button>
              
              <input type="file" ref={fileInputRef} onChange={e => {
                const reader = new FileReader();
                reader.onload = async (ev) => { 
                  if (confirm("Perhatian: Mengimpor JSON akan menimpa data lama. Lanjutkan?")) {
                    setToast({ message: "Membangun ulang database dari JSON...", type: 'info' });
                    const success = await importData(ev.target?.result as string);
                    if (success) setToast({ message: "Database Berhasil Dipulihkan!", type: 'success' });
                    else setToast({ message: "Struktur JSON tidak valid.", type: 'error' });
                  }
                };
                if (e.target.files?.[0]) reader.readAsText(e.target.files[0]);
              }} className="hidden" accept=".json" />
            </div>
          </div>
        </div>

        {/* SUPABASE CLOUD CONNECTOR */}
        <div className="mt-8 bg-white p-10 rounded-[56px] border-2 border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-10">
               <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-[28px] flex items-center justify-center text-3xl shadow-inner ${isCloudConnected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                     {isCloudConnected ? '☁️' : '🔌'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Cloud Connector</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${isCloudConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{isCloudConnected ? 'Connected & Live Sync' : 'Standalone / Offline Mode'}</p>
                    </div>
                  </div>
               </div>
               <button onClick={syncToCloud} className="bg-slate-50 border-2 px-6 py-3 rounded-2xl text-[9px] font-black uppercase hover:border-indigo-500 transition-all shadow-sm">Sync Now 🔄</button>
            </div>

            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Supabase Project URL</label>
                     <input 
                        type="text" 
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold text-xs focus:border-indigo-500 outline-none transition-all shadow-inner"
                        placeholder="https://xyz.supabase.co"
                        value={localSbUrl}
                        onChange={e => setLocalSbUrl(e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Supabase Anon Key</label>
                     <input 
                        type="password" 
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold text-xs focus:border-indigo-500 outline-none transition-all shadow-inner"
                        placeholder="eyJhbGci..."
                        value={localSbKey}
                        onChange={e => setLocalSbKey(e.target.value)}
                     />
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={handleSaveCloud}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl"
                  >
                    Update & Restart Session
                  </button>
                  {supabaseConfig.isEnabled && (
                    <button 
                      onClick={() => updateSupabaseConfig({ ...supabaseConfig, isEnabled: false })}
                      className="px-8 py-5 bg-red-50 text-red-500 rounded-[28px] font-black text-[11px] uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
                    >Offline</button>
                  )}
               </div>
            </div>
        </div>

        {/* DATA CLEANING */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[56px] border-2 border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">🧹</div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 leading-none">Pembersihan <br/>Data Cabang</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-10">Wipe log transaksi percobaan di cabang spesifik tanpa merusak master data.</p>
              
              <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-slate-100 mb-8">
                 <select className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black text-sm outline-none shadow-sm" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                    <option value="">-- Pilih Cabang --</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                 </select>
              </div>

              <button disabled={!targetOutletId} onClick={() => setShowOutletResetConfirm(true)} className={`w-full py-6 rounded-[28px] font-black text-[12px] uppercase tracking-[0.3em] transition-all shadow-2xl ${!targetOutletId ? 'bg-slate-100 text-slate-300' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'}`}>
                 HAPUS DATA {selectedOutlet?.name || ''} 🧨
              </button>
           </div>

           <div className="bg-red-50 p-10 rounded-[56px] border-4 border-red-100 relative overflow-hidden flex flex-col justify-center border-dashed">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-red-600 text-6xl">🚨</div>
              <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter mb-2 leading-none">Factory Global <br/>Wipe Data</h3>
              <p className="text-[10px] text-red-800/60 font-black uppercase tracking-widest mb-12">Tindakan fatal: Mengosongkan seluruh isi database Cloud untuk semua cabang.</p>
              <button onClick={() => setShowGlobalResetConfirm(true)} className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-red-600/30 active:scale-95 transition-all">FACTORY RESET 🧨</button>
           </div>
        </div>
      </div>

      {/* CLONE CONFIRMATION */}
      {showCloneConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-lg p-12 shadow-2xl text-center animate-in zoom-in-95 duration-300">
             <div className="text-6xl mb-8">⚡</div>
             <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-4">Confirm Replicate?</h3>
             <p className="text-slate-500 text-[10px] font-black leading-relaxed uppercase tracking-widest">
                Anda akan menyalin infrastruktur dari <b>{outlets.find(o=>o.id===cloneFromId)?.name}</b> ke <b>{outlets.find(o=>o.id===cloneToId)?.name}</b>.
                <br/><br/>
                <span className="text-rose-600 font-black italic">Catatan: Stok di cabang baru akan dimulai dari angka 0.</span>
             </p>
             <div className="flex flex-col gap-3 mt-12">
                <button onClick={handleClone} className="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-600 transition-all">YA, EKSEKUSI REPLIKASI</button>
                <button onClick={() => setShowCloneConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">BATALKAN</button>
             </div>
          </div>
        </div>
      )}

      {/* GLOBAL RESET CONFIRMATION */}
      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-red-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-lg p-12 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">☢️</div>
            <h3 className="text-3xl font-black text-red-600 uppercase tracking-tighter">WIPE TOTAL CLOUD?</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase mt-8 mb-12 leading-relaxed tracking-widest">
               Tindakan ini akan <span className="text-red-600 font-black">MENGHAPUS SEMUA DATA</span> (Transaksi, Stok, Produk, Member) di <span className="text-red-600 font-black">SELURUH CABANG</span>. 
               <br/><br/>
               Sistem akan kembali ke kondisi kosong seperti instalasi baru.
            </p>
            <div className="flex flex-col gap-3">
               <button 
                 disabled={isResetting}
                 onClick={handleGlobalReset} 
                 className={`w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-red-600/30 active:scale-95 transition-all ${isResetting ? 'opacity-50 cursor-wait' : ''}`}
               >
                 {isResetting ? 'WIPING DATABASE...' : 'IYA, HAPUS SEGALANYA 🧨'}
               </button>
               <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">BATALKAN</button>
            </div>
          </div>
        </div>
      )}

      {/* OUTLET RESET CONFIRMATION */}
      {showOutletResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-lg p-12 shadow-2xl text-center animate-in zoom-in-95">
            <div className="text-6xl mb-8">🧹</div>
            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Konfirmasi Wipe</h3>
            <p className="text-slate-500 text-[10px] mt-8 mb-12 leading-relaxed uppercase font-black tracking-widest">Anda akan menghapus permanen data di cabang <br/><span className="text-orange-600">{selectedOutlet?.name}</span>. <br/><br/>Data Master, Member, dan cabang lain tetap aman.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { 
                setToast({ message: `Membersihkan data ${selectedOutlet?.name}...`, type: 'info' });
                resetOutletData(targetOutletId); 
                setShowOutletResetConfirm(false); 
                setTargetOutletId(''); 
                setToast({ message: "Cabang berhasil dibersihkan.", type: 'success' });
              }} className="w-full py-6 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl">YA, BERSIHKAN CABANG</button>
              <button onClick={() => setShowOutletResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">BATAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
