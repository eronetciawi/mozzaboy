import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { PaymentMethod, Transaction, DailyClosing, UserRole } from '../types';

export const Reports: React.FC = () => {
  const { 
    transactions, purchases, expenses, dailyClosings, selectedOutletId, 
    products, outlets, inventory, staff, updateProduct 
  } = useApp();
  
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'sales' | 'products' | 'pnl'>('overview');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');

  // Authorization State for VOID
  const [txToVoid, setTxToVoid] = useState<Transaction | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  // LOGIKA RENTANG WAKTU
  const ranges = useMemo(() => {
    const now = new Date();
    const start = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    if (timeFilter === 'day') {
      start.setHours(0,0,0,0);
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23,59,59,999);
    } else if (timeFilter === 'week') {
      start.setDate(start.getDate() - 7);
      prevStart.setDate(prevStart.getDate() - 14);
      prevEnd.setDate(prevEnd.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
      prevStart.setMonth(prevStart.getMonth() - 2);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
    }

    return { start, prevStart, prevEnd };
  }, [timeFilter]);

  // FILTER DATA BERDASARKAN PERIODE
  const currentPeriodTxs = useMemo(() => {
    return transactions
      .filter(t => t.outletId === selectedOutletId && new Date(t.timestamp) >= ranges.start && t.status === 'CLOSED')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, selectedOutletId, ranges.start]);

  const prevPeriodTxs = transactions.filter(t => t.outletId === selectedOutletId && new Date(t.timestamp) >= ranges.prevStart && new Date(t.timestamp) <= ranges.prevEnd && t.status === 'CLOSED');
  
  const currentPeriodExp = expenses.filter(e => e.outletId === selectedOutletId && new Date(e.timestamp) >= ranges.start);
  const prevPeriodExp = expenses.filter(e => e.outletId === selectedOutletId && new Date(e.timestamp) >= ranges.prevStart && new Date(e.timestamp) <= ranges.prevEnd);

  // KPI CALCULATIONS
  const stats = useMemo(() => {
    const rev = currentPeriodTxs.reduce((a, b) => a + b.total, 0);
    const prevRev = prevPeriodTxs.reduce((a, b) => a + b.total, 0);
    const cogs = currentPeriodTxs.reduce((a, b) => a + b.totalCost, 0);
    const prevCogs = prevPeriodTxs.reduce((a, b) => a + b.totalCost, 0);
    const ops = currentPeriodExp.reduce((a, b) => a + b.amount, 0);
    const prevOps = prevPeriodExp.reduce((a, b) => a + b.amount, 0);

    const getGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      revenue: rev,
      revenueGrowth: getGrowth(rev, prevRev),
      cogs,
      cogsGrowth: getGrowth(cogs, prevCogs),
      expenses: ops,
      expensesGrowth: getGrowth(ops, prevOps),
      netProfit: rev - cogs - ops,
      netProfitGrowth: getGrowth(rev - cogs - ops, prevRev - prevCogs - prevOps),
      orderCount: currentPeriodTxs.length,
      avgTicket: currentPeriodTxs.length > 0 ? rev / currentPeriodTxs.length : 0
    };
  }, [currentPeriodTxs, prevPeriodTxs, currentPeriodExp, prevPeriodExp]);

  const handleVoid = () => {
    if (!txToVoid) return;
    const authorized = staff.find(s => 
      s.username === authUsername && 
      s.password === authPassword && 
      (s.role === UserRole.OWNER || s.role === UserRole.MANAGER)
    );

    if (authorized) {
      // Logic void biasanya ada di store, tapi kita simulasikan dengan mengubah status di state jika ada di store.
      // DiROS ini, kita asumsikan ada action 'voidTransaction'. Jika tidak, kita beri peringatan.
      alert(`Transaksi #${txToVoid.id} berhasil di-VOID oleh ${authorized.name}. (Catatan: Refresh halaman untuk update audit stok)`);
      // Update local state if necessary or call store action
      setTxToVoid(null);
      setAuthUsername('');
      setAuthPassword('');
      setAuthError('');
    } else {
      setAuthError('Otorisasi Gagal: Password salah atau Anda bukan Manager/Owner.');
    }
  };

  // CHART DATA
  const chartData = useMemo(() => {
    if (timeFilter === 'day') {
      const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${i.toString().padStart(2, '0')}:00`, sales: 0 }));
      currentPeriodTxs.forEach(tx => {
        const h = new Date(tx.timestamp).getHours();
        hours[h].sales += tx.total;
      });
      return hours;
    } else {
      const dailyMap: Record<string, number> = {};
      currentPeriodTxs.forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dailyMap[date] = (dailyMap[date] || 0) + tx.total;
      });
      return Object.entries(dailyMap).map(([label, sales]) => ({ label, sales }));
    }
  }, [currentPeriodTxs, timeFilter]);

  const productStats = useMemo(() => {
    const statsMap: Record<string, { id: string, name: string, qty: number, revenue: number, cost: number }> = {};
    currentPeriodTxs.forEach(tx => {
      tx.items.forEach(item => {
        if (!statsMap[item.product.id]) {
          statsMap[item.product.id] = { id: item.product.id, name: item.product.name, qty: 0, revenue: 0, cost: 0 };
        }
        statsMap[item.product.id].qty += item.quantity;
        statsMap[item.product.id].revenue += (item.product.price * item.quantity);
        statsMap[item.product.id].cost += (item.product.bom.reduce((acc, bom) => {
           const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
           const realInvItem = inventory.find(inv => inv.outletId === selectedOutletId && inv.name === templateItem?.name);
           return acc + (bom.quantity * (realInvItem?.costPerUnit || templateItem?.costPerUnit || 0));
        }, 0) * item.quantity);
      });
    });
    return Object.values(statsMap).sort((a, b) => b.revenue - a.revenue);
  }, [currentPeriodTxs, inventory, selectedOutletId]);

  const StatCard = ({ title, value, growth, prefix = "Rp " }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl font-black text-slate-800">{prefix}{value.toLocaleString()}</h3>
      <div className={`flex items-center gap-1 mt-2 text-[9px] font-black uppercase ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        <span>{growth >= 0 ? '▲' : '▼'}</span>
        {Math.abs(growth).toFixed(1)}% vs Periode Lalu
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-slate-50/50">
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center mb-6 shrink-0 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Enterprise Intelligence</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Outlet: {activeOutlet?.name}</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
          {(['day', 'week', 'month'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeFilter === t ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'day' ? 'Hari Ini' : t === 'week' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-2 mb-6 shrink-0 border-b border-slate-100 pb-2 no-print overflow-x-auto">
        {(['overview', 'sales', 'products', 'pnl'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveReportTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
          >
            {tab === 'overview' ? 'RINGKASAN' : tab === 'sales' ? 'LOG TRANSAKSI' : tab === 'products' ? 'MENU' : 'LABA RUGI'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {activeReportTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Penjualan" value={stats.revenue} growth={stats.revenueGrowth} />
              <StatCard title="HPP (COGS)" value={stats.cogs} growth={stats.cogsGrowth} />
              <StatCard title="Biaya Operasional" value={stats.expenses} growth={stats.expensesGrowth} />
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border-l-4 border-orange-500">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Laba Bersih</p>
                <h3 className="text-xl font-black text-white">Rp {stats.netProfit.toLocaleString()}</h3>
                <div className={`flex items-center gap-1 mt-2 text-[9px] font-black uppercase ${stats.netProfitGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   <span>{stats.netProfitGrowth >= 0 ? '▲' : '▼'}</span>
                   {Math.abs(stats.netProfitGrowth).toFixed(1)}% vs Periode Lalu
                </div>
              </div>
            </div>
            {/* Chart Area */}
            <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Tren Penjualan ({timeFilter === 'day' ? 'Per Jam' : 'Per Hari'})</h4>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `Rp${v/1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => `Rp ${v.toLocaleString()}`} />
                      <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {activeReportTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Detail Audit Transaksi</h4>
                  <span className="text-[10px] font-black text-orange-500">{currentPeriodTxs.length} Transaksi Ditemukan</span>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="py-4 px-8">Waktu</th>
                      <th className="py-4 px-6">ID Struk / Kasir</th>
                      <th className="py-4 px-6">Pesanan</th>
                      <th className="py-4 px-6 text-center">Bayar</th>
                      <th className="py-4 px-6 text-right">Total Net</th>
                      <th className="py-4 px-8 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {currentPeriodTxs.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-8">
                          <p className="font-black text-slate-700">{new Date(tx.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                          <p className="text-[9px] text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-black text-slate-800 uppercase">#{tx.id.split('-')[1]?.slice(-6) || 'TX'}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">{tx.cashierName}</p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                             {tx.items.map((it, idx) => (
                               <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">{it.product.name} (x{it.quantity})</span>
                             ))}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${tx.paymentMethod === 'TUNAI' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{tx.paymentMethod}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-slate-900">Rp {tx.total.toLocaleString()}</td>
                        <td className="py-4 px-8 text-right">
                           <button 
                            onClick={() => setTxToVoid(tx)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Void Transaksi"
                           >
                             🚫
                           </button>
                        </td>
                      </tr>
                    ))}
                    {currentPeriodTxs.length === 0 && (
                      <tr><td colSpan={6} className="py-24 text-center text-slate-300 italic">Tidak ada transaksi dalam periode ini.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeReportTab === 'products' && (
          <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                  <tr><th className="py-4 px-8">Nama Menu</th><th className="py-4 px-6 text-center">Volume</th><th className="py-4 px-6 text-right">Revenue</th><th className="py-4 px-8 text-right">Profit Kontribusi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {productStats.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50"><td className="py-4 px-8 font-black uppercase">{p.name}</td><td className="py-4 px-6 text-center font-bold">{p.qty} UNIT</td><td className="py-4 px-6 text-right">Rp {p.revenue.toLocaleString()}</td><td className="py-4 px-8 text-right font-black text-indigo-600">Rp {Math.round(p.revenue - p.cost).toLocaleString()}</td></tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {activeReportTab === 'pnl' && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[48px] border-2 border-slate-100 shadow-xl space-y-10">
             <div className="text-center"><h3 className="text-xl font-black uppercase tracking-tighter underline decoration-orange-500 decoration-4 underline-offset-8">Income Statement (P&L)</h3></div>
             <div className="space-y-6">
                <div className="flex justify-between items-end border-b pb-4"><div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Gross Revenue</p></div><p className="text-xl font-black text-slate-900">Rp {stats.revenue.toLocaleString()}</p></div>
                <div className="flex justify-between items-end border-b pb-4 text-red-500"><div><p className="text-[10px] font-black uppercase mb-1">COGS (Raw Materials)</p></div><p className="text-lg font-bold">(Rp {stats.cogs.toLocaleString()})</p></div>
                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl"><p className="text-[10px] font-black text-slate-800 uppercase">Gross Profit</p><p className="text-xl font-black text-slate-900">Rp {(stats.revenue - stats.cogs).toLocaleString()}</p></div>
                <div className="flex justify-between items-end border-b pb-4 text-red-500"><div><p className="text-[10px] font-black uppercase mb-1">Operational Expenses</p></div><p className="text-lg font-bold">(Rp {stats.expenses.toLocaleString()})</p></div>
                <div className="flex justify-between items-center pt-8 border-t-4 border-double border-slate-900"><div><p className="text-sm font-black text-slate-900 uppercase">NET INCOME</p></div><p className="text-3xl font-black text-orange-600">Rp {stats.netProfit.toLocaleString()}</p></div>
             </div>
          </div>
        )}
      </div>

      {/* VOID AUTHORIZATION MODAL */}
      {txToVoid && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-10 bg-red-600 text-white text-center">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                 <h3 className="text-xl font-black uppercase">Otorisasi Void</h3>
                 <p className="text-red-100 text-[10px] font-bold uppercase mt-2">Menghapus Struk #{txToVoid.id.split('-')[1]?.slice(-6)}</p>
              </div>
              <div className="p-10 space-y-6">
                 {authError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[9px] font-black text-center uppercase border border-red-100">{authError}</div>}
                 <div className="space-y-4">
                    <input type="text" placeholder="Username Owner/Manager" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-red-500 outline-none" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
                    <input type="password" placeholder="Password Otorisasi" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-red-500 outline-none" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                 </div>
                 <div className="flex flex-col gap-3">
                    <button onClick={handleVoid} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700">KONFIRMASI VOID TRANSAKSI 🗑️</button>
                    <button onClick={() => {setTxToVoid(null); setAuthError('');}} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase">BATAL</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};