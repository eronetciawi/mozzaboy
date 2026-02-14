
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp, getTodayDateString } from '../store';
import { OrderStatus, PaymentMethod, UserRole, InventoryItemType } from '../types';
import html2canvas from 'html2canvas';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, isSaving, logout,
    attendance, brandConfig, staff, inventory, productionRecords, purchases, stockTransfers, expenseTypes
  } = useApp();
  
  const [actualCash, setActualCash] = useState<number | string>(0);
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
  const todayISO = getTodayDateString();
  const todayDisplay = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const currentShiftAttendance = useMemo(() => {
    const records = [...(attendance || [])]
      .filter(a => {
        const recordDate = typeof a.date === 'string' ? a.date : new Date(a.date).toLocaleDateString('en-CA');
        return a.staffId === currentUser?.id && a.outletId === selectedOutletId && recordDate === todayISO;
      })
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    return records[0];
  }, [attendance, currentUser, selectedOutletId, todayISO]);

  const shiftTimeRange = useMemo(() => {
    return {
      start: currentShiftAttendance ? new Date(currentShiftAttendance.clockIn) : new Date(),
      end: new Date()
    };
  }, [currentShiftAttendance]);

  const shiftName = useMemo(() => {
     const startTime = String(currentUser?.shiftStartTime || "10:00");
     const startHourStr = startTime.split(':')[0];
     const startHour = parseInt(startHourStr) || 10;
     if (startHour >= 10 && startHour < 15) return 'SHIFT PAGI';
     if (startHour >= 15) return 'SHIFT MALAM';
     return 'SHIFT PAGI';
  }, [currentUser]);

  const myClosing = useMemo(() => 
    dailyClosings.find(c => {
      const ts = c.timestamp;
      const closingDate = new Date(ts).toLocaleDateString('en-CA');
      return c.staffId === currentUser?.id && c.outletId === selectedOutletId && closingDate === todayISO;
    }),
    [dailyClosings, currentUser, todayISO, selectedOutletId]
  );

  const scheduledTime = `${currentUser?.shiftStartTime || '10:00'} - ${currentUser?.shiftEndTime || '18:00'}`;
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  const isEarly = useMemo(() => {
    const now = new Date();
    const endTime = String(currentUser?.shiftEndTime || '18:00');
    const [eh, em] = endTime.split(':').map(Number);
    const endToday = new Date(); 
    endToday.setHours(eh || 18, em || 0, 0, 0);
    return now.getTime() < endToday.getTime();
  }, [currentUser]);

  const numericActualCash = typeof actualCash === 'string' ? (parseInt(actualCash) || 0) : actualCash;

  // DATA ENGINE UNTUK AUDIT SHIFT
  const shiftData = useMemo(() => {
    // Tentukan range waktu shift (dari absen masuk sampai sekarang/tutup)
    const start = currentShiftAttendance ? new Date(currentShiftAttendance.clockIn) : new Date(new Date().setHours(0,0,0,0));
    const end = myClosing ? new Date(myClosing.timestamp) : new Date();

    const sTxs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === (myClosing?.staffId || currentUser?.id) && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const sExps = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === (myClosing?.staffId || currentUser?.id) && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);
    const sProds = productionRecords.filter(p => p.outletId === selectedOutletId && p.staffId === (myClosing?.staffId || currentUser?.id) && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sPurchases = purchases.filter(p => p.outletId === selectedOutletId && p.staffId === (myClosing?.staffId || currentUser?.id) && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sTrfs = stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && t.staffId === (myClosing?.staffId || currentUser?.id) && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);

    const cashSales = sTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+(b.total ?? 0), 0);
    const qrisSales = sTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+(b.total ?? 0), 0);
    const expTotal = sExps.reduce((a,b)=>a+(b.amount ?? 0), 0);
    
    let opening = 0;
    if (shiftName === 'SHIFT MALAM') {
       const morning = dailyClosings.find(c => {
          const closingDate = new Date(c.timestamp).toLocaleDateString('en-CA');
          return c.outletId === selectedOutletId && c.shiftName === 'SHIFT PAGI' && closingDate === todayISO;
       });
       opening = morning ? (morning.actualCash ?? 0) : 0;
    }

    const expected = (opening + cashSales) - expTotal;
    const diff = numericActualCash - expected;

    // Hitung Mutasi Stok Selama Shift
    const mutations = inventory.filter(i => i.outletId === selectedOutletId).map(item => {
        const inPur = sPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b)=>a+b.quantity, 0);
        const inProd = sProds.filter(p => p.resultItemId === item.id).reduce((a,b)=>a+b.resultQuantity, 0);
        const inTrf = sTrfs.filter(t => t.toOutletId === selectedOutletId && t.itemName === item.name && t.status === 'ACCEPTED').reduce((a,b)=>a+b.quantity, 0);
        
        let outSales = 0;
        sTxs.forEach(tx => tx.items.forEach(it => {
            (it.product.bom || []).forEach(b => {
                const matchedItem = inventory.find(i => i.id === b.inventoryItemId);
                if (b.inventoryItemId === item.id || (matchedItem && matchedItem.name === item.name)) {
                   outSales += (b.quantity * it.quantity);
                }
            });
        }));

        const outProd = sProds.reduce((acc, pr) => {
            const comp = pr.components.find(c => {
               const cItem = inventory.find(i => i.id === c.inventoryItemId);
               return c.inventoryItemId === item.id || (cItem && cItem.name === item.name);
            });
            return acc + (comp?.quantity || 0);
        }, 0);

        const outTrf = sTrfs.filter(t => t.fromOutletId === selectedOutletId && t.itemName === item.name).reduce((a,b)=>a+b.quantity, 0);
        
        const totalIn = inPur + inProd + inTrf;
        const totalOut = outSales + outProd + outTrf;
        const endQty = item.quantity;
        const startQty = endQty - totalIn + totalOut;
        
        return { name: item.name, unit: item.unit, start: startQty, in: totalIn, out: totalOut, end: endQty };
    }).filter(m => m.in > 0 || m.out > 0 || Math.abs(m.start - m.end) > 0.001);

    return { cashSales, qrisSales, expTotal, opening, expected, diff, sExps, sProds, mutations };
  }, [transactions, expenses, dailyClosings, selectedOutletId, currentUser, numericActualCash, shiftName, todayISO, currentShiftAttendance, inventory, productionRecords, purchases, stockTransfers, myClosing]);

  const handleValidation = () => {
    if (isSaving) return;
    if (!currentShiftAttendance) { setToast({ message: "Anda belum melakukan ABSEN MASUK hari ini!", type: 'error' }); return; }
    if (numericActualCash < 0) { setToast({ message: "Uang fisik tidak boleh negatif!", type: 'error' }); return; }
    if (shiftData.diff !== 0 && !notes.trim()) { setToast({ message: "Wajib isi alasan selisih uang!", type: 'error' }); return; }
    const isOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
    if (isEarly && !isOwner) { setApprovalReason(`PULANG AWAL (Shift Selesai: ${currentUser?.shiftEndTime}, Jam Sekarang: ${currentTimeStr}).`); setShowApproval(true); return; }
    if (Math.abs(shiftData.diff) > 50000 && !isOwner) { setApprovalReason(`SELISIH BESAR: Rp ${shiftData.diff.toLocaleString()}.`); setShowApproval(true); return; }
    setShowConfirm(true);
  };

  const handleExecute = async () => {
    try {
      await performClosing(numericActualCash, notes, shiftData.opening, shiftName, shiftData.cashSales, shiftData.qrisSales, shiftData.expTotal, shiftData.diff);
      setToast({ message: "Tutup Buku Berhasil! ✨ Silakan unduh laporan.", type: 'success' });
      setShowConfirm(false); 
      setShowApproval(false);
    } catch (e) {
      setToast({ message: "Gagal menyimpan data ke cloud.", type: 'error' });
    }
  };

  const handleAuthorizeAndExecute = async () => {
    const authorized = staff.find(s => s.username === authUsername && s.password === authPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (authorized) { setAuthError(''); await handleExecute(); } else { setAuthError('Otorisasi Gagal.'); }
  };

  const downloadFinalAuditImage = async () => {
     if (!finalAuditRef.current) return;
     try {
        const element = finalAuditRef.current;
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, allowTaint: true, scrollY: -window.scrollY, windowWidth: 500 });
        const link = document.createElement('a');
        const outletName = activeOutlet?.name || 'Cabang';
        link.download = `DailyReport-${outletName}-${todayISO}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
     } catch (err) { alert("Gagal mengunduh laporan."); }
  };

  const FinanceLine = ({ label, value, isNeg = false, isBold = false, isTotal = false, indent = false }: any) => (
    <div className={`flex justify-between items-center py-2.5 ${isTotal ? 'border-t-2 border-slate-900 mt-2 pt-4' : 'border-b border-slate-50'} ${indent ? 'pl-6' : ''}`}>
      <span className={`text-[10px] uppercase tracking-tight ${isBold ? 'font-black text-slate-900' : 'font-bold text-slate-500'} ${indent ? 'italic' : ''}`}>{label}</span>
      <span className={`font-mono text-[11px] font-black ${isNeg ? 'text-rose-600' : 'text-slate-900'}`}>
        {isNeg ? '-' : ''}Rp {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );

  // VIEW 1: LAPORAN FINAL (SETELAH TUTUP BUKU)
  if (myClosing) {
    const finalizedExpected = (myClosing.openingBalance + myClosing.totalSalesCash) - myClosing.totalExpenses;
    const grossTotal = myClosing.totalSalesCash + myClosing.totalSalesQRIS;

    return (
      <div className="h-full flex flex-col bg-slate-100 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-32">
           <div className="w-full overflow-x-auto pb-4 no-scrollbar flex justify-center">
              <div ref={finalAuditRef} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 text-slate-900 w-[500px] shrink-0 h-auto">
                  {/* HEADER STRUK */}
                  <div className="p-10 border-b-2 border-dashed border-slate-100 text-center bg-slate-50/50">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-xl" style={{ backgroundColor: brandConfig.primaryColor }}>
                      {brandConfig.name.charAt(0)}
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Daily Report</h4>
                    <p className="text-sm font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">{activeOutlet?.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{todayDisplay}</p>
                  </div>

                  <div className="p-10 space-y-10">
                    {/* INFO STAFF */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-[11px]">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Penanggung Jawab</p>
                        <p className="font-black text-slate-800 uppercase leading-tight">{myClosing.staffName}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Jadwal Shift</p>
                        <p className="font-black text-slate-800 uppercase leading-tight">{myClosing.shiftName} ({scheduledTime})</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">Jam Absen Masuk</p>
                        <p className="font-black text-slate-800">{currentShiftAttendance ? new Date(currentShiftAttendance.clockIn).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '--:--'} WIB</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">Jam Tutup & Pulang</p>
                        <p className="font-black text-slate-800">{new Date(myClosing.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB</p>
                      </div>
                    </div>

                    {/* FINANSIAL AUDIT */}
                    <div className="bg-white p-8 rounded-[32px] border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,0.05)]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center border-b pb-4">Ringkasan Audit Finansial</p>
                      <FinanceLine label="1. Modal Awal Shift" value={myClosing.openingBalance} isBold />
                      <FinanceLine label="2. Total Omset (Gross)" value={grossTotal} isBold />
                      <FinanceLine label="Penjualan Tunai (+)" value={myClosing.totalSalesCash} indent />
                      <FinanceLine label="Penjualan QRIS (+)" value={myClosing.totalSalesQRIS} indent />
                      <FinanceLine label="3. Total Pengeluaran (-)" value={myClosing.totalExpenses} isNeg isBold />
                      <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200">
                        <FinanceLine label="Expected (Seharusnya di Laci)" value={finalizedExpected} isBold />
                        <div className="flex justify-between items-center py-4 bg-indigo-50 px-5 rounded-2xl mt-4 border border-indigo-100">
                            <span className="text-[10px] font-black text-indigo-600 uppercase">Input Uang Fisik</span>
                            <span className="text-xl font-black text-indigo-600 underline decoration-2 underline-offset-8">Rp {myClosing.actualCash.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className={`flex justify-between items-center py-5 px-6 rounded-2xl mt-4 border-2 ${myClosing.discrepancy === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        <span className="text-[11px] font-black uppercase tracking-widest">Selisih Audit</span>
                        <span className="text-2xl font-black font-mono">{(myClosing.discrepancy > 0 ? '+' : '')}{myClosing.discrepancy.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* DETAIL PENGELUARAN */}
                    {shiftData.sExps.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Rincian Pengeluaran Kas</p>
                            <div className="space-y-2">
                                {shiftData.sExps.map(e => (
                                    <div key={e.id} className="flex justify-between text-[10px] border-b border-slate-50 pb-2">
                                        <div className="flex-1 pr-4">
                                            <p className="font-black text-slate-800 uppercase leading-tight">{e.notes || 'Operasional'}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">
                                                {expenseTypes.find(t=>t.id===e.typeId)?.name || 'LAINNYA'} • {new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                        <span className="font-mono font-black text-rose-600">Rp {e.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DETAIL PRODUKSI */}
                    {shiftData.sProds.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Log Produksi & Mixing</p>
                            <div className="grid grid-cols-1 gap-2">
                                {shiftData.sProds.map(p => {
                                    const item = inventory.find(i=>i.id===p.resultItemId);
                                    return (
                                        <div key={p.id} className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100">
                                            <div className="flex-1 pr-4">
                                                <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">{item?.name}</p>
                                                <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">JAM: {new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            <span className="font-mono font-black text-indigo-600">+{p.resultQuantity} {item?.unit}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MUTASI INVENTORY */}
                    {shiftData.mutations.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Audit Mutasi Stok</p>
                            <div className="overflow-hidden border-2 border-slate-100 rounded-[24px]">
                                <table className="w-full text-left text-[8px] table-auto border-collapse">
                                    <thead className="bg-slate-900 text-white font-black uppercase">
                                        <tr>
                                            <th className="p-3">Material</th>
                                            <th className="p-3 text-right">Awal</th>
                                            <th className="p-3 text-right">In</th>
                                            <th className="p-3 text-right">Out</th>
                                            <th className="p-3 text-right">Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {shiftData.mutations.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-black uppercase text-slate-700 leading-tight">{m.name}</td>
                                                <td className="p-3 text-right font-mono text-slate-400">{(m.start || 0).toFixed(1)}</td>
                                                <td className="p-3 text-right font-mono text-emerald-600">+{(m.in || 0).toFixed(1)}</td>
                                                <td className="p-3 text-right font-mono text-rose-600">-{(m.out || 0).toFixed(1)}</td>
                                                <td className="p-3 text-right font-mono font-black bg-slate-50/50">{(m.end || 0).toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CATATAN */}
                    {myClosing.notes && (
                      <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 italic text-[11px] text-amber-900 leading-relaxed shadow-inner">
                          <p className="text-[8px] font-black text-amber-600 uppercase mb-2 not-italic tracking-widest">Catatan Auditor Kasir:</p>
                          "{myClosing.notes}"
                      </div>
                    )}

                    {/* FOOTER STRUK */}
                    <div className="pt-10 text-center border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] mb-1">{brandConfig.name} OS Enterprise</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-none">Verification ID: {myClosing.id.slice(-12).toUpperCase()}</p>
                    </div>
                  </div>
              </div>
           </div>

           <div className="flex flex-col gap-3 no-print">
              <button onClick={downloadFinalAuditImage} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">📥 DOWNLOAD REPORT</button>
              <button onClick={logout} className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-all">SELESAI & KELUAR ➔</button>
           </div>
        </div>
      </div>
    );
  }

  // VIEW 2: FORM TUTUP BUKU (SEBELUM DATA DISIMPAN)
  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {toast.type && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[700] animate-in slide-in-from-top-10 duration-500 w-full px-4 max-w-sm">
           <div className={`bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 border-2 ${toast.type === 'error' ? 'border-rose-500' : 'border-emerald-500'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                {toast.type === 'error' ? '⚠️' : '✅'}
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest leading-tight">{toast.message}</p>
           </div>
        </div>
      )}

      {!currentShiftAttendance ? (
         <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[32px] flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">⚠️</div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Shift Belum Aktif</h3>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-4 leading-relaxed max-w-xs">
               Anda belum melakukan ABSEN MASUK hari ini. Silakan ke menu <b>CREW ACCESS</b> untuk memulai shift sebelum melakukan tutup buku.
            </p>
         </div>
      ) : (
      <>
      <div className="bg-white border-b px-4 py-2 md:px-6 md:py-3 shrink-0 flex justify-between items-center z-20 shadow-sm">
         <h2 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest">End Shift Audit - {shiftName}</h2>
         <p className="text-[9px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{todayDisplay}</p>
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
         <div className={`mb-4 p-4 rounded-[24px] border-2 flex items-center justify-between transition-all shrink-0 ${isEarly ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-50'}`}>
            <div className="flex flex-col">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shift Kasir: {currentUser?.name}</p>
               <p className="text-[11px] font-black text-slate-700 uppercase">{shiftName} | Absen: {new Date(currentShiftAttendance.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
            <div className="text-right">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Sekarang</p>
               <p className={`text-[11px] font-black uppercase ${isEarly ? 'text-orange-600' : 'text-emerald-600'}`}>{currentTimeStr} • {isEarly ? 'TUTUP AWAL' : 'SESUAI'}</p>
            </div>
         </div>

         <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-xl p-8 flex flex-col justify-center shrink-0 mb-6">
            <div className="text-center mb-8">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Total Uang Tunai Di Laci Seharusnya</p>
               <h4 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">Rp {shiftData.expected.toLocaleString()}</h4>
               <p className="text-[8px] font-bold text-slate-300 uppercase mt-2">(Modal Awal + Sales Tunai - Biaya Operasional)</p>
            </div>

            <div className="space-y-5">
               <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-200">Rp</span>
                  <input 
                     type="number" 
                     inputMode="numeric" 
                     onFocus={e => e.currentTarget.select()} 
                     className={`w-full p-8 pl-20 bg-slate-50 border-4 rounded-[32px] text-4xl md:text-6xl font-black text-center outline-none transition-all ${shiftData.diff !== 0 && numericActualCash > 0 ? 'border-rose-200 text-rose-600' : 'border-slate-100 text-slate-900 focus:border-indigo-500'}`} 
                     value={actualCash} 
                     onChange={e => setActualCash(e.target.value)} 
                     placeholder="0" 
                  />
               </div>
               
               {numericActualCash >= 0 && shiftData.diff !== 0 && (
                  <div className="flex justify-center">
                     <span className={`text-[10px] font-black uppercase px-6 py-2 rounded-full shadow-sm border-2 ${shiftData.diff === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                        SELISIH AUDIT: Rp {shiftData.diff.toLocaleString()}
                     </span>
                  </div>
               )}

               <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-[11px] font-black text-center outline-none focus:bg-white focus:border-indigo-200 shadow-inner uppercase tracking-wider" placeholder="Alasan Selisih / Pesan Audit" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
         </div>

         <div className="pb-32 px-4">
            <button 
               onClick={handleValidation} 
               className={`w-full py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 border-b-8 ${isSaving ? 'bg-slate-300' : 'bg-slate-900 border-slate-700 text-white'}`} 
               style={!isSaving ? { backgroundColor: brandConfig.primaryColor } : {}}
            >
               {isSaving ? 'SINKRONISASI...' : 'KONFIRMASI & ABSEN PULANG 🏁'}
            </button>
            <p className="text-center text-[8px] font-black text-slate-400 uppercase mt-4 tracking-widest">*Tutup buku sekaligus mencatat jam pulang kerja Anda secara otomatis.</p>
         </div>
      </div>
      </>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[650] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🎯</div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Finalisasi & Pulang</h3>
              <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-3">
                 <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                    <span>Uang Fisik Setor:</span>
                    <span className="text-slate-900 font-mono">Rp {numericActualCash.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                    <span>Selisih Audit:</span>
                    <span className={shiftData.diff === 0 ? 'text-emerald-600' : 'text-rose-600'}>Rp {shiftData.diff.toLocaleString()}</span>
                 </div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-10 leading-relaxed px-2">Data akan dikunci dan sistem mencatat jam pulang Anda sekarang. Lanjutkan?</p>
              <div className="space-y-4">
                 <button 
                    disabled={isSaving}
                    onClick={handleExecute} 
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95"
                    style={{ backgroundColor: brandConfig.primaryColor }}
                 >
                    {isSaving ? 'SEDANG MENYIMPAN...' : 'YA, TUTUP & ABSEN PULANG 🚀'}
                 </button>
                 <button onClick={() => setShowConfirm(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px]">Periksa Lagi</button>
              </div>
           </div>
        </div>
      )}

      {showApproval && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center shadow-2xl scale-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🔒</div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Otorisasi Supervisor</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-10 leading-relaxed">{approvalReason}</p>
              <div className="space-y-5">
                 <input type="text" placeholder="Username Manajer" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black outline-none text-sm" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black outline-none text-sm" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                 {authError && <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{authError}</p>}
                 <button onClick={handleAuthorizeAndExecute} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95">IZINKAN PENGAJUAN ➔</button>
                 <button onClick={() => { setShowApproval(false); setAuthError(''); }} className="w-full py-2 text-slate-400 font-black uppercase text-[10px]">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
