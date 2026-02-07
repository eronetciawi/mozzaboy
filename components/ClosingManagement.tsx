
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, UserRole, InventoryItemType } from '../types';
import html2canvas from 'html2canvas';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, staff, isSaving, logout,
    productionRecords, purchases, inventory, attendance, expenseTypes, brandConfig
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

  const currentShiftAttendance = useMemo(() => {
    const records = [...(attendance || [])]
      .filter(a => a.staffId === currentUser?.id && a.outletId === selectedOutletId)
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    return records[0];
  }, [attendance, currentUser, selectedOutletId]);

  const shiftTimeRange = useMemo(() => {
    return {
      start: currentShiftAttendance ? new Date(currentShiftAttendance.clockIn) : new Date(new Date().setHours(0,0,0,0)),
      end: new Date()
    };
  }, [currentShiftAttendance]);

  const shiftName = useMemo(() => {
     const hour = new Date().getHours();
     return hour < 15 ? 'SHIFT PAGI' : 'SHIFT SORE/MALAM';
  }, []);

  const myClosing = useMemo(() => 
    dailyClosings.find(c => c.staffId === currentUser?.id && new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr),
    [dailyClosings, currentUser, todayStr]
  );

  const calc = useMemo(() => {
    const { start, end } = shiftTimeRange;
    
    const shiftTxs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser?.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const shiftExps = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === currentUser?.id && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);
    const shiftProds = productionRecords.filter(p => p.outletId === selectedOutletId && p.staffId === currentUser?.id && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const shiftPurchases = purchases.filter(p => p.outletId === selectedOutletId && p.staffId === currentUser?.id && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);

    const cashSales = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+(b.total ?? 0), 0);
    const qrisSales = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+(b.total ?? 0), 0);
    const expTotal = shiftExps.reduce((a,b)=>a+(b.amount ?? 0), 0);
    
    const expByCategory: Record<string, { name: string, total: number }> = {};
    shiftExps.forEach(e => {
       const isAuto = e.id.startsWith('exp-auto-');
       const typeId = isAuto ? 'supply' : (e.typeId || 'other');
       const typeName = isAuto ? 'BELANJA STOK' : (expenseTypes.find(t => t.id === e.typeId)?.name || 'BIAYA OPERASIONAL');
       
       if (!expByCategory[typeId]) expByCategory[typeId] = { name: typeName, total: 0 };
       expByCategory[typeId].total += e.amount;
    });

    const stockAudit = inventory.filter(inv => inv.outletId === selectedOutletId).map(item => {
      const masukBeli = shiftPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b) => a + b.quantity, 0);
      const masukMasak = shiftProds.filter(p => p.resultItemId === item.id).reduce((a,b) => a + b.resultQuantity, 0);
      let keluarSales = 0;
      shiftTxs.forEach(tx => {
        tx.items.forEach(it => {
          (it.product.bom || []).forEach(b => {
            if (b.inventoryItemId === item.id) keluarSales += (b.quantity * it.quantity);
          });
        });
      });
      let keluarMasak = 0;
      shiftProds.forEach(p => {
        (p.components || []).forEach(c => {
          if (c.inventoryItemId === item.id) keluarMasak += c.quantity;
        });
      });
      const totalIn = masukBeli + masukMasak;
      const totalOut = keluarSales + keluarMasak;
      const endStock = item.quantity;
      const startStock = endStock - totalIn + totalOut;
      return { name: item.name, id: item.id, unit: item.unit, startStock, totalIn, totalOut, endStock };
    }).filter(i => i.totalIn > 0 || i.totalOut > 0);

    let opening = 0;
    if (shiftName.includes('SORE')) {
       const morning = dailyClosings.find(c => c.outletId === selectedOutletId && c.shiftName.includes('PAGI') && new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr);
       opening = morning ? (morning.actualCash ?? 0) : 0;
    }

    const expected = opening + cashSales - expTotal;
    const diff = (actualCash ?? 0) - expected;

    return { 
      cashSales, qrisSales, expTotal, opening, expected, diff, 
      totalTrx: shiftTxs.length,
      shiftExps, shiftProds, shiftPurchases, stockAudit,
      expByCategory: Object.values(expByCategory).sort((a,b) => b.total - a.total)
    };
  }, [transactions, expenses, dailyClosings, selectedOutletId, currentUser, actualCash, shiftName, todayStr, shiftTimeRange, inventory, productionRecords, purchases, expenseTypes]);

  const handleExecute = async (overrider?: string) => {
    await performClosing(actualCash, overrider ? `${notes} (Disetujui oleh: ${overrider})` : notes, calc.opening, shiftName);
    setShowConfirm(false); setShowApproval(false);
  };

  const handleExportReport = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `Report-${brandConfig.name}-${activeOutlet?.name || 'Store'}-${todayStr}.png`;
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

  const ReportSection = ({ title, children, icon, color = "text-slate-800", hideBorder = false }: any) => (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 ${hideBorder ? '' : 'border-b border-slate-100'} pb-2`}>
         <span className="text-sm">{icon}</span>
         <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] ${color}`}>{title}</h5>
      </div>
      {children}
    </div>
  );

  const FinanceRow = ({ label, value, isNegative = false, colorClass = "" }: any) => (
    <div className="flex justify-between items-center text-[10px] py-1.5">
      <span className="font-bold text-slate-500 uppercase tracking-tight">{label}</span>
      <span className={`font-mono font-black ${isNegative ? 'text-rose-600' : colorClass || 'text-slate-900'}`}>
        {isNegative ? '-' : ''}Rp {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );

  if (myClosing) {
    const formatTime = (date?: any) => date ? new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const reportDate = new Date(myClosing.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <div className="h-full flex flex-col bg-slate-100 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-20">
           <div className="bg-emerald-600 rounded-[32px] p-6 text-white text-center shadow-xl animate-in zoom-in-95">
              <h3 className="text-lg font-black uppercase tracking-tighter">Shift Closed & Verified</h3>
              <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Laporan Audit Digital Telah Terbit.</p>
           </div>

           <div ref={reportRef} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 text-slate-900">
              <div className="relative">
                 <div className="p-8 md:p-10 text-center bg-slate-900 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-2" style={{ color: brandConfig.primaryColor }}>Daily Report</p>
                    <h4 className="text-2xl font-black uppercase tracking-tighter">{brandConfig.name}</h4>
                    <div className="mt-4 flex justify-center items-center gap-3">
                       <span className="h-px w-8 bg-white/20"></span>
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {reportDate} • {myClosing.shiftName}
                       </p>
                       <span className="h-px w-8 bg-white/20"></span>
                    </div>
                 </div>

                 <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-8 border-b-2 border-dashed border-slate-100 bg-slate-50/50">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama PIC</p>
                       <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{currentUser?.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lokasi</p>
                       <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                          {activeOutlet?.name || 'Verified Point'}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absensi In</p>
                       <p className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                          {formatTime(currentShiftAttendance?.clockIn)} WIB
                       </p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absensi Out</p>
                       <p className="text-[11px] font-black text-rose-600 uppercase tracking-tight">
                          {formatTime(myClosing.timestamp)} WIB
                       </p>
                    </div>
                 </div>
              </div>

              <div className="p-8 md:p-10 space-y-12">
                 <ReportSection title="Financial Performance" icon="💰" color="text-indigo-600">
                    <div className="space-y-1">
                       <FinanceRow label="Modal Awal Shift" value={myClosing.openingBalance} />
                       <FinanceRow label="Total Penjualan Tunai" value={myClosing.totalSalesCash} colorClass="text-emerald-600" />
                       <FinanceRow label="Total Pengeluaran Shift" value={calc.expTotal} isNegative />
                       <FinanceRow label="Total Penjualan QRIS" value={myClosing.totalSalesQRIS} colorClass="text-blue-600" />
                       <div className="bg-slate-900 rounded-2xl p-5 mt-4 flex justify-between items-center text-white shadow-lg">
                          <span className="text-[9px] font-black uppercase text-indigo-400">Net Sales per Shift</span>
                          <span className="text-xl font-black font-mono">Rp {((myClosing.totalSalesCash ?? 0) + (myClosing.totalSalesQRIS ?? 0)).toLocaleString()}</span>
                       </div>
                    </div>
                 </ReportSection>

                 <ReportSection title="Cash Box Reconciliation" icon="🔒">
                    <div className="bg-slate-50 rounded-[24px] p-6 border-2 border-slate-100 space-y-2">
                       <FinanceRow label="Uang Seharusnya Ada" value={(myClosing.openingBalance ?? 0) + (myClosing.totalSalesCash ?? 0) - (calc.expTotal ?? 0)} />
                       <FinanceRow label="Uang Fisik di Laci" value={myClosing.actualCash} />
                       <div className={`flex justify-between items-center text-[11px] font-black uppercase pt-3 mt-1 border-t-2 border-dashed border-slate-200 ${(myClosing.discrepancy ?? 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <span>Selisih (Discrepancy)</span>
                          <span>{(myClosing.discrepancy ?? 0) === 0 ? 'MATCH ✓' : `Rp ${(myClosing.discrepancy ?? 0).toLocaleString()}`}</span>
                       </div>
                    </div>
                 </ReportSection>

                 <div className="pt-10 border-t-2 border-dashed border-slate-100 text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">{brandConfig.name} • Cloud Operating System</p>
                 </div>
              </div>
           </div>

           <div className="flex gap-2 shrink-0">
              <button onClick={handleExportReport} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                 <span>💾</span> SIMPAN ARSIP AUDIT
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
            <span className="text-xs font-black text-rose-500 whitespace-nowrap">Rp {(calc.expTotal ?? 0).toLocaleString()}</span>
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
                       className={`w-full p-4 pl-12 bg-slate-50 border-2 rounded-[24px] text-2xl font-black text-center outline-none transition-all ${(calc.diff ?? 0) !== 0 && actualCash > 0 ? 'border-rose-200 text-rose-600' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`}
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
               className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 border-b-4 ${isEarly ? 'bg-rose-600 border-rose-800 text-white' : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'}`}
               style={!isEarly && actualCash > 0 ? { backgroundColor: brandConfig.primaryColor } : {}}
            >
               {isSaving ? 'MEMPROSES...' : 'TUTUP SHIFT SEKARANG 🏁'}
            </button>
         </div>
      </div>
    </div>
  );
};
