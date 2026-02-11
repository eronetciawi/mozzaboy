
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
  const finalAuditRef = useRef<HTMLDivElement>(null);

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
        const endQty = item.quantity;
        const startQty = endQty - totalIn + totalOut;

        return { name: item.name, unit: item.unit, in: totalIn, out: totalOut, start: startQty, end: endQty };
    }).filter(m => m.in > 0 || m.out > 0 || m.start !== m.end);

    return { 
      cashSales, qrisSales, expTotal, opening, expected, diff, 
      totalTrx: sTxs.length, sExps, sProds, sPurchases, sTrfs, mutations 
    };
  }, [transactions, expenses, dailyClosings, selectedOutletId, currentUser, actualCash, shiftName, todayStr, shiftTimeRange, inventory, productionRecords, purchases, stockTransfers]);

  const handleValidation = () => {
    if (isSaving) return;
    if (actualCash < 0) { setToast({ message: "Uang fisik tidak boleh negatif!", type: 'error' }); return; }
    if (actualCash === 0 && shiftData.expected > 0) { setToast({ message: "Mohon masukkan jumlah uang fisik di laci!", type: 'error' }); return; }
    if (shiftData.diff !== 0 && !notes.trim()) { setToast({ message: "Wajib isi catatan penjelasan jika ada selisih uang!", type: 'error' }); return; }
    const isOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
    if (isEarly && !isOwner) { setApprovalReason(`PULANG AWAL (Jadwal: ${scheduledEndStr}, Jam: ${currentTimeStr}).`); setShowApproval(true); return; }
    if (Math.abs(shiftData.diff) > 50000 && !isOwner) { setApprovalReason(`SELISIH BESAR: Rp ${shiftData.diff.toLocaleString()}.`); setShowApproval(true); return; }
    setShowConfirm(true);
  };

  const handleAuthorizeAndExecute = () => {
    const manager = staff.find(s => s.username === authUsername && s.password === authPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (manager) { handleExecute(); setAuthUsername(''); setAuthPassword(''); setAuthError(''); } 
    else { setAuthError("Otorisasi Gagal."); }
  };

  const handleExecute = async () => {
    try {
      await performClosing(actualCash, notes, shiftData.opening, shiftName, shiftData.cashSales, shiftData.qrisSales, shiftData.expTotal, shiftData.diff);
      setToast({ message: "Tutup Buku Berhasil!", type: 'success' });
      setShowConfirm(false); setShowApproval(false);
    } catch (e) {
      setToast({ message: "Gagal menyimpan data.", type: 'error' });
    }
  };

  const downloadFinalAuditImage = async () => {
     if (!finalAuditRef.current) return;
     try {
        const canvas = await html2canvas(finalAuditRef.current, { scale: 3, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `Laporan-Daily-Audit-${currentUser?.name}-${todayStr}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
     } catch (err) {
        alert("Gagal mengunduh laporan.");
     }
  };

  const FinanceRow = ({ label, value, isNegative = false, colorClass = "" }: any) => (
    <div className="flex justify-between items-center text-[10px] py-1 border-b border-slate-50 last:border-0">
      <span className="font-bold text-slate-500 uppercase tracking-tight">{label}</span>
      <span className={`font-mono font-black ${isNegative ? 'text-rose-600' : colorClass || 'text-slate-900'}`}>
        {isNegative ? '-' : ''}Rp {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );

  if (myClosing) {
    return (
      <div className="h-full flex flex-col bg-slate-100 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-xl mx-auto w-full space-y-6 pb-32">
           {/* FINAL AUDIT RECEIPT VIEW */}
           <div ref={finalAuditRef} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 text-slate-900">
                <div className="p-8 border-b-2 border-dashed border-slate-100 text-center bg-slate-50/50">
                  {brandConfig.logoUrl ? (
                    <img src={brandConfig.logoUrl} className="w-14 h-14 object-contain mx-auto mb-4" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-[20px] flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-xl">{brandConfig.name.charAt(0)}</div>
                  )}
                  <h4 className="text-base font-black text-slate-900 uppercase tracking-tighter">Daily Report</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-[0.2em]">{activeOutlet?.name || 'Verified Digital Audit'}</p>
                </div>

                <div className="p-8 space-y-8">
                  {/* IDENTITAS SHIFT & ABSENSI */}
                  <div className="grid grid-cols-2 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Kasir PIC</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{myClosing.staffName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Shift / Jadwal</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{myClosing.shiftName} ({currentUser?.shiftStartTime} - {currentUser?.shiftEndTime})</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-indigo-500 uppercase">Absen Masuk</p>
                      <p className="text-[11px] font-black text-indigo-600 uppercase">
                        {currentShiftAttendance ? new Date(currentShiftAttendance.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'} WIB
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Selesai Tutup Buku</p>
                      <p className="text-[11px] font-black text-slate-800 uppercase">{new Date(myClosing.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 w-full border-b border-dashed"></div>

                  {/* RINGKASAN FINANSIAL */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ringkasan Finansial</p>
                    <div className="bg-slate-50/50 p-4 rounded-2xl space-y-1">
                      <FinanceRow label="Modal Awal Shift" value={myClosing.openingBalance} />
                      <FinanceRow label="Penjualan Tunai (+)" value={myClosing.totalSalesCash} colorClass="text-emerald-600" />
                      <FinanceRow label="Penjualan QRIS (+)" value={myClosing.totalSalesQRIS} colorClass="text-blue-600" />
                      <FinanceRow label="Total Pengeluaran (-)" value={myClosing.totalExpenses} isNegative />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-900 rounded-2xl p-4 text-white">
                          <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Uang Tunai di Laci</p>
                          <p className="text-base font-black font-mono">Rp {myClosing.actualCash.toLocaleString()}</p>
                       </div>
                       <div className={`rounded-2xl p-4 border-2 ${myClosing.discrepancy === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          <p className="text-[7px] font-black opacity-60 uppercase mb-1">Selisih (Diff)</p>
                          <p className="text-base font-black font-mono">{(myClosing.discrepancy > 0 ? '+' : '')}{myClosing.discrepancy.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>

                  {/* RINCIAN PENGELUARAN LENGKAP */}
                  {shiftData.sExps.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Rincian Biaya Operasional</p>
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                         <table className="w-full text-left text-[8px]">
                            <thead className="bg-slate-50 border-b">
                               <tr className="text-slate-400 uppercase">
                                  <th className="p-3">Kategori & Keterangan</th>
                                  <th className="p-3 text-right">Nominal</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {shiftData.sExps.map((exp, idx) => {
                                 const isAuto = exp.id.startsWith('exp-auto-');
                                 const type = isAuto ? "BELANJA STOK" : (expenseTypes.find(t => t.id === exp.typeId)?.name || 'Lain-lain');
                                 const expTime = new Date(exp.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                 return (
                                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-3">
                                         <p className={`font-black uppercase leading-none ${isAuto ? 'text-orange-600' : 'text-slate-800'}`}>
                                            {type} <span className="ml-1 text-[7px] text-slate-400 font-bold opacity-60">[{expTime}]</span>
                                         </p>
                                         <p className="text-slate-400 italic mt-1 font-medium line-clamp-1">{exp.notes || '-'}</p>
                                      </td>
                                      <td className="p-3 text-right font-black text-rose-600 whitespace-nowrap">Rp {exp.amount.toLocaleString()}</td>
                                   </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  {/* RINCIAN PRODUKSI / MIXING */}
                  {shiftData.sProds.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Data Produksi & Mixing</p>
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                         <table className="w-full text-left text-[8px]">
                            <thead className="bg-slate-50 border-b">
                               <tr className="text-slate-400 uppercase">
                                  <th className="p-3">Item Hasil</th>
                                  <th className="p-3 text-right">Jumlah</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {shiftData.sProds.map((prod, idx) => {
                                 const item = inventory.find(i => i.id === prod.resultItemId);
                                 const prodTime = new Date(prod.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                 return (
                                   <tr key={idx}>
                                      <td className="p-3">
                                         <p className="font-black uppercase text-indigo-600">{item?.name || 'Hasil Olahan'}</p>
                                         <p className="text-[6px] text-slate-400 font-bold uppercase tracking-widest">Waktu Input: {prodTime} WIB</p>
                                      </td>
                                      <td className="p-3 text-right font-black text-slate-700">+{prod.resultQuantity} {item?.unit}</td>
                                   </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  {/* RINCIAN TRANSFER STOK */}
                  {shiftData.sTrfs.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Log Transfer Stok Antar Cabang</p>
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                         <table className="w-full text-left text-[8px]">
                            <thead className="bg-indigo-900 text-white uppercase">
                               <tr>
                                  <th className="p-3">Item & Alur</th>
                                  <th className="p-3 text-right">Jumlah</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {shiftData.sTrfs.map((tr, idx) => {
                                 const isOut = tr.fromOutletId === selectedOutletId;
                                 return (
                                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-3">
                                         <p className="font-black text-slate-800 uppercase">{tr.itemName}</p>
                                         <p className="text-[6px] text-slate-400 font-medium uppercase">
                                            {isOut ? `Ke: ${tr.toOutletName}` : `Dari: ${tr.fromOutletName}`}
                                         </p>
                                      </td>
                                      <td className={`p-3 text-right font-black ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                                         {isOut ? '-' : '+'}{tr.quantity} {tr.unit}
                                      </td>
                                   </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  {/* MUTASI STOK LENGKAP */}
                  {shiftData.mutations.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Laporan Mutasi Stok Harian</p>
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                         <table className="w-full text-left text-[8px]">
                            <thead className="bg-slate-900 text-white text-center">
                               <tr className="uppercase tracking-tighter">
                                  <th className="p-2 text-left">Item</th>
                                  <th className="p-2">Awal</th>
                                  <th className="p-2 text-emerald-400">Masuk</th>
                                  <th className="p-2 text-rose-400">Keluar</th>
                                  <th className="p-2 bg-slate-800">Sisa</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {shiftData.mutations.map((m, idx) => (
                                 <tr key={idx} className="text-center font-bold">
                                    <td className="p-2 text-left font-black uppercase text-slate-800 leading-tight">
                                      {m.name}
                                      <span className="block text-[6px] text-slate-400 font-normal">({m.unit})</span>
                                    </td>
                                    <td className="p-2 text-slate-400">{m.start}</td>
                                    <td className="p-2 text-emerald-600">{(m.in > 0 ? `+${m.in}` : '0')}</td>
                                    <td className="p-2 text-rose-600">{(m.out > 0 ? `-${m.out}` : '0')}</td>
                                    <td className="p-2 bg-slate-50 font-black text-slate-900">{m.end}</td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mb-0.5">Mozza Boy Food OS</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase italic mb-1">Insya Allah Berkah</p>
                    <p className="text-[6px] font-bold text-slate-200 uppercase">System Hash ID: {myClosing.id}</p>
                  </div>
                </div>
           </div>

           <div className="flex flex-col gap-3">
              <button 
                onClick={downloadFinalAuditImage}
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                 <span>📥</span> DOWNLOAD DAILY REPORT
              </button>
              <button 
                onClick={logout} 
                className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-all"
              >
                 KELUAR SESI POS ➔
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      <div className="bg-white border-b px-4 py-2 md:px-6 md:py-3 shrink-0 flex justify-between items-center z-20 shadow-sm">
         <h2 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest">Daily Audit - {shiftName}</h2>
         <p className="text-[9px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{activeOutlet?.name}</p>
      </div>

      <div className="flex bg-white border-b px-4 py-3 md:px-6 md:py-4 gap-4 md:gap-8 overflow-x-auto no-scrollbar shrink-0 shadow-md">
         <div className="flex flex-col shrink-0">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5">Modal Awal</span>
            <span className="text-[16px] md:text-[20px] font-black text-slate-800 tracking-tighter">Rp {shiftData.opening.toLocaleString()}</span>
         </div>
         <div className="flex flex-col shrink-0 border-l pl-4 md:pl-8 border-slate-100">
            <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase mb-0.5">Tunai (+)</span>
            <span className="text-[16px] md:text-[20px] font-black text-emerald-600 tracking-tighter">Rp {shiftData.cashSales.toLocaleString()}</span>
         </div>
         <div className="flex flex-col shrink-0 border-l pl-4 md:pl-8 border-slate-100">
            <span className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase mb-0.5">QRIS (+)</span>
            <span className="text-[16px] md:text-[20px] font-black text-blue-600 tracking-tighter">Rp {shiftData.qrisSales.toLocaleString()}</span>
         </div>
         <div className="flex flex-col shrink-0 border-l pl-4 md:pl-8 border-slate-100">
            <span className="text-[8px] md:text-[10px] font-black text-rose-400 uppercase mb-0.5">Biaya (-)</span>
            <span className="text-[16px] md:text-[20px] font-black text-rose-500 tracking-tighter">Rp {shiftData.expTotal.toLocaleString()}</span>
         </div>
      </div>

      <div className="flex-1 p-3 md:p-6 overflow-y-auto custom-scrollbar">
         <div className={`mb-4 p-3 md:p-4 rounded-2xl border-2 flex items-center justify-between transition-all shrink-0 ${isEarly ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-50'}`}>
            <div className="flex flex-col">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jadwal Shift</p>
               <p className="text-[10px] font-black text-slate-700 uppercase">{currentUser?.shiftStartTime} - {scheduledEndStr}</p>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Waktu Sekarang</p>
               <p className={`text-[10px] font-black uppercase ${isEarly ? 'text-orange-600' : 'text-emerald-600'}`}>{currentTimeStr} • {isEarly ? 'Tutup Awal' : 'Sesuai'}</p>
            </div>
         </div>

         <div className="bg-white rounded-[32px] md:rounded-[40px] border-2 border-slate-100 shadow-xl p-6 md:p-8 flex flex-col justify-center shrink-0 mb-4">
            <div className="text-center mb-6">
               <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Uang Tunai Di Laci Seharusnya</p>
               <h4 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">Rp {shiftData.expected.toLocaleString()}</h4>
            </div>

            <div className="space-y-4">
               <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-200">Rp</span>
                  <input 
                     type="number" 
                     inputMode="numeric" 
                     onFocus={e => e.currentTarget.select()} 
                     className={`w-full p-6 pl-16 bg-slate-50 border-2 rounded-[24px] md:rounded-[32px] text-3xl md:text-5xl font-black text-center outline-none transition-all ${shiftData.diff !== 0 && actualCash > 0 ? 'border-rose-200 text-rose-600' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`} 
                     value={actualCash || ''} 
                     onChange={e => setActualCash(parseInt(e.target.value) || 0)} 
                     placeholder="0" 
                  />
               </div>
               
               {actualCash > 0 && shiftData.diff !== 0 && (
                  <div className="flex justify-center">
                     <span className={`text-[9px] font-black uppercase px-4 py-1 rounded-full ${shiftData.diff === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        SELISIH: Rp {shiftData.diff.toLocaleString()}
                     </span>
                  </div>
               )}

               <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-[10px] font-bold text-center outline-none focus:bg-white focus:border-indigo-200 shadow-inner" placeholder="Pesan/Catatan Audit (Opsional)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
         </div>

         <div className="pb-24">
            <button onClick={handleValidation} className={`w-full py-6 md:py-8 rounded-[24px] md:rounded-[32px] font-black text-xs md:text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 border-b-8 ${isSaving ? 'bg-slate-300' : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'}`} style={!isSaving && actualCash > 0 ? { backgroundColor: brandConfig.primaryColor } : {}}>
               {isSaving ? 'MEMPROSES...' : 'VERIFIKASI & TUTUP BUKU 🏁'}
            </button>
         </div>
      </div>

      {showApproval && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl scale-in-95">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8">Otorisasi Manajer</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none text-sm" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none text-sm" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                 {authError && <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{authError}</p>}
                 <button onClick={handleAuthorizeAndExecute} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95">IZINKAN SEKARANG ➔</button>
                 <button onClick={() => { setShowApproval(false); setAuthError(''); }} className="w-full py-2 text-slate-400 font-black uppercase text-[10px]">Tutup</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
