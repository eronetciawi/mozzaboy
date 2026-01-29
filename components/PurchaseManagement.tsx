
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { RequestStatus } from '../types';

export const PurchaseManagement: React.FC = () => {
  const { purchases, inventory, addPurchase, selectedOutletId, outlets, stockRequests } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [useConversion, setUseConversion] = useState(false);
  const [multiplier, setMultiplier] = useState(1000);
  const [rawPurchaseQty, setRawPurchaseQty] = useState(0);

  const [formData, setFormData] = useState({ 
    inventoryItemId: '', 
    quantity: 0, 
    unitPrice: 0,
    requestId: undefined as string | undefined
  });

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const currentOutletInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const selectedItem = currentOutletInventory.find(i => i.id === formData.inventoryItemId);

  const finalQuantity = useConversion ? (rawPurchaseQty * multiplier) : formData.quantity;

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => p.outletId === selectedOutletId)
      .filter(p => p.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, selectedOutletId, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTotal = filteredPurchases.filter(p => new Date(p.timestamp).toDateString() === today).reduce((acc, p) => acc + p.totalPrice, 0);
    const monthTotal = filteredPurchases.filter(p => new Date(p.timestamp).getMonth() === new Date().getMonth()).reduce((acc, p) => acc + p.totalPrice, 0);
    return { todayTotal, monthTotal };
  }, [filteredPurchases]);

  const handleSave = () => {
    if (formData.inventoryItemId && finalQuantity > 0 && formData.unitPrice > 0) {
      addPurchase({ inventoryItemId: formData.inventoryItemId, quantity: finalQuantity, unitPrice: formData.unitPrice }, formData.requestId);
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({ inventoryItemId: '', quantity: 0, unitPrice: 0, requestId: undefined });
    setRawPurchaseQty(0);
    setUseConversion(false);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Procurement Cabang</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Belanja stok: <span className="text-orange-600 font-bold">{activeOutlet?.name}</span></p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="w-full md:w-auto px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
        >
          + Catat Belanja Baru
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hari Ini</p>
          <h4 className="text-sm md:text-xl font-black text-slate-800">Rp {stats.todayTotal.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bulan Ini</p>
          <h4 className="text-sm md:text-xl font-black text-slate-800">Rp {stats.monthTotal.toLocaleString()}</h4>
        </div>
        <div className="hidden md:block bg-orange-500 p-4 rounded-3xl text-white shadow-lg">
          <p className="text-[8px] font-black text-orange-200 uppercase tracking-widest mb-1">Total Nota</p>
          <h4 className="text-xl font-black">{filteredPurchases.length}</h4>
        </div>
      </div>

      <div className="space-y-3">
         {filteredPurchases.map(p => (
           <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                 <h4 className="text-[11px] font-black text-slate-800 uppercase">{p.itemName}</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.timestamp).toLocaleDateString()} • {p.staffName}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm font-black text-slate-900">Rp {p.totalPrice.toLocaleString()}</p>
                 <p className="text-[9px] font-black text-orange-500 uppercase">{p.quantity} Unit</p>
              </div>
           </div>
         ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Input Belanja Stok</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Pilih Barang</label>
                   <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500" value={formData.inventoryItemId} onChange={e => setFormData({...formData, inventoryItemId: e.target.value})}>
                      <option value="">-- Pilih Material --</option>
                      {currentOutletInventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                   </select>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Gunakan Konversi Satuan?</p>
                      <button onClick={() => setUseConversion(!useConversion)} className={`w-12 h-6 rounded-full relative transition-all ${useConversion ? 'bg-orange-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useConversion ? 'right-1' : 'left-1'}`}></div>
                      </button>
                   </div>
                   {useConversion ? (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Jumlah (Misal: 5 KG)</label>
                           <input type="number" onFocus={e => e.target.select()} className="w-full p-3 bg-white rounded-xl font-black text-center" value={rawPurchaseQty} onChange={e => setRawPurchaseQty(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                           <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Ke (Misal: x1000 Gram)</label>
                           <input type="number" onFocus={e => e.target.select()} className="w-full p-3 bg-white rounded-xl font-black text-center text-orange-600" value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value) || 1)} />
                        </div>
                        <p className="col-span-2 text-center text-[9px] font-black text-slate-400 mt-2">TOTAL STOK MASUK: {finalQuantity} {selectedItem?.unit}</p>
                     </div>
                   ) : (
                     <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah Beli ({selectedItem?.unit || 'Unit'})</label>
                       <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-white border-2 rounded-2xl font-black text-xl" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} />
                     </div>
                   )}
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Total Harga Nota (Rp)</label>
                   <input type="number" onFocus={e => e.target.select()} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-slate-800 focus:border-orange-500 outline-none" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})} placeholder="0" />
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 shrink-0">
                <button 
                  disabled={!formData.inventoryItemId || finalQuantity <= 0 || formData.unitPrice <= 0}
                  onClick={handleSave} 
                  className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-30"
                >SIMPAN BELANJA 🚛</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
