
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, DailyClosing, UserRole, Product, InventoryItemType } from '../types';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, inventory, purchases, stockTransfers, staff, productionRecords, products, expenseTypes
  } = useApp();
  
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedClosingReport, setSelectedClosingReport] = useState<DailyClosing | null>(null);

  const [approvalUsername, setApprovalUsername] = useState('');
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');

  const isManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const todayDate = new Date();
  const todayStr = todayDate.toDateString();
  const startOfToday = new Date(todayDate);
  startOfToday.setHours(0,0,0,0);

  const shiftStartHour = parseInt((currentUser?.shiftStartTime || '10:00').split(':')[0]);
  const isShift1 = shiftStartHour < 14;
  const isShift2 = shiftStartHour >= 14;

  const myClosingToday = useMemo(() => {
    return dailyClosings.find(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser?.id && 
      new Date(c.timestamp).toDateString() === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser, todayStr]);

  const allClosingsToday = useMemo(() => {
    return dailyClosings.filter(c => 
      c.outletId === selectedOutletId && 
      new Date(c.timestamp).toDateString() === todayStr
    );
  }, [dailyClosings, selectedOutletId, todayStr]);

  const openingBalanceFromPreviousShift = useMemo(() => {
     if (isShift2) {
        const prevClosing = allClosingsToday.find(c => {
           const s = staff.find(st => st.id === c.staffId);
           const sh = parseInt((s?.shiftStartTime || '10:00').split(':')[0]);
           return sh < 14;
        });
        return prevClosing ? prevClosing.actualCash : 0;
     }
     return 0;
  }, [allClosingsToday, isShift2, staff]);

  const shiftTxs = transactions.filter(tx => 
    tx.outletId === selectedOutletId && 
    new Date(tx.timestamp) >= startOfToday && 
    tx.cashierId === currentUser?.id && 
    tx.status === OrderStatus.CLOSED
  );
  
  const totalSalesCash = shiftTxs.filter(tx => tx.paymentMethod === PaymentMethod.CASH).reduce((acc, tx) => acc + tx.total, 0);
  const totalSalesQRIS = shiftTxs.filter(tx => tx.paymentMethod === PaymentMethod.QRIS).reduce((acc, tx) => acc + tx.total, 0);
  
  const totalExpenses = expenses.filter(ex => 
    ex.outletId === selectedOutletId && 
    new Date(ex.timestamp) >= startOfToday && 
    ex.staffId === currentUser?.id
  ).reduce((acc, ex) => acc + ex.amount, 0);

  const expectedCash = openingBalanceFromPreviousShift + totalSalesCash - totalExpenses;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0;

  const isEarlyClosing = useMemo(() => {
     if (!isShift2) return false;
     const currentHour = todayDate.getHours();
     return currentHour < 22;
  }, [isShift2, todayDate]);

  const handleClosing = () => {
    performClosing(actualCash, notes);
    setShowConfirm(false);
    setActualCash(0);
    setNotes('');
  };

  const handleManagerOverride = () => {
    const approver = staff.find(s => s.username === approvalUsername && s.password === approvalPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (approver) {
      setShowApproval(false);
      performClosing(actualCash, notes + ` [Shift Override by ${approver.name}]`);
      setApprovalError('');
      setActualCash(0);
      setNotes('');
    } else {
      setApprovalError('Kredensial Manager salah.');
    }
  };

  const calculateDetailedMovement = (reportDate: Date, staffId: string) => {
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && tx.cashierId === staffId && new Date(tx.timestamp) >= start && new Date(tx.timestamp) <= end && tx.status === OrderStatus.CLOSED);
    const periodPurchases = purchases.filter(p => p.outletId === selectedOutletId && p.staffId === staffId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const periodTransfers = stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && t.staffId === staffId && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const periodProduction = productionRecords.filter(p => p.outletId === selectedOutletId && p.staffId === staffId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);

    return inventory.filter(i => i.outletId === selectedOutletId).map(item => {
      let soldQty = 0;
      periodTxs.forEach(tx => {
        tx.items.forEach(cartItem => {
          const processBOM = (prod: Product, multiplier: number) => {
            if (prod.isCombo && prod.comboItems) {
               prod.comboItems.forEach(ci => {
                  const inner = products.find(p => p.id === ci.productId);
                  if (inner) processBOM(inner, multiplier * ci.quantity);
               });
            } else {
               prod.bom.forEach(bom => {
                  const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
                  if (templateItem && templateItem.name === item.name) soldQty += (bom.quantity * multiplier);
               });
            }
          };
          processBOM(cartItem.product, cartItem.quantity);
        });
      });
      const pIn = periodPurchases.filter(p => p.inventoryItemId === item.id).reduce((acc, b) => acc + b.quantity, 0);
      const tIn = periodTransfers.filter(t => t.toOutletId === selectedOutletId && t.itemName === item.name).reduce((acc, b) => acc + b.quantity, 0);
      const tOut = periodTransfers.filter(t => t.fromOutletId === selectedOutletId && t.itemName === item.name).reduce((acc, b) => acc + b.quantity, 0);
      const prIn = periodProduction.filter(p => p.resultItemId === item.id).reduce((acc, b) => acc + b.resultQuantity, 0);
      let prOut = 0;
      periodProduction.forEach(p => p.components.forEach(c => { if(c.inventoryItemId === item.id) prOut += c.quantity; }));
      const final = item.quantity;
      const initial = final + (soldQty + tOut + prOut) - (pIn + tIn + prIn);
      return { name: item.name, unit: item.unit, initial, plus: pIn + tIn + prIn, minus: soldQty + tOut + prOut, final };
    }).filter(i => i.initial !== i.final || i.plus > 0 || i.minus > 0);
  };

  const renderAuditReport = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const movement = calculateDetailedMovement(reportDate, cls.staffId);
    return (
      <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-start justify-center p-0 md:p-6 overflow-y-auto" onClick={() => setSelectedClosingReport(null)}>
        <div className="bg-white rounded-none md:rounded-lg w-full max-w-4xl my-0 md:my-10 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-50">
            <h3 className="font-black text-slate-900 uppercase">Laporan Audit Shift</h3>
            <button onClick={() => setSelectedClosingReport(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">✕</button>
          </div>
          <div className="p-10 space-y-8 font-mono text-[11px]">
             <div className="text-center space-y-2 mb-10">
                <h2 className="text-xl font-black uppercase">Mozza Boy Enterprise</h2>
                <p>{activeOutlet?.name}</p>
                <div className="border-b border-dashed border-slate-300 w-full"></div>
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><span>TANGGAL</span><span>{reportDate.toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>KASIR</span><span>{cls.staffName}</span></div>
                <div className="flex justify-between"><span>WAKTU TUTUP</span><span>{reportDate.toLocaleTimeString()}</span></div>
             </div>
             <div className="border-b border-dashed border-slate-300 w-full"></div>
             <div className="space-y-4">
                <div className="flex justify-between font-black"><span>PENJUALAN TUNAI</span><span>Rp {cls.totalSalesCash.toLocaleString()}</span></div>
                <div className="flex justify-between font-black"><span>DIGITAL (QRIS)</span><span>Rp {cls.totalSalesQRIS.toLocaleString()}</span></div>
                <div className="flex justify-between font-black text-red-600"><span>PENGELUARAN (-)</span><span>Rp {cls.totalExpenses.toLocaleString()}</span></div>
                <div className="border-b border-slate-900 w-full"></div>
                <div className="flex justify-between text-base font-black"><span>TOTAL FISIK KAS</span><span>Rp {cls.actualCash.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-500 font-bold"><span>SELISIH (VAR)</span><span>Rp {cls.discrepancy.toLocaleString()}</span></div>
             </div>
             <div className="border-b border-dashed border-slate-300 w-full pt-10"></div>
             <h4 className="font-black uppercase text-center mt-4">Audit Stok Material</h4>
             <table className="w-full text-left">
                <thead><tr className="border-b border-slate-300"><th className="py-2">ITEM</th><th className="py-2 text-right">AWAL</th><th className="py-2 text-right">PEMAKAIAN</th><th className="py-2 text-right">AKHIR</th></tr></thead>
                <tbody>
                   {movement.map(m => (
                     <tr key={m.name} className="border-b border-slate-100">
                        <td className="py-2">{m.name}</td>
                        <td className="py-2 text-right">{m.initial.toFixed(1)}</td>
                        <td className="py-2 text-right text-red-500">-{m.minus.toFixed(1)}</td>
                        <td className="py-2 text-right font-black">{m.final.toFixed(1)}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
             <div className="pt-20 text-center italic opacity-30">-- Laporan Audit Digital Mozza Boy POS --</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-24 md:pb-8">
      <div className="mb-4">
         <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Serah Terima Kasir</h2>
         <p className="text-slate-500 font-medium text-[9px] uppercase tracking-widest italic leading-none mt-1">{activeOutlet?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          {!myClosingToday ? (
             <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                   <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Status Kas: {currentUser?.name}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{isShift1 ? 'SHIFT 1 (PAGI)' : 'SHIFT 2 (SORE/END)'}</p>
                   </div>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner">📔</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* BAGIAN DATA REKAP (LEBIH COMPACT DENGAN GRID 2X2) */}
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                         {isShift2 ? (
                            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                               <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Modal Awal</p>
                               <p className="text-xs font-black text-indigo-800">Rp {openingBalanceFromPreviousShift.toLocaleString()}</p>
                            </div>
                         ) : (
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center opacity-40">
                               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modal Awal</p>
                               <p className="text-xs font-black text-slate-800">Rp 0</p>
                            </div>
                         )}
                         <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Jualan Tunai</p>
                            <p className="text-xs font-black text-emerald-800">Rp {totalSalesCash.toLocaleString()}</p>
                         </div>
                         <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col justify-center">
                            <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Jualan QRIS</p>
                            <p className="text-xs font-black text-blue-800">Rp {totalSalesQRIS.toLocaleString()}</p>
                         </div>
                         <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex flex-col justify-center">
                            <p className="text-[7px] font-black text-red-400 uppercase tracking-widest mb-0.5">Biaya Keluar</p>
                            <p className="text-xs font-black text-red-600">Rp {totalExpenses.toLocaleString()}</p>
                         </div>
                      </div>

                      <div className="p-6 bg-slate-900 rounded-[28px] text-white shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-10 text-3xl transform rotate-12">🏁</div>
                         <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Target Kas Fisik (Tunai)</p>
                         <p className="text-2xl font-black text-orange-500 tracking-tighter">Rp {expectedCash.toLocaleString()}</p>
                      </div>
                   </div>

                   {/* BAGIAN INPUT (DITINGKATKAN PRIORITAS VISUALNYA) */}
                   <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-800 uppercase text-center block tracking-widest">Hitung Uang Fisik Di Laci</label>
                         <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">Rp</span>
                            <input 
                              type="number" 
                              onFocus={e => e.target.select()}
                              className={`w-full p-5 pl-12 bg-slate-50 border-4 rounded-[28px] text-2xl font-black text-center focus:outline-none transition-all ${hasDiscrepancy && actualCash > 0 ? 'border-red-500 text-red-600' : 'border-slate-100 text-slate-900 focus:border-orange-500'}`}
                              value={actualCash || ''}
                              onChange={e => setActualCash(parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                         </div>
                      </div>
                      
                      {hasDiscrepancy && actualCash > 0 && (
                         <div className="p-2 bg-red-600 text-white rounded-2xl text-center animate-in zoom-in-95 duration-300">
                            <p className="text-[8px] font-black uppercase tracking-widest">Selisih Kas: Rp {discrepancy.toLocaleString()}</p>
                         </div>
                      )}
                      
                      <textarea 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] h-16 outline-none focus:border-orange-500 shadow-inner resize-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Catatan kendala shift..."
                      />
                      
                      <button 
                        onClick={() => {
                           if(isEarlyClosing && !isManager) {
                              setApprovalError("Dilarang tutup toko sebelum jam 22:00. Butuh otorisasi Manager.");
                              setShowApproval(true);
                           } else if(hasDiscrepancy && !isManager) {
                              setApprovalError("Ada selisih kas. Butuh otorisasi Manager untuk konfirmasi.");
                              setShowApproval(true);
                           } else {
                              setShowConfirm(true);
                           }
                        }}
                        className="w-full py-4 bg-orange-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                      >
                        {isShift1 ? 'SERAH TERIMA ➔' : 'TUTUP TOKO 🏁'}
                      </button>
                   </div>
                </div>
             </div>
          ) : (
             <div className="bg-white p-12 rounded-[48px] border border-green-100 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-4xl shadow-inner">✅</div>
                <div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Shift Selesai</h4>
                   <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 px-8 leading-relaxed tracking-widest">
                      Laporan telah berhasil dikirim ke Cloud Mozza Boy.
                   </p>
                </div>
                <button onClick={() => setSelectedClosingReport(myClosingToday)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange-500 transition-all">LIHAT AUDIT FINAL 📑</button>
             </div>
          )}
        </div>

        {/* RIWAYAT AUDIT SAMPING (LEBIH RINGKAS) */}
        <div className="lg:col-span-4 space-y-3">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Log Hari Ini</h3>
           <div className="space-y-3">
              {allClosingsToday.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-[28px] border-2 border-dashed border-slate-200 opacity-50">
                   <p className="text-[9px] font-black uppercase italic tracking-widest">Belum ada data</p>
                </div>
              ) : (
                allClosingsToday.map(cls => (
                   <div key={cls.id} onClick={() => setSelectedClosingReport(cls)} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-500 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm ${cls.discrepancy === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {cls.discrepancy === 0 ? '👤' : '⚠️'}
                         </div>
                         <div className="min-w-0">
                            <h5 className="text-[10px] font-black text-slate-800 uppercase leading-none truncate">{cls.staffName.split(' ')[0]}</h5>
                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">{new Date(cls.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                         <p className={`text-[7px] font-black uppercase mt-0.5 ${cls.discrepancy === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {cls.discrepancy === 0 ? 'OK' : 'MISS'}
                         </p>
                      </div>
                   </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* MODAL APPROVAL MANAGER */}
      {showApproval && (
        <div className="fixed inset-0 z-[220] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">🔒</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-2 tracking-tighter">Otorisasi Manager</h3>
              <p className="text-red-600 text-[8px] font-black uppercase mb-6 leading-tight">{approvalError}</p>
              <div className="space-y-3">
                 <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none text-xs" value={approvalUsername} onChange={e => setApprovalUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none text-xs" value={approvalPassword} onChange={e => setApprovalPassword(e.target.value)} />
                 <button onClick={handleManagerOverride} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">OVERRIDE 🛠️</button>
                 <button onClick={() => setShowApproval(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batal</button>
              </div>
           </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Proses {isShift1 ? 'Serah Terima' : 'Tutup Toko'}?</h3>
            <p className="text-slate-500 text-xs mt-4 mb-8 leading-relaxed uppercase font-bold tracking-widest">
               Pastikan seluruh pintu outlet sudah terkunci dan semua transaksi hari ini sudah diinput.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleClosing} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl">YA, PROSES 🏁</button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[9px]">KEMBALI</button>
            </div>
          </div>
        </div>
      )}

      {selectedClosingReport && renderAuditReport(selectedClosingReport)}
    </div>
  );
};
