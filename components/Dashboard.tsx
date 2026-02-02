
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { Transaction, PaymentMethod, UserRole, OrderStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';

const CompactMetric: React.FC<{ label: string; value: string; color: string; icon: string }> = ({ label, value, color, icon }) => (
  <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
    </div>
    <p className={`text-xl md:text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
  </div>
);

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { 
    selectedOutletId, outlets, 
    currentUser, transactions, expenses, attendance, filteredTransactions 
  } = useApp();
  
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const isExecutive = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const isGlobalView = selectedOutletId === 'all' && isExecutive;
  const todayStr = new Date().toLocaleDateString('en-CA');

  const myPresenceToday = useMemo(() => {
     if (isExecutive) return true;
     return attendance.find(a => a.staffId === currentUser?.id && a.date === todayStr);
  }, [attendance, currentUser, todayStr, isExecutive]);

  const summary = useMemo(() => {
    const targetTxs = isGlobalView ? transactions : filteredTransactions;
    const closedTxs = targetTxs.filter(t => t.status === OrderStatus.CLOSED);
    const sales = closedTxs.reduce((a, b) => a + (b.total ?? 0), 0);
    const cash = closedTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + (b.total ?? 0), 0);
    const qris = closedTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a, b) => a + (b.total ?? 0), 0);
    const targetExps = isGlobalView ? expenses : expenses.filter(e => e.outletId === selectedOutletId);
    const exp = targetExps.reduce((a, b) => a + (b.amount ?? 0), 0);
    return { sales, cash, qris, exp, totalClosed: closedTxs.length };
  }, [isGlobalView, transactions, filteredTransactions, expenses, selectedOutletId]);

  const intel = useMemo(() => {
    const targetTxs = isGlobalView ? transactions : filteredTransactions;
    const closedTxs = targetTxs.filter(t => t.status === OrderStatus.CLOSED);
    const hourlyMap = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0 }));
    closedTxs.forEach(tx => {
      const h = new Date(tx.timestamp).getHours();
      if (hourlyMap[h]) hourlyMap[h].sales += (tx.total ?? 0);
    });
    return { trafficData: hourlyMap.filter((_, i) => i >= 9 && i <= 22) };
  }, [isGlobalView, transactions, filteredTransactions]);

  const downloadReceipt = async () => {
    if (!receiptRef.current || !viewingTransaction) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Struk-Audit-MB-${viewingTransaction.id.slice(-6)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { alert('Gagal menyimpan gambar struk.'); }
  };

  const latestTransactions = useMemo(() => {
    return (isGlobalView ? transactions : filteredTransactions)
      .filter(t => t.status === OrderStatus.CLOSED)
      .slice(0, 15);
  }, [isGlobalView, transactions, filteredTransactions]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-[#fcfdfe] pb-40">
      <div className="flex justify-between items-center mb-8">
        <div>
           <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Audit Dashboard</p>
           <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mt-1">
             {isGlobalView ? "Global Intel Hub" : "Branch Control Center"}
           </h2>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Synced</p>
           <p className="text-[11px] font-bold text-slate-800 uppercase mt-1">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* 1. STATUS ABSENSI BAR */}
      <div className={`mb-8 p-6 rounded-[40px] border-2 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${myPresenceToday ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100 animate-pulse'}`}>
         <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center text-2xl shadow-inner ${myPresenceToday ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
               {myPresenceToday ? '✅' : '⚠️'}
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Status Kehadiran Hari Ini</p>
               <h4 className={`text-sm font-black uppercase ${myPresenceToday ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {myPresenceToday ? 'Tugas Aktif: Akses POS Terbuka ✓' : 'Wajib Absen Masuk Untuk Mulai Jualan!'}
               </h4>
            </div>
         </div>
         {!myPresenceToday && (
            <button onClick={() => setActiveTab?.('attendance')} className="w-full md:w-auto px-12 py-4 bg-rose-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">ABSEN SEKARANG ➔</button>
         )}
      </div>

      {/* 2. RINGKASAN METRIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <CompactMetric label="Total Omzet" value={`Rp ${((summary.sales ?? 0)/1000).toFixed(0)}k`} color="text-slate-900" icon="💰" />
        <CompactMetric label="Sales Tunai" value={`Rp ${((summary.cash ?? 0)/1000).toFixed(0)}k`} color="text-emerald-600" icon="💵" />
        <CompactMetric label="Sales QRIS" value={`Rp ${((summary.qris ?? 0)/1000).toFixed(0)}k`} color="text-blue-600" icon="📱" />
        <CompactMetric label="Total Transaksi" value={`${summary.totalClosed}`} color="text-indigo-600" icon="🧾" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         {/* 3. CHART PENJUALAN */}
         <div className="xl:col-span-2 bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Grafik Traffic Penjualan</h3>
               <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Hourly Analytics</span>
            </div>
            <div className="flex-1 h-full w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intel.trafficData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="hour" fontSize={9} axisLine={false} tickLine={false} stroke="#94a3b8" />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900' }}
                        labelStyle={{ color: '#6366f1' }}
                        formatter={(v: number) => [`Rp ${(v ?? 0).toLocaleString()}`, 'Sales']}
                     />
                     <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={4} fillOpacity={0.1} fill="#6366f1" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 4. AUDIT PENJUALAN TERAKHIR */}
         <div className="bg-slate-900 p-8 rounded-[48px] text-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                 <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Audit Penjualan</h3>
                 <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">15 Transaksi Terakhir</p>
              </div>
              <span className="text-[7px] font-black bg-white/10 px-2 py-1 rounded uppercase tracking-widest text-slate-400">Click for Receipt</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
               {latestTransactions.map(tx => (
                  <button 
                    key={tx.id} 
                    onClick={() => setViewingTransaction(tx)}
                    className="w-full flex justify-between items-center p-5 bg-white/5 hover:bg-white/10 rounded-[28px] border border-white/5 transition-all text-left group active:scale-[0.98]"
                  >
                     <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase truncate group-hover:text-orange-400 transition-colors">
                           {tx.items.map(i => i.product.name).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[7px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase">{tx.paymentMethod}</span>
                           <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">
                              {new Date(tx.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • #{tx.id.slice(-6).toUpperCase()}
                           </p>
                        </div>
                     </div>
                     <div className="text-right ml-4 shrink-0">
                        <p className="text-xs font-black text-emerald-400 whitespace-nowrap">Rp {(tx.total ?? 0).toLocaleString()}</p>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">{tx.cashierName.split(' ')[0]}</p>
                     </div>
                  </button>
               ))}

               {latestTransactions.length === 0 && (
                 <div className="py-20 text-center opacity-20">
                    <div className="text-4xl mb-4">📑</div>
                    <p className="text-[10px] font-black uppercase italic tracking-widest">Data transaksi kosong</p>
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* 5. DIGITAL RECEIPT MODAL - OPTIMIZED UX */}
      {viewingTransaction && (
        <div 
          className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setViewingTransaction(null)} // Close on backdrop click
        >
           <div 
             className="w-full max-w-xs md:max-w-sm flex flex-col gap-4 animate-in zoom-in-95 duration-300 relative"
             onClick={e => e.stopPropagation()} // Prevent close when clicking receipt
           >
              {/* COMPACT CLOSE BUTTON */}
              <button 
                onClick={() => setViewingTransaction(null)}
                className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
              >
                 <span className="text-xl">✕</span>
              </button>

              {/* THE RECEIPT CANVAS - COMPACT VERSION */}
              <div 
                ref={receiptRef}
                className="bg-white p-6 md:p-8 rounded-[28px] shadow-2xl text-slate-900 border border-slate-100 overflow-hidden relative"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                 <div className="text-center border-b-2 border-dashed border-slate-200 pb-5 mb-5">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center font-black text-2xl mx-auto mb-3">M</div>
                    <h4 className="text-[12px] font-black uppercase tracking-tighter">Mozza Boy Street Food</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {outlets.find(o => o.id === viewingTransaction.outletId)?.name || 'Outlet Mozza Boy'}
                    </p>
                 </div>

                 <div className="space-y-4 mb-5">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest">
                       <span>Ref: #{viewingTransaction.id.slice(-8).toUpperCase()}</span>
                       <span>{new Date(viewingTransaction.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <div className="h-px bg-slate-100"></div>
                    <div className="space-y-3">
                       {viewingTransaction.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start">
                             <div className="flex-1 pr-4">
                                <p className="text-[10px] font-black uppercase leading-tight text-slate-800">{item.product.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                  {item.quantity} x Rp {(item.product.outletSettings?.[viewingTransaction.outletId]?.price || item.product.price || 0).toLocaleString()}
                                </p>
                             </div>
                             <p className="text-[10px] font-black font-mono text-slate-900 whitespace-nowrap">Rp {(((item.product.outletSettings?.[viewingTransaction.outletId]?.price || item.product.price || 0)) * item.quantity).toLocaleString()}</p>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                       <span>Subtotal</span>
                       <span className="font-mono">Rp {(viewingTransaction.subtotal ?? 0).toLocaleString()}</span>
                    </div>
                    {((viewingTransaction.membershipDiscount || 0) + (viewingTransaction.bulkDiscount || 0) + (viewingTransaction.pointDiscountValue || 0)) > 0 && (
                      <div className="flex justify-between text-[9px] font-black text-rose-500 uppercase italic">
                         <span>Potongan Diskon</span>
                         <span className="font-mono">-Rp {((viewingTransaction.membershipDiscount || 0) + (viewingTransaction.bulkDiscount || 0) + (viewingTransaction.pointDiscountValue || 0)).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-3 border-t border-slate-50">
                       <span className="text-[9px] font-black uppercase text-slate-400 mb-1">Total Netto</span>
                       <span className="text-xl font-black font-mono text-slate-900 tracking-tighter">Rp {(viewingTransaction.total ?? 0).toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center bg-slate-50 -mx-8 -mb-8 px-8 py-6">
                    <div>
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Payment</p>
                       <p className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">{viewingTransaction.paymentMethod}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cashier PIC</p>
                       <p className="text-[9px] font-black text-slate-800 uppercase mt-0.5">{viewingTransaction.cashierName.split(' ')[0]}</p>
                    </div>
                 </div>
              </div>

              {/* ACTION BUTTONS - COMPACT */}
              <div className="flex gap-2">
                 <button 
                   onClick={downloadReceipt}
                   className="flex-1 py-4 bg-orange-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-orange-700"
                 >
                    <span>💾</span> SIMPAN GAMBAR
                 </button>
                 <button 
                   onClick={() => setViewingTransaction(null)}
                   className="flex-1 py-4 bg-white text-slate-900 rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                    TUTUP AUDIT
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
