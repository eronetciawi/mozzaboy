
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

export const StockTransferManagement: React.FC = () => {
  const { inventory, outlets, selectedOutletId, stockTransfers, transferStock, respondToTransfer, currentUser, dailyClosings = [] } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming');
  
  // Picker States
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const [formData, setFormData] = useState({ toOutletId: '', itemName: '', quantity: 0 });

  const isShiftClosed = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CASHIER) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (dailyClosings || []).some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser]);

  const currentOutletInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const destinationOutlets = outlets.filter(o => o.id !== selectedOutletId);
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  // Grouping Transaksi
  const incomingPending = useMemo(() => 
    stockTransfers.filter(t => t.toOutletId === selectedOutletId && t.status === 'PENDING'),
    [stockTransfers, selectedOutletId]
  );

  const outgoingPending = useMemo(() => 
    stockTransfers.filter(t => t.fromOutletId === selectedOutletId && t.status === 'PENDING'),
    [stockTransfers, selectedOutletId]
  );

  const transferHistory = useMemo(() => 
    stockTransfers.filter(t => (t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId) && t.status !== 'PENDING')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [stockTransfers, selectedOutletId]
  );

  const filteredItemsForPicker = useMemo(() => {
    return currentOutletInventory.filter(i => 
      i.name.toLowerCase().includes(pickerQuery.toLowerCase())
    );
  }, [currentOutletInventory, pickerQuery]);

  const handleOpenAdd = () => {
    if (isShiftClosed) return alert("Akses Terkunci. Anda sudah melakukan tutup buku hari ini.");
    setShowModal(true);
  };

  const handleTransfer = () => {
    if (isShiftClosed) return;
    if (!formData.toOutletId || !formData.itemName || formData.quantity <= 0) return alert("Lengkapi data mutasi!");
    transferStock(selectedOutletId, formData.toOutletId, formData.itemName, formData.quantity);
    setShowModal(false);
    setFormData({ toOutletId: '', itemName: '', quantity: 0 });
    setActiveSubTab('outgoing');
  };

  const selectedItemData = currentOutletInventory.find(i => i.name === formData.itemName);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Logistik Antar Cabang</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic tracking-widest">Kontrol pergerakan stok: <span className="text-indigo-600 font-bold">{activeOutlet?.name}</span></p>
        </div>
        <button 
          disabled={isShiftClosed}
          onClick={handleOpenAdd}
          className={`w-full md:w-auto px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all flex items-center justify-center gap-2 ${isShiftClosed ? 'bg-slate-200 text-slate-400 grayscale cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'}`}
        >
          <span>{isShiftClosed ? '🔒' : '📦'}</span> {isShiftClosed ? 'SHIFT CLOSED' : '+ KIRIM BARANG'}
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full mb-8">
         <button onClick={() => setActiveSubTab('incoming')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'incoming' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>
            Incoming
            {incomingPending.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[8px] animate-bounce border-2 border-white">{incomingPending.length}</span>}
         </button>
         <button onClick={() => setActiveSubTab('outgoing')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'outgoing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            Outgoing
         </button>
         <button onClick={() => setActiveSubTab('history')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            Audit Log
         </button>
      </div>

      <div className="space-y-4">
         {activeSubTab === 'incoming' && (
           <>
             {incomingPending.length === 0 ? (
               <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Tidak ada pengiriman masuk</p>
               </div>
             ) : (
               incomingPending.map(tr => (
                 <div key={tr.id} className="bg-white p-6 rounded-[32px] border-2 border-indigo-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-in zoom-in-95">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                       <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl shrink-0">🚚</div>
                       <div>
                          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Dari: {tr.fromOutletName}</p>
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{tr.itemName}</h4>
                          <p className="text-xl font-black text-slate-900 mt-1">{tr.quantity} <span className="text-[10px] text-slate-400 uppercase">{tr.unit}</span></p>
                       </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                       <button onClick={() => respondToTransfer(tr.id, 'ACCEPTED')} className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all">TERIMA ✓</button>
                       <button onClick={() => respondToTransfer(tr.id, 'REJECTED')} className="flex-1 md:flex-none px-10 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all">TOLAK ✕</button>
                    </div>
                 </div>
               ))
             )}
           </>
         )}

         {activeSubTab === 'outgoing' && (
           <>
             {outgoingPending.length === 0 ? (
               <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Semua barang keluar telah diterima</p>
               </div>
             ) : (
               outgoingPending.map(tr => (
                 <div key={tr.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                       <span className="text-[7px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">MENUNGGU KONFIRMASI...</span>
                    </div>
                    <div className="flex items-center gap-5 w-full md:w-auto mt-2 md:mt-0">
                       <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-3xl shrink-0">🛫</div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tujuan: {tr.toOutletName}</p>
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{tr.itemName}</h4>
                          <p className="text-xl font-black text-slate-900 mt-1">{tr.quantity} <span className="text-[10px] text-slate-400 uppercase">{tr.unit}</span></p>
                       </div>
                    </div>
                    <div className="text-right w-full md:w-auto">
                       <p className="text-[9px] font-bold text-slate-300 uppercase italic">Dikirim Oleh: {tr.staffName.split(' ')[0]}</p>
                       <p className="text-[8px] text-slate-200 mt-1 uppercase font-black">{new Date(tr.timestamp).toLocaleString()}</p>
                    </div>
                 </div>
               ))
             )}
           </>
         )}

         {activeSubTab === 'history' && (
           <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <tr>
                      <th className="py-5 px-8">Item & Waktu</th>
                      <th className="py-5 px-4">Alur Mutasi</th>
                      <th className="py-5 px-4 text-center">Jumlah</th>
                      <th className="py-5 px-8 text-right">Status Akhir</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                   {transferHistory.map(tr => {
                      const isMeSender = tr.fromOutletId === selectedOutletId;
                      return (
                         <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-8">
                               <p className="font-black text-slate-800 uppercase leading-none">{tr.itemName}</p>
                               <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{new Date(tr.timestamp).toLocaleString('id-ID')}</p>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-500 uppercase italic">
                               {tr.fromOutletName} ➔ {tr.toOutletName}
                            </td>
                            <td className="py-4 px-4 text-center">
                               <span className={`font-black ${isMeSender ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isMeSender ? '-' : '+'}{tr.quantity} {tr.unit}
                               </span>
                            </td>
                            <td className="py-4 px-8 text-right">
                               <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${tr.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {tr.status === 'ACCEPTED' ? 'Diterima ✓' : 'Ditolak ✕'}
                               </span>
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
             {transferHistory.length === 0 && (
               <div className="py-20 text-center opacity-20 italic text-[10px] uppercase font-black">Riwayat mutasi kosong</div>
             )}
           </div>
         )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-lg h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kirim Barang Antar Cabang</h3>
                   <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Stok Pengirim Akan Terpotong Seketika</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Kirim Ke Cabang Mana?</label>
                   <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-indigo-500 text-slate-900" value={formData.toOutletId} onChange={e => setFormData({...formData, toOutletId: e.target.value})}>
                      <option value="">-- Pilih Cabang Tujuan --</option>
                      {destinationOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Pilih Barang yang Dikirim</label>
                   <button 
                      onClick={() => setShowItemPicker(true)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-left flex justify-between items-center group transition-all hover:border-indigo-500"
                   >
                      <span className={formData.itemName ? 'text-slate-900' : 'text-slate-300'}>
                         {formData.itemName ? formData.itemName : 'Cari di Gudang Anda...'}
                      </span>
                      <span className="text-indigo-500">🔍</span>
                   </button>
                   {selectedItemData && (
                     <p className="text-[9px] font-black text-emerald-600 uppercase mt-2 ml-1">Stok Gudang Sekarang: {selectedItemData.quantity} {selectedItemData.unit}</p>
                   )}
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah yang Dikirim</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        onFocus={(e) => e.target.select()}
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-800 focus:border-indigo-500 outline-none text-center shadow-inner" 
                        value={formData.quantity || ''} 
                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} 
                        placeholder="0" 
                      />
                      {selectedItemData && (
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase text-[10px]">{selectedItemData.unit}</span>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button 
                  disabled={!formData.toOutletId || !formData.itemName || formData.quantity <= 0 || (selectedItemData && formData.quantity > selectedItemData.quantity)}
                  onClick={handleTransfer} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-30"
                >
                   {selectedItemData && formData.quantity > selectedItemData.quantity ? 'STOK TIDAK CUKUP' : 'PROSES PENGIRIMAN 🚀'}
                </button>
             </div>
          </div>
        </div>
      )}

      {showItemPicker && (
         <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-2xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6 text-white px-2">
               <div>
                  <h3 className="font-black uppercase tracking-tighter text-lg">Pilih Barang Gudang</h3>
                  <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Asal: {activeOutlet?.name}</p>
               </div>
               <button onClick={() => { setShowItemPicker(false); setPickerQuery(''); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">✕</button>
            </div>
            
            <div className="relative mb-6">
               <input 
                  autoFocus
                  type="text" 
                  placeholder="Ketik nama bahan..." 
                  className="w-full p-5 bg-white rounded-2xl font-black text-xl outline-none border-4 border-indigo-500 shadow-2xl text-slate-900"
                  value={pickerQuery}
                  onChange={e => setPickerQuery(e.target.value)}
               />
               <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl opacity-20">🔍</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 pb-10">
               {filteredItemsForPicker.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => {
                       setFormData({...formData, itemName: item.name});
                       setShowItemPicker(false);
                       setPickerQuery('');
                    }}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-[28px] text-left hover:bg-indigo-600 transition-all group flex justify-between items-center active:scale-95"
                  >
                     <div>
                        <p className="text-white font-black uppercase text-sm">{item.name}</p>
                        <p className="text-white/30 text-[8px] font-bold uppercase mt-1">Ready di Gudang: {item.quantity} {item.unit}</p>
                     </div>
                     <span className="text-indigo-500 opacity-30 group-hover:text-white group-hover:opacity-100 font-black text-[10px]">PILIH ➔</span>
                  </button>
               ))}
               {filteredItemsForPicker.length === 0 && (
                  <div className="text-center py-20 opacity-20 flex flex-col items-center">
                     <span className="text-4xl mb-4">🚫</span>
                     <p className="text-white font-black uppercase text-xs">Item Tidak Ditemukan</p>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};
