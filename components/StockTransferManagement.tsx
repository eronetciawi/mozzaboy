
import React, { useState } from 'react';
import { useApp } from '../store';

export const StockTransferManagement: React.FC = () => {
  const { inventory, outlets, selectedOutletId, stockTransfers, transferStock } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ toOutletId: '', itemName: '', quantity: 0 });

  const currentOutletInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const destinationOutlets = outlets.filter(o => o.id !== selectedOutletId);

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
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Mutasi Stok Cabang</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Pindah barang antar outlet Mozza Boy</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
        >
          + Kirim Barang ke Cabang Lain
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Log Perpindahan Stok</h3>
        {stockTransfers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
             <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada mutasi stok</p>
          </div>
        ) : (
          [...stockTransfers].reverse().map(tr => (
            <div key={tr.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 group transition-all">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg shrink-0">🔄</div>
                     <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase leading-tight">{tr.itemName}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tr.timestamp).toLocaleString()}</p>
                     </div>
                  </div>
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black">-{tr.quantity} {tr.unit}</span>
               </div>
               
               <div className="flex items-center gap-3 px-3 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex-1 text-center">
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-1">DARI</p>
                     <p className="text-[9px] font-black text-slate-700 uppercase truncate px-1">{tr.fromOutletName}</p>
                  </div>
                  <div className="text-indigo-300 text-sm animate-pulse">$\rightarrow$</div>
                  <div className="flex-1 text-center">
                     <p className="text-[7px] font-black text-slate-400 uppercase mb-1">KE TUJUAN</p>
                     <p className="text-[9px] font-black text-orange-600 uppercase truncate px-1">{tr.toOutletName}</p>
                  </div>
               </div>
               
               <div className="flex justify-between items-center text-[7px] font-black text-slate-300 uppercase px-1 tracking-widest">
                  <span>PIC: {tr.staffName}</span>
                  <span>ID: {tr.id.slice(-6)}</span>
               </div>
            </div>
          ))
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
                   <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500" value={formData.toOutletId} onChange={e => setFormData({...formData, toOutletId: e.target.value})}>
                      <option value="">-- Pilih Cabang Penerima --</option>
                      {destinationOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Bahan yang Dikirim</label>
                   <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})}>
                      <option value="">-- Pilih Bahan --</option>
                      {currentOutletInventory.map(i => <option key={i.id} value={i.name}>{i.name} (Sisa: {i.quantity} {i.unit})</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah Kirim</label>
                   <input type="number" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-slate-800 focus:border-orange-500 outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                </div>

                <div className="p-6 bg-slate-900 rounded-[32px] text-white flex items-center gap-4 border border-white/5">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">⚠️</div>
                   <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">Data mutasi akan langsung mengurangi stok gudang cabang ini dan menambah stok di cabang tujuan.</p>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!formData.toOutletId || !formData.itemName || formData.quantity <= 0}
                  onClick={handleTransfer} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:bg-slate-200"
                >KONFIRMASI PENGIRIMAN 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
