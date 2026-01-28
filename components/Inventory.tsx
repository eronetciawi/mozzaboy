
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
    <div className="h-full flex flex-col p-8 overflow-hidden bg-slate-50/30">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gudang & Inventaris</h2>
          <div className="flex gap-4 mt-4">
             <button 
              onClick={() => setActiveTab(InventoryItemType.RAW)}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === InventoryItemType.RAW ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400'}`}
             >
               📦 Bahan Mentah (Raw)
             </button>
             <button 
              onClick={() => setActiveTab(InventoryItemType.WIP)}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === InventoryItemType.WIP ? 'border-purple-500 text-slate-800' : 'border-transparent text-slate-400'}`}
             >
               🧪 Setengah Jadi (WIP)
             </button>
          </div>
        </div>
        <div className="flex gap-3 mb-1">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari item..." 
              className="pl-10 pr-6 py-3 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-sm text-slate-900 shadow-sm w-48"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
          {isManagerOrOwner && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-500 transition-all"
            >
              + Tambah {activeTab === InventoryItemType.RAW ? 'Bahan' : 'Mixing Item'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col mb-6">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <th className="py-6 px-8">Nama Barang</th>
              <th className="py-6 px-4 text-center">Satuan</th>
              <th className="py-6 px-4 text-right">Stok Saat Ini</th>
              <th className="py-6 px-4 text-right">Ambang Batas</th>
              {isManagerOrOwner && <th className="py-6 px-8 text-right">Kelola</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-5 px-8">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 uppercase text-xs tracking-tight">{item.name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">ID: {item.id}</span>
                  </div>
                </td>
                <td className="py-5 px-4 text-center">
                  <span className="text-slate-400 font-black text-[10px] uppercase bg-slate-100 px-2 py-1 rounded-md">{item.unit}</span>
                </td>
                <td className="py-5 px-4 text-right">
                  <span className={`font-black text-sm ${item.quantity <= item.minStock ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                    {item.quantity.toLocaleString()}
                  </span>
                </td>
                <td className="py-5 px-4 text-right font-bold text-slate-400 text-xs">
                  {item.minStock} {item.unit}
                </td>
                {isManagerOrOwner && (
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingItem(item)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl shadow-sm transition-colors text-xs">✏️</button>
                      <button onClick={() => setItemToDelete(item)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-colors text-xs">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic tracking-[0.2em]">Belum ada data di kategori ini</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-sm p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Hapus Item?</h3>
            <p className="text-slate-500 text-xs font-medium leading-relaxed px-4">Anda akan menghapus <span className="text-red-600 font-black uppercase">{itemToDelete.name}</span>. Pastikan item ini tidak terikat pada resep menu aktif.</p>
            <div className="flex flex-col gap-3 mt-10">
              <button onClick={() => { deleteInventoryItem(itemToDelete.id); setItemToDelete(null); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">HAPUS PERMANEN 🗑️</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">BATALKAN</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-12 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Tambah {activeTab}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Nama Barang</label>
                <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-orange-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ketik nama bahan..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Stok Awal</label>
                  <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Satuan</label>
                  <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none uppercase" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="kg/pcs/ml" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-xs tracking-widest">Batal</button>
              <button onClick={handleAddItem} className="flex-1 py-5 bg-slate-900 text-white font-black rounded-3xl text-xs uppercase shadow-2xl tracking-widest">Simpan Barang</button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-lg p-12 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Edit {editingItem.type}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Nama Barang</label>
                <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-orange-500 outline-none" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Stok Sekarang</label>
                  <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Satuan</label>
                  <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 uppercase" value={editingItem.unit} onChange={e => setEditingItem({...editingItem, unit: e.target.value})} placeholder="kg/pcs/ml" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Ambang Batas (Alert)</label>
                <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900" value={editingItem.minStock} onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-5 text-slate-400 font-black uppercase text-xs tracking-widest">Batal</button>
              <button onClick={handleUpdateItem} className="flex-1 py-5 bg-orange-500 text-white font-black rounded-3xl text-xs uppercase shadow-2xl tracking-widest">Update Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
