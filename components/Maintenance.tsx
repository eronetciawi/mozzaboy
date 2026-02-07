
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole, BrandConfig } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    resetOutletData, resetGlobalData, 
    currentUser, outlets, brandConfig, updateBrandConfig,
    exportTableToCSV, isDbConnected, exportSystemBackup, importSystemBackup
  } = useApp();
  
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleExportBackup = async () => {
    setIsProcessing(true);
    setRestoreProgress('Menyiapkan file cadangan...');
    try {
      await exportSystemBackup();
      setToast({ message: "BACKUP BERHASIL DIUNDUH!", type: 'success' });
    } catch (e) {
      setToast({ message: "Gagal melakukan backup.", type: 'error' });
    } finally {
      setIsProcessing(false);
      setRestoreProgress('');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("RESTORE DATA: Tindakan ini akan menimpa data Cloud saat ini dengan data dari file backup. Lanjutkan?")) {
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    setRestoreProgress('Membaca file & Sinkronisasi Cloud...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const jsonString = event.target?.result as string;
      const result = await importSystemBackup(jsonString);
      if (result.success) {
        setToast({ message: result.message, type: 'success' });
      } else {
        setToast({ message: result.message, type: 'error' });
      }
      setIsProcessing(false);
      setRestoreProgress('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportGroups = [
    {
      title: "Infrastruktur & SDM",
      items: [
        { id: 'outlets', label: 'Data Outlet', icon: '🏢', color: 'bg-slate-100 text-slate-600' },
        { id: 'staff', label: 'Data Kru', icon: '👥', color: 'bg-slate-100 text-slate-600' },
      ]
    },
    {
      title: "Katalog & Menu",
      items: [
        { id: 'categories', label: 'Kategori', icon: '🏷️', color: 'bg-emerald-50 text-emerald-600' },
        { id: 'products', label: 'Daftar Menu', icon: '🍔', color: 'bg-emerald-50 text-emerald-600' },
      ]
    },
    {
      title: "Logistik & Produksi",
      items: [
        { id: 'inventory', label: 'Daftar Stok', icon: '📦', color: 'bg-orange-50 text-orange-600' },
        { id: 'wip_recipes', label: 'Formula Resep', icon: '🧪', color: 'bg-orange-50 text-orange-600' },
        { id: 'production_records', label: 'Log Produksi', icon: '🍳', color: 'bg-orange-50 text-orange-600' },
      ]
    },
    {
      title: "Marketing & CRM",
      items: [
        { id: 'customers', label: 'Data Pelanggan', icon: '🎖️', color: 'bg-indigo-50 text-indigo-600' },
        { id: 'membership_tiers', label: 'Level Member', icon: '🏆', color: 'bg-indigo-50 text-indigo-600' },
        { id: 'bulk_discounts', label: 'Promo Grosir', icon: '🎁', color: 'bg-indigo-50 text-indigo-600' },
      ]
    },
    {
      title: "Strategi Bisnis",
      items: [
        { id: 'simulations', label: 'Engineering', icon: '📐', color: 'bg-rose-50 text-rose-600' },
      ]
    }
  ];

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

      {isProcessing && restoreProgress && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-10">
           <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-8"></div>
           <h3 className="text-xl font-black uppercase tracking-widest">{restoreProgress}</h3>
           <p className="text-slate-500 text-[10px] font-bold uppercase mt-4">Mohon jangan tutup aplikasi sampai selesai.</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">System Maintenance</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Infrastructure & Data Control</p>
        </div>

        {/* DATA RESET PHILOSOPHY GUIDE */}
        <div className="bg-white rounded-[48px] border-2 border-slate-100 p-8 md:p-10 shadow-sm overflow-hidden relative">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">ℹ️</div>
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Memahami Prosedur Wipe Data</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Informasi Penting Sebelum Melakukan Reset</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-rose-50/50 rounded-[32px] p-6 border border-rose-100">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-sm">🗑️</span>
                    <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-widest">Data yang DIHAPUS</h4>
                 </div>
                 <ul className="space-y-3">
                    {[
                      'Seluruh Riwayat Transaksi Penjualan',
                      'Seluruh Catatan Pengeluaran Biaya',
                      'Log Absensi & Kehadiran Karyawan',
                      'Laporan Tutup Buku / Closing Shift',
                      'Riwayat Produksi & Mixing Bahan',
                      'Riwayat Belanja Stok ke Supplier',
                      'Riwayat Mutasi Stok Antar Cabang'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-[10px] font-bold text-slate-600 uppercase leading-tight">
                         <span className="text-rose-400 mt-0.5">•</span> {item}
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-emerald-50/50 rounded-[32px] p-6 border border-emerald-100">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">🛡️</span>
                    <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Data yang TETAP AMAN</h4>
                 </div>
                 <ul className="space-y-3">
                    {[
                      'Saldo Stok di Gudang (Inventory Fisik)',
                      'Katalog Produk & Daftar Harga',
                      'Akun Login Karyawan & Password',
                      'Database Pelanggan (Member CRM)',
                      'Poin Loyalitas Pelanggan',
                      'Pengaturan Cabang & Geofencing'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-[10px] font-bold text-slate-600 uppercase leading-tight">
                         <span className="text-emerald-400 mt-0.5">✓</span> {item}
                      </li>
                    ))}
                 </ul>
              </div>
           </div>
           
           <div className="mt-8 p-5 bg-slate-900 rounded-[28px] flex items-center gap-4 text-white">
              <span className="text-2xl">💡</span>
              <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wider opacity-90">
                MozzaBoy Reset dirancang untuk membersihkan <b>History</b> (Jejak Aktivitas) agar pembukuan Anda mulai dari nol, tanpa mengganggu <b>Master Data</b> dan <b>Saldo Stok</b> yang sedang berjalan.
              </p>
           </div>
        </div>

        {/* DATA ASSETS EXPORT (CSV) - FULL SUITE */}
        <div className="bg-white p-8 md:p-12 rounded-[56px] shadow-sm border-2 border-slate-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📊</div>
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Full Master Data Export</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unduh database master secara terpisah dalam format Excel / CSV</p>
              </div>
           </div>

           <div className="space-y-8">
              {exportGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-4">{group.title}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map(asset => (
                      <button 
                        key={asset.id}
                        onClick={() => exportTableToCSV(asset.id)}
                        className="flex items-center gap-4 p-5 bg-white border-2 border-slate-50 rounded-[32px] hover:border-indigo-500 transition-all text-left group active:scale-95 shadow-sm"
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${asset.color}`}>
                          {asset.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">{asset.label}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">EXCEL / CSV ↓</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* BACKUP & RESTORE ENTERPRISE */}
        <div className="bg-white p-8 md:p-12 rounded-[56px] shadow-sm border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center text-4xl shadow-inner">
                 📦
              </div>
              <div>
                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-2">Disaster Recovery</p>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Full System Backup</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cadangkan seluruh data master & transaksi ke file lokal</p>
              </div>
           </div>
           <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={handleExportBackup}
                disabled={isProcessing}
                className="flex-1 md:flex-none px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30"
              >
                📥 DOWNLOAD BACKUP
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 md:flex-none px-8 py-5 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:border-orange-500 transition-all active:scale-95 disabled:opacity-30"
              >
                📤 RESTORE SYSTEM
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestoreFile} />
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

        {/* DANGER ZONE */}
        <div className="pt-10 border-t border-slate-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[32px] border-2 border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Reset Data Cabang</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Wipe riwayat aktivitas per outlet spesifik.</p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                    <select className="flex-1 p-3 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                       <option value="">Pilih Cabang</option>
                       {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button disabled={!targetOutletId || isProcessing} onClick={() => setShowOutletResetConfirm(true)} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase disabled:opacity-30 shadow-lg shadow-orange-100 transition-all active:scale-95">WIPE 🧨</button>
                 </div>
              </div>
              
              <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Factory Reset Global</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Bersihkan seluruh jejak operasional di semua cabang.</p>
                 </div>
                 <button disabled={isProcessing} onClick={() => setShowGlobalResetConfirm(true)} className="w-full md:w-auto px-10 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-30">SYSTEM RESET 🧨</button>
              </div>
           </div>
        </div>
      </div>

      {/* CONFIRMS */}
      {showOutletResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[56px] w-full max-sm:w-full max-w-sm p-10 md:p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧹</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Reset Cabang?</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4 mb-6">
                Menghapus Riwayat Transaksi, Biaya, & Absensi di cabang: <span className="text-orange-600">{outlets.find(o=>o.id===targetOutletId)?.name}</span>.
             </p>
             <div className="p-4 bg-orange-50 rounded-2xl mb-8 border border-orange-100">
                <p className="text-[9px] font-bold text-orange-700 uppercase">CATATAN: Saldo Stok Barang & Menu Tetap Aman.</p>
             </div>
             <div className="flex flex-col gap-3">
                <button disabled={isProcessing} onClick={handleBranchWipe} className="w-full py-6 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl transition-all active:scale-95">IYA, BERSIHKAN RIWAYAT</button>
                <button onClick={() => setShowOutletResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATALKAN</button>
             </div>
          </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-red-600/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[56px] w-full max-sm:w-full max-w-sm p-10 md:p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧨</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Factory Reset</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4 mb-6">
                Tindakan ini akan mengosongkan SELURUH isi database aktivitas transaksi global.
             </p>
             <div className="bg-rose-50 p-4 rounded-2xl mb-8 border border-rose-100">
                <p className="text-[9px] font-bold text-rose-700 uppercase">Akun Staff, Inventaris, dan Menu TIDAK AKAN terhapus.</p>
             </div>
             <div className="flex flex-col gap-3">
                <button disabled={isProcessing} onClick={handleGlobalWipe} className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl transition-all active:scale-95">NUCLEAR WIPE GLOBAL</button>
                <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">JANGAN, BATALKAN</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
