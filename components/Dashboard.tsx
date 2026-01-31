
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { Transaction, PaymentMethod, UserRole, Product } from '../types';
import html2canvas from 'html2canvas';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard: React.FC<{ title: string; value: string; trend: string; isPositive: boolean; icon: string }> = ({ title, value, trend, isPositive, icon }) => (
  <div className="bg-white p-4 md:p-5 rounded-[28px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-500 transition-all">
    <div className="flex justify-between items-start mb-2">
      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <span className="text-lg opacity-40 group-hover:opacity-100 transition-opacity">{icon}</span>
    </div>
    <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter">{value}</h3>
    <p className={`text-[8px] md:text-[9px] mt-2 flex items-center gap-1 font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <span>{isPositive ? '▲' : '▼'}</span> {trend}
    </p>
  </div>
);

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { 
    filteredTransactions, inventory, selectedOutletId, outlets, 
    currentUser, dailyClosings, approveClosing, rejectClosing,
    transactions, attendance
  } = useApp();
  
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const isManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const pendingClosings = dailyClosings.filter(c => c.status === 'PENDING');

  const txs = filteredTransactions.filter(t => t.status === 'CLOSED');
  const totalSales = txs.reduce((sum, tx) => sum + tx.total, 0);
  const totalOrders = txs.length;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  // --- PERFORMANCE LOGIC (From My Portal) ---
  const todayStr = new Date().toISOString().split('T')[0];
  const mySalesToday = useMemo(() => {
    return transactions
      .filter(tx => tx.cashierId === currentUser?.id && tx.status === 'CLOSED' && new Date(tx.timestamp).toISOString().split('T')[0] === todayStr)
      .reduce((acc, tx) => acc + tx.total, 0);
  }, [transactions, currentUser, todayStr]);

  const targetSales = currentUser?.dailySalesTarget || 0;
  const bonusAmount = currentUser?.targetBonusAmount || 0;
  const progressPercent = targetSales > 0 ? Math.min(100, Math.round((mySalesToday / targetSales) * 100)) : 0;
  const isTargetAchieved = targetSales > 0 && mySalesToday >= targetSales;

  const salesData = [
    { name: 'Pagi', sales: txs.filter(t => new Date(t.timestamp).getHours() < 12).reduce((a,b)=>a+b.total, 0) },
    { name: 'Siang', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 12 && new Date(t.timestamp).getHours() < 15).reduce((a,b)=>a+b.total, 0) },
    { name: 'Sore', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 15 && new Date(t.timestamp).getHours() < 18).reduce((a,b)=>a+b.total, 0) },
    { name: 'Malam', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 18).reduce((a,b)=>a+b.total, 0) },
  ];

  const lowStockItems = inventory.filter(item => item.outletId === selectedOutletId && item.quantity <= item.minStock);

  const getPrice = (p: Product) => p.outletSettings?.[selectedOutletId]?.price || p.price;

  const downloadReceipt = async () => {
    if (!receiptRef.current || !viewingTransaction) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `Struk-${viewingTransaction.id.slice(-6)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Gagal mengunduh gambar.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="p-3 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      
      {/* MANAGER NOTIFICATION BAR */}
      {isManager && pendingClosings.length > 0 && (
        <div className="mb-6 space-y-3 animate-in slide-in-from-top-4">
           {pendingClosings.map(cls => (
             <div key={cls.id} className="bg-red-600 p-4 md:p-5 rounded-3xl text-white shadow-xl shadow-red-600/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl animate-pulse">🚨</div>
                   <div>
                      <h4 className="text-[10px] md:text-xs font-black uppercase tracking-tight leading-none">Butuh Persetujuan Tutup Buku</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-white/70 uppercase mt-1">
                         {outlets.find(o => o.id === cls.outletId)?.name} • {cls.staffName} • Selisih: Rp {cls.discrepancy.toLocaleString()}
                      </p>
                   </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={() => approveClosing(cls.id)} className="flex-1 md:flex-none px-5 py-2 bg-white text-red-600 rounded-xl font-black text-[9px] uppercase shadow-lg">SETUJUI</button>
                   <button onClick={() => rejectClosing(cls.id)} className="flex-1 md:flex-none px-5 py-2 bg-red-800 text-white rounded-xl font-black text-[9px] uppercase">TOLAK</button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* TOP: MAIN STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        <StatCard title="Omzet" value={`Rp ${(totalSales/1000).toFixed(0)}k`} trend="Live" isPositive={true} icon="💰" />
        <StatCard title="Struk" value={totalOrders.toString()} trend="Orders" isPositive={true} icon="🧾" />
        <StatCard title="Avg Check" value={`Rp ${totalOrders > 0 ? (totalSales/totalOrders/1000).toFixed(0) : 0}k`} trend="Per Order" isPositive={true} icon="📈" />
        <StatCard title="Stok Kritis" value={lowStockItems.length.toString()} trend="Items" isPositive={false} icon="⚠️" />
      </div>

      {/* MIDDLE: PERFORMANCE & LOW STOCK ALERT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
         {/* INCENTIVE CARD (Personal Performance) */}
         <div className={`lg:col-span-2 p-6 rounded-[32px] shadow-lg relative overflow-hidden transition-all duration-500 border border-white/10 ${isTargetAchieved ? 'bg-gradient-to-br from-emerald-600 to-teal-800' : 'bg-slate-900'}`}>
            <div className="absolute top-0 right-0 p-6 opacity-10 text-4xl transform rotate-12">{isTargetAchieved ? '🏆' : '🎯'}</div>
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isTargetAchieved ? 'text-emerald-200' : 'text-orange-500'}`}>
                       Insentif Penjualan Anda
                    </p>
                    <h3 className="text-2xl font-black text-white tracking-tighter">Rp {mySalesToday.toLocaleString()}</h3>
                  </div>
                  {isTargetAchieved && (
                    <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                       <p className="text-[8px] font-black text-white uppercase tracking-widest">Bonus: Rp {bonusAmount.toLocaleString()}</p>
                    </div>
                  )}
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                     <span>Target: Rp {targetSales.toLocaleString()}</span>
                     <span className="text-white">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-1000 ${isTargetAchieved ? 'bg-emerald-400' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
               </div>
            </div>
         </div>

         {/* LOW STOCK CARD */}
         <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col relative group">
            <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
               Peringatan Stok
            </h4>
            <div className="space-y-2 flex-1">
               {lowStockItems.slice(0, 2).map(item => (
                 <div key={item.id} className="p-3 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center transition-transform hover:scale-[1.02]">
                    <span className="text-[9px] font-black text-red-800 uppercase truncate max-w-[120px]">{item.name}</span>
                    <span className="text-[10px] font-bold text-red-600 shrink-0">{item.quantity} {item.unit}</span>
                 </div>
               ))}
               {lowStockItems.length > 2 && (
                 <p className="text-[8px] font-black text-red-400 text-center uppercase tracking-widest mt-2">+{lowStockItems.length - 2} Item Lainnya</p>
               )}
               {lowStockItems.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-6">Semua stok aman ✓</p>}
            </div>
            <button 
              onClick={() => setActiveTab && setActiveTab('inventory')}
              className="mt-4 w-full py-2 bg-slate-50 text-[8px] font-black text-slate-400 uppercase rounded-xl border border-slate-100 hover:bg-slate-900 hover:text-white transition-all"
            >Check Warehouse ➔</button>
         </div>
      </div>

      {/* RECENT TRANSACTIONS (Moved Up) */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 md:px-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Transaksi Terbaru</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Live Audit Trail</p>
          </div>
          <button onClick={() => setActiveTab && setActiveTab('pos')} className="text-[9px] font-black bg-slate-900 text-white px-5 py-2.5 rounded-2xl uppercase shadow-lg shadow-slate-900/10 active:scale-95 transition-transform">+ Kasir Jualan</button>
        </div>

        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
           {txs.slice(0, 10).map(tx => (
             <button 
                key={tx.id} 
                onClick={() => setViewingTransaction(tx)}
                className="w-full p-5 md:px-8 flex items-center justify-between text-left active:bg-slate-50 transition-colors group"
             >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${tx.paymentMethod === 'TUNAI' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {tx.paymentMethod === 'TUNAI' ? '💵' : '📱'}
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">#{tx.id.split('-')[1]?.slice(-6)}</span>
                        <span className="text-[8px] font-black text-slate-300 uppercase">• {new Date(tx.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 line-clamp-1 uppercase italic">{tx.items.map(i => i.product.name).join(', ')}</p>
                   </div>
                </div>
                <div className="text-right flex items-center gap-4">
                   <div className="hidden md:block">
                      <p className="text-[7px] font-black text-slate-300 uppercase">Cashier</p>
                      <p className="text-[9px] font-black text-slate-600 uppercase">{tx.cashierName.split(' ')[0]}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-slate-900 tracking-tight">Rp {tx.total.toLocaleString()}</p>
                      <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Struk ➔</p>
                   </div>
                </div>
             </button>
           ))}
           {txs.length === 0 && (
             <div className="py-20 text-center opacity-20 italic text-[10px] font-black uppercase">Belum ada transaksi hari ini</div>
           )}
        </div>
      </div>

      {/* BOTTOM: ANALYTICS CHART (Moved Down) */}
      <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm mb-10">
         <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
               Arus Kas Cabang (Batching)
            </h4>
            <span className="text-[8px] font-black text-slate-300 uppercase italic">Real-time Cloud Sync</span>
         </div>
         <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} stroke="#94a3b8" />
                <YAxis fontSize={9} axisLine={false} tickLine={false} stroke="#94a3b8" tickFormatter={(val) => `Rp${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: '900', color: '#1e293b', marginBottom: '4px', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* RECEIPT MODAL */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto no-scrollbar" onClick={() => setViewingTransaction(null)}>
          <div className="w-full max-w-sm flex flex-col items-center animate-in slide-in-from-bottom-10 zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
             <div className="w-full mb-6 flex justify-between items-center gap-4 px-2">
                <button onClick={() => setViewingTransaction(null)} className="w-12 h-12 rounded-2xl bg-white/10 text-white backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all">✕</button>
                <div className="flex gap-2">
                   <button onClick={downloadReceipt} className="px-5 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Unduh 💾</button>
                </div>
             </div>
             
             <div className="relative w-full">
                <div className="absolute inset-0 bg-black/20 blur-3xl rounded-[40px] transform translate-y-8"></div>
                <div ref={receiptRef} className="bg-white p-8 md:p-10 w-full shadow-2xl flex flex-col text-slate-900 font-mono text-[10px] md:text-[11px] uppercase border-t-[8px] border-orange-500 relative">
                   <div className="absolute top-0 left-0 w-full h-3 bg-[radial-gradient(circle,transparent:5px,white:5px)] bg-[length:12px_12px] bg-repeat-x -mt-1.5"></div>
                   <div className="text-center mb-10">
                      <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 select-none">M</div>
                      <h3 className="text-base font-black tracking-tight leading-none mb-1">MOZZA BOY</h3>
                      <div className="w-full border-b border-dashed border-slate-200 mb-6"></div>
                      <h3 className="text-[10px] font-black text-slate-800">{activeOutlet?.name}</h3>
                   </div>
                   <div className="space-y-1.5 mb-8">
                      <div className="flex justify-between"><span>Waktu:</span><span>{new Date(viewingTransaction.timestamp).toLocaleString()}</span></div>
                      <div className="flex justify-between font-black border-t border-slate-100 pt-1 mt-1"><span>Order ID:</span><span>#{viewingTransaction.id.slice(-6)}</span></div>
                   </div>
                   <div className="w-full border-b-2 border-slate-900 mb-6"></div>
                   
                   {/* ITEMS LIST */}
                   <div className="space-y-4 mb-8">
                      {viewingTransaction.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-4">
                           <span className="flex-1 leading-tight">{it.product.name} x {it.quantity}</span>
                           <span className="font-bold shrink-0">Rp {(getPrice(it.product) * it.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                   </div>
                   
                   {/* DISCOUNT BREAKDOWN IN RECEIPT */}
                   <div className="w-full border-t border-dashed border-slate-200 py-4 space-y-2">
                      <div className="flex justify-between"><span>Subtotal</span><span>Rp {viewingTransaction.subtotal.toLocaleString()}</span></div>
                      {viewingTransaction.bulkDiscount && viewingTransaction.bulkDiscount > 0 && (
                         <div className="flex justify-between text-indigo-600 italic"><span>Diskon Grosir</span><span>-Rp {viewingTransaction.bulkDiscount.toLocaleString()}</span></div>
                      )}
                      {viewingTransaction.membershipDiscount && viewingTransaction.membershipDiscount > 0 && (
                         <div className="flex justify-between text-orange-600 italic"><span>Diskon Member</span><span>-Rp {viewingTransaction.membershipDiscount.toLocaleString()}</span></div>
                      )}
                      {viewingTransaction.pointDiscountValue && viewingTransaction.pointDiscountValue > 0 && (
                         <div className="flex justify-between text-emerald-600 italic"><span>Potongan Poin</span><span>-Rp {viewingTransaction.pointDiscountValue.toLocaleString()}</span></div>
                      )}
                   </div>

                   <div className="w-full border-b border-dashed border-slate-300 mb-6"></div>
                   <div className="flex justify-between text-[13px] font-black"><span>TOTAL</span><span className="text-orange-600">Rp {viewingTransaction.total.toLocaleString()}</span></div>
                   
                   {/* FOOTER INFO */}
                   <div className="text-center mt-6 space-y-4">
                      {viewingTransaction.customerId && (
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">+ {viewingTransaction.pointsEarned} Poin Didapat ✓</p>
                      )}
                      <div className="inline-block p-3 border border-slate-100 rounded-2xl bg-slate-50">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${viewingTransaction.id}&color=1a1a1a`} alt="Audit QR" className="w-14 h-14 grayscale opacity-80" crossOrigin="anonymous" />
                      </div>
                   </div>
                   <div className="absolute bottom-0 left-0 w-full h-3 bg-[radial-gradient(circle,white:5px,transparent:5px)] bg-[length:12px_12px] bg-repeat-x mb-[-1.5px]"></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
