
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    resetOutletData, resetGlobalData, 
    currentUser, outlets, 
    exportTableToCSV, resetAttendanceLogs, importCSVToTable
  } = useApp();
  
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [showAttendanceResetConfirm, setShowAttendanceResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportTable, setCurrentImportTable] = useState<string | null>(null);

  useEffect(() => {
    if (toast.type && toast.type !== 'info') {
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

  const triggerImport = (table: string) => {
     setCurrentImportTable(table);
     fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !currentImportTable) return;

     setIsProcessing(true);
     setToast({ message: `Mempulihkan Tabel ${currentImportTable.toUpperCase()}...`, type: 'info' });

     const reader = new FileReader();
     reader.onload = async (event) => {
        const csv = event.target?.result as string;
        const success = await importCSVToTable(currentImportTable, csv);
        
        setIsProcessing(false);
        if (success) {
           setToast({ message: `Data ${currentImportTable.toUpperCase()} Berhasil Dipulihkan!`, type: 'success' });
        } else {
           setToast({ message: `Gagal memulihkan ${currentImportTable.toUpperCase()}. Cek format file.`, type: 'error' });
        }
        e.target.value = ''; // Reset input
     };
     reader.readAsText(file);
  };

  const backupMasterData = () => {
    const tables = ['outlets', 'staff', 'products', 'categories', 'customers', 'membership_tiers', 'bulk_discounts', 'expense_types'];
    setToast({ message: "Memproses Master Archive...", type: 'info' });
    tables.forEach((t, i) => setTimeout(() => exportTableToCSV(t), i * 1000));
  };

  const backupAllSystem = () => {
    const tables = ['outlets', 'staff', 'products', 'categories', 'customers', 'inventory', 'transactions', 'expenses', 'purchases', 'daily_closings', 'attendance', 'stock_transfers', 'production_records'];
    setToast({ message: "Memproses Total System Backup...", type: 'info' });
    tables.forEach((t, i) => setTimeout(() => exportTableToCSV(t), i * 1000));
  };

  const ExportButton = ({ label, table }: { label: string; table: string }) => (
    <div className="flex gap-1">
      <button 
        onClick={() => exportTableToCSV(table)} 
        className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 rounded-l-xl font-black text-[9px] uppercase tracking-widest text-left flex justify-between items-center group transition-all hover:bg-slate-900 hover:text-white"
      >
        <span>{label}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">↓</span>
      </button>
      <button 
        onClick={() => triggerImport(table)}
        className="px-4 bg-slate-100 text-slate-400 rounded-r-xl border-l border-white hover:bg-orange-500 hover:text-white transition-all text-[10px]"
        title="Restore dari CSV"
      >
        ↑
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-40">
      {/* Hidden File Input for Import */}
      <input 
         type="file" 
         ref={fileInputRef} 
         className="hidden" 
         accept=".csv" 
         onChange={handleFileChange} 
      />

      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0 shadow-inner">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⏳'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-1">System Audit</p>
                <p className="text-[11px] font-bold opacity-90 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Enterprise Archive Hub</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Backup, Recovery & Data Portability Tools</p>
           </div>
           <div className="flex gap-2">
              <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                 <span className="text-indigo-600 text-xs">ℹ️</span>
                 <p className="text-[8px] font-black text-indigo-400 uppercase leading-tight">Gunakan tombol <b>↑</b> di samping tabel <br/>untuk memulihkan data dari CSV.</p>
              </div>
           </div>
        </div>

        {/* MEGA BACKUP SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-indigo-600 p-8 rounded-[48px] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl transform rotate-12 group-hover:scale-110 transition-transform">📂</div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Master Data Full Backup</h3>
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mb-10 leading-relaxed max-w-xs">Ekspor seluruh konfigurasi bisnis (Cabang, Staff, Menu, CRM) dalam satu kali klik.</p>
              <button onClick={backupMasterData} className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-50 active:scale-95 transition-all">Download Master Archive ↓</button>
           </div>
           
           <div className="bg-emerald-600 p-8 rounded-[48px] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl transform rotate-12 group-hover:scale-110 transition-transform">💾</div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Full System Audit Backup</h3>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mb-10 leading-relaxed max-w-xs">Arsip total mencakup Master Data + Seluruh Log Transaksi, Absensi, dan Stok.</p>
              <button onClick={backupAllSystem} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 active:scale-95 transition-all">Download Mega Archive ↓</button>
           </div>
        </div>

        {/* DETAILED EXPORT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* MASTER DATA */}
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🏢</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Master Business</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Daftar Cabang" table="outlets" />
                 <ExportButton label="Database Staff" table="staff" />
                 <ExportButton label="Katalog Produk" table="products" />
                 <ExportButton label="Kategori Menu" table="categories" />
                 <ExportButton label="Member CRM" table="customers" />
                 <ExportButton label="Loyalty Tiers" table="membership_tiers" />
              </div>
           </div>

           {/* LOGISTICS & STOCK */}
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📦</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Supply Chain</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Stok Gudang (Current)" table="inventory" />
                 <ExportButton label="Resep Mixing (WIP)" table="wip_recipes" />
                 <ExportButton label="Riwayat Belanja" table="purchases" />
                 <ExportButton label="Log Mutasi Cabang" table="stock_transfers" />
                 <ExportButton label="Log Produksi/Masak" table="production_records" />
              </div>
           </div>

           {/* OPERATIONS */}
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📈</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Operational Logs</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Semua Transaksi" table="transactions" />
                 <ExportButton label="Biaya Operasional" table="expenses" />
                 <ExportButton label="Rekap Tutup Buku" table="daily_closings" />
                 <ExportButton label="Log Absensi Kru" table="attendance" />
                 <ExportButton label="Pengajuan Cuti" table="leave_requests" />
              </div>
           </div>
        </div>

        {/* DANGER ZONE AREA */}
        <div className="pt-10 border-t border-slate-200">
           <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] mb-8 text-center">Nuclear Management (Danger Zone)</h4>
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
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Kosongkan seluruh database cloud Mozza Boy.</p>
                 </div>
                 <button disabled={isProcessing} onClick={() => setShowGlobalResetConfirm(true)} className="w-full md:w-auto px-10 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg disabled:opacity-30">SYSTEM RESET 🧨</button>
              </div>
           </div>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}
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
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4">Tindakan ini akan mengosongkan SELURUH isi database cloud (Kecuali Akun Staff).</p>
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
