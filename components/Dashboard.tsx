
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
// Add Product to imports
import { Transaction, PaymentMethod, UserRole, Product } from '../types';
import html2canvas from 'html2canvas';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard: React.FC<{ title: string; value: string; trend: string; isPositive: boolean }> = ({ title, value, trend, isPositive }) => (
  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{title}</p>
    <h3 className="text-lg md:text-xl font-black text-slate-800">{value}</h3>
    <p className={`text-[8px] md:text-[9px] mt-2 flex items-center gap-1 font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <span>{isPositive ? '▲' : '▼'}</span> {trend}
    </p>
  </div>
);

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { filteredTransactions, inventory, selectedOutletId, outlets, currentUser, customers } = useApp();
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const txs = filteredTransactions.filter(t => t.status === 'CLOSED');
  const totalSales = txs.reduce((sum, tx) => sum + tx.total, 0);
  const totalOrders = txs.length;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  const salesData = [
    { name: 'Pagi', sales: txs.filter(t => new Date(t.timestamp).getHours() < 12).reduce((a,b)=>a+b.total, 0) },
    { name: 'Siang', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 12 && new Date(t.timestamp).getHours() < 15).reduce((a,b)=>a+b.total, 0) },
    { name: 'Sore', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 15 && new Date(t.timestamp).getHours() < 18).reduce((a,b)=>a+b.total, 0) },
    { name: 'Malam', sales: txs.filter(t => new Date(t.timestamp).getHours() >= 18).reduce((a,b)=>a+b.total, 0) },
  ];

  const lowStockItems = inventory.filter(item => item.outletId === selectedOutletId && item.quantity <= item.minStock);

  return (
    <div className="p-3 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-20 md:pb-8">
      {/* STATS GRID - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <StatCard title="Omzet" value={`Rp ${(totalSales/1000).toFixed(0)}k`} trend="Live" isPositive={true} />
        <StatCard title="Struk" value={totalOrders.toString()} trend="Orders" isPositive={true} />
        <StatCard title="Avg Check" value={`Rp ${totalOrders > 0 ? (totalSales/totalOrders/1000).toFixed(0) : 0}k`} trend="Per Order" isPositive={true} />
        <StatCard title="Stok Kritis" value={lowStockItems.length.toString()} trend="Items" isPositive={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CHART - Responsive height */}
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">Arus Kas Hari Ini</h4>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val/1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ALERTS - Hidden or stacked */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Peringatan Stok</h4>
          <div className="space-y-3">
             {lowStockItems.slice(0, 3).map(item => (
               <div key={item.id} className="p-3 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-red-800 uppercase">{item.name}</span>
                  <span className="text-[10px] font-bold text-red-600">{item.quantity} {item.unit}</span>
               </div>
             ))}
             {lowStockItems.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-6">Semua stok aman ✓</p>}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS - Horizontal Scroll on mobile */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Transaksi Terbaru</h4>
          <button onClick={() => setActiveTab && setActiveTab('pos')} className="text-[8px] font-black bg-orange-500 text-white px-3 py-1 rounded-full uppercase">Buat Pesanan +</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-50 text-[8px] font-black uppercase text-slate-400">
               <tr>
                 <th className="py-3 px-4">Waktu</th>
                 <th className="py-3 px-4">Order ID</th>
                 <th className="py-3 px-4">Menu</th>
                 <th className="py-3 px-4 text-right">Total</th>
                 <th className="py-3 px-4 text-center">Aksi</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[10px]">
               {txs.slice(0, 5).map(tx => (
                 <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-500">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="py-3 px-4 font-black text-slate-900 uppercase">#{tx.id.split('-')[1]?.slice(-4) || 'TX'}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">{tx.items.map(i => i.product.name).join(', ')}</td>
                    <td className="py-3 px-4 text-right font-black">Rp {tx.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                       <button onClick={() => setViewingTransaction(tx)} className="text-[14px]">📄</button>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT MODAL (Optimized for HP) */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-none md:rounded-[32px] w-full max-w-sm h-full md:h-auto overflow-hidden flex flex-col shadow-2xl">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center no-print">
                <button onClick={() => setViewingTransaction(null)} className="text-xs font-black text-slate-400">TUTUP</button>
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase">Cetak</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-8 flex justify-center no-scrollbar bg-slate-100 md:bg-white">
                <div ref={receiptRef} className="bg-white p-6 w-[280px] shadow-sm flex flex-col text-slate-900 font-mono text-[10px] uppercase">
                   <div className="text-center mb-6">
                      <h3 className="text-sm font-black tracking-tight">{activeOutlet?.name}</h3>
                      <p className="text-[8px] mt-1 opacity-60 leading-tight">{activeOutlet?.address}</p>
                      <p className="mt-4">---------------------------</p>
                   </div>
                   <div className="space-y-1 mb-4">
                      <div className="flex justify-between"><span>Tgl:</span><span>{new Date(viewingTransaction.timestamp).toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span>Kasir:</span><span>{viewingTransaction.cashierName}</span></div>
                      <div className="flex justify-between font-black"><span>ID:</span><span>#{viewingTransaction.id.slice(-6)}</span></div>
                   </div>
                   <p className="mb-4">---------------------------</p>
                   <div className="space-y-3 mb-6">
                      {viewingTransaction.items.map((it, idx) => (
                        <div key={idx}>
                           <div className="flex justify-between"><span>{it.product.name}</span><span>Rp {(getPrice(it.product) * it.quantity).toLocaleString()}</span></div>
                           <div className="text-[8px] opacity-60">{it.quantity} x {getPrice(it.product).toLocaleString()}</div>
                        </div>
                      ))}
                   </div>
                   <p className="mb-4">---------------------------</p>
                   <div className="space-y-1 font-black">
                      <div className="flex justify-between text-xs"><span>TOTAL</span><span className="text-orange-600">Rp {viewingTransaction.total.toLocaleString()}</span></div>
                      <div className="flex justify-between opacity-60"><span>Bayar</span><span>{viewingTransaction.paymentMethod}</span></div>
                   </div>
                   <div className="text-center mt-10">
                      <p className="text-[8px]">Terima Kasih</p>
                      <p className="text-[7px] mt-1 italic font-sans">mozzaboy.com</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );

  // Use the imported Product type
  function getPrice(p: Product) {
    return p.outletSettings?.[selectedOutletId]?.price || p.price;
  }
};
