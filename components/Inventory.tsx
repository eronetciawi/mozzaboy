
import React, { useState, useMemo, useEffect } from 'react';
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
    name: '', unit: 'gr', quantity: 0, minStock: 500, costPerUnit: 0, type: InventoryItemType.RAW, isCashierOperated: false
  });

  const isManagerOrOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  const movementLogs = useMemo(() => {
    const logs: any[] = [];
    purchases.filter(p => p.outletId === selectedOutletId).forEach(p => {
      logs.push({ id: p.id, timestamp: p.timestamp, itemName: p.itemName, qty: p.quantity, type: 'IN', category: 'RESTOCK', source: 'Supplier', staff: p.staffName, ref: `#PUR-${p.id.slice(-4).toUpperCase()}` });
    });
    stockTransfers.filter(t => t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId).forEach(t => {
      const isOut = t.fromOutletId === selectedOutletId;
      logs.push({ id: t.id, timestamp: t.timestamp, itemName: t.itemName, qty: isOut ? -t.quantity : t.quantity, type: isOut ? 'OUT' : 'IN', category: 'MUTATION', source: isOut ? `Ke ${t.toOutletName}` : `Dari ${t.fromOutletName}`, staff: t.staffName, ref: `#TRF-${t.id.slice(-4).toUpperCase()}` });
    });
    productionRecords.filter(pr => pr.outletId === selectedOutletId).forEach(pr => {
      const resultItem = inventory.find(inv => inv.id === pr.resultItemId);
      logs.push({ id: `${pr.id}-res`, timestamp: pr.timestamp, itemName: resultItem?.name || 'WIP', qty: pr.resultQuantity, type: 'IN', category: 'PRODUCTION', source: 'Hasil Produksi', staff: pr.staffName, ref: `#PROD-${pr.id.slice(-4).toUpperCase()}` });
      pr.components.forEach((comp, idx) => {
        const compItem = inventory.find(inv => inv.id === comp.inventoryItemId);
        logs.push({ id: `${pr.id}-comp-${idx}`, timestamp: pr.timestamp, itemName: compItem?.name || 'Bahan', qty: -comp.quantity, type: 'OUT', category: 'PRODUCTION', source: 'Pemakaian Produksi', staff: pr.staffName, ref: `#PROD-${pr.id.slice(-4).toUpperCase()}` });
      });
    });
    transactions.filter(tx => tx.outletId === selectedOutletId && tx.status === OrderStatus.CLOSED).forEach(tx => {
      tx.items.forEach((cartItem, cidx) => {
        const processBOM = (prod: Product, multiplier: number) => {
          if (prod.isCombo && prod.comboItems) {
            prod.comboItems.forEach(ci => {
              const inner = products.find(p => p.id === ci.productId);
              if (inner) processBOM(inner, multiplier * ci.quantity);
            });
          } else {
            (prod.bom || []).forEach((bom, bidx) => {
              const template = inventory.find(inv => inv.id === bom.inventoryItemId);
              if (template) {
                logs.push({ id: `${tx.id}-${cidx}-${bidx}`, timestamp: tx.timestamp, itemName: template.name, qty: -(bom.quantity * multiplier), type: 'OUT', category: 'SALES', source: `Penjualan POS`, staff: tx.cashierName, ref: `#POS-${tx.id.slice(-6).toUpperCase()}` });
              }
            });
          }
        };
        processBOM(cartItem.product, cartItem.quantity);
      });
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [purchases, stockTransfers, productionRecords, transactions, selectedOutletId, inventory, products]);

  const filteredData = inventory.filter(i => i.outletId === selectedOutletId && i.type === activeTab && i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = movementLogs.filter(log => log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || log.ref.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddItem = () => { 
    if (newItem.name && selectedBranches.length > 0) { 
      addInventoryItem({ ...newItem, type: activeTab }, selectedBranches); 
      setShowAddModal(false); 
      setNewItem({ name: '', unit: 'gr', quantity: 0, minStock: 500, costPerUnit: 0, type: activeTab, isCashierOperated: false });
      setSelectedBranches([]);
    } 
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteInventoryItem(itemToDelete.id);
      setItemToDelete(null);
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
          {viewMode === 'list' && isManagerOrOwner && (
            <button onClick={() => { setSelectedBranches([selectedOutletId]); setShowAddModal(true); }} className="w-full md:w-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-slate-900/10 active:scale-95 transition-all">+ Item Baru</button>
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

            {/* DESKTOP: TABLE */}
            <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="py-5 px-8">Item Material</th>
                    <th className="py-5 px-4 text-center">Satuan</th>
                    <th className="py-5 px-4 text-right">Stok Aktif</th>
                    <th className="py-5 px-4 text-right text-orange-500">HPP Unit</th>
                    <th className="py-5 px-8 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-900">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="py-4 px-8 font-black uppercase text-[11px]">{item.name}</td>
                      <td className="py-4 px-4 text-center text-slate-400 font-black text-[10px] uppercase">{item.unit}</td>
                      <td className="py-4 px-4 text-right font-black text-sm">{item.quantity.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-orange-600 text-xs">Rp {item.costPerUnit?.toLocaleString() || '0'}</td>
                      <td className="py-4 px-8 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">✏️</button>
                          <button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE: CARD LIST (NO SCROLL) */}
            <div className="md:hidden space-y-3">
               {filteredData.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all active:scale-[0.98]">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg text-slate-400">📦</div>
                           <div>
                              <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{item.name}</h4>
                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">HPP: Rp {item.costPerUnit.toLocaleString()} / {item.unit}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => setEditingItem(item)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-sm shadow-sm active:bg-blue-200">✏️</button>
                           <button onClick={() => setItemToDelete(item)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-sm shadow-sm active:bg-red-200">🗑️</button>
                        </div>
                     </div>
                     <div className="flex justify-between items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div>
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Stok Tersedia</p>
                           <p className={`text-xl font-black ${item.quantity <= item.minStock ? 'text-red-600' : 'text-slate-800'}`}>{item.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span></p>
                        </div>
                        {item.quantity <= item.minStock && (
                          <div className="text-right">
                             <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase animate-pulse">RESTOCK!</span>
                          </div>
                        )}
                     </div>
                  </div>
               ))}
               {filteredData.length === 0 && <div className="py-20 text-center opacity-20 italic text-xs font-black uppercase">Tidak ada item material.</div>}
            </div>
          </div>
        ) : (
          /* AUDIT LOGS */
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

      {/* MODALS: ADD & EDIT */}
      {editingItem && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Edit Material</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{editingItem.name}</p>
                </div>
                <button onClick={() => setEditingItem(null)} className="text-slate-400">✕</button>
             </div>
             
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Kuantitas Fisik</label>
                  <input 
                    type="number" 
                    onFocus={e => e.target.select()} 
                    className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-[28px] text-4xl font-black text-center outline-none focus:border-orange-500 transition-all text-slate-900" 
                    value={editingItem.quantity} 
                    onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">HPP Unit (Rp)</label>
                     <input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-center text-indigo-600 outline-none" value={editingItem.costPerUnit} onChange={e => setEditingItem({...editingItem, costPerUnit: parseInt(e.target.value) || 0})} />
                   </div>
                   <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border">
                      <button onClick={() => setEditingItem({...editingItem, isCashierOperated: !editingItem.isCashierOperated})} className={`w-12 h-6 rounded-full relative transition-all ${editingItem.isCashierOperated ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingItem.isCashierOperated ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <p className="text-[10px] font-black uppercase text-slate-700">Akses Kasir</p>
                   </div>
                </div>
                <button onClick={() => { updateInventoryItem(editingItem); setEditingItem(null); }} className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">SIMPAN DATA STOK 💾</button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-2xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8">Registrasi Material</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Material</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500 text-slate-900" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Contoh: Keju Mozzarella" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Stok Awal</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none text-slate-900" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Satuan</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm uppercase outline-none text-slate-900" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="gr / ml / pcs" />
                </div>
              </div>
              <button onClick={handleAddItem} disabled={selectedBranches.length === 0 || !newItem.name} className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">DAFTARKAN MASTER STOK 🚀</button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
              ⚠️
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Material?</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed px-4 uppercase">
              Material <span className="text-red-600 font-black">"{itemToDelete.name}"</span> akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={handleConfirmDelete}
                className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all active:scale-95"
              >
                HAPUS PERMANEN 🗑️
              </button>
              <button 
                onClick={() => setItemToDelete(null)}
                className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600"
              >
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
