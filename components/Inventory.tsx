
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItem, UserRole, InventoryItemType, Product, OrderStatus } from '../types';

export const Inventory: React.FC = () => {
  const { 
    inventory = [], selectedOutletId, updateInventoryItem, deleteInventoryItem, addInventoryItem, currentUser,
    transactions = [], purchases = [], stockTransfers = [], productionRecords = [], products = [], outlets = []
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

  const movementLogs = useMemo(() => {
    const logs: any[] = [];
    const filteredInv = (inventory || []).filter(i => i.outletId === selectedOutletId && (isOwnerOrManager || i.isCashierOperated));
    const invNames = new Set(filteredInv.map(i => i.name));

    (purchases || []).filter(p => p.outletId === selectedOutletId).forEach(p => {
      if (invNames.has(p.itemName)) {
        logs.push({ id: p.id, timestamp: p.timestamp, itemName: p.itemName, qty: p.quantity, type: 'IN', category: 'RESTOCK', source: 'Supplier', staff: p.staffName, ref: `#PUR-${p.id.slice(-4).toUpperCase()}` });
      }
    });
    
    (stockTransfers || []).filter(t => t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId).forEach(t => {
      if (invNames.has(t.itemName)) {
        const isOut = t.fromOutletId === selectedOutletId;
        logs.push({ id: t.id, timestamp: t.timestamp, itemName: t.itemName, qty: isOut ? -t.quantity : t.quantity, type: isOut ? 'OUT' : 'IN', category: 'MUTATION', source: isOut ? `Ke ${t.toOutletName}` : `Dari ${t.fromOutletName}`, staff: t.staffName, ref: `#TRF-${t.id.slice(-4).toUpperCase()}` });
      }
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, stockTransfers, selectedOutletId, inventory, isOwnerOrManager]);

  const filteredData = (inventory || []).filter(i => {
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
      setNewItem({ 
        name: '', unit: 'gr', quantity: 0, minStock: 0, costPerUnit: 0, type: activeTab, isCashierOperated: false, canCashierPurchase: false 
      });
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
                      <td className={`py-4 px-4 text-right font-black text-sm ${item.quantity <= (item.minStock || 0) ? 'text-red-600 animate-pulse' : ''}`}>{(item.quantity ?? 0).toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-slate-300 text-xs">{(item.minStock ?? 0).toLocaleString()}</td>
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
                           <p className={`text-lg font-black ${item.quantity <= (item.minStock || 0) ? 'text-red-600' : 'text-slate-800'}`}>{(item.quantity ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Limit Aman</p>
                           <p className="text-lg font-black text-slate-300">{(item.minStock ?? 0).toLocaleString()}</p>
                        </div>
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
                     <p className={`text-sm font-black ${log.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'IN' ? '+' : ''}{(log.qty ?? 0).toFixed(1)}</p>
                     <p className="text-[7px] font-black text-slate-300 uppercase">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {editingItem && isOwnerOrManager && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
             <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-8 text-center">Update Data Stok</h3>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Stok Fisik</label>
                     <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-center text-slate-900" value={editingItem.quantity ?? 0} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 text-red-500">Limit Aman</label>
                     <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-center text-red-600 outline-none focus:border-red-500" value={editingItem.minStock ?? 0} onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value) || 0})} />
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">HPP Unit (Rp)</label>
                   <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-center text-indigo-600 outline-none" value={editingItem.costPerUnit ?? 0} onChange={e => setEditingItem({...editingItem, costPerUnit: parseInt(e.target.value) || 0})} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingItem(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
                  <button onClick={() => { updateInventoryItem(editingItem); setEditingItem(null); }} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Simpan Data 💾</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
