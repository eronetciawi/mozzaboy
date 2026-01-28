
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { RequestStatus } from '../types';

export const PurchaseManagement: React.FC = () => {
  const { purchases, inventory, addPurchase, selectedOutletId, outlets, stockRequests, deleteStockRequest } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk konversi unit
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

  // Ambil request yang pending untuk outlet ini
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
    const todayTotal = filteredPurchases
      .filter(p => new Date(p.timestamp).toDateString() === today)
      .reduce((acc, p) => acc + p.totalPrice, 0);
    
    const monthTotal = filteredPurchases
      .filter(p => new Date(p.timestamp).getMonth() === new Date().getMonth() && new Date(p.timestamp).getFullYear() === new Date().getFullYear())
      .reduce((acc, p) => acc + p.totalPrice, 0);

    return { todayTotal, monthTotal };
  }, [filteredPurchases]);

  const handleSave = () => {
    if (formData.inventoryItemId && finalQuantity > 0 && formData.unitPrice > 0) {
      addPurchase({
        inventoryItemId: formData.inventoryItemId,
        quantity: finalQuantity,
        unitPrice: formData.unitPrice // Di store.tsx ini dianggap total bayar
      }, formData.requestId);
      
      setShowModal(false);
      resetForm();
    } else {
      alert("Mohon lengkapi data pembelian dengan benar.");
    }
  };

  const resetForm = () => {
    setFormData({ inventoryItemId: '', quantity: 0, unitPrice: 0, requestId: undefined });
    setRawPurchaseQty(0);
    setUseConversion(false);
    setPurchaseUnitLabel('KG');
    setMultiplier(1000);
  };

  const fulfillRequest = (req: any) => {
    const item = currentOutletInventory.find(i => i.id === req.inventoryItemId);
    setFormData({
      inventoryItemId: req.inventoryItemId,
      quantity: req.requestedQuantity,
      unitPrice: (item?.costPerUnit || 0) * req.requestedQuantity,
      requestId: req.id
    });
    setShowModal(true);
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden bg-slate-50/50">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
            Procurement: <span className="text-orange-500">{activeOutlet?.name}</span>
          </h2>
          <p className="text-slate-500 font-medium italic text-sm">Input belanja & Konversi satuan otomatis (KG $\rightarrow$ Gram)</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-8 py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase shadow-2xl shadow-slate-900/20 hover:bg-orange-600 transition-all flex items-center gap-2 group"
        >
          <span className="text-lg group-hover:rotate-90 transition-transform">➕</span>
          Catat Pembelian Baru
        </button>
      </div>

      {pendingRequests.length > 0 && (
        <div className="mb-8 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pengajuan Stok Dari Staff ({pendingRequests.length})</h3>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {pendingRequests.map(req => (
              <div key={req.id} className={`min-w-[300px] bg-white rounded-3xl p-6 border-2 shadow-sm flex flex-col justify-between transition-all hover:shadow-lg ${req.isUrgent ? 'border-red-200' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">{req.itemName}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(req.timestamp).toLocaleString()}</p>
                  </div>
                  {req.isUrgent && <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[8px] font-black uppercase animate-pulse">Urgent</span>}
                </div>
                <div className="mb-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Diajukan Oleh:</p>
                  <p className="text-xs font-bold text-slate-700">{req.staffName}</p>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Jumlah:</p>
                      <p className="text-lg font-black text-orange-500">{req.requestedQuantity} {req.unit}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => fulfillRequest(req)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all"
                  >
                    Beli Sekarang
                  </button>
                  <button 
                    onClick={() => { if(confirm('Batalkan pengajuan ini?')) deleteStockRequest(req.id); }}
                    className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Belanja Hari Ini</p>
          <h4 className="text-2xl font-black text-slate-800">Rp {stats.todayTotal.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Belanja Bulan Ini</p>
          <h4 className="text-2xl font-black text-slate-800">Rp {stats.monthTotal.toLocaleString()}</h4>
        </div>
        <div className="bg-orange-500 p-6 rounded-[32px] text-white shadow-xl shadow-orange-500/20">
          <p className="text-[10px] font-black text-orange-200 uppercase mb-1 tracking-widest">Unit Stats</p>
          <h4 className="text-2xl font-black">{filteredPurchases.length} <span className="text-sm font-medium">Nota</span></h4>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm flex flex-col mb-10">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Riwayat Pengadaan Stok</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari item..." 
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase text-slate-400">
                <th className="py-4 px-8">Waktu & Tanggal</th>
                <th className="py-4 px-6">Bahan Baku</th>
                <th className="py-4 px-6">Qty Masuk Gudang</th>
                <th className="py-4 px-6">Harga Satuan</th>
                <th className="py-4 px-6 text-right">Total Bayar</th>
                <th className="py-4 px-8">Staff Penginput</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPurchases.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 italic">Belum ada data belanja</td></tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-8">
                      <p className="text-[10px] font-black text-slate-800">{new Date(p.timestamp).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(p.timestamp).toLocaleTimeString()}</p>
                    </td>
                    <td className="py-4 px-6 font-black text-slate-700 uppercase text-xs tracking-tight">
                      {p.itemName}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-black text-[10px]">
                        {p.quantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs italic">
                      Rp {p.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-slate-900">
                      Rp {p.totalPrice.toLocaleString()}
                    </td>
                    <td className="py-4 px-8">
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{p.staffName}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-3xl p-12 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Input Nota Belanja</h3>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest mt-1">Gunakan Fitur Konversi Jika Beli Satuan Besar (KG)</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 transition-all font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Pilih Bahan Baku Inventory</label>
                  <select 
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-orange-500 outline-none"
                    value={formData.inventoryItemId}
                    onChange={e => {
                      const item = currentOutletInventory.find(i => i.id === e.target.value);
                      setFormData({ ...formData, inventoryItemId: e.target.value, unitPrice: (item?.costPerUnit || 0) * (formData.quantity || 1) });
                    }}
                  >
                    <option value="">-- Pilih Barang --</option>
                    {currentOutletInventory.map(i => (
                      <option key={i.id} value={i.id}>{i.name} (Stok Satuan: {i.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 px-2">
                   <button 
                    onClick={() => setUseConversion(!useConversion)}
                    className={`flex-1 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${useConversion ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white text-slate-400 border-slate-100'}`}
                   >
                     {useConversion ? '✓ Konversi Satuan Aktif' : 'Gunakan Konversi Satuan?'}
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {useConversion ? (
                    <div className="md:col-span-2 p-8 bg-orange-50 rounded-[32px] border-2 border-orange-100 space-y-6">
                       <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Kalkulator Konversi Stok</p>
                       </div>
                       <div className="grid grid-cols-3 gap-4 items-end">
                          <div className="col-span-1">
                             <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Jumlah Beli</label>
                             <input 
                              type="number" 
                              className="w-full p-4 bg-white border border-orange-200 rounded-xl font-black text-center"
                              value={rawPurchaseQty}
                              onChange={e => setRawPurchaseQty(parseFloat(e.target.value) || 0)}
                             />
                          </div>
                          <div className="col-span-1">
                             <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Satuan (KG)</label>
                             <input 
                              type="text" 
                              className="w-full p-4 bg-white border border-orange-200 rounded-xl font-black text-center uppercase"
                              value={purchaseUnitLabel}
                              onChange={e => setPurchaseUnitLabel(e.target.value)}
                             />
                          </div>
                          <div className="col-span-1">
                             <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Faktor (x1000)</label>
                             <input 
                              type="number" 
                              className="w-full p-4 bg-white border border-orange-200 rounded-xl font-black text-center text-orange-600"
                              value={multiplier}
                              onChange={e => setMultiplier(parseFloat(e.target.value) || 1)}
                             />
                          </div>
                       </div>
                       <div className="bg-white/50 p-4 rounded-2xl border border-orange-200 flex justify-center items-center gap-4">
                          <span className="text-sm font-bold text-slate-400">{rawPurchaseQty} {purchaseUnitLabel}</span>
                          <span className="text-xl">➔</span>
                          <span className="text-lg font-black text-slate-800">{finalQuantity} {selectedItem?.unit || 'Stok'}</span>
                       </div>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Jumlah Beli ({selectedItem?.unit || 'Stok'})</label>
                      <input 
                        type="number" 
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-2xl focus:border-orange-500 outline-none"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Total Harga Belanja (Rp)</label>
                    <input 
                      type="number" 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-3xl text-slate-800 focus:border-orange-500 outline-none"
                      value={formData.unitPrice}
                      onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-900 rounded-[32px] text-white flex justify-between items-center shadow-2xl">
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Stok Masuk</p>
                      <p className="text-2xl font-black text-orange-500">{finalQuantity} {selectedItem?.unit || 'Unit'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">HPP Baru</p>
                      <p className="text-lg font-black text-white">Rp {finalQuantity > 0 ? (formData.unitPrice / finalQuantity).toLocaleString() : 0}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 shrink-0">
               <button 
                disabled={!selectedItem || finalQuantity <= 0 || formData.unitPrice <= 0}
                onClick={handleSave}
                className={`w-full py-5 font-black rounded-3xl text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${(!selectedItem || finalQuantity <= 0 || formData.unitPrice <= 0) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600'}`}
               >
                 SIMPAN PEMBELIAN & MASUKKAN STOK 🚀
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
