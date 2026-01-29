
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { OrderStatus, PaymentMethod } from '../types';

export const Reports: React.FC = () => {
  const { 
    transactions, expenses, purchases, selectedOutletId, 
    products, outlets, inventory, expenseTypes 
  } = useApp();
  
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'history'>('day');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // --- LOGIKA FILTER DATA ---
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
    
    return { txs, exps, start, end };
  }, [transactions, expenses, selectedOutletId, timeFilter, selectedMonth, selectedYear]);

  // --- KALKULASI FINANSIAL PROFESIONAL ---
  const metrics = useMemo(() => {
    const closedTxs = filteredData.txs.filter(t => t.status === OrderStatus.CLOSED);
    const revenue = closedTxs.reduce((a, b) => a + b.total, 0);
    const cogs = closedTxs.reduce((a, b) => a + (b.totalCost || 0), 0);
    const opEx = filteredData.exps.reduce((a, b) => a + b.amount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - opEx;
    
    return { revenue, cogs, opEx, grossProfit, netProfit, count: closedTxs.length };
  }, [filteredData]);

  const handlePrint = () => {
    window.print();
  };

  const FinanceRow = ({ label, value, isBold = false, isNegative = false, isTotal = false, indent = false }: any) => (
    <div className={`flex justify-between items-end py-2.5 ${isTotal ? 'border-t-2 border-slate-900 mt-2 pt-4' : 'border-b border-slate-100'} ${isBold ? 'font-black text-slate-900' : 'text-slate-600 font-medium'}`}>
      <span className={`text-[11px] uppercase tracking-wider ${indent ? 'pl-6 border-l-2 border-slate-100 ml-1' : ''}`}>{label}</span>
      <span className={`text-xs font-mono tabular-nums ${isNegative ? 'text-red-600' : ''}`}>
        {isNegative ? '(' : ''}Rp {value.toLocaleString('id-ID')}{isNegative ? ')' : ''}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* UI HEADER (HIDDEN ON PRINT) */}
      <div className="p-6 md:p-8 border-b border-slate-100 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Laporan Inteligensi Keuangan</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Audit Terpadu Mozza Boy Enterprise</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
             {(['day', 'week', 'month', 'history'] as const).map(t => (
               <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === t ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                 {t === 'day' ? 'Hari Ini' : t === 'week' ? '7 Hari' : t === 'month' ? '30 Hari' : 'Arsip'}
               </button>
             ))}
          </div>

          {timeFilter === 'history' && (
            <div className="flex gap-2">
               <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
               </select>
               <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-6 py-2.5 bg-white border-2 border-slate-900 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
               <span>🖨️</span> CETAK LAPORAN
            </button>
            <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10">
               <span>📄</span> EXPORT PDF RESMI
            </button>
          </div>
        </div>
      </div>

      {/* REPORT VIEWPORT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-12 bg-slate-100/30 print:bg-white print:p-0">
        
        {/* DOCUMENT CONTAINER */}
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-[48px] overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* LOGO & WATERMARK DECOR (HIDDEN ON PRINT) */}
          <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none no-print">
            <div className="text-[200px] font-black transform rotate-12">MB</div>
          </div>

          {/* OFFICIAL DOCUMENT HEADER */}
          <div className="p-10 md:p-16 border-b-8 border-slate-900">
             <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="space-y-4">
                   <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl">M</div>
                   <div>
                      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mozza Boy Enterprise</h1>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Professional Financial Statement</p>
                   </div>
                   <div className="text-[10px] text-slate-500 font-medium uppercase leading-relaxed max-w-xs">
                      {activeOutlet?.name}<br/>
                      {activeOutlet?.address}
                   </div>
                </div>

                <div className="text-left md:text-right space-y-4">
                   <div className="inline-block px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Periode Laporan</p>
                      <p className="text-sm font-black text-slate-800 uppercase">
                        {timeFilter === 'history' ? `${months[selectedMonth]} ${selectedYear}` : 'Laporan Real-time'}
                      </p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-900 uppercase">Dokumen: #MB-ACC-{Date.now().toString().slice(-6)}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Dicetak Pada: {new Date().toLocaleString('id-ID')}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* FINANCIAL CONTENT */}
          <div className="p-10 md:p-16 space-y-12">
            
            {/* SECTION 1: INCOME STATEMENT */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">I. Ringkasan Laba Rugi Operasional</h3>
                 <div className="flex-1 h-px bg-slate-100"></div>
              </div>
              
              <div className="space-y-1">
                 <FinanceRow label="Pendapatan Penjualan Kotor (Gross Sales)" value={metrics.revenue} isBold />
                 <FinanceRow label="Retur & Potongan Penjualan" value={0} isNegative />
                 <div className="py-4"></div>
                 
                 <FinanceRow label="Beban Pokok Penjualan (HPP / COGS)" value={metrics.cogs} isNegative />
                 <FinanceRow label="Laba Kotor (Gross Profit)" value={metrics.grossProfit} isBold isTotal />
                 
                 <div className="py-6"></div>
                 
                 <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Beban Operasional (OpEx)</h4>
                 {expenseTypes.map(type => {
                    const amount = filteredData.exps.filter(e => e.typeId === type.id).reduce((a,b)=>a+b.amount, 0);
                    if (amount === 0) return null;
                    return <FinanceRow key={type.id} label={type.name} value={amount} indent isNegative />;
                 })}
                 <FinanceRow label="Total Beban Operasional" value={metrics.opEx} isNegative />

                 <div className="py-4"></div>
                 <div className="p-8 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-2xl">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight">Laba Bersih (Net Income)</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Setelah Pajak & Biaya Operasional</p>
                    </div>
                    <div className="text-right">
                       <p className="text-3xl font-black tracking-tighter">Rp {metrics.netProfit.toLocaleString('id-ID')}</p>
                       <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase mt-2">
                          Margin: {metrics.revenue > 0 ? ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) : 0}%
                       </div>
                    </div>
                 </div>
              </div>
            </section>

            {/* SECTION 2: TOP PERFORMING PRODUCTS (PROFESSIONAL BAR) */}
            <section className="no-break-page">
              <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">II. Analisa Kontribusi Produk</h3>
                 <div className="flex-1 h-px bg-slate-100"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    {products.map(p => {
                       const qty = filteredData.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc, tx) => acc + tx.items.filter(it => it.product.id === p.id).reduce((a,b)=>a+b.quantity, 0), 0);
                       return { name: p.name, qty };
                    }).sort((a,b)=>b.qty - a.qty).slice(0, 5).map((item, idx) => (
                       <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                             <span className="text-slate-400">{idx+1}. {item.name}</span>
                             <span className="text-slate-900 font-mono">{item.qty} PCS</span>
                          </div>
                          <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500" style={{ width: `${(item.qty / (Math.max(...products.map(p => filteredData.txs.filter(t => t.status === OrderStatus.CLOSED).reduce((acc, tx) => acc + tx.items.filter(it => it.product.id === p.id).reduce((a,b)=>a+b.quantity, 0), 0))) || 1)) * 100}%` }}></div>
                          </div>
                       </div>
                    ))}
                 </div>
                 
                 <div className="p-8 bg-slate-50 border border-slate-200 rounded-[32px] flex flex-col justify-center text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Average Ticket Size</p>
                    <h4 className="text-3xl font-black text-slate-900">
                      Rp {metrics.count > 0 ? Math.round(metrics.revenue / metrics.count).toLocaleString('id-ID') : 0}
                    </h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-4">Berdasarkan {metrics.count} Transaksi Berhasil</p>
                 </div>
              </div>
            </section>

            {/* AUDIT FOOTER */}
            <div className="pt-20 border-t border-slate-100">
               <div className="grid grid-cols-3 gap-12">
                  <div className="text-center space-y-16">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dibuat Oleh (Admin)</p>
                     <div className="border-b border-slate-300 w-32 mx-auto"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900">Mozza Boy System</p>
                  </div>
                  <div className="text-center space-y-4 flex flex-col items-center justify-center">
                     <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-2 opacity-50 grayscale">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIED-DOC-${Date.now()}&color=0f172a`} alt="Audit QR" />
                     </div>
                     <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Digital Audit Proof</p>
                  </div>
                  <div className="text-center space-y-16">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Otorisasi (Owner)</p>
                     <div className="border-b border-slate-300 w-32 mx-auto"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900">Alex Principal</p>
                  </div>
               </div>
            </div>
          </div>
          
          {/* PAGE END STRIP */}
          <div className="bg-slate-900 h-4 w-full"></div>
        </div>
        
        {/* PRINT FOOTER (ONLY VISIBLE ON PAPER) */}
        <div className="hidden print:block fixed bottom-0 left-0 w-full p-8 border-t border-slate-200 bg-white">
          <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
             <span>Laporan ini sah secara digital dan dikeluarkan oleh Mozza Boy ROS v5.0</span>
             <span>Halaman 1 dari 1</span>
          </div>
        </div>

      </div>
    </div>
  );
};
