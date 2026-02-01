
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { Transaction, PaymentMethod, UserRole, OrderStatus, Attendance } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';

// Komponen Metrik yang padat dan modern
const CompactMetric: React.FC<{ label: string; value: string; color: string; icon: string }> = ({ label, value, color, icon }) => (
  <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm group-hover:scale-110 transition-transform">{icon}</span>
    </div>
    <p className={`text-lg md:text-xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
  </div>
);

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { 
    selectedOutletId, outlets, products,
    currentUser, transactions, expenses, attendance, staff, filteredTransactions
  } = useApp();
  
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const isExecutive = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const isGlobalView = selectedOutletId === 'all' && isExecutive;
  const todayStr = new Date().toISOString().split('T')[0];

  // DATA: Summary Metrics
  const summary = useMemo(() => {
    const targetTxs = isGlobalView ? transactions : filteredTransactions;
    const closedTxs = targetTxs.filter(t => t.status === OrderStatus.CLOSED);
    const sales = closedTxs.reduce((a, b) => a + b.total, 0);
    const cash = closedTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + b.total, 0);
    const qris = closedTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a, b) => a + b.total, 0);
    const targetExps = isGlobalView ? expenses : expenses.filter(e => e.outletId === selectedOutletId);
    const exp = targetExps.reduce((a, b) => a + b.amount, 0);
    return { sales, cash, qris, exp };
  }, [isGlobalView, transactions, filteredTransactions, expenses, selectedOutletId]);

  // DATA: Intelligence (Top Products & Hourly Traffic)
  const intel = useMemo(() => {
    const targetTxs = isGlobalView ? transactions : filteredTransactions;
    const closedTxs = targetTxs.filter(t => t.status === OrderStatus.CLOSED);
    
    // 1. Hourly Traffic
    const hourlyMap = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0 }));
    closedTxs.forEach(tx => {
      const h = new Date(tx.timestamp).getHours();
      if (hourlyMap[h]) hourlyMap[h].sales += tx.total;
    });
    const trafficData = hourlyMap.filter((_, i) => i >= 9 && i <= 22);

    // 2. Top Products
    const productMap: Record<string, { name: string, qty: number }> = {};
    closedTxs.forEach(tx => {
      tx.items.forEach(item => {
        if (!productMap[item.product.id]) productMap[item.product.id] = { name: item.product.name, qty: 0 };
        productMap[item.product.id].qty += item.quantity;
      });
    });
    const topProducts = Object.values(productMap).sort((a,b) => b.qty - a.qty).slice(0, 5);

    return { trafficData, topProducts };
  }, [isGlobalView, transactions, filteredTransactions]);

  // DATA: Presence (Owner) or Personal (Staff)
  const presenceInfo = useMemo(() => {
    if (isExecutive) {
      return staff
        .filter(s => isGlobalView || s.assignedOutletIds.includes(selectedOutletId))
        .map(s => {
          const record = attendance.find(a => a.staffId === s.id && a.date === todayStr);
          return { name: s.name, status: record ? (record.clockOut ? 'PULANG' : 'AKTIF') : 'OFF' };
        }).sort((a,b) => a.status === 'AKTIF' ? -1 : 1);
    }
    return attendance.find(a => a.staffId === currentUser?.id && a.date === todayStr);
  }, [isExecutive, isGlobalView, staff, attendance, selectedOutletId, currentUser, todayStr]);

  // DATA: Motivation Engine
  const mission = useMemo(() => {
    if (!currentUser) return null;
    const mySales = transactions
      .filter(t => t.cashierId === currentUser.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp).toISOString().split('T')[0] === todayStr)
      .reduce((a, b) => a + b.total, 0);
    const target = currentUser.dailySalesTarget || 1500000;
    const percent = Math.min(100, Math.round((mySales / target) * 100));
    return { sales: mySales, target, percent };
  }, [currentUser, transactions, todayStr]);

  const downloadReceipt = async () => {
    if (!receiptRef.current || !viewingTransaction) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Struk-${viewingTransaction.id.slice(-6)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { alert('Gagal simpan'); }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-[#fcfdfe] pb-40">
      
      {/* 1. COMPACT HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Operational Intel</p>
           <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none mt-1">
             {isGlobalView ? "Network Hub" : "Branch Dashboard"}
           </h2>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
        </div>
      </div>

      {/* 2. TOP PRIORITY: PERSONAL ATTENDANCE (ONLY FOR STAFF) */}
      {!isExecutive && (
        <div className={`mb-6 p-5 rounded-[32px] border-2 flex items-center justify-between transition-all ${presenceInfo ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100 animate-pulse'}`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${presenceInfo ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                 {presenceInfo ? '✅' : '⚠️'}
              </div>
              <div>
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Absensi Anda</p>
                 <h4 className={`text-xs font-black uppercase ${presenceInfo ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {presenceInfo ? 'Anda Sudah Check-In ✓' : 'Segera Absen Masuk! ➔'}
                 </h4>
              </div>
           </div>
           {!presenceInfo && (
              <button 
                onClick={() => setActiveTab && setActiveTab('attendance')}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-200"
              >
                 Portal Absen
              </button>
           )}
           {presenceInfo && (
              <div className="text-right">
                 <p className="text-[9px] font-black text-emerald-600 font-mono">{(presenceInfo as Attendance).clockIn ? new Date((presenceInfo as Attendance).clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p>
                 <p className="text-[7px] font-bold text-emerald-400 uppercase">Clock-In Time</p>
              </div>
           )}
        </div>
      )}

      {/* 3. MISSION BAR */}
      {!isGlobalView && mission && (
        <div className="mb-6 bg-white border border-orange-100 rounded-[32px] p-5 shadow-sm relative overflow-hidden">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shrink-0 ${mission.percent >= 100 ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-orange-500 text-white shadow-orange-200'}`}>{mission.percent}%</div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Misi Sales Hari Ini</p>
                    <h4 className="text-sm font-black text-slate-800 uppercase">Rp {mission.sales.toLocaleString()} / <span className="text-slate-400">Rp {mission.target.toLocaleString()}</span></h4>
                 </div>
              </div>
              <div className="w-full md:flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 ${mission.percent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${mission.percent}%` }}></div>
              </div>
              <p className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap ${mission.percent >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                 {mission.percent >= 100 ? 'Target Tercapai! ✨' : `Rp ${(mission.target - mission.sales).toLocaleString()} Lagi`}
              </p>
           </div>
        </div>
      )}

      {/* 4. KEY METRICS GRID (2-Cols Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        <CompactMetric label="Total Omzet" value={`Rp ${(summary.sales/1000).toFixed(0)}k`} color="text-slate-900" icon="💰" />
        <CompactMetric label="Setoran Tunai" value={`Rp ${(summary.cash/1000).toFixed(0)}k`} color="text-emerald-600" icon="💵" />
        <CompactMetric label="Uang Digital" value={`Rp ${(summary.qris/1000).toFixed(0)}k`} color="text-blue-500" icon="📱" />
        <CompactMetric label="Biaya Keluar" value={`Rp ${(summary.exp/1000).toFixed(0)}k`} color="text-rose-500" icon="💸" />
      </div>

      {/* 5. OUTLET INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         {/* CHART JAM RAMAI */}
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col min-h-[250px] md:min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Traffic Jam Ramai</h3>
                  <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Live Hourly Activity</p>
               </div>
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <div className="flex-1 h-full w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intel.trafficData}>
                     <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="hour" fontSize={8} axisLine={false} tickLine={false} stroke="#94a3b8" />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '900' }}
                        labelStyle={{ color: '#6366f1' }}
                     />
                     <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* PRODUK TERLARIS */}
         <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl flex flex-col">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Menu Paling Laris (Top 5)</h3>
            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
               {intel.topProducts.map((p, idx) => (
                  <div key={idx} className="group">
                     <div className="flex justify-between items-center mb-1.5 px-1">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-white/20 font-mono">0{idx+1}</span>
                           <span className="text-[11px] font-black uppercase truncate max-w-[140px] group-hover:text-indigo-400 transition-colors">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-white/80">{p.qty} Unit</span>
                     </div>
                     <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-1000" 
                          style={{ width: `${(p.qty / (intel.topProducts[0]?.qty || 1)) * 100}%` }}
                        ></div>
                     </div>
                  </div>
               ))}
               {intel.topProducts.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] uppercase font-black py-10 text-center">Menunggu data penjualan...</div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* 6. TEAM PRESENCE (FOR OWNER) */}
         {isExecutive && (
            <div className="lg:col-span-1 space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Team Presence</h3>
               <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                     {(presenceInfo as any[]).map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{p.name.charAt(0)}</div>
                              <span className="text-[11px] font-black text-slate-700 uppercase">{p.name}</span>
                           </div>
                           <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase ${p.status === 'AKTIF' ? 'bg-green-100 text-green-600' : p.status === 'PULANG' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{p.status}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* 7. ENHANCED TRANSACTION FEED */}
         <div className={`${isExecutive ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            <div className="flex justify-between items-center px-1">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Sales Feed (Live)</h3>
               <button onClick={() => setActiveTab && setActiveTab('pos')} className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:translate-x-1 transition-transform">Input Baru ➔</button>
            </div>
            
            <div className="space-y-2">
               {(isGlobalView ? transactions : filteredTransactions).filter(t => t.status === OrderStatus.CLOSED).slice(0, 15).map(tx => (
                  <button key={tx.id} onClick={() => setViewingTransaction(tx)} className="w-full bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm hover:border-orange-200 transition-all flex justify-between items-center group text-left active:scale-[0.98]">
                     <div className="flex gap-4 items-center min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${tx.paymentMethod === PaymentMethod.QRIS ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'}`}>
                           {tx.paymentMethod === PaymentMethod.QRIS ? '📱' : '💵'}
                        </div>
                        <div className="min-w-0">
                           <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-black text-slate-900 uppercase">#{tx.id.slice(-6)}</span>
                              <span className="text-[7px] font-bold text-slate-300 uppercase">{new Date(tx.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                           </div>
                           <p className="text-[9px] font-bold text-slate-500 uppercase truncate leading-none">
                              {tx.items.map(i => `${i.product.name} (x${i.quantity})`).join(', ')}
                           </p>
                        </div>
                     </div>
                     <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-black text-slate-900 font-mono">Rp {tx.total.toLocaleString()}</p>
                        <p className="text-[7px] font-black text-orange-500 uppercase">{tx.cashierName.split(' ')[0]}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>
      </div>

      {/* 8. ENHANCED RECEIPT MODAL */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setViewingTransaction(null)}>
           <div className="w-full max-w-sm animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-4 px-2">
                 <button onClick={() => setViewingTransaction(null)} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center">✕</button>
                 <button onClick={downloadReceipt} className="px-6 bg-white text-slate-900 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl">Simpan 💾</button>
              </div>
              
              <div ref={receiptRef} className="bg-white p-8 md:p-10 shadow-2xl flex flex-col font-mono text-[11px] text-slate-900 border-t-[12px] border-orange-500">
                 {/* HEADER */}
                 <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-4xl font-black mx-auto mb-4">M</div>
                    <h3 className="text-sm font-black tracking-tighter uppercase">Mozza Boy Enterprise</h3>
                    <p className="text-[9px] font-black text-slate-700 uppercase mt-1">
                      {outlets.find(o=>o.id===viewingTransaction.outletId)?.name}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase mt-1 px-4 leading-tight">
                      {outlets.find(o=>o.id===viewingTransaction.outletId)?.address}
                    </p>
                    
                    <div className="w-full border-b border-dashed border-slate-200 my-4"></div>
                    
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase px-1">
                       <span>ID: #{viewingTransaction.id.slice(-6)}</span>
                       <span>{new Date(viewingTransaction.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase px-1 mt-1">
                       <span>Kasir: {viewingTransaction.cashierName}</span>
                       <span>Status: Lunas</span>
                    </div>
                 </div>

                 {/* ITEMS */}
                 <div className="space-y-4 mb-8">
                    {viewingTransaction.items.map((it, idx) => (
                       <div key={idx} className="flex justify-between items-start gap-4 uppercase">
                          <div className="flex-1">
                             <p className="leading-tight">{it.product.name}</p>
                             <p className="text-[9px] text-slate-400">Qty: {it.quantity} x Rp {((it.product.outletSettings?.[viewingTransaction.outletId]?.price || it.product.price)).toLocaleString()}</p>
                          </div>
                          <span className="font-black">Rp {((it.product.outletSettings?.[viewingTransaction.outletId]?.price || it.product.price) * it.quantity).toLocaleString()}</span>
                       </div>
                    ))}
                 </div>

                 {/* TOTALS & DISCOUNTS */}
                 <div className="w-full border-t border-slate-200 pt-5 space-y-2">
                    {((viewingTransaction.membershipDiscount || 0) + (viewingTransaction.bulkDiscount || 0) + (viewingTransaction.pointDiscountValue || 0)) > 0 && (
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                         <span>Subtotal</span>
                         <span>Rp {viewingTransaction.subtotal.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {viewingTransaction.membershipDiscount && viewingTransaction.membershipDiscount > 0 ? (
                      <div className="flex justify-between text-[10px] text-orange-600 uppercase font-bold italic">
                         <span>Disc Member</span>
                         <span>-Rp {viewingTransaction.membershipDiscount.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {viewingTransaction.bulkDiscount && viewingTransaction.bulkDiscount > 0 ? (
                      <div className="flex justify-between text-[10px] text-orange-600 uppercase font-bold italic">
                         <span>Disc Grosir</span>
                         <span>-Rp {viewingTransaction.bulkDiscount.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {viewingTransaction.pointDiscountValue && viewingTransaction.pointDiscountValue > 0 ? (
                      <div className="flex justify-between text-[10px] text-indigo-600 uppercase font-bold italic">
                         <span>Redeem Poin</span>
                         <span>-Rp {viewingTransaction.pointDiscountValue.toLocaleString()}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-base font-black uppercase pt-3 border-t-2 border-slate-900 mt-2">
                       <span>Total Netto</span>
                       <span className="text-orange-600">Rp {viewingTransaction.total.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mt-4 pt-4 border-t border-dashed border-slate-200">
                       <span>Metode Bayar</span>
                       <span className={`${viewingTransaction.paymentMethod === PaymentMethod.QRIS ? 'text-blue-600' : 'text-emerald-600'}`}>
                         {viewingTransaction.paymentMethod}
                       </span>
                    </div>
                 </div>

                 {/* FOOTER QR */}
                 <div className="mt-10 text-center">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${viewingTransaction.id}&color=0f172a`} className="w-20 h-20 mx-auto opacity-30 grayscale" alt="QR" />
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] mt-6">Digital Audit Proof</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-2 italic">Terima kasih telah berkunjung!</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
