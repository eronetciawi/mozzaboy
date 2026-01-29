
import React, { useState } from 'react';
import { useApp } from '../store';
import { InventoryItem, UserRole, InventoryItemType } from '../types';

export const Inventory: React.FC = () => {
  const { 
    inventory, 
    selectedOutletId, 
    updateInventoryItem, 
    deleteInventoryItem, 
    addInventoryItem, 
    currentUser 
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<InventoryItemType>(InventoryItemType.RAW);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id' | 'outletId'>>({ 
    name: '', 
    unit: 'kg', 
    quantity: 0, 
    minStock: 1, 
    costPerUnit: 0,
    type: InventoryItemType.RAW
  });

  const isManagerOrOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  const filteredData = inventory.filter(i => 
    i.outletId === selectedOutletId && 
    i.type === activeTab &&
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = () => {
    if (newItem.name) {
      addInventoryItem({ ...newItem, type: activeTab });
      setShowAddModal(false);
      setNewItem({ name: '', unit: 'kg', quantity: 0, minStock: 1, costPerUnit: 0, type: activeTab });
    }
  };

  const handleUpdateItem = () => {
    if (editingItem) {
      updateInventoryItem(editingItem);
      setEditingItem(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-50/30 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Gudang & Inventaris</h2>
          <div className="flex gap-4 mt-3 overflow-x-auto no-scrollbar pb-1">
             <button 
              onClick={() => setActiveTab(InventoryItemType.RAW)}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${activeTab === InventoryItemType.RAW ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400'}`}
             >
               📦 Bahan Mentah
             </button>
             <button 
              onClick={() => setActiveTab(InventoryItemType.WIP)}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${activeTab === InventoryItemType.WIP ? 'border-purple-500 text-slate-800' : 'border-transparent text-slate-400'}`}
             >
               🧪 Setengah Jadi
             </button>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <input 
              type="text" 
              placeholder="Cari item..." 
              className="w-full md:w-48 pl-10 pr-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-xs shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
          </div>
          {isManagerOrOwner && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase shadow-xl hover:bg-orange-500 transition-all whitespace-nowrap"
            >
              + Tambah
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* DESKTOP TABLE (Hidden on Mobile) */}
        <div className="hidden md:block bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="py-6 px-8">Nama Barang</th>
                <th className="py-6 px-4 text-center">Satuan</th>
                <th className="py-6 px-4 text-right">Stok</th>
                <th className="py-6 px-4 text-right">Limit</th>
                {isManagerOrOwner && <th className="py-6 px-8 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 group">
                  <td className="py-5 px-8">
                    <span className="font-black text-slate-800 uppercase text-xs">{item.name}</span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-slate-400 font-black text-[10px] uppercase">{item.unit}</span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className={`font-black text-sm ${item.quantity <= item.minStock ? 'text-red-600' : 'text-slate-900'}`}>{item.quantity}</span>
                  </td>
                  <td className="py-5 px-4 text-right font-bold text-slate-400 text-xs">{item.minStock}</td>
                  {isManagerOrOwner && (
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setEditingItem(item)} className="p-2 text-blue-500">✏️</button>
                        <button onClick={() => setItemToDelete(item)} className="p-2 text-red-500">🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS (Hidden on Desktop) */}
        <div className="md:hidden space-y-3">
          {filteredData.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${item.quantity <= item.minStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {item.quantity <= item.minStock ? '⚠️' : '📦'}
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs leading-tight">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Limit: {item.minStock} {item.unit}</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                 <div className="text-lg font-black text-slate-900">
                    {item.quantity} <span className="text-[9px] text-slate-400">{item.unit}</span>
                 </div>
                 {isManagerOrOwner && (
                   <div className="flex gap-1">
                      <button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-[10px]">✏️</button>
                      <button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-[10px]">🗑️</button>
                   </div>
                 )}
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic">Kosong</div>
          )}
        </div>
      </div>

      {/* MODALS - Reused but made responsive */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase">Input {activeTab}</h3>
               <button onClick={() => setShowAddModal(false)} className="text-slate-400">✕</button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Barang</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Stok Awal</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Satuan</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="kg/pcs" />
                </div>
              </div>
              <button onClick={handleAddItem} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN ITEM 💾</button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase">Edit Item</h3>
            <div className="space-y-6">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Stok Saat Ini</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-orange-200 rounded-2xl font-black text-xl" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Ambang Batas (Limit)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={editingItem.minStock} onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value) || 0})} />
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setEditingItem(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Batal</button>
                  <button onClick={handleUpdateItem} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">UPDATE DATA</button>
               </div>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[210] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-xs p-10 text-center shadow-2xl">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">⚠️</div>
             <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Hapus Item?</h3>
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-8">"{itemToDelete.name}"</p>
             <div className="flex flex-col gap-2">
                <button onClick={() => { deleteInventoryItem(itemToDelete.id); setItemToDelete(null); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase">Hapus Permanen</button>
                <button onClick={() => setItemToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batal</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
