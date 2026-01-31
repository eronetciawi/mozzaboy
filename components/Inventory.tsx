
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItem, UserRole, InventoryItemType, Product, OrderStatus } from '../types';

export const Inventory: React.FC = () => {
  const { 
    inventory, selectedOutletId, updateInventoryItem, deleteInventoryItem, addInventoryItem, currentUser,
    transactions, purchases, stockTransfers, productionRecords, products, outlets
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'audit'>('list');
  const [activeTab, setActiveTab] = useState<InventoryItemType>(InventoryItemType.RAW);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id' | 'outletId'>>({ 
    name: '', unit: 'gr', quantity: 0, minStock: 0, costPerUnit: 0, type: InventoryItemType.RAW, isCashierOperated: false, canCashierPurchase: false
  });

  const isOwnerOrManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const isCashier = currentUser?.role === UserRole.CASHIER;

  const movementLogs = useMemo(() => {
    const logs: any[] = [];
    // Data logs tetap difilter berdasarkan apa yang bisa dilihat kasir jika kasir yang melihat
    const filteredInv = inventory.filter(i => i.outletId === selectedOutletId && (isOwnerOrManager || i.isCashierOperated));
    const invNames = new Set(filteredInv.map(i => i.name));

    purchases.filter(p => p.outletId === selectedOutletId).forEach(p => {
      if (invNames.has(p.itemName)) {
        logs.push({ id: p.id, timestamp: p.timestamp, itemName: p.itemName, qty: p.quantity, type: 'IN', category: 'RESTOCK', source: 'Supplier', staff: p.staffName, ref: `#PUR-${p.id.slice(-4).toUpperCase()}` });
      }
    });
    
    stockTransfers.filter(t => t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId).forEach(t => {
      if (invNames.has(t.itemName)) {
        const isOut = t.fromOutletId === selectedOutletId;
        logs.push({ id: t.id, timestamp: t.timestamp, itemName: t.itemName, qty: isOut ? -t.quantity : t.quantity, type: isOut ? 'OUT' : 'IN', category: 'MUTATION', source: isOut ? `Ke ${t.toOutletName}` : `Dari ${t.fromOutletName}`, staff: t.staffName, ref: `#TRF-${t.id.slice(-4).toUpperCase()}` });
      }
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, stockTransfers, selectedOutletId, inventory, isOwnerOrManager]);

  // FILTER UTAMA: Jika Kasir, hanya tampilkan item dengan isCashierOperated: true
  const filteredData = inventory.filter(i => {
    const belongsToOutlet = i.outletId === selectedOutletId;
    const matchesTab = i.type === activeTab;
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasPermission = isOwnerOrManager || i.isCashierOperated === true;
    
    return belongsToOutlet && matchesTab && matchesSearch && hasPermission;
  });

  const filteredLogs = movementLogs.filter(log => log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || log.ref.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddItem = () => { 
    if (newItem.name && selectedBranches.length > 0) { 
      addInventoryItem({ ...newItem, type: activeTab }, selectedBranches); 
      setShowAddModal(false); 
      setNewItem({ name: '', unit: 'gr', quantity: 0, minStock: 0, costPerUnit: 0, type: activeTab, isCashierOperated: false, canCashierPurchase: false });
      setSelectedBranches([]);
    } 
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-50/30 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 shrink-0">
        <div className="space-y-3 w-full md:w-auto">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Manajemen Stok</h2>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
             <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>📦 Gudang</button>
             <button onClick={() => setViewMode('audit')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>🔍 Audit Log</button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <input type="text" placeholder="Cari Bahan..." className="w-full md:w-48 px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl font-bold text-[10px] shadow-sm outline-none focus:border-orange-500 text-slate-900" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {viewMode === 'list' && isOwnerOrManager && (
            <button onClick={() => { setSelectedBranches([selectedOutletId]); setShowAddModal(true); }} className="w-full md:w-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">+ Item Baru</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'list' ? (
          <div className="space-y-6 pb-20">
            <div className="flex gap-2 sticky top-0 bg-slate-50/80 backdrop-blur z-10 py-2">
                <button onClick={() => setActiveTab(InventoryItemType.RAW)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === InventoryItemType.RAW ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border text-slate-400'}`}>Bahan Mentah</button>
                <button onClick={() => setActiveTab(InventoryItemType.WIP)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === InventoryItemType.WIP ? 'bg-purple-600 text-white shadow-lg' : 'bg-white border text-slate-400'}`}>WIP/Olahan</button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="py-5 px-8">Material</th>
                    <th className="py-5 px-4 text-center">Unit</th>
                    <th className="py-5 px-4 text-right">Stok Aktif</th>
                    <th className="py-5 px-4 text-right text-red-500">Limit Aman</th>
                    <th className="py-5 px-4 text-right">Akses Kasir</th>
                    {isOwnerOrManager && <th className="py-5 px-8 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-900">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8 font-black uppercase text-[11px]">{item.name}</td>
                      <td className="py-4 px-4 text-center text-slate-400 font-black text-[10px] uppercase">{item.unit}</td>
                      <td className={`py-4 px-4 text-right font-black text-sm ${item.quantity <= (item.minStock || 0) ? 'text-red-600 animate-pulse' : ''}`}>{item.quantity.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-slate-300 text-xs">{item.minStock?.toLocaleString() || '0'}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${item.isCashierOperated ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                             {item.isCashierOperated ? 'Lihat: Aktif' : 'Lihat: Off'}
                          </span>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${item.canCashierPurchase ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-300'}`}>
                             {item.canCashierPurchase ? 'Beli: Boleh' : 'Beli: No'}
                          </span>
                        </div>
                      </td>
                      {isOwnerOrManager && (
                        <td className="py-4 px-8 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">✏️</button>
                            <button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD LIST */}
            <div className="md:hidden space-y-3">
               {filteredData.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">📦</div>
                           <div>
                              <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{item.name}</h4>
                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Satuan: {item.unit}</p>
                           </div>
                        </div>
                        {isOwnerOrManager && (
                           <div className="flex gap-2">
                              <button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">✏️</button>
                              <button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">🗑️</button>
                           </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Stok Aktif</p>
                           <p className={`text-lg font-black ${item.quantity <= (item.minStock || 0) ? 'text-red-600' : 'text-slate-800'}`}>{item.quantity.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Limit Aman</p>
                           <p className="text-lg font-black text-slate-300">{item.minStock?.toLocaleString() || '0'}</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <span className={`flex-1 text-[7px] font-black px-2 py-1.5 rounded-lg text-center uppercase ${item.isCashierOperated ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>Lihat Kasir: {item.isCashierOperated ? 'ON' : 'OFF'}</span>
                        <span className={`flex-1 text-[7px] font-black px-2 py-1.5 rounded-lg text-center uppercase ${item.canCashierPurchase ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>Beli Kasir: {item.canCashierPurchase ? 'YES' : 'NO'}</span>
                     </div>
                  </div>
               ))}
            </div>
            {filteredData.length === 0 && <div className="py-20 text-center opacity-20 italic text-xs font-black uppercase">Tidak ada item material.</div>}
          </div>
        ) : (
          <div className="space-y-3 pb-24">
             {filteredLogs.map((log, idx) => (
               <div key={idx} className="bg-white p-5 rounded-[28px] border shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${log.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{log.type === 'IN' ? '↓' : '↑'}</div>
                     <div>
                        <h5 className="text-[10px] font-black uppercase text-slate-800">{log.itemName}</h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{log.source} • {log.staff.split(' ')[0]}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-sm font-black ${log.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'IN' ? '+' : ''}{log.qty.toFixed(1)}</p>
                     <p className="text-[7px] font-black text-slate-300 uppercase">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* MODAL EDIT (Manager Only) */}
      {editingItem && isOwnerOrManager && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
             <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-8 text-center">Update Data Stok</h3>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Stok Fisik</label>
                     <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-center text-slate-900" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 text-red-500">Limit Aman</label>
                     <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-center text-red-600 outline-none focus:border-red-500" value={editingItem.minStock} onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value) || 0})} />
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">HPP Unit (Rp)</label>
                   <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-center text-indigo-600 outline-none" value={editingItem.costPerUnit} onChange={e => setEditingItem({...editingItem, costPerUnit: parseInt(e.target.value) || 0})} />
                </div>
                
                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Pengaturan Akses Kasir</p>
                   <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="text-xl">👁️</span>
                         <p className="text-[10px] font-black uppercase text-slate-600">Muncul di Daftar Stok?</p>
                      </div>
                      <button onClick={() => setEditingItem({...editingItem, isCashierOperated: !editingItem.isCashierOperated})} className={`w-14 h-7 rounded-full relative transition-all ${editingItem.isCashierOperated ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${editingItem.isCashierOperated ? 'right-1' : 'left-1'}`}></div>
                      </button>
                   </div>
                   <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="text-xl">🚚</span>
                         <p className="text-[10px] font-black uppercase text-orange-700">Kasir Boleh Belanja Ini?</p>
                      </div>
                      <button onClick={() => setEditingItem({...editingItem, canCashierPurchase: !editingItem.canCashierPurchase})} className={`w-14 h-7 rounded-full relative transition-all ${editingItem.canCashierPurchase ? 'bg-orange-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${editingItem.canCashierPurchase ? 'right-1' : 'left-1'}`}></div>
                      </button>
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingItem(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
                  <button onClick={() => { updateInventoryItem(editingItem); setEditingItem(null); }} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Simpan Data 💾</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL ADD (Manager Only) */}
      {showAddModal && isOwnerOrManager && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-2xl p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8 text-center">Registrasi Material Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nama Material</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Contoh: Keju Mozzarella" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Stok Awal</label>
                <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block text-red-500">Limit Aman (Min)</label>
                <input type="number" className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-sm text-red-600" value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Satuan</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm uppercase" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="gr / ml / pcs" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">HPP Unit (Rp)</label>
                <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={newItem.costPerUnit} onChange={e => setNewItem({...newItem, costPerUnit: parseInt(e.target.value) || 0})} />
              </div>
              <div className="md:col-span-2 space-y-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-slate-600">Muncul di Daftar Stok Kasir?</p>
                    <button onClick={() => setNewItem({...newItem, isCashierOperated: !newItem.isCashierOperated})} className={`w-12 h-6 rounded-full relative transition-all ${newItem.isCashierOperated ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newItem.isCashierOperated ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-orange-700">Kasir Boleh Belanja Ini?</p>
                    <button onClick={() => setNewItem({...newItem, canCashierPurchase: !newItem.canCashierPurchase})} className={`w-12 h-6 rounded-full relative transition-all ${newItem.canCashierPurchase ? 'bg-orange-500' : 'bg-slate-300'}`}>
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newItem.canCashierPurchase ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
              </div>
              <div className="md:col-span-2 p-5 bg-slate-900 rounded-3xl text-white">
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pilih Cabang (Multi-Outlet Register):</p>
                    <button onClick={() => setSelectedBranches(outlets.map(o=>o.id))} className="text-[8px] font-black text-orange-400 underline">Pilih Semua</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {outlets.map(o => (
                      <button 
                        key={o.id} 
                        onClick={() => setSelectedBranches(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id])}
                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${selectedBranches.includes(o.id) ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/40'}`}
                      >
                         {o.name}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
              <button onClick={handleAddItem} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Daftarkan Master Stok 🚀</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {itemToDelete && isOwnerOrManager && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Material?</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed px-4 uppercase mb-10">Data <span className="text-red-600">"{itemToDelete.name}"</span> akan hilang permanen.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { deleteInventoryItem(itemToDelete.id); setItemToDelete(null); }} className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase shadow-xl">HAPUS PERMANEN 🗑️</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATALKAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
