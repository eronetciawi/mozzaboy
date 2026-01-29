
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
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
  const [isCapturing, setIsCapturing] = useState(false);
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

  const getPrice = (p: Product) => {
    return p.outletSettings?.[selectedOutletId]?.price || p.price;
  };

  const shareAsTextFallback = (tx: Transaction) => {
    const itemsText = tx.items.map(it => `- ${it.product.name} (x${it.quantity}): Rp ${(getPrice(it.product) * it.quantity).toLocaleString()}`).join('%0A');
    const message = `*STRUK BELANJA MOZZA BOY*%0A---------------------------%0AOutlet: ${activeOutlet?.name}%0ATgl: ${new Date(tx.timestamp).toLocaleString()}%0AID: #${tx.id.slice(-6)}%0A---------------------------%0A${itemsText}%0A---------------------------%0A*TOTAL: Rp ${tx.total.toLocaleString()}*%0A_Bayar via: ${tx.paymentMethod}_%0A%0ATerima Kasih!`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

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

  const shareReceiptAsImage = async () => {
    if (!receiptRef.current || !viewingTransaction) return;
    
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png', 1.0));
      if (!blob) throw new Error('Blob creation failed');

      const file = new File([blob], `Struk-MozzaBoy-${viewingTransaction.id.slice(-6)}.png`, { type: 'image/png' });

      // Cek dukungan Share API untuk File
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Struk Mozza Boy',
          text: `Struk belanja #${viewingTransaction.id.slice(-6)}`
        });
      } else {
        // Jika tidak mendukung kirim file, tawarkan kirim teks atau unduh
        if (confirm('Browser Anda tidak mendukung pengiriman gambar langsung. Kirim struk dalam format teks ke WhatsApp?')) {
          shareAsTextFallback(viewingTransaction);
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback terakhir jika terjadi error pada Share API
      shareAsTextFallback(viewingTransaction);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="p-3 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <StatCard title="Omzet" value={`Rp ${(totalSales/1000).toFixed(0)}k`} trend="Live" isPositive={true} />
        <StatCard title="Struk" value={totalOrders.toString()} trend="Orders" isPositive={true} />
        <StatCard title="Avg Check" value={`Rp ${totalOrders > 0 ? (totalSales/totalOrders/1000).toFixed(0) : 0}k`} trend="Per Order" isPositive={true} />
        <StatCard title="Stok Kritis" value={lowStockItems.length.toString()} trend="Items" isPositive={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-10">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Transaksi Terbaru</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Live Audit Trail</p>
          </div>
          <button onClick={() => setActiveTab && setActiveTab('pos')} className="text-[9px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl uppercase shadow-lg shadow-slate-900/10">Kasir Jualan +</button>
        </div>

        <div className="divide-y divide-slate-50">
           {txs.slice(0, 10).map(tx => (
             <button 
                key={tx.id} 
                onClick={() => setViewingTransaction(tx)}
                className="w-full p-5 flex items-center justify-between text-left active:bg-slate-50 transition-colors"
             >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.paymentMethod === 'TUNAI' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
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
                <div className="text-right">
                   <p className="text-xs font-black text-slate-900 tracking-tight">Rp {tx.total.toLocaleString()}</p>
                   <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest">Struk ➔</p>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-sm h-full md:h-auto overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <button onClick={() => setViewingTransaction(null)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100">✕</button>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Pratinjau Struk</h3>
                <div className="w-10"></div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center no-scrollbar bg-slate-200">
                {/* PAPER DESIGN */}
                <div 
                  ref={receiptRef} 
                  className="bg-white p-8 w-full max-w-[300px] shadow-2xl flex flex-col text-[#1a1a1a] font-mono text-[11px] uppercase border-t-[10px] border-orange-500 relative"
                >
                   <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,white_4px)] bg-[length:12px_12px] bg-repeat-x -mt-1"></div>

                   <div className="text-center mb-8">
                      <h3 className="text-base font-black tracking-tight leading-none mb-1">MOZZA BOY</h3>
                      <p className="text-[10px] font-bold tracking-widest opacity-80 italic">Korean Street Food</p>
                      <div className="w-full border-b border-dashed border-slate-300 my-4"></div>
                      <h3 className="text-[11px] font-black">{activeOutlet?.name}</h3>
                      <p className="text-[8px] mt-1 opacity-60 leading-tight px-4">{activeOutlet?.address}</p>
                   </div>

                   <div className="space-y-1.5 mb-6 lowercase">
                      <div className="flex justify-between uppercase"><span>Tanggal:</span><span>{new Date(viewingTransaction.timestamp).toLocaleDateString()}</span></div>
                      <div className="flex justify-between uppercase"><span>Waktu:</span><span>{new Date(viewingTransaction.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                      <div className="flex justify-between uppercase"><span>Kasir:</span><span>{viewingTransaction.cashierName}</span></div>
                      <div className="flex justify-between font-black mt-1 uppercase"><span>Order ID:</span><span>#{viewingTransaction.id.slice(-6)}</span></div>
                   </div>

                   <div className="w-full border-b border-dashed border-slate-300 my-4"></div>

                   <div className="space-y-4 mb-8">
                      {viewingTransaction.items.map((it, idx) => (
                        <div key={idx} className="flex flex-col">
                           <div className="flex justify-between items-start">
                              <span className="flex-1 pr-4">{it.product.name}</span>
                              <span className="font-bold">Rp {(getPrice(it.product) * it.quantity).toLocaleString()}</span>
                           </div>
                           <div className="text-[9px] opacity-50 lowercase">{it.quantity} x {getPrice(it.product).toLocaleString()}</div>
                        </div>
                      ))}
                   </div>

                   <div className="w-full border-b border-dashed border-slate-300 my-4"></div>

                   <div className="space-y-2 font-black">
                      <div className="flex justify-between text-[13px]">
                        <span>TOTAL</span>
                        <span className="text-orange-600">Rp {viewingTransaction.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between opacity-60">
                        <span>Bayar Via</span>
                        <span>{viewingTransaction.paymentMethod}</span>
                      </div>
                   </div>

                   <div className="text-center mt-12 space-y-1">
                      <div className="inline-block border-2 border-slate-200 p-2 rounded mb-4 bg-white">
                         <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${viewingTransaction.id}&color=1a1a1a`} 
                           alt="Audit QR" 
                           className="w-16 h-16 grayscale" 
                           crossOrigin="anonymous"
                         />
                      </div>
                      <p className="text-[9px] font-bold">Terima Kasih Atas Kunjungannya</p>
                      <p className="text-[8px] opacity-40 italic lowercase">#mozzaboy_official</p>
                   </div>

                   <div className="absolute bottom-0 left-0 w-full h-2 bg-[radial-gradient(circle,white_4px,transparent_4px)] bg-[length:12px_12px] bg-repeat-x mb-[-4px]"></div>
                </div>
             </div>

             {/* ACTIONS */}
             <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col gap-3 pb-safe shrink-0">
                <button 
                  onClick={shareReceiptAsImage}
                  disabled={isCapturing}
                  className={`w-full py-5 bg-[#25D366] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all ${isCapturing ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  <span className="text-xl">{isCapturing ? '⌛' : '📸'}</span> 
                  {isCapturing ? 'PROSES...' : 'KIRIM KE WHATSAPP'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={downloadReceipt} 
                    disabled={isCapturing}
                    className="py-4 bg-slate-100 text-slate-700 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-200 active:bg-slate-200"
                   >Unduh Gambar</button>
                   <button 
                    onClick={() => window.print()} 
                    className="py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest"
                   >Cetak Thermal</button>
                </div>
                <button 
                  onClick={() => setViewingTransaction(null)} 
                  className="py-3 text-slate-400 text-[8px] font-black uppercase tracking-[0.3em]"
                >Tutup Panel</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
