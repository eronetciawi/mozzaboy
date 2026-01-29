
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { RequestStatus } from '../types';

export const PurchaseManagement: React.FC = () => {
  const { purchases, inventory, addPurchase, selectedOutletId, outlets, stockRequests, deleteStockRequest } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [useConversion, setUseConversion] = useState(false);
  const [purchaseUnitLabel, setPurchaseUnitLabel] = useState('KG');
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

  const pendingRequests = stockRequests.filter(r => r.outletId === selectedOutletId && r.status === RequestStatus.PENDING);
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

      {/* STATS TILES */}
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

      {/* PENDING REQUESTS HORIZONTAL */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">Request Belanja Pending</h3>
           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="min-w-[240px] bg-white p-5 rounded-3xl border-2 border-orange-100 shadow-sm flex flex-col justify-between">
                   <div>
                      <h4 className="font-black text-slate-800 uppercase text-[11px] mb-1">{req.itemName}</h4>
                      <p className="text-[8px] font-bold text-orange-500 uppercase">Butuh {req.requestedQuantity} {req.unit}</p>
                   </div>
                   <button 
                    onClick={() => {
                      const item = currentOutletInventory.find(i => i.id === req.inventoryItemId);
                      setFormData({ inventoryItemId: req.inventoryItemId, quantity: req.requestedQuantity, unitPrice: (item?.costPerUnit || 0) * req.requestedQuantity, requestId: req.id });
                      setShowModal(true);
                    }}
                    className="mt-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase"
                   >Beli Sekarang</button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* PURCHASE HISTORY CARDS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Riwayat Pengadaan Stok</h3>
           <div className="relative">
              <input type="text" placeholder="Cari..." className="pl-7 pr-3 py-1.5 bg-white border rounded-full text-[9px] font-bold outline-none focus:border-orange-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px]">🔍</span>
           </div>
        </div>
        {filteredPurchases.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg shrink-0">🚛</div>
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase leading-tight">{p.itemName}</h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">+{p.quantity.toLocaleString()} Unit • {new Date(p.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900">Rp {p.totalPrice.toLocaleString()}</p>
              <p className="text-[7px] font-black text-slate-300 uppercase">{p.staffName.split(' ')[0]}</p>
            </div>
          </div>
        ))}
        {filteredPurchases.length === 0 && <p className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase italic">Belum ada data belanja</p>}
      </div>

      {/* FULL SCREEN PURCHASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
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

                <div className="flex gap-2">
                   <button onClick={() => setUseConversion(!useConversion)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${useConversion ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                      {useConversion ? '✓ Konversi Aktif' : 'Gunakan Konversi?'}
                   </button>
                </div>

                {useConversion ? (
                  <div className="p-6 bg-orange-50 rounded-3xl border-2 border-orange-100 grid grid-cols-2 gap-4">
                     <div className="col-span-2"><p className="text-[9px] font-black text-orange-600 uppercase mb-4 tracking-widest text-center">Kalkulator Satuan (Contoh: KG $\rightarrow$ Gram)</p></div>
                     <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Jumlah Beli</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-black text-center" value={rawPurchaseQty} onChange={e => setRawPurchaseQty(parseFloat(e.target.value) || 0)} />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Faktor (x1000)</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-black text-center text-orange-600" value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value) || 1)} />
                     </div>
                     <div className="col-span-2 pt-2 border-t border-orange-200 flex justify-center items-center gap-3">
                        <span className="text-[10px] font-black text-slate-800">Total Masuk:</span>
                        <span className="text-xl font-black text-orange-600">{finalQuantity} <span className="text-xs uppercase">{selectedItem?.unit || 'Unit'}</span></span>
                     </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah Beli ({selectedItem?.unit || 'Unit'})</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xl" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} />
                  </div>
                )}

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Total Harga Nota (Rp)</label>
                   <input type="number" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-slate-800 focus:border-orange-500 outline-none" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})} />
                </div>

                <div className="p-6 bg-slate-900 rounded-[32px] text-white flex justify-between items-center">
                   <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimasi HPP Baru</p>
                      <p className="text-lg font-black text-orange-400">Rp {finalQuantity > 0 ? Math.round(formData.unitPrice / finalQuantity).toLocaleString() : 0}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stok Masuk</p>
                      <p className="text-lg font-black text-white">{finalQuantity} {selectedItem?.unit}</p>
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!selectedItem || finalQuantity <= 0 || formData.unitPrice <= 0}
                  onClick={handleSave} 
                  className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >MASUKKAN KE GUDANG 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
