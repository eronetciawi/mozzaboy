
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { RequestStatus, UserRole, InventoryItemType } from '../types';

export const PurchaseManagement: React.FC = () => {
  const { purchases, inventory, addPurchase, selectedOutletId, outlets, currentUser, dailyClosings = [], isSaving } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemPickerQuery, setItemPickerQuery] = useState('');

  const [useConversion, setUseConversion] = useState(false);
  const [multiplier, setMultiplier] = useState(10); // Default per box/pack
  const [rawPurchaseQty, setRawPurchaseQty] = useState(0);

  const [formData, setFormData] = useState({ 
    inventoryItemId: '', 
    quantity: 0, 
    unitPrice: 0,
    requestId: undefined as string | undefined
  });

  const isShiftClosed = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CASHIER) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (dailyClosings || []).some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser]);

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  
  const filteredInventoryItems = useMemo(() => {
    return (inventory || [])
      .filter(i => i.outletId === selectedOutletId)
      .filter(i => i.type === InventoryItemType.RAW)
      .filter(i => !isCashier || i.canCashierPurchase === true)
      .filter(i => i.name.toLowerCase().includes(itemPickerQuery.toLowerCase()));
  }, [inventory, selectedOutletId, isCashier, itemPickerQuery]);

  const selectedItem = (inventory || []).find(i => i.id === formData.inventoryItemId);
  const finalQuantity = useConversion ? (rawPurchaseQty * multiplier) : formData.quantity;

  const filteredPurchases = useMemo(() => {
    return (purchases || [])
      .filter(p => p.outletId === selectedOutletId)
      .filter(p => p.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, selectedOutletId, searchTerm]);

  const handleOpenAdd = () => {
    if (isShiftClosed) return alert("Akses Terkunci. Anda sudah melakukan tutup buku hari ini.");
    resetForm();
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isShiftClosed) return;
    
    if (!formData.inventoryItemId || finalQuantity <= 0 || formData.unitPrice <= 0) {
       alert("Lengkapi Item, Kuantitas, dan Total Bayar!");
       return;
    }

    // SPEED OPTIMIZATION: Modal langsung ditutup & Toast langsung muncul (Optimistic UI)
    setShowModal(false);
    setShowSuccessToast(true);
    
    // Proses pengiriman data (tanpa blocking UI)
    addPurchase({ 
      inventoryItemId: formData.inventoryItemId, 
      quantity: finalQuantity, 
      unitPrice: formData.unitPrice, 
      requestId: formData.requestId 
    });

    // Reset UI state
    resetForm();
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const resetForm = () => {
    setFormData({ inventoryItemId: '', quantity: 0, unitPrice: 0, requestId: undefined });
    setRawPurchaseQty(0);
    setUseConversion(false);
    setItemPickerQuery('');
    setMultiplier(10);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-24 md:pb-8 relative">
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-8 py-4 rounded-[40px] shadow-2xl flex items-center gap-4 border-2 border-orange-500/30">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-xl shadow-lg animate-bounce">🚚</div>
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] leading-none text-orange-400">Belanja Dicatat!</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1.5 tracking-widest">Stok Gudang Berhasil Ditambah.</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Supply & Stocking</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Pencatatan Belanja {activeOutlet?.name}</p>
        </div>
        <button 
          disabled={isShiftClosed}
          onClick={handleOpenAdd}
          className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isShiftClosed ? 'bg-slate-200 text-slate-400 grayscale cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
        >
          <span>{isShiftClosed ? '🔒' : '🚚'}</span> {isShiftClosed ? 'SHIFT CLOSED' : 'INPUT BELANJA BARU'}
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
                 <p className="text-sm font-black text-slate-900">Rp {(p.totalPrice ?? 0).toLocaleString()}</p>
                 <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{(p.quantity ?? 0).toLocaleString()} {(inventory || []).find(i=>i.name===p.itemName)?.unit}</p>
              </div>
           </div>
         ))}
         {filteredPurchases.length === 0 && (
           <div className="py-20 text-center opacity-20 italic text-[10px] uppercase font-black">Riwayat belanja kosong</div>
         )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 overflow-hidden border-t md:border border-white/20">
             
             <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
             </div>

             <div className="px-6 md:px-10 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Nota Belanja</h3>
                   <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Input Supply Gudang</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                <div className="space-y-3">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Pilih Item dari Gudang</label>
                   {!selectedItem ? (
                     <button 
                        onClick={() => setShowItemPicker(true)}
                        className="w-full p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-xs uppercase hover:border-orange-500 hover:text-orange-500 transition-all flex flex-col items-center gap-1"
                     >
                        <span className="text-xl">🔍</span>
                        <span>Klik untuk Cari Produk</span>
                     </button>
                   ) : (
                     <div className="p-5 bg-orange-50 border-2 border-orange-100 rounded-3xl flex justify-between items-center shadow-inner">
                        <div>
                           <p className="text-[11px] font-black text-orange-600 uppercase leading-none">{selectedItem.name}</p>
                           <p className="text-[8px] font-bold text-orange-400 uppercase mt-1">Stok Saat Ini: {(selectedItem.quantity ?? 0).toLocaleString()} {selectedItem.unit}</p>
                        </div>
                        <button onClick={() => setFormData({...formData, inventoryItemId: ''})} className="w-8 h-8 bg-white text-orange-500 rounded-full flex items-center justify-center shadow-sm border border-orange-100 font-black text-[10px]">✕</button>
                     </div>
                   )}
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kuantitas Nota</label>
                      <button onClick={() => setUseConversion(!useConversion)} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${useConversion ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
                         {useConversion ? 'Mode Konversi Aktif' : 'Konversi Unit?'}
                      </button>
                   </div>
                   
                   {useConversion ? (
                      <div className="grid grid-cols-7 gap-2 bg-slate-50 p-5 rounded-[32px] border border-slate-100 shadow-inner">
                         <div className="col-span-3">
                            <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Qty Nota (Bungkus/Kotak)</label>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              onFocus={e => e.currentTarget.select()} 
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl font-black text-center text-xs outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900" 
                              value={rawPurchaseQty === 0 ? "" : rawPurchaseQty} 
                              onChange={e => setRawPurchaseQty(parseFloat(e.target.value) || 0)} 
                              placeholder="0"
                            />
                         </div>
                         <div className="col-span-1 flex items-center justify-center pt-5 text-xs opacity-20">✖</div>
                         <div className="col-span-3">
                            <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Isi per Kotak</label>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              onFocus={e => e.currentTarget.select()} 
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl font-black text-center text-xs outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900" 
                              value={multiplier === 0 ? "" : multiplier} 
                              onChange={e => setMultiplier(parseFloat(e.target.value) || 1)} 
                            />
                         </div>
                         <div className="col-span-7 pt-2 text-center">
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Input Gudang: {(finalQuantity ?? 0).toLocaleString()} {selectedItem?.unit}</p>
                         </div>
                      </div>
                   ) : (
                      <div className="relative">
                         <input 
                           type="number" 
                           inputMode="decimal"
                           onFocus={e => e.currentTarget.select()} 
                           className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-black text-xl text-center outline-none focus:border-orange-500 transition-all text-slate-900 shadow-inner" 
                           value={formData.quantity === 0 ? "" : formData.quantity} 
                           onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} 
                           placeholder="0"
                         />
                         <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase text-[10px]">{selectedItem?.unit || '--'}</span>
                      </div>
                   )}
                </div>

                <div className="space-y-3">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Total Nominal Nota (Uang)</label>
                   <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-orange-500 text-base">Rp</span>
                      <input 
                        type="number" 
                        inputMode="numeric"
                        onFocus={e => e.currentTarget.select()}
                        className="w-full p-6 pl-14 bg-orange-500 text-white border-4 border-orange-200 rounded-[32px] font-black text-3xl shadow-xl focus:outline-none transition-all placeholder:text-orange-300"
                        value={formData.unitPrice === 0 ? "" : formData.unitPrice}
                        onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})}
                        placeholder="0"
                      />
                   </div>
                   <p className="text-[7px] text-slate-400 uppercase italic ml-2">Masukkan total uang yang dibayar sesuai struk belanja.</p>
                </div>
             </div>

             <div className="px-6 md:px-10 py-6 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!formData.inventoryItemId || finalQuantity <= 0 || formData.unitPrice <= 0}
                  onClick={handleSave} 
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-xl disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  SUBMIT BELANJA 🚀
                </button>
             </div>
          </div>
        </div>
      )}

      {showItemPicker && (
         <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-2xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6 text-white px-2">
               <div>
                  <h3 className="font-black uppercase tracking-tighter text-lg">Cari Bahan Baku</h3>
                  <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">Khusus Bahan Mentah (RAW)</p>
               </div>
               <button onClick={() => setShowItemPicker(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">✕</button>
            </div>
            <input 
               autoFocus
               type="text" 
               placeholder="Ketik nama bahan..." 
               className="w-full p-5 bg-white rounded-2xl font-black text-xl mb-6 outline-none border-4 border-orange-500 shadow-2xl text-slate-900"
               value={itemPickerQuery}
               onChange={e => setItemPickerQuery(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 pb-10">
               {filteredInventoryItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => {
                       setFormData({...formData, inventoryItemId: item.id});
                       setShowItemPicker(false);
                       setItemPickerQuery('');
                    }}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-[28px] text-left hover:bg-orange-500 transition-all group flex justify-between items-center"
                  >
                     <div>
                        <p className="text-white font-black uppercase text-sm">{item.name}</p>
                        <p className="text-white/30 text-[8px] font-bold uppercase mt-1">Stok: {(item.quantity ?? 0).toLocaleString()} {item.unit}</p>
                     </div>
                     <span className="text-orange-500 opacity-30 group-hover:text-white group-hover:opacity-100">PILIH</span>
                  </button>
               ))}
            </div>
         </div>
      )}
    </div>
  );
};
