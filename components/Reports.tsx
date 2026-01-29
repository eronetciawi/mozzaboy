
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { PaymentMethod, Transaction, DailyClosing, UserRole, InventoryItem, Product, OrderStatus } from '../types';

export const Reports: React.FC = () => {
  const { 
    transactions, purchases, expenses, selectedOutletId, 
    products, outlets, inventory, expenseTypes
  } = useApp();
  
  const [activeReportTab, setActiveReportTab] = useState<'executive' | 'sales_audit' | 'pnl_detail' | 'inventory_value'>('executive');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'history'>('day');
  
  // State untuk Filter Histori Bulan Sebelumnya
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // --- LOGIKA FILTER DATA ENTERPRISE ---
  const filteredData = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (timeFilter === 'day') {
      start.setHours(0,0,0,0);
    } else if (timeFilter === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (timeFilter === 'month') {
      start.setDate(now.getDate() - 30);
    } else if (timeFilter === 'history') {
      start = new Date(selectedYear, selectedMonth, 1);
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    }

    const txs = transactions.filter(t => t.outletId === selectedOutletId && new Date(t.timestamp) >= start && (timeFilter !== 'history' || new Date(t.timestamp) <= end));
    const exps = expenses.filter(e => e.outletId === selectedOutletId && new Date(e.timestamp) >= start && (timeFilter !== 'history' || new Date(e.timestamp) <= end));
    const purs = purchases.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= start && (timeFilter !== 'history' || new Date(p.timestamp) <= end));

    return { txs, exps, purs, start, end };
  }, [transactions, expenses, purchases, selectedOutletId, timeFilter, selectedMonth, selectedYear]);

  // --- KALKULASI METRIK KEUANGAN ---
  const metrics = useMemo(() => {
    const closedTxs = filteredData.txs.filter(t => t.status === OrderStatus.CLOSED);
    const revenue = closedTxs.reduce((a, b) => a + b.total, 0);
    const cogs = closedTxs.reduce((a, b) => a + (b.totalCost || 0), 0);
    const opEx = filteredData.exps.reduce((a, b) => a + b.amount, 0);
    
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - opEx;
    
    const invValue = inventory
      .filter(i => i.outletId === selectedOutletId)
      .reduce((a, b) => a + (b.quantity * b.costPerUnit), 0);

    return { revenue, cogs, opEx, grossProfit, netProfit, invValue, transactionCount: closedTxs.length };
  }, [filteredData, inventory, selectedOutletId]);

  // --- PREPARASI DATA GRAFIK ---
  const chartData = useMemo(() => {
    const map: Record<string, { label: string, sales: number, costs: number }> = {};
    
    filteredData.txs.filter(t => t.status === OrderStatus.CLOSED).forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!map[date]) map[date] = { label: date, sales: 0, costs: 0 };
      map[date].sales += tx.total;
      map[date].costs += (tx.totalCost || 0);
    });

    return Object.values(map);
  }, [filteredData]);

  const StatCard = ({ title, value, subValue, colorClass = "text-slate-800", icon }: any) => (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-500 transition-all">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <h3 className={`text-2xl font-black ${colorClass}`}>Rp {value.toLocaleString()}</h3>
        {subValue && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-50/50">
      {/* ENTERPRISE REPORTING HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 shrink-0 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Business Intelligence</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Master Audit: {activeOutlet?.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-[24px] border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             {(['day', 'week', 'month', 'history'] as const).map(t => (
               <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                 {t === 'day' ? 'Hari Ini' : t === 'week' ? '7 Hari' : t === 'month' ? '30 Hari' : 'History'}
               </button>
             ))}
          </div>
          
          {timeFilter === 'history' && (
            <div className="flex gap-2 animate-in slide-in-from-right-2">
               <select className="bg-slate-50 border rounded-lg px-2 py-1.5 text-[9px] font-black uppercase outline-none" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
               </select>
               <select className="bg-slate-50 border rounded-lg px-2 py-1.5 text-[9px] font-black uppercase outline-none" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          )}

          <button onClick={() => window.print()} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg">
             <span>📄</span> EXPORT PDF
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2 no-print overflow-x-auto no-scrollbar">
         <button onClick={() => setActiveReportTab('executive')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeReportTab === 'executive' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Ringkasan Eksekutif</button>
         <button onClick={() => setActiveReportTab('sales_audit')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeReportTab === 'sales_audit' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Audit Penjualan</button>
         <button onClick={() => setActiveReportTab('pnl_detail')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeReportTab === 'pnl_detail' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Laporan Laba Rugi</button>
         <button onClick={() => setActiveReportTab('inventory_value')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeReportTab === 'inventory_value' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Valuasi Inventori</button>
      </div>

      {/* REPORT CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 print:overflow-visible">
        
        {/* VIEW 1: EXECUTIVE DASHBOARD */}
        {activeReportTab === 'executive' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={metrics.revenue} subValue={`${metrics.transactionCount} Struk Terbit`} icon="💰" colorClass="text-orange-600" />
                <StatCard title="Pemakaian HPP" value={metrics.cogs} subValue={`${((metrics.cogs/metrics.revenue)*100 || 0).toFixed(1)}% Food Cost`} icon="🍢" colorClass="text-slate-600" />
                <StatCard title="Biaya Operasional" value={metrics.opEx} subValue="Pengeluaran Cabang" icon="💸" colorClass="text-red-600" />
                <StatCard title="Laba Bersih" value={metrics.netProfit} subValue={`${((metrics.netProfit/metrics.revenue)*100 || 0).toFixed(1)}% Net Margin`} icon="📈" colorClass="text-emerald-600" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                   <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Tren Analisis: Revenue vs HPP</h4>
                   <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData}>
                            <defs>
                               <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                               <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/><stop offset="95%" stopColor="#64748b" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `Rp${v/1000}k`} />
                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" name="Penjualan" />
                            <Area type="monotone" dataKey="costs" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorCosts)" name="Modal HPP" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white">
                   <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-6">Menu Paling Laris</h4>
                   <div className="space-y-5">
                      {products.map(p => {
                         const qty = filteredData.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc, tx) => acc + tx.items.filter(it => it.product.id === p.id).reduce((a,b)=>a+b.quantity, 0), 0);
                         return { name: p.name, qty };
                      }).sort((a,b)=>b.qty - a.qty).slice(0, 5).map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black text-white/20">0{idx+1}</span>
                               <span className="text-[11px] font-black uppercase truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="text-orange-500 font-black text-xs">{item.qty} <span className="text-[8px] text-white/40">PCS</span></span>
                         </div>
                      ))}
                   </div>
                   <div className="mt-10 p-5 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Average Ticket Size</p>
                      <p className="text-lg font-black text-white">Rp {metrics.transactionCount > 0 ? Math.round(metrics.revenue / metrics.transactionCount).toLocaleString() : 0}</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW 2: SALES AUDIT TRAIL */}
        {activeReportTab === 'sales_audit' && (
           <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Audit Trail Transaksi</h4>
                 <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{filteredData.txs.length} Transaksi Terlapor</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                       <tr>
                          <th className="py-4 px-8">Waktu / ID</th>
                          <th className="py-4 px-6">Pesanan</th>
                          <th className="py-4 px-6 text-center">Metode</th>
                          <th className="py-4 px-6 text-right">Revenue</th>
                          <th className="py-4 px-8 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                       {filteredData.txs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="py-4 px-8">
                                <p className="font-black text-slate-800 uppercase">#{tx.id.split('-')[1]?.slice(-6) || 'TX'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(tx.timestamp).toLocaleString()}</p>
                             </td>
                             <td className="py-4 px-6">
                                <p className="font-bold text-slate-600 truncate uppercase max-w-xs">{tx.items.map(i => `${i.product.name} (x${i.quantity})`).join(', ')}</p>
                             </td>
                             <td className="py-4 px-6 text-center">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${tx.paymentMethod === PaymentMethod.CASH ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{tx.paymentMethod}</span>
                             </td>
                             <td className="py-4 px-6 text-right font-black text-slate-900">Rp {tx.total.toLocaleString()}</td>
                             <td className="py-4 px-8 text-right">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${tx.status === OrderStatus.VOIDED ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{tx.status}</span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* VIEW 3: DETAILED P&L (FOR PDF EXPORT) */}
        {activeReportTab === 'pnl_detail' && (
          <div className="max-w-4xl mx-auto bg-white p-12 md:p-20 rounded-[60px] border-2 border-slate-100 shadow-2xl space-y-12 print:shadow-none print:border-none print:p-8">
             {/* PDF HEADER */}
             <div className="text-center border-b-4 border-slate-900 pb-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Mozza Boy Enterprise</h1>
                <p className="text-xs font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Laporan Laba Rugi Operasional</p>
                <div className="mt-6 flex justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Cabang: {activeOutlet?.name}</span>
                   <span>•</span>
                   <span>Periode: {timeFilter === 'history' ? `${months[selectedMonth]} ${selectedYear}` : 'Laporan Berjalan'}</span>
                </div>
             </div>

             <div className="space-y-10">
                {/* REVENUE SECTION */}
                <section>
                   <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
                      <h4 className="text-sm font-black uppercase tracking-widest">Total Gross Revenue</h4>
                      <p className="text-xl font-black">Rp {metrics.revenue.toLocaleString()}</p>
                   </div>
                   <div className="space-y-3 pl-4 opacity-70">
                      <div className="flex justify-between text-xs font-bold uppercase"><span>Penjualan Bersih</span><span>Rp {metrics.revenue.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs font-bold uppercase italic text-slate-400"><span>Potongan & Retur</span><span>(Rp 0)</span></div>
                   </div>
                </section>

                {/* COGS SECTION */}
                <section>
                   <div className="flex justify-between items-end border-b-2 border-red-500 pb-3 mb-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Beban Pokok Penjualan (HPP)</h4>
                      <p className="text-xl font-black text-red-600">(Rp {metrics.cogs.toLocaleString()})</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-3xl flex justify-between items-center">
                      <p className="text-[11px] font-black uppercase tracking-widest">Laba Kotor (Gross Profit)</p>
                      <p className="text-2xl font-black text-slate-900">Rp {metrics.grossProfit.toLocaleString()}</p>
                   </div>
                </section>

                {/* OPEX SECTION */}
                <section>
                   <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Biaya Operasional (OpEx)</h4>
                      <p className="text-sm font-bold text-slate-500">Rp {metrics.opEx.toLocaleString()}</p>
                   </div>
                   <div className="space-y-4 pl-4">
                      {expenseTypes.map(type => {
                         const amount = filteredData.exps.filter(e => e.typeId === type.id).reduce((a,b)=>a+b.amount, 0);
                         if (amount === 0) return null;
                         return (
                           <div key={type.id} className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                              <span>{type.name}</span>
                              <span>Rp {amount.toLocaleString()}</span>
                           </div>
                         );
                      })}
                   </div>
                </section>

                {/* NET PROFIT LINE */}
                <section className="pt-10 border-t-8 border-double border-slate-900">
                   <div className="flex justify-between items-center">
                      <div>
                         <h3 className="text-2xl font-black uppercase tracking-tighter">Laba Bersih Setelah Biaya</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Net Operating Income</p>
                      </div>
                      <div className="text-right">
                         <p className="text-4xl font-black text-emerald-600 tracking-tighter">Rp {metrics.netProfit.toLocaleString()}</p>
                         <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase mt-2 inline-block">Margin {((metrics.netProfit/metrics.revenue)*100 || 0).toFixed(1)}%</span>
                      </div>
                   </div>
                </section>
             </div>

             <div className="pt-20 text-center">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">This report is generated by Mozza Boy Enterprise POS v4.0 and is digitaly verified</p>
             </div>
          </div>
        )}

        {/* VIEW 4: INVENTORY VALUATION */}
        {activeReportTab === 'inventory_value' && (
           <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-10 text-8xl transform rotate-12">📦</div>
                 <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Total Nilai Aset Gudang</h4>
                 <h3 className="text-5xl font-black tracking-tighter">Rp {metrics.invValue.toLocaleString()}</h3>
                 <p className="text-xs text-slate-400 mt-4 uppercase font-bold tracking-widest italic leading-relaxed max-w-xl">
                    Nilasi aset dihitung berdasarkan harga beli terakhir (HPP Unit) dikalikan sisa stok fisik yang ada di cabang saat ini.
                 </p>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                       <tr>
                          <th className="py-5 px-8">Nama Bahan</th>
                          <th className="py-5 px-6 text-center">Stok</th>
                          <th className="py-5 px-6 text-right">HPP Unit</th>
                          <th className="py-5 px-8 text-right bg-slate-100">Nilai Investasi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                       {inventory.filter(i => i.outletId === selectedOutletId).map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 group">
                             <td className="py-4 px-8 font-black text-slate-800 uppercase">{item.name}</td>
                             <td className="py-4 px-6 text-center font-bold text-slate-500">{item.quantity} {item.unit}</td>
                             <td className="py-4 px-6 text-right font-bold text-slate-400">Rp {item.costPerUnit.toLocaleString()}</td>
                             <td className="py-4 px-8 text-right font-black text-indigo-600 bg-indigo-50/20">Rp {(item.quantity * item.costPerUnit).toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>
      
      {/* PRINT-ONLY FOOTER */}
      <div className="hidden print:block fixed bottom-0 left-0 w-full p-8 border-t border-slate-200 bg-white">
         <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Mozza Boy System Archive - Official Report</span>
            <span>Generated At: {new Date().toLocaleString()}</span>
         </div>
      </div>
    </div>
  );
};
