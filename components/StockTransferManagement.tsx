
import React, { useState } from 'react';
import { useApp } from '../store';

export const StockTransferManagement: React.FC = () => {
  const { inventory, outlets, selectedOutletId, stockTransfers, transferStock } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ toOutletId: '', itemName: '', quantity: 0 });

  const currentOutletInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const destinationOutlets = outlets.filter(o => o.id !== selectedOutletId);

  const handleTransfer = () => {
    if (!formData.toOutletId || !formData.itemName || formData.quantity <= 0) {
      return alert("Mohon lengkapi data mutasi dengan benar.");
    }
    
    transferStock(selectedOutletId, formData.toOutletId, formData.itemName, formData.quantity);
    setShowModal(false);
    setFormData({ toOutletId: '', itemName: '', quantity: 0 });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Mutasi Stok Cabang</h2>
          <p className="text-slate-500 font-medium italic text-sm">Kirim bahan baku antar cabang Mozza Boy</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all"
        >
          + Buat Mutasi Baru
        </button>
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm">
        <h3 className="p-6 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-50 bg-slate-50/50">Riwayat Pergerakan Stok Lintas Cabang</h3>
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <th className="py-4 px-8">Waktu Mutasi</th>
              <th className="py-4 px-6">Pengirim</th>
              <th className="py-4 px-6">Penerima</th>
              <th className="py-4 px-6">Item Bahan</th>
              <th className="py-4 px-6 text-right">Jumlah</th>
              <th className="py-4 px-8 text-right">Operator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stockTransfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic tracking-[0.2em]">Belum ada riwayat mutasi stok.</td>
              </tr>
            ) : (
              stockTransfers.map(tr => (
                <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-5 px-8">
                    <p className="text-[10px] font-black text-slate-800">{new Date(tr.timestamp).toLocaleDateString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(tr.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="py-5 px-6">
                    <span className="text-xs font-bold text-slate-400 uppercase">{tr.fromOutletName}</span>
                  </td>
                  <td className="py-5 px-6">
                    <span className="text-xs font-black text-orange-600 uppercase underline decoration-orange-200 decoration-2 underline-offset-4">{tr.toOutletName}</span>
                  </td>
                  <td className="py-5 px-6 font-black uppercase text-slate-800 text-xs tracking-tight">{tr.itemName}</td>
                  <td className="py-5 px-6 text-right font-black text-slate-900">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px]">{tr.quantity} {tr.unit}</span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{tr.staffName}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-12 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-slate-800 mb-10 uppercase tracking-tighter">Form Mutasi Stok</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Cabang Tujuan</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm focus:border-orange-500 outline-none"
                  value={formData.toOutletId}
                  onChange={e => setFormData({...formData, toOutletId: e.target.value})}
                >
                  <option value="">-- Pilih Cabang Penerima --</option>
                  {destinationOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Pilih Bahan (Stok Cabang Ini)</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm focus:border-orange-500 outline-none"
                  value={formData.itemName}
                  onChange={e => setFormData({...formData, itemName: e.target.value})}
                >
                  <option value="">-- Pilih Bahan --</option>
                  {currentOutletInventory.map(i => <option key={i.id} value={i.name}>{i.name} (Sisa: {i.quantity} {i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Jumlah Dikirim</label>
                <input 
                  type="number" 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xl focus:border-orange-500 outline-none"
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
              <button onClick={handleTransfer} className="flex-1 py-5 bg-slate-900 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange-500 transition-all">Konfirmasi Mutasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
