
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { OrderStatus, PaymentMethod, DailyClosing, UserRole, Product } from '../types';

export const ClosingManagement: React.FC = () => {
  const { 
    transactions, expenses, dailyClosings, performClosing, 
    currentUser, selectedOutletId, outlets, inventory, purchases, stockTransfers, staff, productionRecords, products
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

  // --- CALCULATE SALES RECAP ---
  const calculateSalesRecap = (reportDate: Date) => {
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= start && new Date(tx.timestamp) <= end && tx.status === OrderStatus.CLOSED);
    
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

  // --- CALCULATE DETAILED STOCK MOVEMENT ---
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
        transfer: transferInQty - transferOutQty,
        production: prodInQty - prodOutQty,
        sold: soldQty,
        final: item.quantity
      };
    });
  };

  const handleClosing = () => {
    performClosing(actualCash, notes);
    setShowConfirm(false);
    setActualCash(0);
    setNotes('');
  };

  const renderAuditReport = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const salesRecap = calculateSalesRecap(reportDate);
    const detailedMovement = calculateDetailedMovement(reportDate);

    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
        <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-5xl min-h-screen md:min-h-0 flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
          
          {/* HEADER TOOLBAR (HIDDEN ON PRINT) */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedClosingReport(null)} className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-slate-400 shadow-sm">←</button>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Audit Daily Report</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{reportDate.toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                CETAK AUDIT 📑
              </button>
            </div>
          </div>

          {/* PRINTABLE CONTENT AREA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-16 space-y-12 pb-32 print:p-0 print:overflow-visible">
            
            {/* DOCUMENT HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-slate-900 pb-10">
                <div className="space-y-4">
                   <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-black">M</div>
                   <div>
                      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mozza Boy Enterprise</h1>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Inventory & Sales Audit Report</p>
                   </div>
                   <div className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                      Outlet: {activeOutlet?.name}<br/>
                      Admin PIC: {cls.staffName}
                   </div>
                </div>

                <div className="text-left md:text-right space-y-6 w-full md:w-auto">
                   <div className="inline-block px-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit ID</p>
                      <p className="text-lg font-mono font-black text-slate-900">#CLS-{cls.id.slice(-8).toUpperCase()}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-900 uppercase">Periode Laporan</p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">{reportDate.toLocaleString('id-ID')}</p>
                   </div>
                </div>
            </div>

            {/* SECTION 1: FINANCIALS */}
            <section className="space-y-6">
               <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">I. Rekapitulasi Kas & Biaya</h3>
                  <div className="flex-1 h-px bg-slate-100"></div>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Kas Tunai Sistem</p>
                     <p className="text-sm font-black text-slate-800">Rp {cls.totalSalesCash.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-2">QRIS / Digital</p>
                     <p className="text-sm font-black text-blue-600">Rp {cls.totalSalesQRIS.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Pengeluaran</p>
                     <p className="text-sm font-black text-red-600">Rp {cls.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className={`p-5 border-2 rounded-3xl ${cls.discrepancy === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Fisik di Laci</p>
                     <p className="text-sm font-black text-slate-900">Rp {cls.actualCash.toLocaleString()}</p>
                  </div>
               </div>
            </section>

            {/* SECTION 2: SALES RECAP */}
            <section className="space-y-6">
               <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">II. Rekapitulasi Penjualan Produk</h3>
                  <div className="flex-1 h-px bg-slate-100"></div>
               </div>
               <div className="overflow-hidden border-2 border-slate-100 rounded-3xl">
                  <table className="w-full text-[10px] text-left">
                     <thead className="bg-slate-900 text-white uppercase text-[8px] font-black tracking-widest">
                        <tr>
                           <th className="py-4 px-6">Nama Produk</th>
                           <th className="py-4 px-4 text-center">Qty Terjual</th>
                           <th className="py-4 px-6 text-right">Subtotal Omzet</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {salesRecap.map(item => (
                           <tr key={item.name}>
                              <td className="py-3 px-6 font-black uppercase text-slate-800">{item.name}</td>
                              <td className="py-3 px-4 text-center font-bold text-slate-500">{item.qty} PCS</td>
                              <td className="py-3 px-6 text-right font-black text-slate-900">Rp {item.total.toLocaleString()}</td>
                           </tr>
                        ))}
                     </tbody>
                     <tfoot className="bg-slate-50 font-black">
                        <tr>
                           <td className="py-4 px-6 text-slate-400 uppercase">Total Penjualan</td>
                           <td className="py-4 px-4 text-center">{salesRecap.reduce((a,b)=>a+b.qty, 0)} PCS</td>
                           <td className="py-4 px-6 text-right text-orange-600">Rp {salesRecap.reduce((a,b)=>a+b.total, 0).toLocaleString()}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </section>

            {/* SECTION 3: DETAILED INVENTORY MOVEMENT */}
            <section className="space-y-6">
               <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">III. Audit Pergerakan Inventori</h3>
                  <div className="flex-1 h-px bg-slate-100"></div>
               </div>

               <div className="overflow-x-auto border-2 border-slate-900 rounded-[32px] bg-white">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                           <th className="py-4 px-6 sticky left-0 bg-slate-900">Material</th>
                           <th className="py-4 px-4 text-center">Awal</th>
                           <th className="py-4 px-4 text-center text-green-400">Beli (+)</th>
                           <th className="py-4 px-4 text-center text-blue-400">Mutasi (±)</th>
                           <th className="py-4 px-4 text-center text-purple-400">Prod (±)</th>
                           <th className="py-4 px-4 text-center text-red-400">Jual (-)</th>
                           <th className="py-4 px-6 text-right bg-slate-800">Akhir</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-[10px]">
                        {detailedMovement.map(m => (
                           <tr key={m.name} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-6 font-black text-slate-800 uppercase sticky left-0 bg-white group-hover:bg-slate-50">{m.name}</td>
                              <td className="py-3 px-4 text-center font-bold text-slate-400">{m.initial.toFixed(2)}</td>
                              <td className="py-3 px-4 text-center font-black text-green-600">{m.purchase > 0 ? `+${m.purchase}` : '-'}</td>
                              <td className={`py-3 px-4 text-center font-black ${m.transfer >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                 {m.transfer !== 0 ? (m.transfer > 0 ? `+${m.transfer}` : m.transfer) : '-'}
                              </td>
                              <td className={`py-3 px-4 text-center font-black ${m.production >= 0 ? 'text-purple-600' : 'text-orange-500'}`}>
                                 {m.production !== 0 ? (m.production > 0 ? `+${m.production}` : m.production) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center font-black text-red-500">{m.sold > 0 ? `-${m.sold.toFixed(2)}` : '-'}</td>
                              <td className="py-3 px-6 text-right font-black text-slate-900 bg-slate-50/50">
                                 {m.final.toFixed(2)} <span className="text-[7px] text-slate-300 ml-1">{m.unit}</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <p className="text-[8px] text-slate-400 italic px-4 font-medium uppercase leading-relaxed">
                  * Data pergerakan dihitung otomatis berdasarkan Log Transaksi, Log Pembelian, Log Mutasi, dan Log Produksi pada tanggal terpilih.
               </p>
            </section>

            {/* SECTION 4: SIGNATURES */}
            <div className="pt-12 border-t border-slate-100">
               <div className="mb-10">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Catatan Audit Akhir:</p>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300 min-h-[80px] italic text-[11px] text-slate-600">
                     "{cls.notes || 'Tidak ada catatan tambahan.'}"
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                  <div className="text-center space-y-16">
                     <p className="text-[9px] font-black text-slate-400 uppercase">Dibuat Oleh (PIC)</p>
                     <div className="border-b border-slate-300 w-40 mx-auto"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900">{cls.staffName}</p>
                  </div>
                  
                  <div className="hidden md:flex flex-col items-center justify-center text-center space-y-4">
                     <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-2 opacity-50 grayscale">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIED-AUDIT-${cls.id}&color=0f172a`} alt="Audit QR" />
                     </div>
                     <p className="text-[7px] font-black text-slate-300 uppercase">System Validated</p>
                  </div>

                  <div className="text-center space-y-16">
                     <p className="text-[9px] font-black text-slate-400 uppercase">Otorisasi (Owner)</p>
                     <div className="border-b border-slate-300 w-40 mx-auto"></div>
                     <p className="text-[10px] font-black uppercase text-slate-300 italic">Signature & Stamp</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 h-4 w-full shrink-0"></div>
        </div>
      </div>
    );
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

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Tutup Buku Shift</h2>
        <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest italic">{activeOutlet?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">Laporan Tutup Buku Terakhir</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
         {[...dailyClosings].filter(c => c.outletId === selectedOutletId).slice(0, 12).map(cls => (
           <div key={cls.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group active:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedClosingReport(cls)}>
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
                 <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest">Detail ➔</p>
              </div>
           </div>
         ))}
      </div>

      {showApproval && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🔒</div>
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-tight">Otorisasi Manager<br/><span className="text-red-600 text-xs">(Terdeteksi Selisih Kas)</span></h3>
               <p className="text-slate-500 font-medium text-[10px] mt-2 px-4 uppercase leading-relaxed text-center">Input fisik tidak sesuai sistem. Masukkan kredensial Manager/Owner untuk menyetujui penutupan.</p>
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
