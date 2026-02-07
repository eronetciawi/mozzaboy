
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, UserRole, StaffMember, InventoryItemType } from '../types';
import html2canvas from 'html2canvas';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, isSaving, logout,
    attendance, brandConfig, staff, inventory, productionRecords, purchases, stockTransfers, expenseTypes
  } = useApp();
  
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | null }>({ message: '', type: null });
  const reportRef = useRef<HTMLDivElement>(null);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const todayStr = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  const scheduledEndStr = currentUser?.shiftEndTime || '18:00';
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  const isEarly = useMemo(() => {
    const now = new Date();
    const [eh, em] = scheduledEndStr.split(':').map(Number);
    const endToday = new Date(); endToday.setHours(eh, em, 0, 0);
    return now.getTime() < endToday.getTime();
  }, [scheduledEndStr]);

  // SHIFT DATA AGGREGATION
  const shiftData = useMemo(() => {
    const { start, end } = shiftTimeRange;
    const sTxs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser?.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const sExps = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === currentUser?.id && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);
    const sProds = productionRecords.filter(p => p.outletId === selectedOutletId && p.staffId === currentUser?.id && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sPurchases = purchases.filter(p => p.outletId === selectedOutletId && p.staffId === currentUser?.id && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sTrfs = stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && t.staffId === currentUser?.id && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);

    const cashSales = sTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+(b.total ?? 0), 0);
    const qrisSales = sTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+(b.total ?? 0), 0);
    const expTotal = sExps.reduce((a,b)=>a+(b.amount ?? 0), 0);
    
    let opening = 0;
    if (shiftName.includes('SORE')) {
       const morning = dailyClosings.find(c => c.outletId === selectedOutletId && c.shiftName.includes('PAGI') && new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr);
       opening = morning ? (morning.actualCash ?? 0) : 0;
    }

    const expected = opening + cashSales - expTotal;
    const diff = (actualCash ?? 0) - expected;

    // Mutation Logic
    const mutations = inventory.filter(i => i.outletId === selectedOutletId).map(item => {
        const inPur = sPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b)=>a+b.quantity, 0);
        const inProd = sProds.filter(p => p.resultItemId === item.id).reduce((a,b)=>a+b.resultQuantity, 0);
        const inTrf = sTrfs.filter(t => t.toOutletId === selectedOutletId && t.itemName === item.name && t.status === 'ACCEPTED').reduce((a,b)=>a+b.quantity, 0);
        
        let outSales = 0;
        sTxs.forEach(tx => tx.items.forEach(it => {
            (it.product.bom || []).forEach(b => {
                if (b.inventoryItemId === item.id) outSales += (b.quantity * it.quantity);
            });
        }));
        
        const outProd = sProds.reduce((acc, pr) => {
            const comp = pr.components.find(c => c.inventoryItemId === item.id);
            return acc + (comp?.quantity || 0);
        }, 0);
        
        const outTrf = sTrfs.filter(t => t.fromOutletId === selectedOutletId && t.itemName === item.name).reduce((a,b)=>a+b.quantity, 0);
        
        const totalIn = inPur + inProd + inTrf;
        const totalOut = outSales + outProd + outTrf;
        
        return {
            name: item.name,
            unit: item.unit,
            in: totalIn,
            out: totalOut,
            start: item.quantity - totalIn + totalOut,
            end: item.quantity
        };
    }).filter(m => m.in > 0 || m.out > 0);

    return { 
        cashSales, qrisSales, expTotal, opening, expected, diff, totalTrx: sTxs.length, 
        sExps, sProds, sPurchases, mutations 
    };
  }, [transactions, expenses, dailyClosings, selectedOutletId, currentUser, actualCash, shiftName, todayStr, shiftTimeRange, inventory, productionRecords, purchases, stockTransfers]);

  const handleValidation = () => {
    if (isSaving) return;
    if (actualCash < 0) { setToast({ message: "Uang fisik tidak boleh negatif!", type: 'error' }); return; }
    if (actualCash === 0 && shiftData.expected > 0) { setToast({ message: "Mohon masukkan jumlah uang fisik di laci!", type: 'error' }); return; }
    if (shiftData.diff !== 0 && !notes.trim()) { setToast({ message: "Wajib isi catatan penjelasan jika ada selisih uang!", type: 'error' }); return; }

    const isOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
    if (isEarly && !isOwner) {
       setApprovalReason(`PULANG AWAL (Jadwal: ${scheduledEndStr}, Jam: ${currentTimeStr}).`);
       setShowApproval(true);
       return;
    }
    if (Math.abs(shiftData.diff) > 50000 && !isOwner) {
       setApprovalReason(`SELISIH BESAR: Rp ${shiftData.diff.toLocaleString()}.`);
       setShowApproval(true);
       return;
    }
    setShowConfirm(true);
  };

  const handleAuthorizeAndExecute = () => {
    const manager = staff.find(s => s.username === authUsername && s.password === authPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (manager) { handleExecute(manager.name); setAuthUsername(''); setAuthPassword(''); setAuthError(''); } 
    else { setAuthError("Otorisasi Gagal."); }
  };

  const handleExecute = async (overrider?: string) => {
    try {
      await performClosing(actualCash, overrider ? `${notes} (Auth: ${overrider})` : notes, shiftData.opening, shiftName);
      setToast({ message: "Tutup Buku Berhasil!", type: 'success' });
      setShowConfirm(false); setShowApproval(false);
    } catch (e) {
      setToast({ message: "Gagal menyimpan data.", type: 'error' });
    }
  };

  const FinanceRow = ({ label, value, isNegative = false, colorClass = "" }: any) => (
    <div className="flex justify-between items-center text-[10px] py-1.5 border-b border-slate-50 last:border-0">
      <span className="font-bold text-slate-500 uppercase tracking-tight">{label}</span>
      <span className={`font-mono font-black ${isNegative ? 'text-rose-600' : colorClass || 'text-slate-900'}`}>
        {isNegative ? '-' : ''}Rp {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );

  const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2 mb-4 mt-8 bg-white sticky top-0 z-10">
        <span className="text-sm">{icon}</span>
        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{title}</h4>
    </div>
  );

  if (myClosing) {
    const reportDate = new Date(myClosing.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return (
      <div className="h-full flex flex-col bg-slate-100 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-24">
           <div className="bg-emerald-600 rounded-[32px] p-6 text-white text-center shadow-xl animate-in zoom-in-95">
              <h3 className="text-lg font-black uppercase tracking-tighter">Shift Closed & Verified</h3>
              <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Laporan Audit Digital Telah Terbit.</p>
           </div>

           <div ref={reportRef} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 text-slate-900 p-8 md:p-12">
              <div className="text-center mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-2">Daily Audit Report</p>
                <h4 className="text-2xl font-black uppercase tracking-tighter">{brandConfig.name}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">{reportDate} • {myClosing.shiftName}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-8 border-y border-dashed border-slate-200 py-8 mb-8">
                <div><p className="text-[8px] font-black text-slate-400 uppercase">PIC Kasir</p><p className="text-[11px] font-black uppercase">{currentUser?.name}</p></div>
                <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Outlet</p><p className="text-[11px] font-black uppercase">{activeOutlet?.name}</p></div>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Mulai</p><p className="text-[11px] font-black text-indigo-600">{new Date(currentShiftAttendance?.clockIn).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p></div>
                <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase">Selesai</p><p className="text-[11px] font-black text-rose-600">{new Date(myClosing.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p></div>
              </div>

              {/* FINANCIAL SUMMARY */}
              <SectionHeader title="Ringkasan Keuangan" icon="💰" />
              <div className="space-y-1">
                 <FinanceRow label="Modal Awal Shift" value={myClosing.openingBalance} />
                 <FinanceRow label="Sales Tunai (+)" value={myClosing.totalSalesCash} colorClass="text-emerald-600" />
                 <FinanceRow label="Sales QRIS (+)" value={myClosing.totalSalesQRIS} colorClass="text-blue-600" />
                 <FinanceRow label="Pengeluaran (-)" value={myClosing.totalExpenses} isNegative />
                 <div className={`p-4 rounded-2xl border-2 border-dashed mt-4 ${myClosing.discrepancy === 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Selisih Kas</span>
                        <span className={`text-sm font-black ${myClosing.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {myClosing.discrepancy === 0 ? 'MATCH ✓' : `Rp ${myClosing.discrepancy.toLocaleString()}`}
                        </span>
                    </div>
                 </div>
              </div>

              {/* EXPENSE DETAIL - ENHANCED */}
              <SectionHeader title="Detail Pengeluaran" icon="💸" />
              {shiftData.sExps.length > 0 ? (
                  <table className="w-full text-left text-[9px]">
                    <thead className="text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="py-2">Uraian Biaya (Kategori & Catatan)</th>
                          <th className="py-2 text-right">Nominal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {shiftData.sExps.map(e => (
                            <tr key={e.id}>
                              <td className="py-2 pr-2">
                                <span className="block uppercase font-black text-slate-800 tracking-tighter">
                                  {e.id.startsWith('exp-auto-') ? 'BELANJA STOK' : (expenseTypes.find(t => t.id === e.typeId)?.name || 'LAIN-LAIN')}
                                </span>
                                <span className="block text-[7px] font-bold text-slate-400 italic lowercase leading-tight">
                                  {e.notes || '- no notes -'}
                                </span>
                              </td>
                              <td className="py-2 text-right font-black text-rose-600 align-top whitespace-nowrap">
                                Rp {e.amount.toLocaleString()}
                              </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
              ) : <p className="text-[9px] text-slate-300 italic">Tidak ada pengeluaran shift ini.</p>}

              {/* INVENTORY MUTATION */}
              <SectionHeader title="Mutasi Stok Shift" icon="📦" />
              <table className="w-full text-left text-[8px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                    <tr>
                        <th className="py-2 px-2">Material</th>
                        <th className="py-2 text-center">Awal</th>
                        <th className="py-2 text-center text-emerald-600">In</th>
                        <th className="py-2 text-center text-rose-600">Out</th>
                        <th className="py-2 text-right px-2">Akhir</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {shiftData.mutations.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-black uppercase text-slate-700 truncate max-w-[80px]">{m.name}</td>
                            <td className="py-2 text-center font-bold text-slate-400">{m.start.toFixed(1)}</td>
                            <td className="py-2 text-center font-black text-emerald-500">{m.in > 0 ? `+${m.in}` : '0'}</td>
                            <td className="py-2 text-center font-black text-rose-500">{m.out > 0 ? `-${m.out}` : '0'}</td>
                            <td className="py-2 text-right px-2 font-black text-slate-900">{m.end.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
              </table>

              {/* PRODUCTION LOG */}
              <SectionHeader title="Produksi & Mixing" icon="🧪" />
              {shiftData.sProds.length > 0 ? (
                  <div className="space-y-3">
                    {shiftData.sProds.map(p => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-black uppercase text-[9px] text-indigo-600">{inventory.find(i=>i.id===p.resultItemId)?.name}</span>
                                <span className="font-black text-[10px]">+{p.resultQuantity} {inventory.find(i=>i.id===p.resultItemId)?.unit}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-60">
                                {p.components.map((c, i) => (
                                    <span key={i} className="text-[7px] font-bold uppercase">{inventory.find(inv=>inv.id===c.inventoryItemId)?.name}: -{c.quantity}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                  </div>
              ) : <p className="text-[9px] text-slate-300 italic">Tidak ada aktivitas produksi.</p>}

              {/* PURCHASE LOG */}
              <SectionHeader title="Log Belanja Stok" icon="🚛" />
              {shiftData.sPurchases.length > 0 ? (
                  <table className="w-full text-left text-[9px]">
                     <tbody className="divide-y divide-slate-50">
                        {shiftData.sPurchases.map(p => (
                            <tr key={p.id}><td className="py-2 uppercase font-bold text-slate-600">{p.itemName} ({p.quantity} {inventory.find(i=>i.name===p.itemName)?.unit})</td><td className="py-2 text-right font-black">Rp {p.totalPrice.toLocaleString()}</td></tr>
                        ))}
                     </tbody>
                  </table>
              ) : <p className="text-[9px] text-slate-300 italic">Tidak ada belanja stok.</p>}

              <div className="mt-12 pt-8 border-t-2 border-slate-900 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Verified Mozza Boy Audit Hub</p>
              </div>
           </div>

           <div className="flex gap-2">
              <button onClick={() => {
                if (!reportRef.current) return;
                html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
                   const link = document.createElement('a');
                   link.download = `Full-Audit-${activeOutlet?.name}-${todayStr}.png`;
                   link.href = canvas.toDataURL(); link.click();
                });
              }} className="flex-1 py-4 bg-white border-2 rounded-2xl font-black text-[10px] uppercase shadow-md flex items-center justify-center gap-2">💾 ARSIP LENGKAP</button>
              <button onClick={logout} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">KELUAR POS ➔</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {toast.type && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 w-full max-w-sm px-4">
           <div className={`px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 ${toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-emerald-600 border-emerald-400 text-white'}`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'error' ? '⚠️' : '✅'}
              </div>
              <p className="text-[11px] font-bold uppercase leading-tight">{toast.message}</p>
           </div>
        </div>
      )}

      <div className="bg-white border-b px-4 py-2 shrink-0 flex justify-between items-center z-20">
         <h2 className="text-[10px] font-black text-slate-900 uppercase">Audit Kasir - {shiftName}</h2>
         <p className="text-[8px] font-bold text-slate-400 uppercase">{activeOutlet?.name}</p>
      </div>

      <div className="flex bg-white border-b px-4 py-3 gap-6 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
         <div className="flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase">Modal</span><span className="text-xs font-black text-slate-800">Rp {shiftData.opening.toLocaleString()}</span></div>
         <div className="flex flex-col border-l pl-4 border-slate-100"><span className="text-[7px] font-black text-emerald-500 uppercase">Tunai (+)</span><span className="text-xs font-black text-emerald-600">Rp {shiftData.cashSales.toLocaleString()}</span></div>
         <div className="flex flex-col border-l pl-4 border-slate-100"><span className="text-[7px] font-black text-blue-500 uppercase">QRIS (+)</span><span className="text-xs font-black text-blue-600">Rp {shiftData.qrisSales.toLocaleString()}</span></div>
         <div className="flex flex-col border-l pl-4 border-slate-100"><span className="text-[7px] font-black text-rose-400 uppercase">Pengeluaran (-)</span><span className="text-xs font-black text-rose-500">Rp {shiftData.expTotal.toLocaleString()}</span></div>
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
         <div className={`mb-4 p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${isEarly ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex justify-between items-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jadwal Shift Anda</p>
               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isEarly ? 'bg-orange-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>
                  {isEarly ? 'Closing Early' : 'On Schedule'}
               </span>
            </div>
            <div className="flex justify-between items-end">
               <div className="space-y-1">
                  <p className="text-[11px] font-black text-slate-800 uppercase">{currentUser?.shiftStartTime} - {scheduledEndStr}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Sekarang jam: <span className="text-slate-900">{currentTimeStr}</span></p>
               </div>
               {isEarly && (
                  <p className="text-[8px] font-black text-orange-600 uppercase text-right max-w-[150px] leading-tight">Untuk tutup sebelum jam normal, silahkan hubungi manager.</p>
               )}
            </div>
         </div>

         <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg p-6 flex flex-col justify-center flex-1">
            <div className="text-center mb-6">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Seharusnya di laci (Tunai)</p>
               <h4 className="text-3xl font-black text-slate-900 tracking-tighter">Rp {shiftData.expected.toLocaleString()}</h4>
               <p className="text-[8px] font-black text-blue-500 uppercase mt-2">QRIS: Rp {shiftData.qrisSales.toLocaleString()} (Non-Fisik)</p>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between items-end mb-2 px-1">
                     <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Uang Fisik Sekarang</label>
                     {actualCash > 0 && (
                        <span className={`text-[8px] font-black uppercase ${shiftData.diff === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {shiftData.diff === 0 ? 'PAS ✓' : `SELISIH: Rp ${shiftData.diff.toLocaleString()}`}
                        </span>
                     )}
                  </div>
                  <div className="relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-200">Rp</span>
                     <input type="number" inputMode="numeric" onFocus={e => e.currentTarget.select()} className={`w-full p-6 pl-14 bg-slate-50 border-4 rounded-[32px] text-3xl font-black text-center outline-none transition-all ${shiftData.diff !== 0 && actualCash > 0 ? 'border-rose-200 text-rose-600' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`} value={actualCash || ''} onChange={e => setActualCash(parseInt(e.target.value) || 0)} placeholder="0" />
                  </div>
               </div>
               <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-bold text-center outline-none focus:bg-white" placeholder="Catatan Audit (Wajib jika ada selisih)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
         </div>

         <div className="mt-6">
            <button onClick={handleValidation} className={`w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 border-b-4 ${isSaving ? 'bg-slate-300' : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'}`} style={!isSaving && actualCash > 0 ? { backgroundColor: brandConfig.primaryColor } : {}}>
               {isSaving ? 'MEMPROSES...' : 'CLOSE SHIFT 🏁'}
            </button>
         </div>
      </div>

      {/* MODAL OTORISASI MANAJER */}
      {showApproval && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl scale-in-95">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Otorisasi Manajer</h3>
              <div className="mt-2 p-4 bg-indigo-50 rounded-2xl text-left">
                 <p className="text-indigo-600 text-[9px] font-black uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1">Verifikasi Izin:</p>
                 <p className="text-slate-700 text-[11px] font-bold uppercase leading-relaxed">{approvalReason}</p>
                 <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] font-black uppercase text-slate-400">
                    <div>Jadwal Selesai: <span className="text-slate-900">{scheduledEndStr}</span></div>
                    <div>Jam Sekarang: <span className="text-slate-900">{currentTimeStr}</span></div>
                 </div>
              </div>
              <div className="mt-8 space-y-4">
                 <input type="text" placeholder="Username Manajer" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-500 text-sm text-slate-900" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-500 text-sm text-slate-900" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                 {authError && <p className="text-[9px] font-black text-rose-600 uppercase">{authError}</p>}
                 <div className="flex flex-col gap-3 pt-4">
                    <button onClick={handleAuthorizeAndExecute} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95">VERIFIKASI & CLOSE SHIFT ➔</button>
                    <button onClick={() => { setShowApproval(false); setAuthError(''); }} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Batalkan</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL KONFIRMASI STANDARD */}
      {showConfirm && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl scale-in-95">
              <div className="text-5xl mb-6">📔</div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Konfirmasi Akhiri Shift</h3>
              <p className="text-slate-500 text-xs font-bold uppercase mt-2 leading-relaxed">
                 Uang fisik <span className="text-slate-900 font-black">Rp {actualCash.toLocaleString()}</span> akan dicatat ke audit hari ini. Lanjutkan?
              </p>
              <div className="flex flex-col gap-3 mt-8">
                 <button onClick={() => handleExecute()} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl">IYA, CLOSE SHIFT</button>
                 <button onClick={() => setShowConfirm(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
