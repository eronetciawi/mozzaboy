
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, DailyClosing, UserRole } from '../types';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, 
    expenses, 
    expenseTypes,
    dailyClosings, 
    performClosing, 
    currentUser, 
    selectedOutletId, 
    outlets,
    inventory,
    purchases,
    stockTransfers,
    staff
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

  // Cek apakah sudah tutup buku hari ini untuk outlet ini
  const existingClosingToday = useMemo(() => {
    return dailyClosings.find(c => 
      c.outletId === selectedOutletId && 
      new Date(c.timestamp).toDateString() === todayStr
    );
  }, [dailyClosings, selectedOutletId, todayStr]);

  const todayTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= todayDate && tx.status === OrderStatus.CLOSED);
  const totalSalesCash = todayTxs.filter(tx => tx.paymentMethod === PaymentMethod.CASH).reduce((acc, tx) => acc + tx.total, 0);
  const totalSalesQRIS = todayTxs.filter(tx => tx.paymentMethod === PaymentMethod.QRIS).reduce((acc, tx) => acc + tx.total, 0);
  const totalSalesAll = totalSalesCash + totalSalesQRIS;
  
  const todayExpensesList = expenses.filter(ex => ex.outletId === selectedOutletId && new Date(ex.timestamp) >= todayDate);
  const totalExpenses = todayExpensesList.reduce((acc, ex) => acc + ex.amount, 0);

  const expectedCash = totalSalesCash - totalExpenses;
  const discrepancy = actualCash - expectedCash;
  const hasDiscrepancy = discrepancy !== 0;

  const calculateMovement = (startTime: Date, endTime: Date = new Date()) => {
    const auditStart = new Date(startTime); auditStart.setHours(0,0,0,0);
    const auditEnd = new Date(endTime); auditEnd.setHours(23,59,59,999);

    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= auditStart && new Date(tx.timestamp) <= auditEnd && tx.status === OrderStatus.CLOSED);
    const periodPurchases = purchases.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= auditStart && new Date(p.timestamp) <= auditEnd);
    const periodTransfersIn = stockTransfers.filter(t => t.toOutletId === selectedOutletId && new Date(t.timestamp) >= auditStart && new Date(t.timestamp) <= auditEnd);
    const periodTransfersOut = stockTransfers.filter(t => t.fromOutletId === selectedOutletId && new Date(t.timestamp) >= auditStart && new Date(t.timestamp) <= auditEnd);

    return inventory.filter(i => i.outletId === selectedOutletId).map(item => {
      let usedInSales = 0;
      periodTxs.forEach(tx => {
        tx.items.forEach(cartItem => {
          cartItem.product.bom.forEach(bom => {
            const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
            if (templateItem && templateItem.name === item.name) {
              usedInSales += bom.quantity * cartItem.quantity;
            }
          });
        });
      });

      const totalIn = periodPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b)=>a+b.quantity, 0) +
                       periodTransfersIn.filter(t => t.itemName === item.name).reduce((a,b)=>a+b.quantity, 0);
      
      const totalOut = usedInSales + periodTransfersOut.filter(t => t.itemName === item.name).reduce((a,b)=>a+b.quantity, 0);
      const initial = item.quantity + totalOut - totalIn;

      return {
        name: item.name,
        unit: item.unit,
        initial,
        restock: totalIn,
        used: totalOut,
        remaining: item.quantity
      };
    });
  };

  const validateAndClosing = () => {
    if (actualCash < 0) {
      alert("Input tidak valid.");
      return;
    }

    if (hasDiscrepancy) {
      if (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) {
        setShowConfirm(true);
      } else {
        setShowApproval(true);
      }
    } else {
      setShowConfirm(true);
    }
  };

  const handleManagerApproval = () => {
    const approver = staff.find(s => 
      s.username === approvalUsername && 
      s.password === approvalPassword && 
      (s.role === UserRole.OWNER || s.role === UserRole.MANAGER)
    );

    if (approver) {
      setShowApproval(false);
      setShowConfirm(true);
      setApprovalError('');
      setApprovalUsername('');
      setApprovalPassword('');
      setNotes(prev => `${prev} [Approved by ${approver.name}]`.trim());
    } else {
      setApprovalError('Kredensial Manager tidak valid atau tidak memiliki akses.');
    }
  };

  const handleClosing = () => {
    performClosing(actualCash, notes);
    setShowConfirm(false);
    setActualCash(0);
    setNotes('');
  };

  const renderAuditReport = (cls: DailyClosing) => {
    const reportStartTime = new Date(cls.timestamp);
    reportStartTime.setHours(0,0,0,0);
    const reportEndTime = new Date(cls.timestamp);
    reportEndTime.setHours(23,59,59,999);

    const periodExpenses = expenses.filter(ex => ex.outletId === cls.outletId && new Date(ex.timestamp) >= reportStartTime && new Date(ex.timestamp) <= reportEndTime);
    const periodMovement = calculateMovement(reportStartTime, reportEndTime);

    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 modal-backdrop">
        <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-4xl max-h-screen md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 print-area">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Master Audit Report</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cabang: {activeOutlet?.name} | {new Date(cls.timestamp).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-6 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">Cetak / Simpan PDF</button>
              <button onClick={() => setSelectedClosingReport(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">✕</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
            <div className="hidden print:block text-center border-b-4 border-slate-900 pb-8 mb-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">MOZZA BOY AUDIT REPORT</h1>
                <p className="text-lg font-bold text-slate-600 uppercase tracking-[0.3em]">{activeOutlet?.name}</p>
                <div className="mt-6 flex justify-between text-left text-sm font-bold text-slate-500">
                    <div>
                        <p>ID OUTLET: {selectedOutletId}</p>
                        <p>TANGGAL: {new Date(cls.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p>AUDITOR: {cls.staffName}</p>
                        <p>WAKTU CETAK: {new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm no-print">1</span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest print:text-xl print:border-b-2 print:border-slate-200 print:pb-2 print:w-full">Ringkasan Finansial</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 print:bg-white print:border-slate-300">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-tighter">Tunai (Cash)</p>
                  <p className="text-base font-black text-slate-800">Rp {cls.totalSalesCash.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 print:bg-white print:border-slate-300">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-2 tracking-tighter">QRIS (Digital)</p>
                  <p className="text-base font-black text-blue-600">Rp {cls.totalSalesQRIS.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 print:bg-white print:border-slate-300">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-2 tracking-tighter">Pengeluaran</p>
                  <p className="text-base font-black text-red-600">Rp {cls.totalExpenses.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl text-white print:bg-white print:text-slate-900 print:border-2 print:border-slate-900 shadow-xl">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Tunai Fisik (Actual)</p>
                  <p className="text-xl font-black text-orange-500 print:text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                  <div className={`mt-2 text-[10px] font-black uppercase ${cls.discrepancy === 0 ? 'text-green-400' : 'text-red-400'} print:text-slate-600`}>
                    SELISIH: Rp {cls.discrepancy.toLocaleString()}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm no-print">2</span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest print:text-xl print:border-b-2 print:border-slate-200 print:pb-2 print:w-full">Rincian Pengeluaran Detil</h4>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden print:border-slate-900">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 print:bg-slate-100 print:text-slate-900">
                    <tr>
                      <th className="py-4 px-6">Waktu</th>
                      <th className="py-4 px-6">Deskripsi Biaya</th>
                      <th className="py-4 px-6 text-right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs print:divide-slate-200">
                    {periodExpenses.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-slate-300 italic">Tidak ada pengeluaran hari ini.</td></tr>
                    ) : (
                      periodExpenses.map(e => (
                        <tr key={e.id}>
                          <td className="py-4 px-6 text-slate-400 font-mono print:text-slate-900">{new Date(e.timestamp).toLocaleTimeString()}</td>
                          <td className="py-4 px-6 text-slate-700">
                            <span className="font-black uppercase text-[10px] bg-slate-100 px-2 py-1 rounded mr-3 border border-slate-200 print:bg-white print:border-slate-800">
                              {expenseTypes.find(t => t.id === e.typeId)?.name || 'Biaya'}
                            </span>
                            <span className="font-bold">{e.notes || '(Tanpa Catatan)'}</span>
                          </td>
                          <td className="py-4 px-6 text-right font-black text-red-500 print:text-slate-900">Rp {e.amount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm no-print">3</span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest print:text-xl print:border-b-2 print:border-slate-200 print:pb-2 print:w-full">Audit Pergerakan Stok</h4>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden print:border-slate-900">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 print:bg-slate-100 print:text-slate-900">
                    <tr>
                      <th className="py-4 px-6">Bahan</th>
                      <th className="py-4 px-4 text-right">Awal</th>
                      <th className="py-4 px-4 text-right">Masuk</th>
                      <th className="py-4 px-4 text-right">Keluar</th>
                      <th className="py-4 px-6 text-right bg-slate-50 print:bg-slate-100">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] print:divide-slate-200">
                    {periodMovement.map(m => (
                      <tr key={m.name}>
                        <td className="py-3 px-6 font-black text-slate-700 uppercase">{m.name} ({m.unit})</td>
                        <td className="py-3 px-4 text-right">{m.initial.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-600">+{m.restock.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-500">-{m.used.toLocaleString()}</td>
                        <td className="py-3 px-6 text-right font-black bg-slate-50/50">{m.remaining.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="p-10 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 print:bg-white print:border-slate-400">
              <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4">Catatan Kasir:</h5>
              <p className="text-sm text-slate-600 italic font-medium mb-10">"{cls.notes || 'Tidak ada catatan.'}"</p>
              <div className="grid grid-cols-2 gap-20 pt-10">
                <div className="text-center border-t-2 border-slate-900 pt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Kasir</p>
                  <p className="text-sm font-black text-slate-800 uppercase">{cls.staffName}</p>
                </div>
                <div className="text-center border-t-2 border-slate-900 pt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Manager/Owner</p>
                  <p className="text-sm font-black text-slate-300 italic">Tanda Tangan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8 shrink-0 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Tutup Buku Mozza Boy</h2>
          <p className="text-slate-500 font-medium italic">Audit kas akhir shift dan sinkronisasi inventaris</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8 no-print">
        <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Ringkasan Sistem: <span className="text-orange-500">{activeOutlet?.name}</span></h3>
          
          <div className="space-y-6 flex-1">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Penjualan Tunai</p>
                  <p className="text-lg font-black text-slate-800">Rp {totalSalesCash.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">Penjualan QRIS</p>
                  <p className="text-lg font-black text-blue-600">Rp {totalSalesQRIS.toLocaleString()}</p>
                </div>
             </div>

            <div className="flex justify-between items-center pb-4 border-b border-slate-50 px-2 mt-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Revenue (ALL)</span>
              <span className="text-xl font-black text-slate-900">Rp {totalSalesAll.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-50 px-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Pengeluaran</span>
              <span className="text-lg font-black text-red-500">Rp {totalExpenses.toLocaleString()}</span>
            </div>

            <div className="p-8 bg-slate-900 rounded-3xl mt-8 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Laci Kasir (Cash Only)</span>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest italic">Expected Cash In Drawer</p>
                   <span className="text-3xl font-black text-orange-500">Rp {expectedCash.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-xl flex flex-col relative overflow-hidden">
          <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Otorisasi Uang Fisik Laci</h3>
          
          {existingClosingToday ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center text-5xl shadow-inner">🔒</div>
                <div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Laporan Sudah Dikunci</h4>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 px-10">Tutup buku untuk cabang ini pada tanggal <span className="text-orange-500">{todayStr}</span> telah berhasil diselesaikan.</p>
                </div>
                <div className="w-full grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Audit Oleh</p>
                       <p className="text-[10px] font-black text-slate-800 uppercase">{existingClosingToday.staffName}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Kas Aktual</p>
                       <p className="text-[10px] font-black text-slate-800 uppercase">Rp {existingClosingToday.actualCash.toLocaleString()}</p>
                    </div>
                </div>
                <button 
                  onClick={() => setSelectedClosingReport(existingClosingToday)}
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all"
                >
                  LIHAT LAPORAN AUDIT HARI INI
                </button>
             </div>
          ) : (
            <div className="space-y-8 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Total Uang Tunai di Laci (Rp)</label>
                <input 
                  type="number" 
                  className={`w-full p-8 bg-slate-50 border-4 rounded-[32px] text-5xl font-black text-center transition-all shadow-inner focus:outline-none ${hasDiscrepancy && actualCash > 0 ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-100 text-slate-900 focus:border-orange-500'}`}
                  value={actualCash}
                  onChange={e => setActualCash(parseInt(e.target.value) || 0)}
                />
                {hasDiscrepancy && actualCash > 0 && (
                  <div className="mt-4 p-4 bg-red-600 text-white rounded-2xl flex items-center justify-between animate-bounce">
                    <span className="text-[10px] font-black uppercase tracking-widest">🚨 Selisih Kas: Rp {discrepancy.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Catatan / Alasan Audit</label>
                <textarea 
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-sm h-32 focus:outline-none focus:border-orange-500"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Misal: QRIS OK, Tunai selisih karena kembalian kurang..."
                />
              </div>

              <button 
                onClick={validateAndClosing}
                className={`w-full py-6 font-black rounded-[32px] text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${hasDiscrepancy && actualCash > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'}`}
              >
                {hasDiscrepancy && actualCash > 0 ? 'BUTUH APPROVAL MANAGER 🔒' : 'FINISH & CLOSE DAY 🏁'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showApproval && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-md p-10 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="text-center mb-8">
               <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">🔒</div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Otorisasi Selisih</h3>
               <p className="text-slate-500 font-medium text-xs mt-2 px-6">Terdeteksi selisih kas fisik <span className="text-red-600 font-black">Rp {discrepancy.toLocaleString()}</span>. Diperlukan kredensial Manager untuk melanjutkan.</p>
            </div>

            {approvalError && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black text-center mb-6 uppercase border border-red-100">{approvalError}</div>}

            <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Username Manager" 
                 className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-red-500 focus:outline-none transition-all"
                 value={approvalUsername}
                 onChange={e => setApprovalUsername(e.target.value)}
               />
               <input 
                 type="password" 
                 placeholder="Password Manager" 
                 className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-red-500 focus:outline-none transition-all"
                 value={approvalPassword}
                 onChange={e => setApprovalPassword(e.target.value)}
               />
               <button 
                 onClick={handleManagerApproval}
                 className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 transition-all"
               >
                 BERIKAN OTORISASI
               </button>
               <button onClick={() => setShowApproval(false)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[48px] w-full max-w-md p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
            <h3 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Finalisasi Laporan?</h3>
            <p className="text-slate-500 font-medium mb-10 text-xs">Semua data transaksi akan dikunci dan laporan audit (termasuk QRIS & Tunai) akan dibuat secara permanen.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Batal</button>
              <button onClick={handleClosing} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg">Konfirmasi Tutup Buku</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm no-print">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Riwayat Log Audit Cabang</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50">
            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <th className="py-5 px-8">Waktu Closing</th>
              <th className="py-5 px-6">Kasir</th>
              <th className="py-5 px-6 text-right">Tunai Aktual</th>
              <th className="py-5 px-6 text-right">QRIS</th>
              <th className="py-5 px-6 text-right">Selisih Kas</th>
              <th className="py-5 px-8 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dailyClosings.filter(c => c.outletId === selectedOutletId).length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic text-[10px] uppercase">Belum ada audit log</td></tr>
            ) : (
              [...dailyClosings].filter(c => c.outletId === selectedOutletId).reverse().map(cls => (
                <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-5 px-8 text-xs font-bold text-slate-500">{new Date(cls.timestamp).toLocaleString()}</td>
                  <td className="py-5 px-6 text-sm font-black text-slate-800 uppercase tracking-tight">{cls.staffName}</td>
                  <td className="py-5 px-6 text-right font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</td>
                  <td className="py-5 px-6 text-right font-black text-blue-600">Rp {cls.totalSalesQRIS.toLocaleString()}</td>
                  <td className={`py-5 px-6 text-right font-black ${cls.discrepancy === 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {cls.discrepancy > 0 ? '+' : ''}Rp {cls.discrepancy.toLocaleString()}
                  </td>
                  <td className="py-5 px-8 text-right">
                    <button 
                      onClick={() => setSelectedClosingReport(cls)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-orange-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Buka Laporan 📄
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedClosingReport && renderAuditReport(selectedClosingReport)}
    </div>
  );
};
