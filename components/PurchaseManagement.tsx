
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { RequestStatus, UserRole } from '../types';

export const PurchaseManagement: React.FC = () => {
  const { purchases, inventory, addPurchase, selectedOutletId, outlets, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Custom Search Modal State
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemPickerQuery, setItemPickerQuery] = useState('');

  const [useConversion, setUseConversion] = useState(false);
  const [multiplier, setMultiplier] = useState(1000);
  const [rawPurchaseQty, setRawPurchaseQty] = useState(0);

  const [formData, setFormData] = useState({ 
    inventoryItemId: '', 
    quantity: 0, 
    unitPrice: 0,
    requestId: undefined as string | undefined
  });

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  
  const filteredInventoryItems = useMemo(() => {
    let base = inventory.filter(i => i.outletId === selectedOutletId);
    // FILTER SPESIFIK: Jika kasir, hanya barang yang canCashierPurchase === true
    if (isCashier) {
       base = base.filter(i => i.canCashierPurchase === true);
    }
    return base.filter(i => i.name.toLowerCase().includes(itemPickerQuery.toLowerCase()));
  }, [inventory, selectedOutletId, isCashier, itemPickerQuery]);

  const selectedItem = inventory.find(i => i.id === formData.inventoryItemId);
  const finalQuantity = useConversion ? (rawPurchaseQty * multiplier) : formData.quantity;

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => p.outletId === selectedOutletId)
      .filter(p => p.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, selectedOutletId, searchTerm]);

  const handleSave = () => {
    if (formData.inventoryItemId && finalQuantity > 0 && formData.unitPrice > 0) {
      addPurchase({ inventoryItemId: formData.inventoryItemId, quantity: finalQuantity, unitPrice: formData.unitPrice }, formData.requestId);
      setShowModal(false);
      resetForm();
      
      // Tampilkan toast sukses
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ inventoryItemId: '', quantity: 0, unitPrice: 0, requestId: undefined });
    setRawPurchaseQty(0);
    setUseConversion(false);
    setItemPickerQuery('');
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-24 md:pb-8 relative">
      
      {/* SUCCESS TOAST OVERLAY */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-orange-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-orange-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🚚</div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Belanja Berhasil</p>
                <p className="text-[9px] font-bold text-orange-200 uppercase mt-1">Stok Gudang Otomatis Bertambah!</p>
              </div>
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Supply & Stocking</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Pencatatan Belanja {activeOutlet?.name}</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="w-full md:w-auto px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <span>🚚</span> INPUT BELANJA BARU
        </button>
      </div>

      <div className="relative mb-6">
        <input 
           type="text" 
           placeholder="Cari riwayat belanja..." 
           className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl font-bold text-xs shadow-sm outline-none focus:border-orange-500 text-slate-900"
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
      </div>

      <div className="space-y-3">
         {filteredPurchases.map(p => (
           <div key={p.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition-all">
              <div className="flex gap-4 items-center">
                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">📦</div>
                 <div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[150px]">{p.itemName}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(p.timestamp).toLocaleDateString()} • {p.staffName.split(' ')[0]}</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-sm font-black text-slate-900">Rp {p.totalPrice.toLocaleString()}</p>
                 <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{p.quantity} Unit</p>
              </div>
           </div>
         ))}
         {filteredPurchases.length === 0 && <p className="py-20 text-center opacity-20 italic font-black uppercase text-xs">Belum ada data belanja</p>}
      </div>

      {/* MODAL BELANJA (RE-DESIGNED FOR MOBILE & USABILITY) */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 overflow-hidden">
             
             <div className="p-6 md:p-10 border-b flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Catat Nota Belanja</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar">
                
                {/* 1. Pilih Barang */}
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">1. Barang yang dibeli</label>
                   {!selectedItem ? (
                     <button 
                        onClick={() => setShowItemPicker(true)}
                        className="w-full p-6 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-black text-sm uppercase hover:border-orange-500 hover:text-orange-500 transition-all"
                     >
                        + Cari & Pilih Barang {isCashier && <span className="block text-[8px] mt-1 text-slate-300">(Hanya barang yang diizinkan Manager)</span>}
                     </button>
                   ) : (
                     <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-[32px] flex justify-between items-center shadow-sm">
                        <div>
                           <p className="text-[11px] font-black text-orange-600 uppercase">{selectedItem.name}</p>
                           <p className="text-[8px] font-bold text-orange-400 uppercase">SATUAN: {selectedItem.unit}</p>
                        </div>
                        <button onClick={() => setFormData({...formData, inventoryItemId: ''})} className="text-orange-500 font-black text-xs bg-white px-3 py-1 rounded-full shadow-sm">Ganti</button>
                     </div>
                   )}
                </div>

                {/* 2. Kuantitas */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Kuantitas / Berat Belanja</label>
                      <button onClick={() => setUseConversion(!useConversion)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${useConversion ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                         {useConversion ? 'Mode Konversi ON' : 'Konversi Unit?'}
                      </button>
                   </div>
                   
                   {useConversion ? (
                      <div className="grid grid-cols-3 gap-3 bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100">
                         <div className="col-span-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Qty Nota</label>
                            <input type="number" onFocus={e => e.target.select()} className="w-full p-3 bg-white rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900" value={rawPurchaseQty} onChange={e => setRawPurchaseQty(parseFloat(e.target.value) || 0)} />
                         </div>
                         <div className="flex items-center justify-center pt-4 text-xs font-black opacity-30">X</div>
                         <div className="col-span-1">
                            <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Gr/Pcs Per Pack</label>
                            <input type="number" onFocus={e => e.target.select()} className="w-full p-3 bg-white rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900" value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value) || 1)} />
                         </div>
                         <p className="col-span-3 text-center text-[10px] font-black text-indigo-600 uppercase mt-2">Masuk ke Gudang: {finalQuantity.toLocaleString()} {selectedItem?.unit}</p>
                      </div>
                   ) : (
                      <div className="relative">
                         <input 
                           type="number" 
                           onFocus={e => e.target.select()} 
                           className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-3xl text-center outline-none focus:border-orange-500 transition-all text-slate-900" 
                           value={formData.quantity} 
                           onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} 
                         />
                         <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase">{selectedItem?.unit || '--'}</span>
                      </div>
                   )}
                </div>

                {/* 3. Total Harga */}
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Total Nominal Nota (Rp)</label>
                   <div className="relative">
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-orange-500 text-xl">Rp</span>
                      <input 
                        type="number" 
                        onFocus={e => e.target.select()}
                        className="w-full p-8 pl-20 bg-orange-500 text-white border-4 border-orange-200 rounded-[40px] font-black text-4xl shadow-2xl focus:outline-none transition-all placeholder:text-orange-300"
                        value={formData.unitPrice || ''}
                        onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})}
                        placeholder="0"
                      />
                   </div>
                   <p className="text-center text-[9px] font-black text-slate-300 uppercase italic">*Pastikan nominal sesuai dengan yang tertera di nota fisik.</p>
                </div>
             </div>

             <div className="p-8 border-t border-slate-50 bg-slate-50/50 shrink-0">
                <button 
                  disabled={!formData.inventoryItemId || finalQuantity <= 0 || formData.unitPrice <= 0}
                  onClick={handleSave} 
                  className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.4em] shadow-2xl disabled:opacity-30 active:scale-95 transition-all"
                >SUBMIT BELANJA 🚀</button>
                <div className="h-safe-bottom md:hidden"></div>
             </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN ITEM PICKER FOR BELANJA */}
      {showItemPicker && (
         <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6 text-white">
               <div>
                  <h3 className="font-black uppercase tracking-tighter text-lg">Pilih Material Belanja</h3>
                  {isCashier && <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">Restricted List: Izin Manager Diperlukan</p>}
               </div>
               <button onClick={() => setShowItemPicker(false)} className="text-2xl">✕</button>
            </div>
            <input 
               autoFocus
               type="text" 
               placeholder="Cetik nama bahan..." 
               className="w-full p-5 bg-white rounded-2xl font-black text-xl mb-6 outline-none border-4 border-orange-500 shadow-2xl text-slate-900"
               value={itemPickerQuery}
               onChange={e => setItemPickerQuery(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
               {filteredInventoryItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => {
                       setFormData({...formData, inventoryItemId: item.id});
                       setShowItemPicker(false);
                       setItemPickerQuery('');
                    }}
                    className="w-full p-6 bg-white/10 border border-white/10 rounded-[32px] text-left hover:bg-orange-500 transition-all group"
                  >
                     <div className="flex justify-between items-center">
                        <div>
                           <p className="text-white font-black uppercase text-sm group-hover:text-white">{item.name}</p>
                           <p className="text-white/40 text-[9px] font-bold uppercase mt-1 group-hover:text-white/60">Stok Saat Ini: {item.quantity} {item.unit}</p>
                        </div>
                        <span className="text-orange-500 opacity-40 group-hover:opacity-100">🚚+</span>
                     </div>
                  </button>
               ))}
               {filteredInventoryItems.length === 0 && (
                  <div className="text-center py-20 px-10">
                     <p className="text-white/30 uppercase font-black italic mb-2">Item tidak ditemukan atau akses terbatas</p>
                     {isCashier && <p className="text-[8px] text-slate-500 font-bold uppercase">Hanya Manager yang dapat memberikan izin belanja barang ke Kasir.</p>}
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};
