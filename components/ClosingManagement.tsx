
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, UserRole, InventoryItemType } from '../types';
import html2canvas from 'html2canvas';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, staff, isSaving, logout,
    productionRecords, purchases, inventory, attendance, expenseTypes
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

  // Menemukan data absensi shift ini
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
    link.download = `Daily-Report-${activeOutlet?.name || 'Outlet'}-${todayStr}.png`;
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
              {/* PROFESSIONAL HEADER */}
              <div className="relative">
                 <div className="p-8 md:p-10 text-center bg-slate-900 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500 mb-2">Daily Report</p>
                    <h4 className="text-2xl font-black uppercase tracking-tighter">Mozzaboy {activeOutlet?.name?.split(' ').pop() || 'Cikereteg'}</h4>
                    <div className="mt-4 flex justify-center items-center gap-3">
                       <span className="h-px w-8 bg-white/20"></span>
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {reportDate} • {myClosing.shiftName}
                       </p>
                       <span className="h-px w-8 bg-white/20"></span>
                    </div>
                 </div>

                 {/* CREW INFO GRID */}
                 <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-8 border-b-2 border-dashed border-slate-100 bg-slate-50/50">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Crew</p>
                       <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{currentUser?.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jadwal Crew</p>
                       <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                          {currentUser?.shiftStartTime || '--:--'} - {currentUser?.shiftEndTime || '--:--'}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absensi Masuk</p>
                       <p className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                          {formatTime(currentShiftAttendance?.clockIn)} WIB
                       </p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absensi Pulang</p>
                       <p className="text-[11px] font-black text-rose-600 uppercase tracking-tight">
                          {formatTime(myClosing.timestamp)} WIB
                       </p>
                    </div>
                 </div>
              </div>

              <div className="p-8 md:p-10 space-y-12">
                 {/* 1. FINANCIAL PERFORMANCE */}
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

                 {/* 2. CASH BOX VERIFICATION */}
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

                 {/* 3. OPERATIONAL EXPENSE AUDIT */}
                 <ReportSection title="Expense Shift Log" icon="💸" color="text-rose-600">
                    <div className="space-y-4">
                       <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex justify-between items-center">
                          <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Total Pengeluaran Shift Ini</p>
                          <p className="text-lg font-black text-rose-700 font-mono">Rp {calc.expTotal.toLocaleString()}</p>
                       </div>
                       
                       <div className="overflow-hidden border border-slate-100 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                             <thead className="bg-slate-50 border-b">
                                <tr className="text-[7px] font-black text-slate-400 uppercase">
                                   <th className="py-3 px-4">Waktu</th>
                                   <th className="py-3 px-4">Uraian / Catatan</th>
                                   <th className="py-3 px-4 text-right">Nominal</th>
                                </tr>
                             </thead>
                             <tbody className="text-[9px] font-bold text-slate-700 uppercase">
                                {calc.shiftExps.map((e, i) => {
                                   const isAuto = e.id.startsWith('exp-auto-');
                                   const catName = expenseTypes.find(t => t.id === e.typeId)?.name || 'LAIN-LAIN';
                                   const displayNotes = e.notes || catName;
                                   
                                   return (
                                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                         <td className="py-3 px-4 text-slate-400 font-mono">{new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                         <td className="py-3 px-4">
                                            <p className="leading-tight text-slate-800">{displayNotes}</p>
                                            <p className="text-[6px] font-black text-rose-400 mt-1">{isAuto ? 'AUTO PURCHASE' : catName}</p>
                                         </td>
                                         <td className="py-3 px-4 text-right text-rose-600 font-black">Rp {e.amount.toLocaleString()}</td>
                                      </tr>
                                   );
                                })}
                                {calc.shiftExps.length === 0 && (
                                   <tr>
                                      <td colSpan={3} className="py-8 text-center text-[9px] italic text-slate-300 uppercase tracking-widest">Nol Pengeluaran</td>
                                   </tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </ReportSection>

                 {/* 4. STOCK MUTATION AUDIT */}
                 <ReportSection title="Inventory Shift Mutation" icon="📦" color="text-orange-600">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                          <thead>
                             <tr className="text-[7px] font-black text-slate-400 uppercase border-b-2 border-slate-100">
                                <th className="py-2">Material Item</th>
                                <th className="py-2 text-right">Awal</th>
                                <th className="py-2 text-right text-green-600">Masuk</th>
                                <th className="py-2 text-right text-red-500">Keluar</th>
                                <th className="py-2 text-right">Akhir</th>
                             </tr>
                          </thead>
                          <tbody className="text-[9px] font-bold text-slate-700 uppercase">
                             {calc.stockAudit.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-50/50 last:border-0">
                                   <td className="py-2.5 truncate max-w-[100px] leading-none">{item.name}</td>
                                   <td className="py-2.5 text-right font-mono">{item.startStock.toFixed(1)}</td>
                                   <td className="py-2.5 text-right font-mono text-green-600">+{item.totalIn.toFixed(1)}</td>
                                   <td className="py-2.5 text-right font-mono text-red-500">-{item.totalOut.toFixed(1)}</td>
                                   <td className="py-2.5 text-right font-black font-mono bg-slate-50/30">{item.endStock.toFixed(1)}</td>
                                </tr>
                             ))}
                             {calc.stockAudit.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-[8px] italic text-slate-300 uppercase">Tidak ada pergerakan stok shift ini</td></tr>}
                          </tbody>
                       </table>
                    </div>
                 </ReportSection>

                 {/* 5. OPS LOGS - SEPARATED INTO ROWS WITHOUT LINES */}
                 <div className="space-y-12">
                    {/* PRODUCTION SECTION */}
                    <ReportSection title="Crew Production Log" icon="🧪" color="text-indigo-600">
                       <div className="bg-slate-50/50 rounded-2xl p-5 space-y-4">
                          {calc.shiftProds.map((p, i) => (
                             <div key={i} className="flex justify-between items-center group">
                                <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{inventory.find(inv=>inv.id===p.resultItemId)?.name || 'Produk Jadi'}</p>
                                      <span className="text-[7px] font-black text-indigo-400 font-mono">[{new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>
                                   </div>
                                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Produksi Hasil Mix</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[12px] font-black text-indigo-600 whitespace-nowrap">+{p.resultQuantity} {inventory.find(inv=>inv.id===p.resultItemId)?.unit}</p>
                                </div>
                             </div>
                          ))}
                          {calc.shiftProds.length === 0 && <p className="text-[9px] italic text-slate-300 uppercase tracking-widest text-center py-4">Nol Aktivitas Produksi</p>}
                       </div>
                    </ReportSection>
                    
                    {/* SUPPLIES SECTION */}
                    <ReportSection title="Shift Supplies Log" icon="🚛" color="text-orange-600">
                       <div className="bg-slate-50/50 rounded-2xl p-5 space-y-4">
                          {calc.shiftPurchases.map((p, i) => (
                             <div key={i} className="flex justify-between items-center group">
                                <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{p.itemName}</p>
                                      <span className="text-[7px] font-black text-orange-400 font-mono">[{new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>
                                   </div>
                                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Supply Bahan Mentah</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[12px] font-black text-orange-600 whitespace-nowrap">+{p.quantity} {inventory.find(inv=>inv.name===p.itemName)?.unit || ''}</p>
                                </div>
                             </div>
                          ))}
                          {calc.shiftPurchases.length === 0 && <p className="text-[9px] italic text-slate-300 uppercase tracking-widest text-center py-4">Nol Aktivitas Belanja</p>}
                       </div>
                    </ReportSection>
                 </div>

                 {/* FOOTER */}
                 <div className="pt-10 border-t-2 border-dashed border-slate-100 text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Mozza Boy Smart OS v6.1 • Verified Audit Archive</p>
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
