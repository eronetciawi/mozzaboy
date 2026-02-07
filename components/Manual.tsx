
import React from 'react';
import { useApp } from '../store';

export const Manual: React.FC = () => {
  const { brandConfig } = useApp();

  const handlePrint = () => {
    window.print();
  };

  // Fix: added optional flag to children property to resolve TS error in JSX usage
  const Step = ({ num, title, children }: { num: string, title: string, children?: React.ReactNode }) => (
    <div className="mb-12 break-inside-avoid">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-lg">
          {num}
        </div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="pl-14 text-slate-600 leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar pb-20">
      {/* Header Panel - No Print for button */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-4 border-b flex justify-between items-center z-50 no-print shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Documentation</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Panduan Setup & Penggunaan</p>
        </div>
        <button 
          onClick={handlePrint}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
        >
          <span>📥</span> SIMPAN SEBAGAI PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 md:p-16 print:p-0">
        {/* Print Cover */}
        <div className="text-center mb-20 border-b-4 border-slate-900 pb-10">
          <div className="w-24 h-24 bg-slate-900 text-white rounded-[32px] flex items-center justify-center text-5xl font-black mx-auto mb-6 shadow-2xl" style={{ backgroundColor: brandConfig.primaryColor }}>
            {brandConfig.name.charAt(0)}
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">{brandConfig.name}</h1>
          <p className="text-lg font-bold text-slate-400 uppercase tracking-[0.3em] mb-8">{brandConfig.tagline}</p>
          <div className="inline-block px-6 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            Official SaaS Onboarding Manual • Version 2.5
          </div>
        </div>

        <Step num="01" title="Menyiapkan Database Cloud (Gratis)">
          <p>Aplikasi ini bersifat "Cloud-First". Anda memerlukan akun <b>Supabase</b> sebagai pusat penyimpanan data agar data bisa diakses dari perangkat manapun.</p>
          <ul className="list-disc pl-5 space-y-2 font-medium">
            <li>Daftar di <span className="text-indigo-600 font-bold">Supabase.com</span> (Gratis).</li>
            <li>Buat <b>New Project</b> dengan nama bisnis Anda.</li>
            <li>Masuk ke menu <b>SQL Editor</b> di sidebar kiri Supabase.</li>
            <li>Klik <b>+ New Query</b>, lalu salin (copy) kode SQL raksasa yang ada di menu <b>Maintenance > Setup Database Cloud</b> di aplikasi ini.</li>
            <li>Klik <b>RUN</b>. Database Anda kini siap digunakan!</li>
          </ul>
        </Step>

        <Step num="02" title="Menghubungkan Aplikasi">
          <p>Setelah database siap, Anda harus "mengawinkan" aplikasi ini dengan database tersebut.</p>
          <ul className="list-disc pl-5 space-y-2 font-medium">
            <li>Di layar Login aplikasi ini, klik tombol <b>SETUP CLOUD NOW ⚡</b>.</li>
            <li>Ambil <b>Project URL</b> dan <b>Anon Key</b> dari dashboard Supabase Anda (Menu: Project Settings > API).</li>
            <li>Masukkan ke dalam aplikasi dan klik <b>CONNECT</b>.</li>
            <li>Login pertama kali menggunakan: <b>Username:</b> <span className="bg-slate-100 px-2 rounded">admin</span> | <b>Password:</b> <span className="bg-slate-100 px-2 rounded">123</span></li>
          </ul>
        </Step>

        <Step num="03" title="Input Bahan Baku & Menu">
          <p>Agar sistem bisa menghitung laba bersih otomatis, ikuti alur input ini:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border">
              <p className="text-[10px] font-black uppercase text-indigo-600 mb-2">1. STOK BARANG</p>
              <p className="text-xs">Masukkan bahan mentah seperti Ayam (kg), Tepung (gr), atau Cup (pcs). Masukkan stok awal Anda di sini.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border">
              <p className="text-[10px] font-black uppercase text-orange-600 mb-2">2. DAFTAR MENU</p>
              <p className="text-xs">Buat menu makanan. Masukkan <b>Resep HPP</b>. Contoh: 1 Fried Chicken memakai 1 potong Ayam dan 100gr Tepung.</p>
            </div>
          </div>
          <p className="text-[11px] font-bold italic text-slate-400 mt-2">Sistem akan otomatis memotong stok gudang setiap terjadi penjualan di Kasir.</p>
        </Step>

        <Step num="04" title="Alur Kerja Harian (SOP)">
          <p>Pastikan staff mengikuti alur ini agar laporan keuangan akurat 100%:</p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="font-black text-slate-300">A</div>
              <div>
                <p className="font-bold text-slate-800 uppercase text-xs">Absensi & Portal</p>
                <p className="text-xs">Staff wajib Absen Masuk untuk membuka akses Kasir Jualan.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="font-black text-slate-300">B</div>
              <div>
                <p className="font-bold text-slate-800 uppercase text-xs">Pencatatan Pengeluaran</p>
                <p className="text-xs">Input setiap biaya operasional harian (beli gas, bayar parkir, dll) di menu <b>Pengeluaran</b>.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="font-black text-slate-300">C</div>
              <div>
                <p className="font-bold text-slate-800 uppercase text-xs">Tutup Buku (End of Shift)</p>
                <p className="text-xs">Di akhir shift, staff wajib menginput jumlah uang fisik di laci. Sistem akan mendeteksi selisih (discrepancy) secara otomatis.</p>
              </div>
            </div>
          </div>
        </Step>

        <Step num="05" title="Analisis Bisnis (Owner Only)">
          <p>Gunakan menu-menu strategis berikut untuk mengembangkan bisnis:</p>
          <ul className="list-disc pl-5 space-y-2 font-medium">
            <li><b>Laporan Bisnis:</b> Lihat Laba Bersih real-time (Omset - HPP - Biaya Operasional).</li>
            <li><b>Menu Engineering:</b> Lihat menu mana yang paling menguntungkan dan mana yang tidak laku.</li>
            <li><b>Loyalty & Promo:</b> Atur poin pelanggan dan level membership untuk membuat pelanggan kembali lagi.</li>
          </ul>
        </Step>

        <div className="mt-20 pt-10 border-t text-center text-slate-300">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Food Operating System • Open Source Distribution</p>
        </div>
      </div>
    </div>
  );
};
