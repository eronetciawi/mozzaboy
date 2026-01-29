
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

  const relevantTransfers = useMemo(() => {
    return stockTransfers
      .filter(tr => tr.fromOutletId === selectedOutletId || tr.toOutletId === selectedOutletId)
      .filter(tr => tr.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockTransfers, selectedOutletId, searchTerm]);

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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
         <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Barang Keluar</p>
            <h4 className="text-xl font-black text-red-600">-{stats.outbound.toLocaleString()}</h4>
         </div>
         <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Barang Masuk</p>
            <h4 className="text-xl font-black text-green-600">+{stats.inbound.toLocaleString()}</h4>
         </div>
      </div>

      <div className="space-y-3">
         {relevantTransfers.map(tr => (
           <div key={tr.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                 <h4 className="text-[11px] font-black text-slate-800 uppercase">{tr.itemName}</h4>
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${tr.fromOutletId === selectedOutletId ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {tr.fromOutletId === selectedOutletId ? 'Outbound' : 'Inbound'}
                 </span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                 <span>{tr.fromOutletName} ➔ {tr.toOutletName}</span>
                 <span className="text-indigo-600">{tr.quantity} {tr.unit}</span>
              </div>
           </div>
         ))}
      </div>

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
                   <input 
                      type="number" 
                      onFocus={(e) => e.target.select()}
                      className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-slate-800 focus:border-indigo-500 outline-none" 
                      value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} 
                      placeholder="0" 
                   />
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!formData.toOutletId || !formData.itemName || formData.quantity <= 0}
                  onClick={handleTransfer} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-30"
                >KONFIRMASI PENGIRIMAN 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
