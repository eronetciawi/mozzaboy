
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { OrderStatus, PaymentMethod, DailyClosing, Product, Transaction } from '../types';

type ReportTab = 'finance' | 'sales' | 'inventory' | 'hr' | 'logs';

export const Reports: React.FC = () => {
  const { 
    transactions, expenses, purchases, selectedOutletId, 
    products, outlets, inventory, expenseTypes, staff, attendance, dailyClosings, categories
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('finance');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'history' | 'date'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const filteredSet = useMemo(() => {
    let start = new Date();
    let end = new Date();

    if (timeFilter === 'day') {
      start.setHours(0,0,0,0);
    } else if (timeFilter === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (timeFilter === 'month') {
      start.setDate(start.getDate() - 30);
    } else if (timeFilter === 'history') {
      start = new Date(selectedYear, selectedMonth, 1);
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    } else if (timeFilter === 'date') {
      start = new Date(specificDate); start.setHours(0,0,0,0);
      end = new Date(specificDate); end.setHours(23,59,59,999);
    }

    const txs = transactions.filter(t => (selectedOutletId === 'all' || t.outletId === selectedOutletId) && new Date(t.timestamp) >= start && new Date(t.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    const exps = expenses.filter(e => (selectedOutletId === 'all' || e.outletId === selectedOutletId) && new Date(e.timestamp) >= start && new Date(e.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    const logs = dailyClosings.filter(l => (selectedOutletId === 'all' || l.outletId === selectedOutletId) && new Date(l.timestamp) >= start && new Date(l.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    
    return { txs, exps, logs, start, end };
  }, [transactions, expenses, dailyClosings, selectedOutletId, timeFilter, selectedMonth, selectedYear, specificDate]);

  const salesIntelligence = useMemo(() => {
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0, count: 0 }));
    const productStats: Record<string, { name: string, qty: number, gross: number, disc: number, net: number, hpp: number }> = {};
    const categoryStats: Record<string, { name: string, revenue: number }> = {};
    const staffStats: Record<string, { name: string, revenue: number, trxCount: number }> = {};
    
    const closedTxs = filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED);
    const voidedTxs = filteredSet.txs.filter(t => t.status === OrderStatus.VOIDED);

    const metrics = {
      grossSales: 0,
      netSales: 0,
      totalCOGS: 0,
      cash: 0,
      qris: 0,
      debit: 0,
      discounts: 0,
      pointRedemptions: 0,
      voidCount: voidedTxs.length,
      voidAmount: voidedTxs.reduce((a, b) => a + b.total, 0),
      totalTrx: closedTxs.length
    };
    
    closedTxs.forEach(tx => {
      const date = new Date(tx.timestamp);
      const h = date.getHours();
      
      hourlyData[h].sales += tx.total;
      hourlyData[h].count += 1;
      
      metrics.grossSales += tx.subtotal;
      metrics.netSales += tx.total;
      metrics.totalCOGS += (tx.totalCost || 0);
      metrics.discounts += (tx.membershipDiscount || 0) + (tx.bulkDiscount || 0);
      metrics.pointRedemptions += (tx.pointDiscountValue || 0);

      if (tx.paymentMethod === PaymentMethod.CASH) metrics.cash += tx.total;
      else if (tx.paymentMethod === PaymentMethod.QRIS) metrics.qris += tx.total;
      else if (tx.paymentMethod === PaymentMethod.DEBIT) metrics.debit += tx.total;

      // Staff Contribution Analysis
      if (!staffStats[tx.cashierId]) staffStats[tx.cashierId] = { name: tx.cashierName, revenue: 0, trxCount: 0 };
      staffStats[tx.cashierId].revenue += tx.total;
      staffStats[tx.cashierId].trxCount += 1;
      
      tx.items.forEach(it => {
        if (!productStats[it.product.id]) productStats[it.product.id] = { name: it.product.name, qty: 0, gross: 0, disc: 0, net: 0, hpp: 0 };
        const itemPrice = (it.product.outletSettings?.[tx.outletId]?.price || it.product.price);
        const itemGross = itemPrice * it.quantity;
        
        // HPP Calculation per item (BOM Based)
        const itemHpp = (it.product.bom || []).reduce((acc, b) => {
           const invItem = inventory.find(inv => inv.id === b.inventoryItemId);
           return acc + (b.quantity * (invItem?.costPerUnit || 0));
        }, 0);

        productStats[it.product.id].qty += it.quantity;
        productStats[it.product.id].gross += itemGross;
        productStats[it.product.id].hpp += (itemHpp * it.quantity);
        
        const discountRatio = tx.subtotal > 0 ? (itemGross / tx.subtotal) : 0;
        const itemDisc = ((tx.membershipDiscount || 0) + (tx.bulkDiscount || 0) + (tx.pointDiscountValue || 0)) * discountRatio;
        productStats[it.product.id].disc += itemDisc;
        productStats[it.product.id].net += (itemGross - itemDisc);

        const catName = categories.find(c => c.id === it.product.categoryId)?.name || 'Uncategorized';
        if (!categoryStats[it.product.categoryId]) categoryStats[it.product.categoryId] = { name: catName, revenue: 0 };
        categoryStats[it.product.categoryId].revenue += (itemGross - itemDisc);
      });
    });

    const topProducts = Object.values(productStats).sort((a,b) => b.qty - a.qty);
    const topStaff = Object.values(staffStats).sort((a,b) => b.revenue - a.revenue);
    const categoryData = Object.values(categoryStats).sort((a,b) => b.revenue - a.revenue);
    const aov = closedTxs.length > 0 ? Math.round(metrics.netSales / closedTxs.length) : 0;

    return {
      hourly: hourlyData.filter(h => h.count > 0 || h.hour === "10:00" || h.hour === "22:00"),
      products: topProducts,
      staff: topStaff,
      categories: categoryData,
      metrics,
      aov,
      rawTransactions: closedTxs.slice(0, 100)
    };
  }, [filteredSet, inventory, categories]);

  const FinanceRow = ({ label, value, isBold = false, isNegative = false, isTotal = false, indent = false }: any) => (
    <div className={`flex justify-between items-end py-2.5 ${isTotal ? 'border-t-2 border-slate-900 mt-2 pt-4' : 'border-b border-slate-100'} ${isBold ? 'font-black text-slate-900' : 'text-slate-600 font-medium'}`}>
      <span className={`text-[10px] uppercase tracking-wider ${indent ? 'pl-8 border-l-2 border-slate-100 ml-2' : ''}`}>{label}</span>
      <span className={`text-[12px] font-mono tabular-nums ${isNegative ? 'text-red-600' : ''}`}>
        {isNegative ? '(' : ''}Rp {value.toLocaleString('id-ID')}{isNegative ? ')' : ''}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* TOOLBAR */}
      <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
           <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Enterprise Intelligence Center</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Business Analysis & Financial Audit</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border shadow-sm">
             {(['finance', 'sales', 'inventory', 'hr', 'logs'] as ReportTab[]).map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                 {t === 'finance' ? 'Profit & Loss' : t === 'sales' ? 'Sales Analysis' : t === 'inventory' ? 'Stock Value' : t === 'hr' ? 'Team Performance' : 'Audit Logs'}
               </button>
             ))}
          </div>

          <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none text-slate-900" value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)}>
             <option value="day">Hari Ini</option>
             <option value="week">7 Hari Terakhir</option>
             <option value="month">30 Hari Terakhir</option>
             <option value="history">Arsip Per Bulan</option>
             <option value="date">Tanggal Spesifik</option>
          </select>

          {timeFilter === 'history' && (
             <div className="flex gap-1">
                <select className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[9px] font-black" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                   {months.map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
                <select className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[9px] font-black" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                   {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          )}

          <button onClick={() => window.print()} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Export Report 📄</button>
        </div>
      </div>

      {/* REPORT VIEW */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 bg-slate-100/30 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-[48px] overflow-hidden print:shadow-none print:border-none print:rounded-none pb-20">
          
          <div className="p-10 md:p-14 border-b-8 border-slate-900 flex flex-col md:flex-row justify-between items-start gap-8">
             <div className="space-y-4">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-3xl font-black">M</div>
                <div>
                   <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Business Performance Statement</h1>
                   <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-3">Module: {activeTab.toUpperCase()} • System Audit v5.0</p>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                   Outlet: {selectedOutletId === 'all' ? 'All Branches' : activeOutlet?.name}
                </div>
             </div>
             <div className="text-right flex flex-col items-end gap-3">
                <div className="bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl inline-block shadow-inner">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Date</p>
                   <p className="text-xs font-mono font-black text-slate-900">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                </div>
                <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Digital Certificate #MB-AUDIT-{Date.now().toString().slice(-6)}</div>
             </div>
          </div>

          <div className="p-10 md:p-16">
            {activeTab === 'finance' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                 <section>
                    <div className="flex items-center gap-4 mb-8">
                       <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">I. Revenue Audit (Pendapatan)</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="space-y-1">
                       <FinanceRow label="Penjualan Kotor (Gross Sales)" value={salesIntelligence.metrics.grossSales} isBold />
                       <FinanceRow label="Potongan Member & Grosir" value={salesIntelligence.metrics.discounts} isNegative indent />
                       <FinanceRow label="Redeem Poin Pelanggan" value={salesIntelligence.metrics.pointRedemptions} isNegative indent />
                       <div className="py-2"></div>
                       <FinanceRow label="Pendapatan Bersih (Net Sales)" value={salesIntelligence.metrics.netSales} isBold isTotal />
                    </div>
                 </section>

                 <section>
                    <div className="flex items-center gap-4 mb-8">
                       <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">II. Production Cost (HPP)</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="space-y-1">
                       <FinanceRow label="Estimasi HPP Bahan Baku Terjual" value={salesIntelligence.metrics.totalCOGS} isNegative />
                       <div className="py-2"></div>
                       <FinanceRow label="Laba Kotor (Gross Profit)" value={salesIntelligence.metrics.netSales - salesIntelligence.metrics.totalCOGS} isBold isTotal />
                    </div>
                 </section>

                 <section className="bg-slate-900 p-10 rounded-[40px] text-white">
                    <div className="flex justify-between items-center mb-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Operating Income (EBITDA Estimate)</p>
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter font-mono">Rp {(salesIntelligence.metrics.netSales - salesIntelligence.metrics.totalCOGS - filteredSet.exps.reduce((a,b)=>a+b.amount, 0)).toLocaleString()}</h3>
                    <p className="text-[9px] text-slate-400 mt-4 italic uppercase">Nilai estimasi sebelum pajak dan depresiasi aset.</p>
                 </section>
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="space-y-16 animate-in fade-in duration-500">
                 {/* EXECUTIVE SUMMARY TILES */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Avg Order Value</p>
                       <h4 className="text-xl font-black text-slate-900 font-mono">Rp {salesIntelligence.aov.toLocaleString()}</h4>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Transaksi</p>
                       <h4 className="text-xl font-black text-slate-900">{salesIntelligence.metrics.totalTrx} Trx</h4>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                       <p className="text-[8px] font-black text-rose-400 uppercase mb-1">Total Void / Batal</p>
                       <h4 className="text-xl font-black text-rose-600">{salesIntelligence.metrics.voidCount}</h4>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                       <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Point Redemption</p>
                       <h4 className="text-xl font-black text-indigo-600">Rp {salesIntelligence.metrics.pointRedemptions.toLocaleString()}</h4>
                    </div>
                 </div>

                 {/* SALES VELOCITY (TRAFFIC HEATMAP) */}
                 <section className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-sm">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-8">IV. Sales Velocity (Traffic Heatmap)</h4>
                    <div className="h-64 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={salesIntelligence.hourly}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="hour" fontSize={8} axisLine={false} tickLine={false} />
                             <YAxis hide />
                             <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                             <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={4} fill="#fb923c" fillOpacity={0.1} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </section>

                 {/* PRODUCT PERFORMANCE & MARGIN AUDIT */}
                 <section className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">V. Itemized Margin & Unit Economics</h4>
                    <div className="bg-white border-2 border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
                       <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                             <tr>
                                <th className="py-6 px-10">Menu Item</th>
                                <th className="py-6 px-4 text-center">Qty Sold</th>
                                <th className="py-6 px-4 text-right">Avg HPP</th>
                                <th className="py-6 px-4 text-right">Net Revenue</th>
                                <th className="py-6 px-10 text-right bg-slate-800 text-orange-400">Net Margin</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {salesIntelligence.products.map(p => (
                               <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 px-10 font-black text-slate-800 uppercase">{p.name}</td>
                                  <td className="py-4 px-4 text-center font-bold text-slate-400">{p.qty} Unit</td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-500">Rp {(p.hpp/(p.qty||1)).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">Rp {p.net.toLocaleString()}</td>
                                  <td className="py-4 px-10 text-right font-black font-mono text-indigo-600 bg-indigo-50/20">Rp {(p.net - p.hpp).toLocaleString()}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </section>

                 {/* STAFF PRODUCTIVITY RANKING */}
                 <section className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">VI. Staff Contribution Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {salesIntelligence.staff.map((s, idx) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-orange-500 shadow-sm">{idx+1}</div>
                                <div>
                                   <p className="text-[11px] font-black uppercase text-slate-800">{s.name}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">{s.trxCount} Transaksi</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-indigo-600">Rp {s.revenue.toLocaleString()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </section>

                 {/* DETAILED TRANSACTION LOG (AUDIT TRAIL) */}
                 <section className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">VII. Digital Audit Trail (Last 100 Receipts)</h4>
                    <div className="space-y-2">
                       {salesIntelligence.rawTransactions.map(tx => (
                          <div key={tx.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-orange-200 transition-all">
                             <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[9px] font-black text-slate-400">ID</div>
                                <div>
                                   <p className="text-[10px] font-black uppercase text-slate-800">{tx.items.map(it=>`${it.product.name} (x${it.quantity})`).join(', ')}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(tx.timestamp).toLocaleString()} • {tx.paymentMethod}</p>
                                </div>
                             </div>
                             <div className="text-right shrink-0">
                                <p className="text-sm font-black text-slate-900 font-mono">Rp {tx.total.toLocaleString()}</p>
                                <p className="text-[8px] font-black text-orange-500 uppercase">Kasir: {tx.cashierName}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                 <div className="bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-sm">
                    <table className="w-full text-left text-[11px]">
                       <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                          <tr>
                             <th className="py-6 px-10">Bahan Baku / SKU</th>
                             <th className="py-6 px-4 text-center">Status</th>
                             <th className="py-6 px-4 text-center">Stok Fisik</th>
                             <th className="py-6 px-10 text-right">Aset Value (IDR)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {inventory.filter(i => (selectedOutletId === 'all' || i.outletId === selectedOutletId)).sort((a,b) => (a.quantity/(a.minStock||1)) - (b.quantity/(b.minStock||1))).map(item => {
                             const health = item.quantity <= 0 ? 'Kritis' : item.quantity <= item.minStock ? 'Kurang' : 'Aman';
                             return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="py-4 px-10 font-black uppercase text-slate-800">{item.name}</td>
                                   <td className="py-4 px-4 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${health === 'Aman' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                         {health}
                                      </span>
                                   </td>
                                   <td className="py-4 px-4 text-center font-bold text-slate-500 font-mono">{item.quantity} {item.unit}</td>
                                   <td className="py-4 px-10 text-right font-black text-slate-900 font-mono">Rp {(item.quantity * item.costPerUnit).toLocaleString()}</td>
                                </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
