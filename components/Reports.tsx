
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { OrderStatus, PaymentMethod, DailyClosing, Product, InventoryItemType } from '../types';

type ReportTab = 'finance' | 'sales' | 'inventory' | 'hr' | 'logs';

export const Reports: React.FC = () => {
  const { 
    transactions, expenses, purchases, selectedOutletId, 
    products, outlets, inventory, expenseTypes, staff, attendance, stockTransfers, productionRecords, dailyClosings
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('finance');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'history' | 'date'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingLog, setViewingLog] = useState<DailyClosing | null>(null);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // --- CORE DATA FILTERING ---
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

    const txs = transactions.filter(t => t.outletId === selectedOutletId && new Date(t.timestamp) >= start && new Date(t.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    const exps = expenses.filter(e => e.outletId === selectedOutletId && new Date(e.timestamp) >= start && new Date(e.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    const logs = dailyClosings.filter(l => l.outletId === selectedOutletId && new Date(l.timestamp) >= start && new Date(l.timestamp) <= (timeFilter === 'history' || timeFilter === 'date' ? end : new Date()));
    
    return { txs, exps, logs, start, end };
  }, [transactions, expenses, dailyClosings, selectedOutletId, timeFilter, selectedMonth, selectedYear, specificDate]);

  // --- ANALYTICS CALCULATORS ---
  const salesIntelligence = useMemo(() => {
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0 }));
    const dailyData = Array(7).fill(0).map((_, i) => ({ day: dayNames[i], sales: 0, index: i }));
    const productStats: Record<string, { name: string, qty: number, revenue: number }> = {};
    const methodStats = { [PaymentMethod.CASH]: 0, [PaymentMethod.QRIS]: 0, [PaymentMethod.DEBIT]: 0 };

    const closedTxs = filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED);
    
    closedTxs.forEach(tx => {
      const date = new Date(tx.timestamp);
      const h = date.getHours();
      const d = date.getDay();
      
      hourlyData[h].sales += tx.total;
      dailyData[d].sales += tx.total;
      methodStats[tx.paymentMethod] += tx.total;
      
      tx.items.forEach(it => {
        if (!productStats[it.product.id]) productStats[it.product.id] = { name: it.product.name, qty: 0, revenue: 0 };
        productStats[it.product.id].qty += it.quantity;
        productStats[it.product.id].revenue += (it.product.outletSettings?.[selectedOutletId]?.price || it.product.price) * it.quantity;
      });
    });

    const sortedHours = [...hourlyData].sort((a,b) => b.sales - a.sales);
    const sortedDays = [...dailyData].sort((a,b) => b.sales - a.sales);
    const topProducts = Object.values(productStats).sort((a,b) => b.qty - a.qty).slice(0, 5);
    const aov = closedTxs.length > 0 ? Math.round(closedTxs.reduce((a,b)=>a+b.total, 0) / closedTxs.length) : 0;

    return {
      hourly: hourlyData,
      daily: dailyData,
      peakHour: sortedHours[0]?.hour || '-',
      peakDay: sortedDays[0]?.day || '-',
      products: topProducts,
      methods: Object.entries(methodStats).map(([name, value]) => ({ name, value })),
      aov,
      totalCount: closedTxs.length
    };
  }, [filteredSet, selectedOutletId]);

  const inventoryAnalytics = useMemo(() => {
    const outletInv = inventory.filter(i => i.outletId === selectedOutletId);
    const totalValue = outletInv.reduce((acc, item) => acc + (item.quantity * item.costPerUnit), 0);
    const lowStockItems = outletInv.filter(i => i.quantity <= i.minStock && i.quantity > 0);
    const outOfStockItems = outletInv.filter(i => i.quantity <= 0);
    
    const valueByType = [
      { name: 'Bahan Mentah', value: outletInv.filter(i => i.type === InventoryItemType.RAW).reduce((acc, i) => acc + (i.quantity * i.costPerUnit), 0) },
      { name: 'WIP / Olahan', value: outletInv.filter(i => i.type === InventoryItemType.WIP).reduce((acc, i) => acc + (i.quantity * i.costPerUnit), 0) }
    ];

    return {
      totalValue,
      itemCount: outletInv.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      valueByType,
      items: outletInv.sort((a, b) => (a.quantity/a.minStock) - (b.quantity/b.minStock))
    };
  }, [inventory, selectedOutletId]);

  const hrPerformance = useMemo(() => {
    return staff.filter(s => s.assignedOutletIds.includes(selectedOutletId)).map(s => {
       const sales = filteredSet.txs.filter(t => t.cashierId === s.id && t.status === OrderStatus.CLOSED).reduce((acc, tx) => acc + tx.total, 0);
       const attends = attendance.filter(a => a.staffId === s.id && new Date(a.date) >= filteredSet.start && new Date(a.date) <= filteredSet.end);
       const lates = attends.filter(a => a.status === 'LATE').length;
       const disciplineScore = attends.length > 0 ? Math.round(((attends.length - lates) / attends.length) * 100) : 100;
       
       const maxSalesInTeam = Math.max(...staff.map(st => filteredSet.txs.filter(t => t.cashierId === st.id).reduce((a,b)=>a+b.total, 0))) || 1;
       const salesScore = (sales / maxSalesInTeam) * 100;
       const globalScore = Math.round((salesScore * 0.5) + (disciplineScore * 0.5));

       return { name: s.name, role: s.role, sales, attends: attends.length, lates, disciplineScore, globalScore };
    }).sort((a,b) => b.globalScore - a.globalScore);
  }, [staff, selectedOutletId, filteredSet, attendance]);

  const FinanceRow = ({ label, value, isBold = false, isNegative = false, isTotal = false, indent = false }: any) => (
    <div className={`flex justify-between items-end py-2 ${isTotal ? 'border-t-2 border-slate-900 mt-2 pt-4' : 'border-b border-slate-100'} ${isBold ? 'font-black text-slate-900' : 'text-slate-600 font-medium'}`}>
      <span className={`text-[10px] uppercase tracking-wider ${indent ? 'pl-6 border-l-2 border-slate-100 ml-1' : ''}`}>{label}</span>
      <span className={`text-[11px] font-mono tabular-nums ${isNegative ? 'text-red-600' : ''}`}>
        {isNegative ? '(' : ''}Rp {value.toLocaleString('id-ID')}{isNegative ? ')' : ''}
      </span>
    </div>
  );

  const calculateSalesRecapForLog = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
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

  const calculateDetailedMovementForLog = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    
    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && new Date(tx.timestamp) >= start && new Date(tx.timestamp) <= end && tx.status === OrderStatus.CLOSED);
    const periodPurchases = purchases.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const periodTransfers = stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const periodProduction = productionRecords.filter(p => p.outletId === selectedOutletId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);

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

      return { name: item.name, unit: item.unit, initial, purchased: pIn, transfer: tIn - tOut, production: prIn - prOut, sold: soldQty, final };
    });
  };

  const getExpensesForLog = (cls: DailyClosing) => {
    const reportDate = new Date(cls.timestamp);
    const start = new Date(reportDate); start.setHours(0,0,0,0);
    const end = new Date(reportDate); end.setHours(23,59,59,999);
    return expenses.filter(e => e.outletId === selectedOutletId && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);
  };

  const COLORS = ['#f97316', '#4f46e5', '#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* TOOLBAR */}
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm z-30 shrink-0">
        <div>
           <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Enterprise Intelligence Center</h2>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Analytical View & Audit Log</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             {(['finance', 'sales', 'inventory', 'hr', 'logs'] as ReportTab[]).map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                 {t === 'finance' ? 'Finansial' : t === 'sales' ? 'Penjualan' : t === 'inventory' ? 'Inventori' : t === 'hr' ? 'SDM' : 'Daily Logs'}
               </button>
             ))}
          </div>

          <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none" value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)}>
             <option value="day">Hari Ini</option>
             <option value="week">7 Hari Terakhir</option>
             <option value="month">30 Hari Terakhir</option>
             <option value="history">Arsip Bulanan</option>
             <option value="date">Tanggal Spesifik</option>
          </select>

          {timeFilter === 'history' && (
             <div className="flex gap-1">
                <select className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[9px] font-black uppercase outline-none" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                   {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[9px] font-black uppercase outline-none" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                   {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          )}

          {timeFilter === 'date' && (
             <input type="date" className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none" value={specificDate} onChange={e => setSpecificDate(e.target.value)} />
          )}

          <button onClick={() => window.print()} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Export PDF 📄</button>
        </div>
      </div>

      {/* REPORT CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-100/50 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-[48px] overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          <div className="p-10 md:p-12 border-b-8 border-slate-900 flex flex-col md:flex-row justify-between items-start gap-8">
             <div className="space-y-3">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black">M</div>
                <div>
                   <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Intelligence Audit Report</h1>
                   <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Module: {activeTab.toUpperCase()}</p>
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">Outlet: {activeOutlet?.name}</div>
             </div>
             <div className="text-left md:text-right">
                <div className="inline-block px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Doc Code</p>
                   <p className="text-xs font-mono font-black text-slate-900">#MB-INT-{activeTab.slice(0,3).toUpperCase()}-{Date.now().toString().slice(-4)}</p>
                </div>
             </div>
          </div>

          <div className="p-10 md:p-12">
            {activeTab === 'finance' && (
              <div className="space-y-10">
                 <section>
                    <div className="flex items-center gap-4 mb-8">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">I. Laporan Laba Rugi Operasional</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="space-y-1">
                       <FinanceRow label="Total Pendapatan (Sales)" value={filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc,b)=>acc+b.total,0)} isBold />
                       <FinanceRow label="HPP Material Terjual (COGS)" value={filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc,b)=>acc+(b.totalCost || 0),0)} isNegative />
                       <FinanceRow label="Total Biaya Operasional" value={filteredSet.exps.reduce((acc,b)=>acc+b.amount,0)} isNegative />
                       <div className="py-8"></div>
                       <div className="p-10 bg-slate-900 rounded-[40px] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                          <div>
                             <h3 className="text-2xl font-black uppercase tracking-tighter">Net Operating Profit</h3>
                             <p className="text-[8px] font-bold text-slate-500 uppercase mt-2 tracking-widest">Estimasi Laba Bersih Cabang</p>
                          </div>
                          <div className="text-right">
                             <p className="text-4xl font-black text-orange-500">Rp {(filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc,b)=>acc+b.total,0) - filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc,b)=>acc+(b.totalCost || 0),0) - filteredSet.exps.reduce((acc,b)=>acc+b.amount,0)).toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="space-y-12">
                 <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Jam Teramai</p>
                       <h4 className="text-lg font-black text-slate-800">{salesIntelligence.peakHour}</h4>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Hari Teramai</p>
                       <h4 className="text-lg font-black text-indigo-600">{salesIntelligence.peakDay}</h4>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Check (AOV)</p>
                       <h4 className="text-lg font-black text-slate-800">Rp {salesIntelligence.aov.toLocaleString()}</h4>
                    </div>
                    <div className="bg-orange-500 p-5 rounded-3xl shadow-lg">
                       <p className="text-[7px] font-black text-orange-200 uppercase tracking-widest mb-1">Total Struk</p>
                       <h4 className="text-xl font-black text-white">{salesIntelligence.totalCount}</h4>
                    </div>
                 </section>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100">
                       <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8 border-b pb-4">Arus Penjualan Per Jam</h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={salesIntelligence.hourly}>
                                <defs><linearGradient id="colorSal" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="hour" fontSize={8} axisLine={false} tickLine={false} />
                                <YAxis fontSize={8} axisLine={false} tickLine={false} tickFormatter={v => `Rp${v/1000}k`} />
                                <Tooltip />
                                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fill="url(#colorSal)" />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100">
                       <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8 border-b pb-4">Distribusi Business Day</h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={salesIntelligence.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" fontSize={8} axisLine={false} tickLine={false} />
                                <YAxis fontSize={8} axisLine={false} tickLine={false} tickFormatter={v => `Rp${v/1000}k`} />
                                <Tooltip />
                                <Bar dataKey="sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[40px] text-white">
                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-8 border-b border-white/10 pb-4">Top 5 Power Products (Terlaris)</h3>
                    <div className="space-y-6">
                       {salesIntelligence.products.map((p, i) => {
                          const maxQty = salesIntelligence.products[0]?.qty || 1;
                          const width = (p.qty / maxQty) * 100;
                          return (
                            <div key={p.name}>
                               <div className="flex justify-between items-end mb-2">
                                  <span className="text-[11px] font-black uppercase">{i+1}. {p.name}</span>
                                  <span className="text-[10px] font-mono text-orange-400">{p.qty} Unit</span>
                               </div>
                               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-50" style={{ width: `${width}%` }}></div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-12">
                 <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Valuasi Aset Stok</p>
                       <h4 className="text-lg font-black text-slate-800">Rp {inventoryAnalytics.totalValue.toLocaleString()}</h4>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Material Terdaftar</p>
                       <h4 className="text-lg font-black text-indigo-600">{inventoryAnalytics.itemCount} SKU</h4>
                    </div>
                    <div className={`p-5 rounded-3xl border shadow-lg ${inventoryAnalytics.lowStockCount > 0 ? 'bg-orange-500 text-white' : 'bg-green-50 text-green-600 border-green-100'}`}>
                       <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${inventoryAnalytics.lowStockCount > 0 ? 'text-orange-200' : 'text-green-400'}`}>Stok Menipis</p>
                       <h4 className="text-xl font-black">{inventoryAnalytics.lowStockCount} Item</h4>
                    </div>
                    <div className={`p-5 rounded-3xl shadow-lg ${inventoryAnalytics.outOfStockCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-50 border border-slate-200'}`}>
                       <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${inventoryAnalytics.outOfStockCount > 0 ? 'text-red-200' : 'text-slate-400'}`}>Out of Stock</p>
                       <h4 className={`text-xl font-black ${inventoryAnalytics.outOfStockCount === 0 ? 'text-slate-300' : ''}`}>{inventoryAnalytics.outOfStockCount} SKU</h4>
                    </div>
                 </section>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 flex flex-col items-center">
                       <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 w-full text-left">Komposisi Nilai Aset</h3>
                       <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie 
                                  data={inventoryAnalytics.valueByType} 
                                  innerRadius={60} 
                                  outerRadius={80} 
                                  paddingAngle={5} 
                                  dataKey="value"
                                >
                                   {inventoryAnalytics.valueByType.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                                <Legend />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[40px] text-white">
                       <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Urgent: Perlu Restock Segera</h3>
                       <div className="space-y-4">
                          {inventoryAnalytics.items.filter(i => i.quantity <= i.minStock).slice(0, 5).map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                               <div>
                                  <p className="text-[10px] font-black uppercase text-white">{item.name}</p>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase">Limit Aman: {item.minStock} {item.unit}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-black text-red-400">{item.quantity} {item.unit}</p>
                                  <p className="text-[7px] font-black text-slate-500 uppercase">Current Stock</p>
                               </div>
                            </div>
                          ))}
                          {inventoryAnalytics.lowStockCount === 0 && (
                            <div className="py-12 text-center opacity-30">
                               <p className="text-[10px] font-black uppercase">Seluruh stok dalam kondisi aman ✓</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <section>
                    <div className="flex items-center gap-4 mb-8">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">II. Matriks Kesehatan Inventori Komprehensif</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="overflow-hidden border-2 border-slate-100 rounded-[32px]">
                       <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                             <tr>
                                <th className="py-5 px-8">Nama Material</th>
                                <th className="py-5 px-6 text-center">Status</th>
                                <th className="py-5 px-6 text-center">Stok Saat Ini</th>
                                <th className="py-5 px-6 text-center">Limit Aman</th>
                                <th className="py-5 px-8 text-right">Nilai Asset</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {inventoryAnalytics.items.map(item => {
                                const status = item.quantity <= 0 ? 'EMPTY' : item.quantity <= item.minStock ? 'CRITICAL' : 'HEALTHY';
                                return (
                                   <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-4 px-8 font-black uppercase text-slate-800">{item.name}</td>
                                      <td className="py-4 px-6 text-center">
                                         <span className={`px-2 py-1 rounded-md text-[7px] font-black uppercase ${status === 'HEALTHY' ? 'bg-green-100 text-green-700' : status === 'CRITICAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                            {status}
                                         </span>
                                      </td>
                                      <td className="py-4 px-6 text-center font-bold text-slate-500">{item.quantity} {item.unit}</td>
                                      <td className="py-4 px-6 text-center font-bold text-slate-300">{item.minStock} {item.unit}</td>
                                      <td className="py-4 px-8 text-right font-black text-slate-900">Rp {(item.quantity * item.costPerUnit).toLocaleString()}</td>
                                   </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-6">
                 <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Arsip Audit Penutupan Shift</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSet.logs.map(log => (
                      <div key={log.id} onClick={() => setViewingLog(log)} className="bg-white p-6 rounded-[32px] border-2 border-slate-50 hover:border-orange-500 transition-all cursor-pointer shadow-sm group">
                         <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${log.discrepancy === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                               {log.discrepancy === 0 ? '✅' : '⚠️'}
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase group-hover:text-orange-500">Detail ➔</span>
                         </div>
                         <h4 className="text-sm font-black text-slate-800">{new Date(log.timestamp).toLocaleDateString([], {weekday: 'long', day:'2-digit', month:'long'})}</h4>
                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">PIC: {log.staffName}</p>
                         <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase">Fisik Kas: <br/><span className="text-slate-900">Rp {log.actualCash.toLocaleString()}</span></div>
                            <div className="text-[10px] font-black text-slate-400 uppercase">Selisih: <br/><span className={log.discrepancy === 0 ? 'text-emerald-600' : 'text-red-600'}>Rp {log.discrepancy.toLocaleString()}</span></div>
                         </div>
                      </div>
                    ))}
                    {filteredSet.logs.length === 0 && (
                       <div className="col-span-full py-20 text-center opacity-30">
                          <p className="text-[10px] font-black uppercase italic">Tidak ada arsip laporan harian untuk periode ini</p>
                       </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'hr' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hrPerformance.map((s, i) => (
                     <div key={s.name} className="bg-white rounded-[40px] border-2 border-slate-100 p-8 shadow-sm hover:border-indigo-500 transition-all group relative overflow-hidden">
                        {i === 0 && <div className="absolute top-0 right-0 p-4 bg-orange-500 text-white font-black text-[9px] rounded-bl-3xl">#1 PERFORMER</div>}
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl">👤</div>
                           <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase leading-none">{s.name}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{s.role}</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase">
                              <span className="text-slate-400">Kehadiran</span>
                              <span className="text-slate-800">{s.attends} Hari</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase">
                              <span className="text-slate-400">Discipline Score</span>
                              <span className={s.disciplineScore < 90 ? 'text-red-600' : 'text-emerald-600'}>{s.disciplineScore}%</span>
                           </div>
                           <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                              <div>
                                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Efficiency Score</p>
                                 <p className="text-2xl font-black text-indigo-600">{s.globalScore}/100</p>
                              </div>
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500" style={{ width: `${s.globalScore}%` }}></div>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL AUDIT OVERLAY (UNTUK LOGS) - FULL VERSION READY FOR PRINT */}
      {viewingLog && (
        <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setViewingLog(null)}>
           <div className="bg-white rounded-[40px] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              
              {/* MODAL HEADER */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center shrink-0 no-print">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setViewingLog(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xl">✕</button>
                    <div>
                       <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">Review Laporan Daily Audit</h3>
                       <p className="text-orange-600 font-bold text-[9px] uppercase tracking-widest">Digital Archive System</p>
                    </div>
                 </div>
                 <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">CETAK DOKUMEN 📑</button>
              </div>

              {/* REPORT CONTENT - SCROLLABLE & PRINTABLE */}
              <div className="flex-1 overflow-y-auto p-10 md:p-16 custom-scrollbar space-y-12 pb-24 print:p-0 print:overflow-visible">
                 
                 {/* DOC HEADER */}
                 <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-slate-900 pb-10">
                    <div className="space-y-4">
                       <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-black">M</div>
                       <div>
                          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mozza Boy Enterprise</h1>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Audit Penutupan Shift</p>
                       </div>
                       <div className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                          Outlet: {activeOutlet?.name}<br/>
                          Admin PIC: {viewingLog.staffName}
                       </div>
                    </div>
                    <div className="text-left md:text-right space-y-6">
                       <div className="inline-block px-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit ID</p>
                          <p className="text-lg font-mono font-black text-slate-900">#CLS-{viewingLog.id.slice(-8).toUpperCase()}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-900 uppercase">Periode Laporan</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase">{new Date(viewingLog.timestamp).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
                       </div>
                    </div>
                 </div>

                 {/* FINANCIAL SECTION */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">I. Ringkasan Kas & Biaya</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Kas Tunai Sistem</p>
                           <p className="text-sm font-black text-slate-800">Rp {viewingLog.totalSalesCash.toLocaleString()}</p>
                        </div>
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-2">QRIS / Digital</p>
                           <p className="text-sm font-black text-blue-600">Rp {viewingLog.totalSalesQRIS.toLocaleString()}</p>
                        </div>
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Pengeluaran</p>
                           <p className="text-sm font-black text-red-600">Rp {viewingLog.totalExpenses.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 border-2 rounded-3xl ${viewingLog.discrepancy === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-2">Fisik di Laci</p>
                           <p className="text-sm font-black text-slate-900">Rp {viewingLog.actualCash.toLocaleString()}</p>
                        </div>
                    </div>
                 </section>

                 {/* EXPENSE DETAIL SECTION (NEW) */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">II. Rincian Pengeluaran Shift</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="overflow-hidden border-2 border-slate-100 rounded-3xl">
                       <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-900 text-white uppercase text-[8px] font-black">
                             <tr>
                                <th className="py-4 px-6">Jenis Biaya</th>
                                <th className="py-4 px-4">Keterangan</th>
                                <th className="py-4 px-4">PIC</th>
                                <th className="py-4 px-6 text-right">Nominal</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {getExpensesForLog(viewingLog).length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic font-bold">Tidak ada pengeluaran dicatat</td></tr>
                             ) : (
                                getExpensesForLog(viewingLog).map(exp => (
                                   <tr key={exp.id}>
                                      <td className="py-3 px-6 font-black uppercase text-slate-800">
                                         {expenseTypes.find(t => t.id === exp.typeId)?.name || 'Lain-lain'}
                                      </td>
                                      <td className="py-3 px-4 font-medium text-slate-500 italic">"{exp.notes || '-'}"</td>
                                      <td className="py-3 px-4 font-black text-slate-400 uppercase">{exp.staffName.split(' ')[0]}</td>
                                      <td className="py-3 px-6 text-right font-black text-red-600">Rp {exp.amount.toLocaleString()}</td>
                                   </tr>
                                ))
                             )}
                          </tbody>
                       </table>
                    </div>
                 </section>

                 {/* SALES RECAP */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">III. Rekapitulasi Produk Terjual</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="overflow-hidden border-2 border-slate-100 rounded-3xl">
                       <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-900 text-white uppercase text-[8px] font-black">
                             <tr><th className="py-4 px-6">Nama Produk</th><th className="py-4 px-4 text-center">Qty</th><th className="py-4 px-6 text-right">Omzet</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {calculateSalesRecapForLog(viewingLog).map(s => (
                               <tr key={s.name}>
                                  <td className="py-3 px-6 font-black uppercase text-slate-800">{s.name}</td>
                                  <td className="py-3 px-4 text-center font-bold text-slate-500">{s.qty} Unit</td>
                                  <td className="py-3 px-6 text-right font-black text-slate-900">Rp {s.total.toLocaleString()}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </section>

                 {/* INVENTORY MOVEMENT */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">IV. Audit Pergerakan Inventori</h3>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div className="overflow-x-auto border-2 border-slate-900 rounded-[32px] bg-white">
                       <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                             <tr>
                                <th className="py-4 px-6 sticky left-0 bg-slate-900">Material</th>
                                <th className="py-4 px-4 text-center">Awal</th>
                                <th className="py-4 px-4 text-center text-green-400">Beli (+)</th>
                                <th className="py-4 px-4 text-center text-blue-400">Mutasi</th>
                                <th className="py-4 px-4 text-center text-purple-400">Prod</th>
                                <th className="py-4 px-4 text-center text-red-400">Jual (-)</th>
                                <th className="py-4 px-6 text-right bg-slate-800">Akhir</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[10px]">
                             {calculateDetailedMovementForLog(viewingLog).map(m => (
                                <tr key={m.name} className="hover:bg-slate-50 transition-colors">
                                   <td className="py-3 px-6 font-black text-slate-800 uppercase sticky left-0 bg-white">{m.name}</td>
                                   <td className="py-3 px-4 text-center font-bold text-slate-400">{m.initial.toFixed(2)}</td>
                                   <td className="py-3 px-4 text-center font-black text-green-600">{m.purchased > 0 ? `+${m.purchased}` : '-'}</td>
                                   <td className={`py-3 px-4 text-center font-black ${m.transfer >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{m.transfer !== 0 ? (m.transfer > 0 ? `+${m.transfer}` : m.transfer) : '-'}</td>
                                   <td className={`py-3 px-4 text-center font-black ${m.production >= 0 ? 'text-purple-600' : 'text-orange-500'}`}>{m.production !== 0 ? (m.production > 0 ? `+${m.production}` : m.production) : '-'}</td>
                                   <td className="py-3 px-4 text-center font-black text-red-500">{m.sold > 0 ? `-${m.sold.toFixed(2)}` : '-'}</td>
                                   <td className="py-3 px-6 text-right font-black text-slate-900 bg-slate-50/50">{m.final.toFixed(2)} <span className="text-[7px] text-slate-300 ml-1">{m.unit}</span></td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </section>

                 <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-2">Catatan PIC Shift:</p>
                    <p className="text-sm font-medium italic opacity-70">"{viewingLog.notes || 'Tidak ada catatan khusus.'}"</p>
                 </div>

                 {/* FOOTER SIGNATURES */}
                 <div className="pt-24 border-t border-slate-100 no-break-page">
                    <div className="grid grid-cols-3 gap-12">
                       <div className="text-center space-y-16">
                          <p className="text-[9px] font-black text-slate-400 uppercase">PIC Cabang</p>
                          <div className="border-b border-slate-300 w-32 mx-auto"></div>
                          <p className="text-[10px] font-black uppercase text-slate-900">{viewingLog.staffName}</p>
                       </div>
                       <div className="text-center space-y-4 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-2 opacity-50 grayscale">
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=DOC-AUDIT-${viewingLog.id}&color=0f172a`} alt="Audit QR" />
                          </div>
                          <p className="text-[7px] font-black text-slate-300 uppercase">Mozza Boy Enterprise</p>
                       </div>
                       <div className="text-center space-y-16">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Otorisasi Owner</p>
                          <div className="border-b border-slate-300 w-32 mx-auto"></div>
                          <p className="text-[10px] font-black uppercase text-slate-300 italic">Signature & Stamp</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
