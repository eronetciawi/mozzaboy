
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, UserRole } from '../types';
import html2canvas from 'html2canvas';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, staff, isSaving, logout
  } = useApp();
  
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [auth, setAuth] = useState({ u: '', p: '' });
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const shiftName = useMemo(() => {
     const hour = new Date().getHours();
     return hour < 15 ? 'SHIFT PAGI' : 'SHIFT SORE/MALAM';
  }, []);

  const myClosing = useMemo(() => 
    dailyClosings.find(c => c.staffId === currentUser?.id && new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr),
    [dailyClosings, currentUser, todayStr]
  );

  const calc = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const txs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser?.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start);
    const cashSales = txs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+(b.total ?? 0), 0);
    const qrisSales = txs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+(b.total ?? 0), 0);
    const exp = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === currentUser?.id && new Date(e.timestamp) >= start).reduce((a,b)=>a+(b.amount ?? 0), 0);
    
    let opening = 0;
    if (shiftName.includes('SORE')) {
       const morning = dailyClosings.find(c => c.outletId === selectedOutletId && c.shiftName.includes('PAGI') && new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr);
       opening = morning ? (morning.actualCash ?? 0) : 0;
    }

    const expected = opening + cashSales - exp;
    const diff = (actualCash ?? 0) - expected;
    return { cashSales, qrisSales, exp, opening, expected, diff, totalTrx: txs.length };
  }, [transactions, expenses, dailyClosings, selectedOutletId, currentUser, actualCash, shiftName, todayStr]);

  const handleExecute = async (overrider?: string) => {
    await performClosing(actualCash, overrider ? `${notes} (Disetujui oleh: ${overrider})` : notes, calc.opening, shiftName);
    setShowConfirm(false); setShowApproval(false);
  };

  const handleExportReport = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `Laporan-Shift-${currentUser?.name}-${todayStr}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const isEarly = useMemo(() => {
    if (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) return false;
    const now = new Date();
    const [eh, em] = (currentUser?.shiftEndTime || '18:00').split(':').map(Number);
    const endToday = new Date(); endToday.setHours(eh, em, 0, 0);
    return now.getTime() < endToday.getTime();
  }, [currentUser]);

  if (myClosing) {
    return (
      <div className="h-full flex flex-col bg-slate-100 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-md mx-auto w-full space-y-6 pb-20">
           {/* SUCCESS CARD */}
           <div className="bg-emerald-600 rounded-[32px] p-6 text-white text-center shadow-xl animate-in zoom-in-95">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">✓</div>
              <h3 className="text-lg font-black uppercase tracking-tighter">Shift Closed Successfully</h3>
              <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Data anda telah tersinkron & dikunci oleh sistem.</p>
           </div>

           {/* DETAILED REPORT RECEIPT */}
           <div ref={reportRef} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 border-b-2 border-dashed border-slate-100 text-center">
                 <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4">M</div>
                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Shift Audit Report</h4>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-[0.2em]">{activeOutlet?.name}</p>
              </div>

              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-y-4">
                    <div className="space-y-1">
                       <p className="text-[7px] font-black text-slate-400 uppercase">Kasir</p>
                       <p className="text-[10px] font-black text-slate-800 uppercase">{currentUser?.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[7px] font-black text-slate-400 uppercase">Shift</p>
                       <p className="text-[10px] font-black text-slate-800 uppercase">{myClosing.shiftName}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[7px] font-black text-slate-400 uppercase">Waktu Tutup</p>
                       <p className="text-[10px] font-black text-slate-800 uppercase">{new Date(myClosing.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[7px] font-black text-slate-400 uppercase">Status</p>
                       <p className="text-[9px] font-black text-emerald-600 uppercase">Finalized ✓</p>
                    </div>
                 </div>

                 <div className="h-px bg-slate-50 w-full"></div>

                 <div className="space-y-3">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Financial Summary</p>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                          <span>Modal Awal (Tunai)</span>
                          <span>Rp {(myClosing.openingBalance ?? 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase">
                          <span>Sales Tunai (+)</span>
                          <span>Rp {(myClosing.totalSalesCash ?? 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase">
                          <span>Biaya Operasional (-)</span>
                          <span>Rp {(myClosing.totalExpenses ?? 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black text-blue-600 uppercase border-t border-slate-50 pt-2">
                          <span>Sales Digital (QRIS)</span>
                          <span>Rp {(myClosing.totalSalesQRIS ?? 0).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-3xl p-5 text-white">
                    <div className="flex justify-between items-center opacity-60 mb-1">
                       <p className="text-[8px] font-black uppercase">Grand Total Omset</p>
                       <p className="text-[8px] font-black uppercase">Tunai + QRIS</p>
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-xl font-black tracking-tighter">Rp {((myClosing.totalSalesCash ?? 0) + (myClosing.totalSalesQRIS ?? 0)).toLocaleString()}</p>
                       <span className="text-[7px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Shift Total</span>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Uang Seharusnya Di Laci</p>
                       <p className="text-[10px] font-black text-slate-600">Rp {((myClosing.openingBalance ?? 0) + (myClosing.totalSalesCash ?? 0) - (myClosing.totalExpenses ?? 0)).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Input Uang Fisik</p>
                       <p className="text-sm font-black text-slate-900">Rp {(myClosing.actualCash ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Discrepancy (Selisih)</p>
                       <p className={`text-xs font-black ${(myClosing.discrepancy ?? 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(myClosing.discrepancy ?? 0) === 0 ? 'MATCH ✓' : `Rp ${(myClosing.discrepancy ?? 0).toLocaleString()}`}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-900 text-center">
                 <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">Mozza Boy Smart OS v5.3 • Digital Audit</p>
              </div>
           </div>

           <div className="flex gap-2 shrink-0">
              <button onClick={handleExportReport} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                 <span>💾</span> SIMPAN GAMBAR
              </button>
              <button onClick={logout} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                 KELUAR POS ➔
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      <div className="bg-white border-b px-4 py-2 shrink-0 flex justify-between items-center z-20">
         <div className="flex items-center gap-2">
            <h2 className="text-[10px] font-black text-slate-900 uppercase">Audit Kasir</h2>
            <span className="text-[7px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">{shiftName}</span>
         </div>
         <p className="text-[8px] font-bold text-slate-400 uppercase">{activeOutlet?.name}</p>
      </div>

      <div className="flex bg-white border-b px-4 py-3 gap-6 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
         <div className="flex flex-col min-w-fit">
            <span className="text-[7px] font-black text-slate-400 uppercase">Modal</span>
            <span className="text-xs font-black text-slate-800 whitespace-nowrap">Rp {(calc.opening ?? 0).toLocaleString()}</span>
         </div>
         <div className="flex flex-col min-w-fit border-l pl-4 border-slate-100">
            <span className="text-[7px] font-black text-emerald-500 uppercase">Tunai (+)</span>
            <span className="text-xs font-black text-emerald-600 whitespace-nowrap">Rp {(calc.cashSales ?? 0).toLocaleString()}</span>
         </div>
         <div className="flex flex-col min-w-fit border-l pl-4 border-slate-100">
            <span className="text-[7px] font-black text-rose-400 uppercase">Biaya (-)</span>
            <span className="text-xs font-black text-rose-500 whitespace-nowrap">Rp {(calc.exp ?? 0).toLocaleString()}</span>
         </div>
         <div className="flex flex-col min-w-fit border-l pl-4 border-slate-100">
            <span className="text-[7px] font-black text-blue-400 uppercase">QRIS</span>
            <span className="text-xs font-black text-blue-600 whitespace-nowrap">Rp {(calc.qrisSales ?? 0).toLocaleString()}</span>
         </div>
      </div>

      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden">
         <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg p-5 flex flex-col justify-center flex-1 min-h-0">
            <div className="text-center mb-4 shrink-0">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ekspektasi Uang Fisik</p>
               <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Rp {(calc.expected ?? 0).toLocaleString()}</h4>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
               <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                     <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Input Uang Di Laci</label>
                     <span className={`text-[8px] font-black uppercase ${(calc.diff ?? 0) === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(calc.diff ?? 0) === 0 ? 'MATCH ✓' : `SELISIH: Rp ${(calc.diff ?? 0).toLocaleString()}`}
                     </span>
                  </div>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-200">Rp</span>
                     <input 
                       type="number" 
                       inputMode="numeric"
                       onFocus={e => e.currentTarget.select()}
                       className={`w-full p-4 pl-12 bg-slate-50 border-2 rounded-[24px] text-2xl font-black text-center outline-none transition-all ${(calc.diff ?? 0) !== 0 && actualCash > 0 ? 'border-rose-200 text-rose-600' : 'border-slate-100 text-slate-900 focus:border-orange-500'}`}
                       value={actualCash === 0 ? "" : actualCash}
                       onChange={e => setActualCash(parseInt(e.target.value) || 0)}
                       placeholder="0"
                     />
                  </div>
               </div>

               <div className="shrink-0">
                  <input 
                     type="text"
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold text-center outline-none focus:bg-white text-slate-800"
                     placeholder="Memo / Catatan (Opsional)"
                     value={notes} onChange={e => setNotes(e.target.value)}
                  />
               </div>
            </div>
         </div>

         <div className="mt-4 shrink-0 space-y-2 pb-safe">
            <button 
               disabled={isSaving || actualCash <= 0}
               onClick={() => { if (isEarly || (calc.diff !== 0 && actualCash > 0)) setShowApproval(true); else setShowConfirm(true); }}
               className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 border-b-4 ${isEarly ? 'bg-rose-600 border-rose-800 text-white' : 'bg-slate-900 border-slate-700 text-white hover:bg-orange-600'}`}
            >
               {isSaving ? 'MEMPROSES...' : 'TUTUP SHIFT SEKARANG 🏁'}
            </button>
         </div>
      </div>

      {showConfirm && (
         <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white rounded-[32px] w-full max-w-xs p-8 text-center shadow-2xl animate-in zoom-in-95">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-4">Kirim Laporan?</h3>
               <p className="text-slate-500 text-[8px] mb-8 uppercase font-bold tracking-widest leading-relaxed">Data akan dikirim langsung ke Owner dan tidak bisa diubah.</p>
               <div className="flex flex-col gap-2">
                  <button onClick={() => handleExecute()} className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95">YA, KIRIM 🚀</button>
                  <button onClick={() => setShowConfirm(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[8px]">BATAL</button>
               </div>
            </div>
         </div>
      )}

      {showApproval && (
         <div className="fixed inset-0 z-[510] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white rounded-[32px] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95">
               <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-3">🔑</div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">Otorisasi Diperlukan</h3>
                  
                  {/* DETAILED NOTIFICATION BOX */}
                  <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-left space-y-3">
                    {isEarly && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">⚠️ PELANGGARAN JAM SHIFT</p>
                        <p className="text-[10px] font-bold text-rose-800 leading-tight">
                          Outlet tidak bisa ditutup sebelum jadwal shift berakhir pkl {currentUser?.shiftEndTime}. Saat ini masih dalam jam kerja.
                        </p>
                      </div>
                    )}
                    
                    {calc.diff !== 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">⚠️ SELISIH UANG TUNAI</p>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-rose-800">Jumlah Selisih:</p>
                          <p className="text-[10px] font-black text-rose-900">Rp {Math.abs(calc.diff).toLocaleString()}</p>
                        </div>
                        <p className="text-[8px] font-black uppercase text-rose-600 italic">
                          Keterangan: Uang {calc.diff < 0 ? 'KURANG (Defisit)' : 'LEBIH (Surplus)'}
                        </p>
                      </div>
                    )}
                  </div>
               </div>

               <div className="space-y-3">
                  <input type="text" placeholder="ID Manager" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-[10px] focus:border-indigo-500 text-slate-900" value={auth.u} onChange={e=>setAuth({...auth, u: e.target.value})} />
                  <input type="password" placeholder="Passkey" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-[10px] focus:border-indigo-500 text-slate-900" value={auth.p} onChange={e=>setAuth({...auth, p: e.target.value})} />
                  {error && <p className="text-[7px] font-black text-red-600 uppercase text-center">{error}</p>}
                  <button onClick={() => {
                     const mgr = staff.find(s => s.username === auth.u && s.password === auth.p && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
                     if (mgr) handleExecute(mgr.name); else setError('KREDENSIAL SALAH!');
                  }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-xl tracking-widest">VERIFIKASI MANAGER 🔓</button>
                  <button onClick={() => { setShowApproval(false); setError(''); }} className="w-full py-1 text-slate-300 font-black text-[8px] uppercase tracking-widest text-center">Batalkan Proses</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
