
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, DailyClosing, UserRole } from '../types';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, expenseTypes, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, inventory, purchases, stockTransfers, staff, productionRecords
  } = useApp();
  
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedClosingReport, setSelectedClosingReport] = useState<DailyClosing | null>(null);

  const [approvalUsername, setApprovalUsername] = useState('');
  const [approvalPassword, setApprovalPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const todayDate = new Date();
  const todayStr = todayDate.toDateString();
  todayDate.setHours(0,0,0,0);

  const existingClosingToday = useMemo(() => {
    return dailyClosings.find(c => c.outletId === selectedOutletId && new Date(c.timestamp).toDateString() === todayStr);
  }, [dailyClosings, selectedOutletId, todayStr]);

  const todayTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= todayDate && tx.status === OrderStatus.CLOSED);
  const totalSalesCash = todayTxs.filter(tx => tx.paymentMethod === PaymentMethod.CASH).reduce((acc, tx) => acc + tx.total, 0);
  const totalSalesQRIS = todayTxs.filter(tx => tx.paymentMethod === PaymentMethod.QRIS).reduce((acc, tx) => acc + tx.total, 0);
  const totalExpenses = expenses.filter(ex => ex.outletId === selectedOutletId && new Date(ex.timestamp) >= todayDate).reduce((acc, ex) => acc + ex.amount, 0);

  const expectedCash = totalSalesCash - totalExpenses;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0;

  const calculateDetailedMovement = (reportDate: Date) => {
    const auditStart = new Date(reportDate); auditStart.setHours(0,0,0,0);
    const auditEnd = new Date(reportDate); auditEnd.setHours(23,59,59,999);
    
    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= auditStart && new Date(tx.timestamp) <= auditEnd && tx.status === OrderStatus.CLOSED);
    const periodPurchases = purchases.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= auditStart && new Date(p.timestamp) <= auditEnd);
    const periodTransfers = stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && new Date(t.timestamp) >= auditStart && new Date(t.timestamp) <= auditEnd);
    const periodProduction = productionRecords.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= auditStart && new Date(p.timestamp) <= auditEnd);

    return inventory.filter(i => i.outletId === selectedOutletId).map(item => {
      let soldQty = 0;
      periodTxs.forEach(tx => {
        tx.items.forEach(cartItem => {
          cartItem.product.bom.forEach(bom => {
            const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
            if (templateItem && templateItem.name === item.name) soldQty += (bom.quantity * cartItem.quantity);
          });
        });
      });

      const purchaseQty = periodPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b) => a + b.quantity, 0);
      const transferInQty = periodTransfers.filter(t => t.toOutletId === selectedOutletId && t.itemName === item.name).reduce((a,b) => a + b.quantity, 0);
      const transferOutQty = periodTransfers.filter(t => t.fromOutletId === selectedOutletId && t.itemName === item.name).reduce((a,b) => a + b.quantity, 0);
      const prodInQty = periodProduction.filter(p => p.resultItemId === item.id).reduce((a,b) => a + b.resultQuantity, 0);
      let prodOutQty = 0;
      periodProduction.forEach(p => {
        p.components.forEach(comp => {
          const compItem = inventory.find(inv => inv.id === comp.inventoryItemId);
          if (compItem && compItem.name === item.name) prodOutQty += comp.quantity;
        });
      });

      const totalIn = purchaseQty + transferInQty + prodInQty;
      const totalOut = soldQty + transferOutQty + prodOutQty;
      const initialStock = item.quantity + totalOut - totalIn;

      return {
        name: item.name,
        unit: item.unit,
        initial: initialStock,
        purchase: purchaseQty,
        transferIn: transferInQty,
        transferOut: transferOutQty,
        productionIn: prodInQty,
        productionOut: prodOutQty,
        sold: soldQty,
        final: item.quantity
      };
    });
  };

  const validateAndClosing = () => {
    if (actualCash < 0) return alert("Input tidak valid.");
    if (hasDiscrepancy && !(currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER)) {
      setShowApproval(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleManagerApproval = () => {
    const approver = staff.find(s => s.username === approvalUsername && s.password === approvalPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (approver) {
      setShowApproval(false);
      setShowConfirm(true);
      setApprovalError('');
      setNotes(prev => `${prev} [Approved by ${approver.name}]`.trim());
    } else {
      setApprovalError('Kredensial Manager salah.');
    }
  };

  const handleClosing = () => {
    performClosing(actualCash, notes);
    setShowConfirm(false);
    setActualCash(0);
    setNotes('');
  };

  const renderAuditReport = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const detailedMovement = calculateDetailedMovement(reportDate);

    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 no-scrollbar overflow-y-auto">
        <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-5xl min-h-screen md:min-h-0 flex flex-col shadow-2xl animate-in zoom-in-95 print-area overflow-hidden">
          {/* COMPACT TOOLBAR - MOBILE FRIENDLY */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-20 no-print shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedClosingReport(null)} className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400">←</button>
              <div>
                <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tighter">Laporan Audit</h3>
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{reportDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="px-4 md:px-6 py-2 bg-orange-600 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
              >
                Cetak PDF 🖨️
              </button>
              <button onClick={() => setSelectedClosingReport(null)} className="hidden md:flex w-10 h-10 rounded-full bg-white border items-center justify-center text-slate-400">✕</button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-12 space-y-8 md:space-y-12 overflow-y-auto custom-scrollbar pb-24 md:pb-12">
            {/* BRANDING HEADER - PDF COMPATIBLE */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 md:border-b-4 border-slate-900 pb-6 md:pb-8 gap-4">
                <div>
                   <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">MOZZA BOY</h1>
                   <p className="text-[8px] md:text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-3 md:mb-4">Enterprise Operating System</p>
                   <div className="space-y-0.5">
                      <p className="text-[10px] md:text-[11px] font-bold text-slate-700">{activeOutlet?.name}</p>
                      <p className="text-[8px] md:text-[10px] text-slate-400 max-w-xs leading-relaxed uppercase">{activeOutlet?.address}</p>
                   </div>
                </div>
                <div className="w-full md:w-auto text-left md:text-right">
                   <div className="inline-block p-2 md:p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl mb-3 md:mb-4">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-0.5 md:mb-1 tracking-widest">ID Audit</p>
                      <p className="text-xs md:text-sm font-mono font-black text-slate-800">#{cls.id.slice(-8).toUpperCase()}</p>
                   </div>
                   <div className="flex md:flex-col justify-between md:justify-end gap-2 px-1">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase">Petugas: {cls.staffName}</p>
                      <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">{reportDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <section>
               <h4 className="text-[9px] md:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 md:mb-6 flex items-center gap-3">
                  <span className="w-6 md:w-8 h-px bg-slate-900"></span> REKAPITULASI FINANSIAL
               </h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200">
                     <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Tunai Sistem</p>
                     <p className="text-sm md:text-lg font-black text-slate-800">Rp {cls.totalSalesCash.toLocaleString()}</p>
                  </div>
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200">
                     <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Digital/QRIS</p>
                     <p className="text-sm md:text-lg font-black text-blue-600">Rp {cls.totalSalesQRIS.toLocaleString()}</p>
                  </div>
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200">
                     <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Total Biaya</p>
                     <p className="text-sm md:text-lg font-black text-red-600">Rp {cls.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 ${cls.discrepancy === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                     <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Fisik Laci</p>
                     <p className="text-sm md:text-lg font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                  </div>
               </div>
               {cls.discrepancy !== 0 && (
                 <div className="mt-3 p-3 bg-red-600 text-white rounded-xl text-center shadow-lg shadow-red-600/10">
                    <p className="text-[9px] font-black uppercase tracking-widest">🚨 TERDETEKSI SELISIH KAS: Rp {cls.discrepancy.toLocaleString()}</p>
                 </div>
               )}
            </section>

            {/* DETAILED STOCK MOVEMENT - HYBRID VIEW */}
            <section>
               <h4 className="text-[9px] md:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 md:mb-6 flex items-center gap-3">
                  <span className="w-6 md:w-8 h-px bg-slate-900"></span> AUDIT PERGERAKAN STOK
               </h4>

               {/* DESKTOP VIEW & PRINT OUTPUT (Always Table) */}
               <div className="hidden md:block overflow-hidden rounded-[32px] border-2 border-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                            <th className="py-4 px-6">Nama Material</th>
                            <th className="py-4 px-4 text-center">Awal</th>
                            <th className="py-4 px-4 text-center text-green-400">+ Beli</th>
                            <th className="py-4 px-4 text-center text-blue-400">± Mutasi</th>
                            <th className="py-4 px-4 text-center text-purple-400">± Prod</th>
                            <th className="py-4 px-4 text-center text-red-400">- Jual</th>
                            <th className="py-4 px-6 text-right bg-slate-800">Akhir</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {detailedMovement.map(m => (
                            <tr key={m.name} className="hover:bg-slate-50 transition-colors text-[11px]">
                                <td className="py-4 px-6 font-black text-slate-800 uppercase leading-none">
                                   {m.name}
                                   <p className="text-[7px] text-slate-400 mt-1 font-bold">Unit: {m.unit}</p>
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-slate-400">{m.initial}</td>
                                <td className="py-4 px-4 text-center font-black text-green-600">{m.purchase > 0 ? `+${m.purchase}` : '-'}</td>
                                <td className="py-4 px-4 text-center font-bold">
                                   <div className="flex flex-col gap-0.5">
                                      {m.transferIn > 0 && <div className="text-blue-600 text-[9px]">+{m.transferIn} In</div>}
                                      {m.transferOut > 0 && <div className="text-slate-400 text-[9px]">-{m.transferOut} Out</div>}
                                      {m.transferIn === 0 && m.transferOut === 0 && <span className="text-slate-200">-</span>}
                                   </div>
                                </td>
                                <td className="py-4 px-4 text-center font-bold">
                                   <div className="flex flex-col gap-0.5">
                                      {m.productionIn > 0 && <div className="text-purple-600 text-[9px]">+{m.productionIn} WIP</div>}
                                      {m.productionOut > 0 && <div className="text-slate-400 text-[9px]">-{m.productionOut} Use</div>}
                                      {m.productionIn === 0 && m.productionOut === 0 && <span className="text-slate-200">-</span>}
                                   </div>
                                </td>
                                <td className="py-4 px-4 text-center font-black text-red-500">{m.sold > 0 ? `-${m.sold.toFixed(1)}` : '-'}</td>
                                <td className="py-4 px-6 text-right font-black text-slate-900 bg-slate-50">
                                   {m.final} <span className="text-[8px] text-slate-300 font-bold ml-1 uppercase">{m.unit}</span>
                                </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               {/* MOBILE VIEW (Elegant Card Grid) - Hidden in Print */}
               <div className="md:hidden space-y-4 no-print">
                  {detailedMovement.map(m => (
                    <div key={m.name} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex flex-col group active:bg-slate-50 transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 flex-1">
                             <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight truncate">{m.name}</h4>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Satuan: {m.unit}</p>
                          </div>
                          <div className="text-right pl-4">
                             <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5 tracking-tighter">Stok Akhir</p>
                             <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-black text-slate-900 leading-none">{m.final}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase">{m.unit}</span>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-5 gap-0.5 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50">
                          <div className="flex flex-col items-center">
                             <p className="text-[6px] font-black text-slate-400 uppercase mb-1">Awal</p>
                             <p className="text-[10px] font-bold text-slate-600">{m.initial}</p>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-200">
                             <p className="text-[6px] font-black text-green-500 uppercase mb-1">Beli</p>
                             <p className="text-[10px] font-black text-green-600">{m.purchase > 0 ? `+${m.purchase}` : '-'}</p>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-200">
                             <p className="text-[6px] font-black text-blue-500 uppercase mb-1">Mutasi</p>
                             <p className={`text-[10px] font-bold ${m.transferIn - m.transferOut > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                {(m.transferIn - m.transferOut) !== 0 ? (m.transferIn - m.transferOut > 0 ? `+${m.transferIn - m.transferOut}` : m.transferIn - m.transferOut) : '-'}
                             </p>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-200">
                             <p className="text-[6px] font-black text-purple-500 uppercase mb-1">Dapur</p>
                             <p className={`text-[10px] font-bold ${m.productionIn - m.productionOut > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                                {(m.productionIn - m.productionOut) !== 0 ? (m.productionIn - m.productionOut > 0 ? `+${m.productionIn - m.productionOut}` : (m.productionIn - m.productionOut).toFixed(1)) : '-'}
                             </p>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-200">
                             <p className="text-[6px] font-black text-red-500 uppercase mb-1">Jual</p>
                             <p className="text-[10px] font-black text-red-600">{m.sold > 0 ? `-${m.sold.toFixed(1)}` : '-'}</p>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* NOTES & VERIFICATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-10">
               <div className="p-6 md:p-8 bg-slate-50 rounded-[28px] md:rounded-[32px] border border-dashed border-slate-200">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-3 md:mb-4 tracking-[0.2em]">Catatan Audit Shift:</p>
                  <p className="text-xs md:text-sm text-slate-600 italic font-medium leading-relaxed">
                     "{cls.notes || 'Tidak ada catatan tambahan untuk laporan ini.'}"
                  </p>
               </div>
               <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-slate-900 rounded-[28px] md:rounded-[32px] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-full flex items-center justify-center text-xl md:text-2xl mb-3 md:mb-4 relative z-10">🛡️</div>
                  <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest relative z-10">Integritas Audit Terjamin</h5>
                  <p className="text-[8px] md:text-[9px] text-slate-400 mt-2 leading-relaxed px-4 md:px-10 uppercase font-bold relative z-10">Laporan ini dihasilkan sistem secara otomatis dan telah melalui verifikasi otorisasi pada {reportDate.toLocaleDateString()}.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Tutup Buku Shift</h2>
        <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest italic">{activeOutlet?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* FINANCIAL SUMMARY INPUT */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Audit Finansial</h3>
            <span className="text-[10px] font-black text-orange-500">{todayStr}</span>
          </div>
          
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[7px] font-black text-slate-400 uppercase mb-1 tracking-widest">Tunai Sistem</p>
                   <p className="text-sm font-black text-slate-800">Rp {totalSalesCash.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                   <p className="text-[7px] font-black text-blue-400 uppercase mb-1 tracking-widest">Digital Sistem</p>
                   <p className="text-sm font-black text-blue-600">Rp {totalSalesQRIS.toLocaleString()}</p>
                </div>
             </div>
             <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Total Pengeluaran</p>
                <p className="text-sm font-black text-red-600">-Rp {totalExpenses.toLocaleString()}</p>
             </div>
             <div className="p-6 bg-slate-900 rounded-[28px] text-white shadow-xl flex justify-between items-center">
                <div>
                   <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Wajib di Laci (Tunai)</p>
                   <p className="text-2xl font-black text-orange-500">Rp {expectedCash.toLocaleString()}</p>
                </div>
                <div className="text-4xl opacity-10">💵</div>
             </div>
          </div>
        </div>

        {/* INPUT ACTUAL CASH */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
          {existingClosingToday ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 py-10">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[28px] flex items-center justify-center text-4xl shadow-inner">🔒</div>
                <div>
                   <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Shift Telah Ditutup</h4>
                   <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 px-6">Laporan audit dilaporkan oleh <span className="text-orange-500">{existingClosingToday.staffName}</span>.</p>
                </div>
                <button onClick={() => setSelectedClosingReport(existingClosingToday)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-500 transition-all">BUKA DETAIL AUDIT 📄</button>
             </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-center">Hitung Uang Fisik Laci</h3>
              <div>
                <input 
                  type="number" 
                  className={`w-full p-6 bg-slate-50 border-4 rounded-[28px] text-4xl font-black text-center focus:outline-none transition-all ${hasDiscrepancy && actualCash > 0 ? 'border-red-500 text-red-600' : 'border-slate-100 text-slate-900 focus:border-orange-500'}`}
                  value={actualCash}
                  onChange={e => setActualCash(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                {hasDiscrepancy && actualCash > 0 && (
                   <div className="mt-3 p-3 bg-red-600 text-white rounded-xl text-center animate-pulse shadow-lg shadow-red-600/20">
                      <span className="text-[9px] font-black uppercase">🚨 Selisih Kas: Rp {discrepancy.toLocaleString()}</span>
                   </div>
                )}
              </div>
              <textarea 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] h-24 outline-none focus:border-orange-500"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Alasan selisih kas / catatan penutupan shift..."
              />
              <button 
                onClick={validateAndClosing}
                className="w-full py-5 bg-orange-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
              >
                {hasDiscrepancy && actualCash > 0 ? 'MINTA OTORISASI MANAGER 🔒' : 'KONFIRMASI TUTUP SHIFT 🏁'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* HISTORY CARDS */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">Laporan Tutup Buku Terakhir</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
         {[...dailyClosings].filter(c => c.outletId === selectedOutletId).slice(0, 12).map(cls => (
           <div key={cls.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group active:bg-slate-50 transition-colors" onClick={() => setSelectedClosingReport(cls)}>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cls.discrepancy === 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    {cls.discrepancy === 0 ? '✅' : '⚠️'}
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{new Date(cls.timestamp).toLocaleDateString([], {day:'2-digit', month:'short'})}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{cls.staffName.split(' ')[0]}</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-xs font-black text-slate-900">Rp {(cls.actualCash/1000).toFixed(0)}k</p>
                 <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${cls.discrepancy === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {cls.discrepancy === 0 ? 'BALANCE' : 'SELISIH'}
                 </span>
              </div>
           </div>
         ))}
      </div>

      {/* MODALS APPROVAL & CONFIRM */}
      {showApproval && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🔒</div>
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-tight">Otorisasi Manager<br/><span className="text-red-600 text-xs">(Terdeteksi Selisih Kas)</span></h3>
               <p className="text-slate-500 font-medium text-[10px] mt-2 px-4 uppercase leading-relaxed">Input fisik tidak sesuai sistem. Masukkan kredensial Manager/Owner untuk menyetujui penutupan.</p>
            </div>
            {approvalError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[8px] font-black text-center mb-4 uppercase border border-red-100">{approvalError}</div>}
            <div className="space-y-4">
               <input type="text" placeholder="Username Manager" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-red-500 outline-none transition-all" value={approvalUsername} onChange={e => setApprovalUsername(e.target.value)} />
               <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-red-500 outline-none transition-all" value={approvalPassword} onChange={e => setApprovalPassword(e.target.value)} />
               <button onClick={handleManagerApproval} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-orange-600 active:scale-95 transition-all">SETUJUI & TUTUP SHIFT 🚀</button>
               <button onClick={() => setShowApproval(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[260] bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">✅</div>
            <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tighter">Finalisasi Audit?</h3>
            <p className="text-slate-500 font-medium mb-10 text-[10px] uppercase px-4 leading-relaxed tracking-widest">Laporan audit akan dibuat permanen dan seluruh transaksi shift ini akan dikunci dalam database.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleClosing} className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">YA, TUTUP SHIFT SEKARANG</button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] tracking-widest">Kembali</button>
            </div>
          </div>
        </div>
      )}

      {selectedClosingReport && renderAuditReport(selectedClosingReport)}
    </div>
  );
};
