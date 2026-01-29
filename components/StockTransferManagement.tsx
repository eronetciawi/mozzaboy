
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';

export const StockTransferManagement: React.FC = () => {
  const { inventory, outlets, selectedOutletId, stockTransfers, transferStock } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ toOutletId: '', itemName: '', quantity: 0 });

  const currentOutletInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const destinationOutlets = outlets.filter(o => o.id !== selectedOutletId);
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  // Filter transfers involving current outlet
  const relevantTransfers = useMemo(() => {
    return stockTransfers
      .filter(tr => tr.fromOutletId === selectedOutletId || tr.toOutletId === selectedOutletId)
      .filter(tr => tr.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockTransfers, selectedOutletId, searchTerm]);

  // Movement Statistics
  const stats = useMemo(() => {
    const outbound = relevantTransfers.filter(t => t.fromOutletId === selectedOutletId).reduce((acc, t) => acc + t.quantity, 0);
    const inbound = relevantTransfers.filter(t => t.toOutletId === selectedOutletId).reduce((acc, t) => acc + t.quantity, 0);
    return { outbound, inbound, totalOps: relevantTransfers.length };
  }, [relevantTransfers, selectedOutletId]);

  const handleTransfer = () => {
    if (!formData.toOutletId || !formData.itemName || formData.quantity <= 0) return alert("Lengkapi data mutasi!");
    transferStock(selectedOutletId, formData.toOutletId, formData.itemName, formData.quantity);
    setShowModal(false);
    setFormData({ toOutletId: '', itemName: '', quantity: 0 });
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Logistik Antar Cabang</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic tracking-widest">Kontrol pergerakan stok: <span className="text-indigo-600 font-bold">{activeOutlet?.name}</span></p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <span>📦</span> + KIRIM STOK KE CABANG LAIN
        </button>
      </div>

      {/* MOVEMENT SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
         <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Barang Keluar</p>
            <h4 className="text-xl font-black text-red-600">-{stats.outbound.toLocaleString()} <span className="text-[10px] text-slate-300">UNIT</span></h4>
         </div>
         <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Barang Masuk</p>
            <h4 className="text-xl font-black text-green-600">+{stats.inbound.toLocaleString()} <span className="text-[10px] text-slate-300">UNIT</span></h4>
         </div>
         <div className="hidden md:block bg-slate-900 p-5 rounded-3xl shadow-xl text-white">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Frekuensi Mutasi</p>
            <h4 className="text-xl font-black">{stats.totalOps} <span className="text-[10px] text-slate-500">KALI</span></h4>
         </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail Perpindahan</h3>
           <div className="relative">
              <input 
                type="text" 
                placeholder="Cari bahan..." 
                className="pl-8 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30">🔍</span>
           </div>
        </div>

        {relevantTransfers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
             <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Tidak ada data mutasi yang ditemukan</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-6">
               <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                     <tr>
                        <th className="py-5 px-6">Tgl & Jam</th>
                        <th className="py-5 px-4">Status</th>
                        <th className="py-5 px-6">Nama Material</th>
                        <th className="py-5 px-4 text-center">Volume</th>
                        <th className="py-5 px-6">Alur Mutasi</th>
                        <th className="py-5 px-6 text-right">PIC</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[10px]">
                     {relevantTransfers.map(tr => {
                        const isOutbound = tr.fromOutletId === selectedOutletId;
                        return (
                          <tr key={tr.id} className="hover:bg-slate-50 transition-colors group">
                             <td className="py-4 px-6 text-slate-400 font-bold">
                                {new Date(tr.timestamp).toLocaleDateString()}<br/>
                                <span className="text-[8px]">{new Date(tr.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                             </td>
                             <td className="py-4 px-4">
                                <span className={`px-3 py-1 rounded-full font-black uppercase text-[7px] shadow-sm ${isOutbound ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                   {isOutbound ? '📤 Keluar' : '📥 Masuk'}
                                </span>
                             </td>
                             <td className="py-4 px-6 font-black text-slate-800 uppercase">{tr.itemName}</td>
                             <td className="py-4 px-4 text-center font-black text-indigo-600">{tr.quantity} {tr.unit}</td>
                             <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                   <span className="max-w-[80px] truncate text-slate-400 font-bold uppercase">{tr.fromOutletName}</span>
                                   <span className="text-indigo-300">➔</span>
                                   <span className="max-w-[80px] truncate text-indigo-600 font-black uppercase">{tr.toOutletName}</span>
                                </div>
                             </td>
                             <td className="py-4 px-6 text-right font-black text-slate-300 uppercase group-hover:text-slate-900 transition-colors">
                                {tr.staffName}
                             </td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>

            {/* MOBILE LIST VIEW */}
            <div className="md:hidden space-y-3">
              {relevantTransfers.map(tr => {
                const isOutbound = tr.fromOutletId === selectedOutletId;
                return (
                  <div key={tr.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isOutbound ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                             {isOutbound ? '📤' : '📥'}
                          </div>
                          <div>
                             <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{tr.itemName}</h4>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tr.timestamp).toLocaleString([], {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</p>
                          </div>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${isOutbound ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isOutbound ? '-' : '+'}{tr.quantity} {tr.unit}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-3 px-3 py-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-20"></div>
                       <div className="flex-1 text-center">
                          <p className="text-[6px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">DARI</p>
                          <p className={`text-[9px] font-black uppercase truncate px-1 ${isOutbound ? 'text-slate-700' : 'text-slate-400'}`}>{tr.fromOutletName}</p>
                       </div>
                       <div className="text-indigo-300 text-xs animate-pulse">➔</div>
                       <div className="flex-1 text-center">
                          <p className="text-[6px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">KE TUJUAN</p>
                          <p className={`text-[9px] font-black uppercase truncate px-1 ${!isOutbound ? 'text-indigo-600' : 'text-slate-400'}`}>{tr.toOutletName}</p>
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[7px] font-black text-slate-300 uppercase px-1 tracking-widest">
                       <span>PIC: {tr.staffName}</span>
                       <span>ID: #{tr.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* FULL SCREEN TRANSFER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-lg h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Form Mutasi Stok</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Cabang Tujuan</label>
                   <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" value={formData.toOutletId} onChange={e => setFormData({...formData, toOutletId: e.target.value})}>
                      <option value="">-- Pilih Cabang Penerima --</option>
                      {destinationOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Bahan yang Dikirim</label>
                   <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})}>
                      <option value="">-- Pilih Bahan --</option>
                      {currentOutletInventory.map(i => <option key={i.id} value={i.name}>{i.name} (Sisa: {i.quantity} {i.unit})</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah Kirim</label>
                   <input type="number" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-slate-800 focus:border-indigo-500 outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                </div>

                <div className="p-6 bg-slate-900 rounded-[32px] text-white flex items-center gap-4 border border-white/5">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">⚠️</div>
                   <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">Mutasi akan <b>mengurangi</b> stok {activeOutlet?.name} dan <b>menambah</b> stok di cabang tujuan secara real-time.</p>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!formData.toOutletId || !formData.itemName || formData.quantity <= 0}
                  onClick={handleTransfer} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >KONFIRMASI PENGIRIMAN 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
