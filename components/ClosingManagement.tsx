
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

  const expectedCash = totalSalesCash - totalExpenses;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0;

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

  const calculateSalesRecap = (reportDate: Date, staffId: string) => {
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    const periodTxs = transactions.filter(tx => 
        tx.outletId === selectedOutletId && 
        tx.cashierId === staffId &&
        new Date(tx.timestamp) >= start && 
        new Date(tx.timestamp) <= end && 
        tx.status === OrderStatus.CLOSED
    );
    
    const recap: Record<string, { name: string, qty: number, total: number }> = {};
    periodTxs.forEach(tx => {
      tx.items.forEach(item => {
        if (!recap[item.product.id]) recap[item.product.id] = { name: item.product.name, qty: 0, total: 0 };
        recap[item.product.id].qty += item.quantity;
        recap[item.product.id].total += (item.product.outletSettings?.[selectedOutletId]?.price || item.product.price) * item.quantity;
      });
    });
    return Object.values(recap).sort((a,b) => b.qty - a.qty);
  };

  // NEW: Comprehensive Movement Audit for Shift
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

      return { 
        name: item.name, 
        unit: item.unit, 
        initial, 
        plus: pIn + tIn + prIn, 
        minus: soldQty + tOut + prOut, 
        final 
      };
    }).filter(i => i.initial !== i.final || i.plus > 0 || i.minus > 0);
  };

  const renderAuditReport = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const salesRecap = calculateSalesRecap(reportDate, cls.staffId);
    const movement = calculateDetailedMovement(reportDate, cls.staffId);
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    
    const shiftExpenses = expenses.filter(e => 
        e.outletId === selectedOutletId && 
        e.staffId === cls.staffId &&
        new Date(e.timestamp) >= start && 
        new Date(e.timestamp) <= end
    );

    return (
      <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-start justify-center p-0 md:p-6 overflow-y-auto no-print" onClick={() => setSelectedClosingReport(null)}>
        <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-5xl my-0 md:my-10 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
          
          <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 md:rounded-t-[40px]">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedClosingReport(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">✕</button>
              <div>
                <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tighter">Review Daily Audit Shift</h3>
                <p className="text-[8px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest">PIC: {cls.staffName}</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest">Cetak Laporan 📑</button>
          </div>

          <div className="p-8 md:p-16 space-y-12 pb-24">
             {/* Header Dokumen */}
             <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-slate-900 pb-10">
                <div className="space-y-4">
                   <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-black">M</div>
                   <div>
                      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mozza Boy Enterprise</h1>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Personal Shift Audit Log</p>
                   </div>
                   <div className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                      Outlet: {activeOutlet?.name}<br/>
                      Admin PIC: {cls.staffName}
                   </div>
                </div>
                <div className="text-left md:text-right space-y-4">
                   <div className="inline-block px-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Log ID</p>
                      <p className="text-lg font-mono font-black text-slate-900">#AUDIT-{cls.id.slice(-8).toUpperCase()}</p>
                   </div>
                   <p className="text-[11px] font-bold text-slate-400 uppercase">{reportDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
             </div>

             {/* I. Ringkasan Kas & Biaya */}
             <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">I. Ringkasan Kas & Biaya</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Total Tunai Sistem</p>
                      <p className="text-sm font-black text-slate-800">Rp {cls.totalSalesCash.toLocaleString()}</p>
                   </div>
                   <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                      <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Total QRIS Sistem</p>
                      <p className="text-sm font-black text-blue-600">Rp {cls.totalSalesQRIS.toLocaleString()}</p>
                   </div>
                   <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                      <p className="text-[8px] font-black text-red-400 uppercase mb-2">Biaya Dikeluarkan</p>
                      <p className="text-sm font-black text-red-600">Rp {cls.totalExpenses.toLocaleString()}</p>
                   </div>
                   <div className={`p-5 border-2 rounded-3xl ${cls.discrepancy === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Fisik Serah Terima</p>
                      <p className="text-sm font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                   </div>
                </div>
             </section>

             {/* II. Rincian Pengeluaran */}
             <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">II. Rincian Pengeluaran Shift</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="overflow-hidden border-2 border-slate-100 rounded-[32px]">
                   <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-white uppercase text-[9px] font-black">
                         <tr><th className="py-5 px-8">Kategori</th><th className="py-5 px-6">Catatan</th><th className="py-5 px-8 text-right">Nominal</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {shiftExpenses.length === 0 ? (
                            <tr><td colSpan={3} className="py-10 text-center text-slate-400 font-bold italic uppercase">Tidak ada biaya dicatat.</td></tr>
                         ) : (
                            shiftExpenses.map(exp => (
                               <tr key={exp.id}>
                                  <td className="py-4 px-8 font-black uppercase text-slate-800">{expenseTypes.find(t => t.id === exp.typeId)?.name || 'Lain-lain'}</td>
                                  <td className="py-4 px-6 font-medium italic text-slate-500">"{exp.notes}"</td>
                                  <td className="py-4 px-8 text-right font-black text-red-600">Rp {exp.amount.toLocaleString()}</td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
             </section>

             {/* III. Rekapitulasi Produk Terjual */}
             <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">III. Rekapitulasi Produk Terjual</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="overflow-hidden border-2 border-slate-100 rounded-[32px]">
                   <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-white uppercase text-[9px] font-black">
                         <tr><th className="py-5 px-8">Nama Menu</th><th className="py-5 px-6 text-center">Volume</th><th className="py-5 px-8 text-right">Total Omzet</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {salesRecap.map(s => (
                           <tr key={s.name}>
                              <td className="py-4 px-8 font-black uppercase text-slate-800">{s.name}</td>
                              <td className="py-4 px-6 text-center font-bold text-slate-500">{s.qty} Unit</td>
                              <td className="py-4 px-8 text-right font-black text-slate-900">Rp {s.total.toLocaleString()}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>

             {/* IV. Audit Pergerakan Inventori */}
             <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">IV. Audit Pergerakan Inventori</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="overflow-x-auto border-2 border-slate-900 rounded-[32px]">
                   <table className="w-full text-left text-[10px] min-w-[600px]">
                      <thead className="bg-slate-900 text-white uppercase text-[8px] font-black">
                         <tr>
                            <th className="py-5 px-8">Material</th>
                            <th className="py-5 px-4 text-center">Awal</th>
                            <th className="py-5 px-4 text-center text-green-400">Masuk (+)</th>
                            <th className="py-5 px-4 text-center text-red-400">Keluar (-)</th>
                            <th className="py-5 px-8 text-right bg-slate-800">Akhir</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {movement.length === 0 ? (
                            <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold italic uppercase">Tidak ada pergerakan stok selama shift.</td></tr>
                         ) : (
                            movement.map(m => (
                               <tr key={m.name} className="hover:bg-slate-50">
                                  <td className="py-4 px-8 font-black uppercase text-slate-800">{m.name}</td>
                                  <td className="py-4 px-4 text-center font-bold text-slate-400">{m.initial.toFixed(2)}</td>
                                  <td className="py-4 px-4 text-center font-black text-green-600">{m.plus > 0 ? `+${m.plus.toFixed(2)}` : '-'}</td>
                                  <td className="py-4 px-4 text-center font-black text-red-600">{m.minus > 0 ? `-${m.minus.toFixed(2)}` : '-'}</td>
                                  <td className="py-4 px-8 text-right font-black text-slate-900 bg-slate-50/50">{m.final.toFixed(2)} <span className="text-[7px] text-slate-300 ml-1">{m.unit}</span></td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
             </section>

             {/* Footer Signatures */}
             <div className="pt-20 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-12">
                   <div className="text-center space-y-16">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Kasir / PIC Shift</p>
                      <div className="border-b border-slate-300 w-32 mx-auto"></div>
                      <p className="text-[10px] font-black uppercase text-slate-900">{cls.staffName}</p>
                   </div>
                   <div className="text-center space-y-4 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-2 opacity-50 grayscale">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=DOC-SHIFT-${cls.id}&color=0f172a`} alt="Audit QR" />
                      </div>
                      <p className="text-[7px] font-black text-slate-300 uppercase">Validasi Digital Mozza Boy</p>
                   </div>
                   <div className="text-center space-y-16">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Otorisasi Manager</p>
                      <div className="border-b border-slate-300 w-32 mx-auto"></div>
                      <p className="text-[10px] font-black uppercase text-slate-300 italic">Signature & Stamp</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Serah Terima & Tutup Shift</h2>
           <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest italic">{activeOutlet?.name}</p>
        </div>
        {isManager && (
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
             <p className="text-[8px] font-black text-indigo-400 uppercase">Shift Manager View</p>
             <p className="text-[10px] font-bold text-indigo-900 uppercase">{allClosingsToday.length} Shift Selesai Hari Ini</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: CALCULATION & FORM */}
        <div className="lg:col-span-2 space-y-6">
          {!myClosingToday ? (
             <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl space-y-8">
                <div className="flex justify-between items-center border-b pb-6">
                   <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Formulir Shift: {currentUser?.name}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Sistem menghitung audit berdasarkan log transaksi personal Anda</p>
                   </div>
                   <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">{new Date().toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tunai Anda</p>
                         <p className="text-sm font-black text-slate-800">Rp {totalSalesCash.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-3xl border border-red-100 flex justify-between items-center">
                         <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Biaya Anda (-)</p>
                         <p className="text-sm font-black text-red-600">Rp {totalExpenses.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl">
                         <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Setoran Fisik Wajib</p>
                         <p className="text-2xl font-black text-orange-500">Rp {expectedCash.toLocaleString()}</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-800 uppercase text-center tracking-widest">Input Uang di Laci</p>
                      <input 
                        type="number" 
                        onFocus={e => e.target.select()}
                        className={`w-full p-6 bg-slate-50 border-4 rounded-[32px] text-4xl font-black text-center focus:outline-none transition-all ${hasDiscrepancy && actualCash > 0 ? 'border-red-500 text-red-600' : 'border-slate-100 text-slate-900 focus:border-orange-500'}`}
                        value={actualCash}
                        onChange={e => setActualCash(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                      {hasDiscrepancy && actualCash > 0 && (
                         <div className="p-3 bg-red-600 text-white rounded-2xl text-center animate-pulse text-[9px] font-black uppercase">
                            Selisih: Rp {discrepancy.toLocaleString()}
                         </div>
                      )}
                      <textarea 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] h-20 outline-none focus:border-orange-500"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Catatan serah terima shift..."
                      />
                      <button 
                        onClick={() => {
                           if(hasDiscrepancy && !isManager) setShowApproval(true);
                           else setShowConfirm(true);
                        }}
                        className="w-full py-5 bg-orange-500 text-white font-black rounded-[28px] text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                      >
                        TUTUP SHIFT SAYA 🏁
                      </button>
                   </div>
                </div>
             </div>
          ) : (
             <div className="bg-white p-12 rounded-[48px] border-2 border-green-100 shadow-xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[40px] flex items-center justify-center text-5xl shadow-inner">✅</div>
                <div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Shift Selesai</h4>
                   <p className="text-slate-400 text-xs font-bold uppercase mt-2 px-10">Laporan shift personal Anda telah tersimpan. Silakan review detail audit di bawah.</p>
                </div>
                <button onClick={() => setSelectedClosingReport(myClosingToday)} className="w-full max-w-xs py-5 bg-slate-900 text-white rounded-[28px] font-black text-[10px] uppercase shadow-lg hover:bg-orange-500 transition-all">REVIEW LOG AUDIT 📑</button>
             </div>
          )}
        </div>

        {/* RIGHT: SHIFT HISTORY */}
        <div className="space-y-6">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Audit Log Hari Ini</h3>
           <div className="space-y-3">
              {allClosingsToday.length === 0 ? (
                <div className="p-8 text-center bg-slate-100 rounded-[32px] border-2 border-dashed border-slate-200 opacity-50">
                   <p className="text-[9px] font-black uppercase italic">Belum ada shift ditutup</p>
                </div>
              ) : (
                allClosingsToday.map(cls => (
                   <div key={cls.id} onClick={() => setSelectedClosingReport(cls)} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-500 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cls.discrepancy === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {cls.discrepancy === 0 ? '👤' : '⚠️'}
                         </div>
                         <div>
                            <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{cls.staffName}</h5>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(cls.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                         <p className={`text-[7px] font-black uppercase ${cls.discrepancy === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {cls.discrepancy === 0 ? 'BALANCE ✓' : `MISS: ${cls.discrepancy.toLocaleString()}`}
                         </p>
                      </div>
                   </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* MODALS */}
      {showApproval && (
        <div className="fixed inset-0 z-[220] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-6 tracking-tighter">Otorisasi Shift<br/><span className="text-red-600 text-xs">(Selisih Uang Laci)</span></h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Username Manager" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500" value={approvalUsername} onChange={e => setApprovalUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500" value={approvalPassword} onChange={e => setApprovalPassword(e.target.value)} />
                 {approvalError && <p className="text-[8px] font-black text-red-600 uppercase">{approvalError}</p>}
                 <button onClick={handleManagerOverride} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">OVERRIDE SHIFT 🛠️</button>
                 <button onClick={() => { setShowApproval(false); setApprovalError(''); }} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batal</button>
              </div>
           </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 text-center shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Selesai Berugas?</h3>
            <p className="text-slate-500 text-sm mt-6 mb-10 leading-relaxed uppercase font-bold">Pastikan uang serah terima laci telah dihitung dengan benar.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleClosing} className="w-full py-5 bg-orange-500 text-white rounded-[24px] font-black text-xs uppercase shadow-xl shadow-orange-500/20">YA, TUTUP SHIFT 🏁</button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-xs">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {selectedClosingReport && renderAuditReport(selectedClosingReport)}
    </div>
  );
};
