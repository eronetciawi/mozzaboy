
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { OrderStatus, PaymentMethod, DailyClosing, Product, Transaction, InventoryItemType, InventoryItem, Expense } from '../types';
import html2canvas from 'html2canvas';

type ReportTab = 'finance' | 'sales' | 'inventory' | 'expenses' | 'production' | 'hr' | 'logs';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#06b6d4'];

export const Reports: React.FC = () => {
  const { 
    transactions = [], expenses = [], purchases = [], selectedOutletId, 
    products = [], outlets = [], inventory = [], expenseTypes = [], staff = [], attendance = [], dailyClosings = [], categories = [],
    stockTransfers = [], productionRecords = [], brandConfig
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('finance');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'history' | 'date'>('day');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [viewingClosing, setViewingClosing] = useState<DailyClosing | null>(null);
  const shiftReportRef = useRef<HTMLDivElement>(null);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  const filteredSet = useMemo(() => {
    let start = new Date();
    let end = new Date();

    if (timeFilter === 'day') {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (timeFilter === 'week') {
      start.setDate(start.getDate() - 7);
      end = new Date();
    } else if (timeFilter === 'month') {
      start.setDate(start.getDate() - 30);
      end = new Date();
    } else if (timeFilter === 'history') {
      start = new Date(selectedYear, selectedMonth, 1);
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    } else if (timeFilter === 'date') {
      start = new Date(specificDate); start.setHours(0,0,0,0);
      end = new Date(specificDate); end.setHours(23,59,59,999);
    }

    const txs = transactions.filter(t => (selectedOutletId === 'all' || t.outletId === selectedOutletId) && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const exps = expenses.filter(e => (selectedOutletId === 'all' || e.outletId === selectedOutletId) && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);
    const logs = dailyClosings.filter(l => (selectedOutletId === 'all' || l.outletId === selectedOutletId) && new Date(l.timestamp) >= start && new Date(l.timestamp) <= end);
    const prods = productionRecords.filter(pr => (selectedOutletId === 'all' || pr.outletId === selectedOutletId) && new Date(pr.timestamp) >= start && new Date(pr.timestamp) <= end);
    const burs = purchases.filter(p => (selectedOutletId === 'all' || p.outletId === selectedOutletId) && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const trfs = stockTransfers.filter(t => (selectedOutletId === 'all' || t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && t.status === 'ACCEPTED' && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);

    return { txs, exps, logs, prods, burs, trfs, start, end };
  }, [transactions, expenses, dailyClosings, productionRecords, purchases, stockTransfers, selectedOutletId, timeFilter, selectedMonth, selectedYear, specificDate]);

  const salesIntelligence = useMemo(() => {
    const closedTxs = filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED);
    const productStats: Record<string, { name: string, qty: number, net: number }> = {};
    const categoryStats: Record<string, { name: string, revenue: number }> = {};
    const staffSales: Record<string, number> = {};

    const metrics = {
      grossSales: 0,
      netSales: 0,
      totalCOGS: 0,
      cash: 0,
      qris: 0,
      discounts: 0,
      totalTrx: closedTxs.length
    };
    
    closedTxs.forEach(tx => {
      metrics.grossSales += (tx.subtotal ?? 0);
      metrics.netSales += (tx.total ?? 0);
      metrics.totalCOGS += (tx.totalCost ?? 0);
      metrics.discounts += (tx.membershipDiscount ?? 0) + (tx.bulkDiscount ?? 0) + (tx.pointDiscountValue ?? 0);

      if (tx.paymentMethod === PaymentMethod.CASH) metrics.cash += (tx.total ?? 0);
      else if (tx.paymentMethod === PaymentMethod.QRIS) metrics.qris += (tx.total ?? 0);

      if (tx.cashierId) staffSales[tx.cashierId] = (staffSales[tx.cashierId] ?? 0) + (tx.total ?? 0);

      tx.items.forEach(it => {
        if (!it.product) return;
        if (!productStats[it.product.id]) productStats[it.product.id] = { name: it.product.name, qty: 0, net: 0 };
        const price = it.product.outletSettings?.[tx.outletId]?.price || it.product.price || 0;
        productStats[it.product.id].qty += (it.quantity ?? 0);
        productStats[it.product.id].net += (price * (it.quantity ?? 0));

        const catId = it.product.categoryId || 'uncategorized';
        const catName = categories.find(c => c.id === catId)?.name || 'Lain-lain';
        if (!categoryStats[catId]) categoryStats[catId] = { name: catName, revenue: 0 };
        categoryStats[catId].revenue += (price * (it.quantity ?? 0));
      });
    });

    return {
      metrics,
      staffSales,
      paymentData: [
        { name: 'Tunai', value: metrics.cash },
        { name: 'QRIS', value: metrics.qris }
      ],
      topProducts: Object.values(productStats).sort((a,b) => b.net - a.net).slice(0, 10),
      topCategories: Object.values(categoryStats).sort((a,b) => b.revenue - a.revenue)
    };
  }, [filteredSet, categories]);

  const expenseIntelligence = useMemo(() => {
    const periodExps = filteredSet.exps;
    const typeStats: Record<string, { name: string, amount: number, count: number }> = {};
    
    let totalAuto = 0;
    let totalManual = 0;

    periodExps.forEach(e => {
      const isAuto = e.id.startsWith('exp-auto-');
      if (isAuto) totalAuto += (e.amount || 0);
      else totalManual += (e.amount || 0);

      const typeId = e.typeId || 'other';
      let typeName = expenseTypes.find(t => t.id === typeId)?.name || 'Lain-lain';
      if (typeId === 'purchase-auto') typeName = "BELANJA STOK";
      
      if (!typeStats[typeId]) typeStats[typeId] = { name: typeName, amount: 0, count: 0 };
      typeStats[typeId].amount += (e.amount || 0);
      typeStats[typeId].count += 1;
    });

    return {
      total: totalAuto + totalManual,
      totalAuto,
      totalManual,
      typeData: Object.values(typeStats).sort((a,b) => b.amount - a.amount)
    };
  }, [filteredSet, expenseTypes]);

  const teamPerformance = useMemo(() => {
    return staff
      .filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId))
      .map(s => {
        const sales = salesIntelligence.staffSales[s.id] ?? 0;
        const attends = (attendance || []).filter(a => a.staffId === s.id && new Date(a.date) >= filteredSet.start && new Date(a.date) <= filteredSet.end);
        const lates = attends.filter(a => a.status === 'LATE').length;
        const discipline = attends.length > 0 ? Math.round(((attends.length - lates) / attends.length) * 100) : 100;
        return { staff: s, sales, discipline, attendCount: attends.length };
      }).sort((a,b) => b.sales - a.sales);
  }, [staff, salesIntelligence, attendance, filteredSet, selectedOutletId]);

  const stockLedger = useMemo(() => {
    if (!inventory) return [];
    return inventory
      .filter(inv => selectedOutletId === 'all' || inv.outletId === selectedOutletId)
      .map(item => {
        const beli = filteredSet.burs.filter(p => p.inventoryItemId === item.id).reduce((a,b) => a + (b.quantity ?? 0), 0);
        const hasilProduksi = filteredSet.prods.filter(pr => pr.resultItemId === item.id).reduce((a,b) => a + (b.resultQuantity ?? 0), 0);
        const trfIn = filteredSet.trfs.filter(t => t.toOutletId === item.outletId && t.itemName === item.name).reduce((a,b) => a + (b.quantity ?? 0), 0);
        const trfOut = filteredSet.trfs.filter(t => t.fromOutletId === item.outletId && t.itemName === item.name).reduce((a,b) => a + (b.quantity ?? 0), 0);

        let terpakaiSales = 0;
        filteredSet.txs.filter(t => t.status === OrderStatus.CLOSED).forEach(tx => {
          tx.items.forEach(it => {
             (it.product?.bom || []).forEach(b => {
                if (b.inventoryItemId === item.id) {
                   terpakaiSales += ((b.quantity ?? 0) * (it.quantity ?? 0));
                } else {
                   const matchedItem = inventory.find(i => i.id === b.inventoryItemId);
                   if (matchedItem && matchedItem.name === item.name && item.outletId === tx.outletId) {
                      terpakaiSales += ((b.quantity ?? 0) * (it.quantity ?? 0));
                   }
                }
             });
          });
        });

        const terpakaiProduksi = filteredSet.prods.reduce((acc, pr) => {
           const comp = (pr.components || []).find(c => {
              const compItem = inventory.find(i => i.id === c.inventoryItemId);
              return c.inventoryItemId === item.id || (compItem && compItem.name === item.name && compItem.outletId === item.outletId);
           });
           return acc + (comp?.quantity || 0);
        }, 0);

        const totalKeluar = terpakaiSales + terpakaiProduksi + trfOut;
        const totalMasuk = beli + hasilProduksi + trfIn;
        const stockAkhir = item.quantity ?? 0;
        const stockAwal = stockAkhir - totalMasuk + totalKeluar;

        return { ...item, stockAwal, mutasi: trfIn - trfOut, beli: beli + hasilProduksi, terpakai: terpakaiSales + terpakaiProduksi, stockAkhir };
      });
  }, [inventory, filteredSet, selectedOutletId]);

  const viewingClosingShiftData = useMemo(() => {
    if (!viewingClosing) return null;
    
    const closingDateISO = new Date(viewingClosing.timestamp).toLocaleDateString('en-CA');
    const myAttend = (attendance || []).find(a => a.staffId === viewingClosing.staffId && a.date === closingDateISO);
    
    // Rentang waktu shift di history
    const start = myAttend ? new Date(myAttend.clockIn) : new Date(new Date(viewingClosing.timestamp).setHours(0,0,0,0));
    const end = new Date(viewingClosing.timestamp);

    const sProds = (productionRecords || []).filter(p => p.outletId === viewingClosing.outletId && p.staffId === viewingClosing.staffId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sPurchases = (purchases || []).filter(p => p.outletId === viewingClosing.outletId && p.staffId === viewingClosing.staffId && new Date(p.timestamp) >= start && new Date(p.timestamp) <= end);
    const sTrfs = (stockTransfers || []).filter(t => (t.fromOutletId === viewingClosing.outletId || t.toOutletId === viewingClosing.outletId) && t.staffId === viewingClosing.staffId && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const sTxs = transactions.filter(t => t.outletId === viewingClosing.outletId && t.cashierId === viewingClosing.staffId && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start && new Date(t.timestamp) <= end);
    const sExps = (expenses || []).filter(e => e.outletId === viewingClosing.outletId && e.staffId === viewingClosing.staffId && new Date(e.timestamp) >= start && new Date(e.timestamp) <= end);

    const mutations = inventory.filter(i => i.outletId === viewingClosing.outletId).map(item => {
        const inPur = sPurchases.filter(p => p.inventoryItemId === item.id).reduce((a,b)=>a+b.quantity, 0);
        const inProd = sProds.filter(p => p.resultItemId === item.id).reduce((a,b)=>a+b.resultQuantity, 0);
        const inTrf = sTrfs.filter(t => t.toOutletId === viewingClosing.outletId && t.itemName === item.name && t.status === 'ACCEPTED').reduce((a,b)=>a+b.quantity, 0);
        
        let outSales = 0;
        sTxs.forEach(tx => tx.items.forEach(it => {
            (it.product.bom || []).forEach(b => {
                const matchedItem = inventory.find(i => i.id === b.inventoryItemId);
                if (b.inventoryItemId === item.id || (matchedItem && matchedItem.name === item.name)) {
                   outSales += (b.quantity * it.quantity);
                }
            });
        }));

        const outProd = sProds.reduce((acc, pr) => {
            const comp = pr.components.find(c => {
               const cItem = inventory.find(i => i.id === c.inventoryItemId);
               return c.inventoryItemId === item.id || (cItem && cItem.name === item.name);
            });
            return acc + (comp?.quantity || 0);
        }, 0);

        const outTrf = sTrfs.filter(t => t.fromOutletId === viewingClosing.outletId && t.itemName === item.name).reduce((a,b)=>a+b.quantity, 0);
        
        const totalIn = inPur + inProd + inTrf;
        const totalOut = outSales + outProd + outTrf;
        const endQty = item.quantity;
        const startQty = endQty - totalIn + totalOut;
        
        return { name: item.name, unit: item.unit, start: startQty, in: totalIn, out: totalOut, end: endQty };
    }).filter(m => m.in > 0 || m.out > 0 || Math.abs(m.start - m.end) > 0.001);

    return { sProds, sExps, mutations, start, end };
  }, [viewingClosing, attendance, productionRecords, purchases, stockTransfers, transactions, inventory, expenses]);

  const exportStockToCSV = () => {
    const headers = ['Nama Item', 'Tipe', 'Unit', 'Stock Awal', 'Mutasi (Trf)', 'Beli/Produksi', 'Terpakai', 'Stock Akhir'];
    const rows = stockLedger.map(i => [i.name, i.type, i.unit, (i.stockAwal ?? 0).toFixed(2), (i.mutasi ?? 0).toFixed(2), (i.beli ?? 0).toFixed(2), (i.terpakai ?? 0).toFixed(2), (i.stockAkhir ?? 0).toFixed(2)]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Stok_${activeOutlet?.name || 'Global'}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadShiftReport = async (log: DailyClosing) => {
    setViewingClosing(log);
    setTimeout(async () => {
      if (shiftReportRef.current) {
        try {
          const element = shiftReportRef.current;
          const canvas = await html2canvas(element, { 
             scale: 2, 
             backgroundColor: '#ffffff', 
             logging: false, 
             useCORS: true,
             windowWidth: 500
          });
          const link = document.createElement('a');
          const outletName = outlets.find(o => o.id === log.outletId)?.name || 'Cabang';
          link.download = `DailyReport-${outletName}-${new Date(log.timestamp).toISOString().split('T')[0]}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) {
          console.error("Capture failed:", err);
        } finally {
          setViewingClosing(null);
        }
      }
    }, 800);
  };

  const FinanceRow = ({ label, value, isBold = false, isNegative = false, isTotal = false, colorClass = "", indent = false }: any) => (
    <div className={`flex justify-between items-center py-2.5 ${isTotal ? 'border-t-2 border-slate-900 mt-2 pt-4' : 'border-b border-slate-50'} ${indent ? 'pl-6' : ''}`}>
      <span className={`text-[10px] uppercase tracking-tight ${isBold ? 'font-black text-slate-900' : 'font-bold text-slate-500'} ${indent ? 'italic' : ''}`}>{label}</span>
      <span className={`font-mono text-[11px] font-black ${isNegative ? 'text-rose-600' : colorClass || 'text-slate-900'}`}>
        {isNegative ? '-' : ''}Rp {(Math.abs(value ?? 0)).toLocaleString('id-ID')}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden font-sans">
      <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
           <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Enterprise Audit Center</h2>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Financial Intelligence & Stock Audit</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
             {(['finance', 'sales', 'expenses', 'inventory', 'production', 'hr', 'logs'] as ReportTab[]).map(t => (
               <button 
                key={t} 
                onClick={() => setActiveTab(t)} 
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
               >
                 {t === 'finance' ? 'Laba Rugi' : t === 'sales' ? 'Sales' : t === 'expenses' ? 'Pengeluaran' : t === 'inventory' ? 'Mutasi Stok' : t === 'production' ? 'Produksi' : t === 'hr' ? 'Tim' : 'Audit Logs'}
               </button>
             ))}
          </div>

          <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none text-slate-900 shadow-sm" value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)}>
             <option value="day">Hari Ini</option>
             <option value="date">Pilih Tanggal</option>
             <option value="week">7 Hari Terakhir</option>
             <option value="month">30 Hari Terakhir</option>
             <option value="history">Arsip Bulanan</option>
          </select>

          {timeFilter === 'date' && (
            <input 
              type="date" 
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none text-orange-600 shadow-sm" 
              value={specificDate} 
              onChange={e => setSpecificDate(e.target.value)} 
            />
          )}

          {timeFilter === 'history' && (
            <div className="flex gap-1">
              <select className="p-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="p-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 bg-slate-100/30">
        <div className="max-w-7xl mx-auto space-y-10 pb-32">

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 md:p-10 rounded-[48px] border shadow-sm">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Revenue Breakdown</h3>
                     <div className="space-y-1">
                        <FinanceRow label="Penjualan Kotor" value={salesIntelligence.metrics.grossSales} isBold />
                        <FinanceRow label="Potongan Member & Promo" value={salesIntelligence.metrics.discounts} isNegative />
                        <FinanceRow label="Penjualan Bersih (Net)" value={salesIntelligence.metrics.netSales} isBold isTotal colorClass="text-indigo-600" />
                     </div>
                  </div>
                  <div className="bg-white p-8 md:p-10 rounded-[48px] border shadow-sm">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Cost Structure</h3>
                     <div className="space-y-1">
                        <FinanceRow label="Harga Pokok (HPP)" value={salesIntelligence.metrics.totalCOGS} isNegative />
                        <FinanceRow label="Operational Expense (OPEX)" value={filteredSet.exps.reduce((a,b)=>a+(b.amount ?? 0), 0)} isNegative />
                        <FinanceRow label="Total Pengeluaran" value={salesIntelligence.metrics.totalCOGS + filteredSet.exps.reduce((a,b)=>a+(b.amount ?? 0), 0)} isTotal isBold />
                     </div>
                  </div>
               </div>
               <div className="bg-slate-900 p-10 md:p-14 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10 text-8xl">📊</div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 mb-2">Net Operating Profit</p>
                  <h3 className="text-5xl md:text-6xl font-black font-mono tracking-tighter">
                    Rp {((salesIntelligence.metrics.netSales ?? 0) - (salesIntelligence.metrics.totalCOGS ?? 0) - (filteredSet.exps.reduce((a,b)=>a+(b.amount ?? 0), 0))).toLocaleString()}
                  </h3>
               </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[40px] border shadow-sm col-span-1">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Payment Distribution</h4>
                     <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={salesIntelligence.paymentData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                 {salesIntelligence.paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString()}`} />
                              <Legend verticalAlign="bottom" height={36}/>
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border shadow-sm col-span-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Top Menu Performance</h4>
                     <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={salesIntelligence.topProducts} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={100} fontSize={9} fontWeight={900} />
                              <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => `Rp ${v.toLocaleString()}`} />
                              <Bar dataKey="net" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
               <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                        <tr>
                           <th className="py-5 px-8">Kategori Produk</th>
                           <th className="py-5 px-8 text-right">Revenue Kontribusi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {salesIntelligence.topCategories.map((cat, idx) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-8 font-black text-slate-800 uppercase text-[11px]">{cat.name}</td>
                              <td className="py-4 px-8 text-right font-black text-indigo-600 text-[11px]">Rp {cat.revenue.toLocaleString()}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'expenses' && (
             <div className="space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="bg-white p-8 rounded-[40px] border shadow-sm col-span-1">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Distribution by Category</h4>
                      <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={expenseIntelligence.typeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount">
                                  {expenseIntelligence.typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                               </Pie>
                               <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString()}`} />
                               <Legend verticalAlign="bottom" height={36} layout="vertical" align="right"/>
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-white p-8 rounded-[40px] border shadow-sm col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Biaya Operasional</p>
                         <h4 className="text-3xl font-black text-slate-900">Rp {expenseIntelligence.total.toLocaleString()}</h4>
                         <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Total Transaksi</span>
                            <span className="text-slate-700">{filteredSet.exps.length} Records</span>
                         </div>
                      </div>
                      <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col justify-between">
                         <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Total Belanja Stok (Auto)</p>
                         <h4 className="text-3xl font-black text-orange-600">Rp {expenseIntelligence.totalAuto.toLocaleString()}</h4>
                         <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between text-[10px] font-bold">
                            <span className="text-orange-400">Porsi Biaya</span>
                            <span className="text-orange-700">{Math.round((expenseIntelligence.totalAuto / (expenseIntelligence.total || 1)) * 100)}%</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden border-slate-200">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Detailed Expense Logs</h4>
                      <span className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black uppercase text-slate-500">{filteredSet.exps.length} Entries</span>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                         <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                            <tr>
                               <th className="py-5 px-8">Waktu & Tanggal</th>
                               <th className="py-5 px-4">Kategori Biaya</th>
                               <th className="py-5 px-4">Penanggung Jawab</th>
                               <th className="py-5 px-4">Keterangan / Notes</th>
                               <th className="py-5 px-8 text-right">Nominal (IDR)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-[11px]">
                            {[...filteredSet.exps].reverse().map(e => {
                               const isAuto = e.id.startsWith('exp-auto-');
                               const type = isAuto ? "BELANJA STOK" : (expenseTypes.find(t => t.id === e.typeId)?.name || 'Lain-lain');
                               return (
                                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="py-4 px-8 font-bold text-slate-400">
                                        {new Date(e.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        <span className="block text-[8px] font-black uppercase text-slate-300 mt-0.5">{new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                     </td>
                                     <td className="py-4 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${isAuto ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
                                           {type}
                                        </span>
                                     </td>
                                     <td className="py-4 px-4 font-black text-slate-800 uppercase">{e.staffName}</td>
                                     <td className="py-4 px-4 italic text-slate-400 leading-tight" title={e.notes}>{e.notes || '-'}</td>
                                     <td className={`py-4 px-8 text-right font-black ${isAuto ? 'text-orange-600' : 'text-rose-600'}`}>Rp {(e.amount || 0).toLocaleString()}</td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                   {filteredSet.exps.length === 0 && (
                     <div className="py-20 text-center opacity-20 flex flex-col items-center">
                        <span className="text-4xl mb-4">💸</span>
                        <p className="font-black uppercase text-xs">Tidak ada catatan pengeluaran</p>
                     </div>
                   )}
                </div>
             </div>
          )}

          {activeTab === 'inventory' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center px-4">
                   <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Stock Ledger Analysis</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Audit mutasi bahan mentah & produk olahan (WIP)</p>
                   </div>
                   <button onClick={exportStockToCSV} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-50 transition-all shadow-lg">Export CSV 📥</button>
                </div>
                <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden border-slate-200">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                         <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                            <tr>
                               <th className="py-5 px-8">Nama Bahan / WIP</th>
                               <th className="py-5 px-4 text-center">Unit</th>
                               <th className="py-5 px-4 text-right bg-slate-800">Stok Awal</th>
                               <th className="py-5 px-4 text-right">Mutasi (Transfer)</th>
                               <th className="py-5 px-4 text-right text-emerald-400">Beli / Masak</th>
                               <th className="py-5 px-4 text-right text-rose-400">Terpakai</th>
                               <th className="py-5 px-8 text-right bg-slate-800">Stok Akhir</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-[11px]">
                            {stockLedger.map(item => (
                               <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 px-8">
                                     <p className="font-black text-slate-800 uppercase leading-tight">{item.name}</p>
                                     <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{item.type === InventoryItemType.RAW ? 'Bahan Mentah' : 'WIP / Olahan'}</p>
                                  </td>
                                  <td className="py-4 px-4 text-center font-bold text-slate-400 uppercase">{item.unit}</td>
                                  <td className="py-4 px-4 text-right font-black text-slate-600 bg-slate-50/30">{(item.stockAwal ?? 0).toLocaleString()}</td>
                                  <td className={`py-4 px-4 text-right font-bold ${item.mutasi < 0 ? 'text-red-500' : item.mutasi > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                                     {(item.mutasi > 0 ? '+' : '')}{(item.mutasi ?? 0).toLocaleString()}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black text-emerald-600">{(item.beli ?? 0) > 0 ? `+${(item.beli ?? 0).toLocaleString()}` : '0'}</td>
                                  <td className="py-4 px-4 text-right font-black text-rose-600">{(item.terpakai ?? 0) > 0 ? `-${(item.terpakai ?? 0).toLocaleString()}` : '0'}</td>
                                  <td className="py-4 px-8 text-right font-black text-slate-900 bg-slate-50/50">{(item.stockAkhir ?? 0).toLocaleString()}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'hr' && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <div className="bg-white p-10 rounded-[48px] border shadow-sm">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Crew Performance Matrix</h3>
                  <div className="space-y-6">
                     {teamPerformance.map((perf, idx) => (
                        <div key={idx} className="flex items-center gap-6 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-orange-200 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-slate-400">{idx+1}</div>
                           <div className="flex-1 min-w-0">
                              <h5 className="font-black text-slate-800 uppercase text-[12px]">{perf.staff.name}</h5>
                              <div className="flex gap-4 mt-1">
                                 <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{perf.attendCount} Shift Kehadiran</span>
                                 <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">{perf.discipline}% Discipline</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[13px] font-black text-slate-900">Rp {perf.sales.toLocaleString()}</p>
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total Kontribusi</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'production' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredSet.prods.map(pr => (
                      <div key={pr.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-lg">🧪</div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(pr.timestamp).toLocaleDateString()}</p>
                            </div>
                         </div>
                         <h4 className="text-sm font-black text-slate-800 uppercase mb-4 leading-tight">
                            {inventory.find(i => i.id === pr.resultItemId)?.name || 'Produk Jadi'}
                            <span className="block text-[10px] text-indigo-600 font-mono mt-1">Hasil: +{(pr.resultQuantity ?? 0)} {inventory.find(i => i.id === pr.resultItemId)?.unit}</span>
                         </h4>
                         <div className="border-t pt-4 space-y-2">
                            {(pr.components || []).map((c, idx) => (
                               <div key={idx} className="flex justify-between text-[9px] font-bold">
                                  <span className="text-slate-500 uppercase leading-tight pr-2">{inventory.find(i => i.id === c.inventoryItemId)?.name}</span>
                                  <span className="text-red-500 shrink-0">-{(c.quantity ?? 0)} {inventory.find(i => i.id === c.inventoryItemId)?.unit}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'logs' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4">
                   {filteredSet.logs.map(log => (
                      <div key={log.id} className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-orange-500 transition-all">
                         <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex flex-col items-center justify-center text-white shrink-0">
                               <span className="text-[9px] font-black opacity-50 uppercase">{new Date(log.timestamp).toLocaleDateString('id-ID', {month: 'short'})}</span>
                               <span className="text-xl font-black leading-none">{new Date(log.timestamp).getDate()}</span>
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-sm font-black text-slate-800 uppercase truncate">{log.staffName}</h4>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{log.shiftName}</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10 w-full md:w-auto text-center md:text-right">
                            <div className="space-y-1">
                               <p className="text-[7px] font-black text-slate-400 uppercase">Sales Tunai</p>
                               <p className="text-[11px] font-black text-slate-900">Rp {(log.totalSalesCash ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[7px] font-black text-slate-400 uppercase">Sales QRIS</p>
                               <p className="text-[11px] font-black text-indigo-600">Rp {(log.totalSalesQRIS ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[7px] font-black text-slate-400 uppercase">Input Kas Fisik</p>
                               <p className="text-[11px] font-black text-slate-900">Rp {(log.actualCash ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[7px] font-black text-slate-400 uppercase">Discrepancy</p>
                               <p className={`text-[11px] font-black ${(log.discrepancy ?? 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {(log.discrepancy ?? 0) === 0 ? 'MATCH ✓' : `Rp ${(log.discrepancy ?? 0).toLocaleString()}`}
                               </p>
                            </div>
                         </div>
                         <button onClick={() => downloadShiftReport(log)} className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-50 transition-all shrink-0">Export Daily ↓</button>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>

      {viewingClosing && viewingClosingShiftData && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 flex items-center justify-center p-4">
           <div className="flex flex-col items-center gap-6 w-full max-w-full overflow-x-auto no-scrollbar">
              <div className="flex flex-col items-center gap-2 mb-2 shrink-0">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white font-black uppercase text-[10px] tracking-widest">Generating Detailed Report...</p>
              </div>
              
              <div className="w-full max-w-[500px] overflow-y-auto max-h-[80vh] bg-white rounded-[40px] shadow-2xl shrink-0">
                <div ref={shiftReportRef} className="bg-white text-slate-900 w-[500px] h-auto">
                    <div className="p-10 border-b-2 border-dashed border-slate-100 text-center bg-slate-50/50">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-[20px] flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-xl" style={{ backgroundColor: brandConfig.primaryColor }}>
                        {brandConfig.name.charAt(0)}
                    </div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Daily Report</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-[0.2em]">{outlets.find(o => o.id === viewingClosing.outletId)?.name || 'Verified Digital Audit'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(viewingClosing.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="p-10 space-y-10">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Penanggung Jawab</p>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{viewingClosing.staffName}</p>
                        </div>
                        <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Shift / Jadwal</p>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">
                            {viewingClosing.shiftName}
                            {(() => {
                                const s = (staff || []).find(st => st.id === viewingClosing.staffId);
                                return s ? ` (${s.shiftStartTime} - ${s.shiftEndTime})` : '';
                            })()}
                        </p>
                        </div>
                        <div className="space-y-1">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">Waktu Masuk</p>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{viewingClosingShiftData.start.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB</p>
                        </div>
                        <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">Waktu Tutup</p>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{new Date(viewingClosing.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB</p>
                        </div>
                    </div>

                    {/* FINANCIAL AUDIT SUMMARY */}
                    <div className="bg-white p-8 rounded-[32px] border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,0.05)]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center border-b pb-4">Ringkasan Audit Finansial</p>
                      <FinanceRow label="1. Modal Awal Shift" value={viewingClosing.openingBalance} isBold />
                      <FinanceRow label="2. Total Omset (Gross)" value={viewingClosing.totalSalesCash + viewingClosing.totalSalesQRIS} isBold />
                      <FinanceRow label="Penjualan Tunai (+)" value={viewingClosing.totalSalesCash} indent />
                      <FinanceRow label="Penjualan QRIS (+)" value={viewingClosing.totalSalesQRIS} indent />
                      <FinanceRow label="3. Total Pengeluaran (-)" value={viewingClosing.totalExpenses} isNegative isBold />
                      
                      <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200">
                        <FinanceRow label="Expected (Seharusnya di Laci)" value={(viewingClosing.openingBalance + viewingClosing.totalSalesCash) - viewingClosing.totalExpenses} isBold />
                        <div className="flex justify-between items-center py-4 bg-indigo-50 px-5 rounded-2xl mt-4 border border-indigo-100">
                            <span className="text-[10px] font-black text-indigo-600 uppercase">Input Uang Fisik</span>
                            <span className="text-xl font-black text-indigo-600 underline decoration-2 underline-offset-8">Rp {viewingClosing.actualCash.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className={`flex justify-between items-center py-5 px-6 rounded-2xl mt-4 border-2 ${viewingClosing.discrepancy === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        <span className="text-[11px] font-black uppercase tracking-widest">Selisih Audit</span>
                        <span className="text-2xl font-black font-mono">{(viewingClosing.discrepancy > 0 ? '+' : '')}{viewingClosing.discrepancy.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* RINCIAN PENGELUARAN DETAIL */}
                    {viewingClosingShiftData.sExps.length > 0 && (
                      <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Rincian Pengeluaran Kas</p>
                          <div className="space-y-2">
                            {viewingClosingShiftData.sExps.map(e => (
                                <div key={e.id} className="flex justify-between text-[11px] border-b border-slate-50 pb-3 hover:bg-slate-50 transition-colors px-2 rounded-lg">
                                  <div className="min-w-0 flex-1 pr-4">
                                      <p className="font-black text-slate-800 uppercase leading-tight">{e.notes || 'Operasional'}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                                        🕒 {new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} WIB • {expenseTypes.find(t=>t.id===e.typeId)?.name || 'LAINNYA'}
                                      </p>
                                  </div>
                                  <span className="font-mono font-black text-rose-600 ml-auto shrink-0">Rp {e.amount.toLocaleString()}</span>
                                </div>
                            ))}
                          </div>
                      </div>
                    )}

                    {/* SECTION PRODUKSI & MIXING */}
                    {viewingClosingShiftData.sProds.length > 0 && (
                        <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Log Produksi & Mixing</p>
                        <div className="grid grid-cols-1 gap-2">
                            {viewingClosingShiftData.sProds.map(p => {
                                const item = inventory.find(i=>i.id===p.resultItemId);
                                return (
                                  <div key={p.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                      <div className="min-w-0 flex-1 pr-4">
                                        <p className="text-[11px] font-black text-slate-700 uppercase leading-tight">{item?.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">🕒 JAM: {new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} WIB</p>
                                      </div>
                                      <span className="font-mono font-black text-indigo-600 shrink-0">+{p.resultQuantity} {item?.unit}</span>
                                  </div>
                                );
                            })}
                        </div>
                        </div>
                    )}

                    {/* SECTION MUTASI STOK / TRANSFER */}
                    {viewingClosingShiftData.mutations.length > 0 && (
                        <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Audit Mutasi Inventaris</p>
                        <div className="overflow-hidden border-2 border-slate-100 rounded-[28px] bg-white">
                            <table className="w-full text-left text-[9px] table-auto border-collapse">
                                <thead className="bg-slate-900 text-white font-black uppercase">
                                    <tr>
                                    <th className="p-4">Material</th>
                                    <th className="p-4 text-right">Awal</th>
                                    <th className="p-4 text-right">In</th>
                                    <th className="p-4 text-right">Out</th>
                                    <th className="p-4 text-right">Akhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {viewingClosingShiftData.mutations.map((m, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-black uppercase text-slate-700 leading-tight min-w-[100px]">{m.name}</td>
                                        <td className="p-4 text-right font-mono text-slate-400">{(m.start || 0).toFixed(1)}</td>
                                        <td className="p-4 text-right font-mono text-emerald-600">+{(m.in || 0).toFixed(1)}</td>
                                        <td className="p-4 text-right font-mono text-rose-600">-{(m.out || 0).toFixed(1)}</td>
                                        <td className="p-4 text-right font-mono font-black bg-slate-50/50">{(m.end || 0).toFixed(1)}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </div>
                    )}

                    {viewingClosing.notes && (
                      <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 italic text-[11px] text-amber-900 leading-relaxed shadow-inner">
                          <p className="text-[8px] font-black text-amber-600 uppercase mb-2 not-italic tracking-widest">Catatan Auditor Kasir:</p>
                          "{viewingClosing.notes}"
                      </div>
                    )}
                    
                    <div className="pt-10 text-center border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] mb-1">{brandConfig.name} OS Enterprise</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-none">Verification ID: {viewingClosing.id.slice(-12).toUpperCase()}</p>
                    </div>
                    </div>
                </div>
              </div>

              <div className="flex gap-2 mb-8 shrink-0">
                 <button onClick={() => setViewingClosing(null)} className="px-10 py-4 bg-white/20 text-white rounded-full font-black text-[11px] uppercase tracking-widest backdrop-blur-md border border-white/10 active:scale-95 transition-all">Tutup Pratinjau</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
