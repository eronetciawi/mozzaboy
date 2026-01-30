
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItem, UserRole, InventoryItemType, Product, OrderStatus } from '../types';

export const Inventory: React.FC = () => {
  const { 
    inventory, selectedOutletId, updateInventoryItem, deleteInventoryItem, addInventoryItem, currentUser,
    transactions, purchases, stockTransfers, productionRecords, products
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'audit'>('list');
  const [activeTab, setActiveTab] = useState<InventoryItemType>(InventoryItemType.RAW);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id' | 'outletId'>>({ 
    name: '', unit: 'kg', quantity: 0, minStock: 1, costPerUnit: 0, type: InventoryItemType.RAW
  });

  const isManagerOrOwner = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  const movementLogs = useMemo(() => {
    const logs: any[] = [];
    purchases.filter(p => p.outletId === selectedOutletId).forEach(p => {
      logs.push({ id: p.id, timestamp: p.timestamp, itemName: p.itemName, qty: p.quantity, type: 'IN', category: 'RESTOCK', source: 'Pembelian Supplier', staff: p.staffName, ref: `#PUR-${p.id.slice(-4).toUpperCase()}` });
    });
    stockTransfers.filter(t => t.fromOutletId === selectedOutletId || t.toOutletId === selectedOutletId).forEach(t => {
      const isOut = t.fromOutletId === selectedOutletId;
      logs.push({ id: t.id, timestamp: t.timestamp, itemName: t.itemName, qty: isOut ? -t.quantity : t.quantity, type: isOut ? 'OUT' : 'IN', category: 'MUTATION', source: isOut ? `Mutasi ke ${t.toOutletName}` : `Mutasi dari ${t.fromOutletName}`, staff: t.staffName, ref: `#TRF-${t.id.slice(-4).toUpperCase()}` });
    });
    productionRecords.filter(pr => pr.outletId === selectedOutletId).forEach(pr => {
      const resultItem = inventory.find(inv => inv.id === pr.resultItemId);
      logs.push({ id: `${pr.id}-res`, timestamp: pr.timestamp, itemName: resultItem?.name || 'Unknown WIP', qty: pr.resultQuantity, type: 'IN', category: 'PRODUCTION', source: 'Hasil Jadi Produksi', staff: pr.staffName, ref: `#PROD-${pr.id.slice(-4).toUpperCase()}` });
      pr.components.forEach((comp, idx) => {
        const compItem = inventory.find(inv => inv.id === comp.inventoryItemId);
        logs.push({ id: `${pr.id}-comp-${idx}`, timestamp: pr.timestamp, itemName: compItem?.name || 'Unknown Material', qty: -comp.quantity, type: 'OUT', category: 'PRODUCTION', source: 'Bahan Terpakai Produksi', staff: pr.staffName, ref: `#PROD-${pr.id.slice(-4).toUpperCase()}` });
      });
    });
    transactions.filter(tx => tx.outletId === selectedOutletId && tx.status === OrderStatus.CLOSED).forEach(tx => {
      tx.items.forEach((cartItem, cidx) => {
        const processBOM = (prod: Product, multiplier: number, depth = 0) => {
          if (prod.isCombo && prod.comboItems) {
            prod.comboItems.forEach(ci => {
              const inner = products.find(p => p.id === ci.productId);
              if (inner) processBOM(inner, multiplier * ci.quantity, depth + 1);
            });
          } else {
            prod.bom.forEach((bom, bidx) => {
              const template = inventory.find(inv => inv.id === bom.inventoryItemId);
              if (template) {
                logs.push({ id: `${tx.id}-${cidx}-${depth}-${bidx}`, timestamp: tx.timestamp, itemName: template.name, qty: -(bom.quantity * multiplier), type: 'OUT', category: 'SALES', source: `POS: ${prod.name}`, staff: tx.cashierName, ref: `#POS-${tx.id.slice(-6).toUpperCase()}` });
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
  const filteredLogs = movementLogs.filter(log => log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || log.ref.toLowerCase().includes(searchTerm.toLowerCase()) || log.source.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddItem = () => { if (newItem.name) { addInventoryItem({ ...newItem, type: activeTab }); setShowAddModal(false); setNewItem({ name: '', unit: 'kg', quantity: 0, minStock: 1, costPerUnit: 0, type: activeTab }); } };
  const handleUpdateItem = () => { if (editingItem) { updateInventoryItem(editingItem); setEditingItem(null); } };
  
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteInventoryItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-50/30 pb-20 md:pb-8">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 shrink-0">
        <div className="space-y-4">
          <div><h2 className="text-xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Warehouse Console</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Logistik & Kontrol Pergerakan Stok</p></div>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
             <button onClick={() => setViewMode('list')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>📦 Daftar Stok</button>
             <button onClick={() => setViewMode('audit')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>🔍 Audit Timeline</button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative"><input type="text" placeholder={viewMode === 'list' ? "Cari barang..." : "Cari item/referensi/sumber..."} className="w-full md:w-64 pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-[11px] shadow-sm transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span></div>
          {viewMode === 'list' && (
            <div className="flex gap-2">
               <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button onClick={() => setActiveTab(InventoryItemType.RAW)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === InventoryItemType.RAW ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Mentah</button>
                  <button onClick={() => setActiveTab(InventoryItemType.WIP)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === InventoryItemType.WIP ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>WIP/Olahan</button>
               </div>
               {isManagerOrOwner && (<button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase shadow-xl hover:bg-orange-500 active:scale-95 transition-all">+ Add Item</button>)}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {viewMode === 'list' ? (
          <>
            <div className="hidden md:block bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden mb-10">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10"><tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest"><th className="py-6 px-10">Material Name</th><th className="py-6 px-4 text-center">Unit</th><th className="py-6 px-4 text-right">Current Stock</th><th className="py-6 px-4 text-right">Safety Limit</th>{isManagerOrOwner && <th className="py-6 px-4 text-right text-orange-500">Unit Cost</th>}{isManagerOrOwner && <th className="py-6 px-10 text-right">Actions</th>}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="py-5 px-10"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${item.quantity <= item.minStock ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>{item.quantity <= item.minStock ? '⚠️' : '📦'}</div><span className="font-black text-slate-800 uppercase text-xs">{item.name}</span></div></td>
                      <td className="py-5 px-4 text-center"><span className="text-slate-400 font-black text-[10px] uppercase">{item.unit}</span></td>
                      <td className="py-5 px-4 text-right"><span className={`font-black text-sm ${item.quantity <= item.minStock ? 'text-red-600' : 'text-slate-900'}`}>{item.quantity.toLocaleString()}</span></td>
                      <td className="py-5 px-4 text-right font-bold text-slate-300 text-xs">{item.minStock}</td>
                      {isManagerOrOwner && (<td className="py-5 px-4 text-right font-black text-orange-600 text-xs">Rp {item.costPerUnit.toLocaleString()}</td>)}
                      {isManagerOrOwner && (<td className="py-5 px-10 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-xs shadow-sm">✏️</button><button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-xs shadow-sm">🗑️</button></div></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 pb-10">
              {filteredData.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${item.quantity <= item.minStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{item.quantity <= item.minStock ? '⚠️' : '📦'}</div><div><h4 className="font-black text-slate-800 uppercase text-[11px] leading-tight">{item.name}</h4><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Limit: {item.minStock} {item.unit}</p></div></div>
                  <div className="text-right flex flex-col items-end gap-2"><div className="text-lg font-black text-slate-900 leading-none">{item.quantity.toLocaleString()} <span className="text-[9px] text-slate-400 uppercase">{item.unit}</span></div>{isManagerOrOwner && (<div className="flex gap-1.5 mt-1"><button onClick={() => setEditingItem(item)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-[10px]">✏️</button><button onClick={() => setItemToDelete(item)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-[10px]">🗑️</button></div>)}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4 pb-20 max-w-6xl mx-auto">
             <div className="space-y-3">
                {filteredLogs.slice(0, 150).map((log, idx) => {
                  const isPositive = log.type === 'IN';
                  const categoryColors: Record<string, string> = { 'SALES': 'bg-rose-50 text-rose-600', 'RESTOCK': 'bg-emerald-50 text-emerald-600', 'MUTATION': 'bg-indigo-50 text-indigo-600', 'PRODUCTION': 'bg-purple-50 text-purple-600' };
                  return (
                    <div key={log.id + idx} className="bg-white p-4 md:p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center gap-4 relative group">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><span className="text-xl font-black">{isPositive ? '↓' : '↑'}</span></div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1 flex-wrap"><h4 className="text-xs md:text-[13px] font-black text-slate-900 uppercase tracking-tight">{log.itemName}</h4><span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${categoryColors[log.category] || 'bg-slate-100 text-slate-500'}`}>{log.category}</span></div>
                         <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase"><span>📅 {new Date(log.timestamp).toLocaleDateString()}</span><span>⏰ {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span className="hidden md:inline px-2 py-0.5 bg-slate-50 rounded border border-slate-100 font-mono text-slate-300">{log.ref}</span></div>
                      </div>
                      <div className="flex items-center justify-between w-full md:w-auto gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-8">
                         <div className="text-left md:text-right min-w-[120px]"><p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Keterangan / Sumber</p><p className="text-sm font-black text-slate-700 uppercase truncate max-w-[180px]">{log.source}</p><p className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">PIC: {log.staff.split(' ')[0]}</p></div>
                         <div className="text-right shrink-0"><div className={`text-lg md:text-xl font-black tracking-tighter ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{isPositive ? '+' : ''}{log.qty.toFixed(2)}</div><p className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em] leading-none">Net Change</p></div>
                      </div>
                      <div className="md:hidden absolute top-4 right-4 font-mono text-[7px] text-slate-200">{log.ref}</div>
                    </div>
                  );
                })}
             </div>
             {filteredLogs.length === 0 && (<div className="py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200"><span className="text-5xl block mb-6 grayscale">🕵️</span><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Timeline audit tidak ditemukan</p></div>)}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Input Material {activeTab}</h3><button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button></div>
            <div className="space-y-6">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nama Barang / Material</label><input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-orange-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Contoh: Mozzarella Cheese" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Stok Awal</label><input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Satuan (Unit)</label><input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="KG / PCS" /></div>
              </div>
              {isManagerOrOwner && (<div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Estimasi Modal Per Unit (Rp)</label><input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-orange-600" value={newItem.costPerUnit} onChange={e => setNewItem({...newItem, costPerUnit: parseInt(e.target.value) || 0})} /></div>)}
              <button onClick={handleAddItem} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">SIMPAN KE DATABASE 💾</button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Penyesuaian Stok</h3><button onClick={() => setEditingItem(null)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button></div>
            <div className="space-y-6">
               <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100"><p className="text-[10px] font-black text-indigo-600 uppercase mb-1">{editingItem.name}</p><p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Perubahan stok di sini hanya untuk koreksi manual / opname. Gunakan menu belanja atau produksi untuk alur resmi.</p></div>
               <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Kuantitas Stok Baru</label><input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 border-orange-200 rounded-2xl font-black text-2xl text-center" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Safety Limit</label><input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={editingItem.minStock} onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value) || 0})} /></div>
                  {isManagerOrOwner && (<div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-orange-500">Unit Cost (HPP)</label><input type="number" onFocus={e => e.target.select()} className="w-full p-4 bg-slate-50 border-2 border-orange-100 rounded-2xl font-black text-orange-600" value={editingItem.costPerUnit} onChange={e => setEditingItem({...editingItem, costPerUnit: parseInt(e.target.value) || 0})} /></div>)}
               </div>
               <div className="flex gap-3"><button onClick={() => setEditingItem(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batalkan</button><button onClick={handleUpdateItem} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-orange-500/20 active:scale-95 transition-all">SIMPAN PERUBAHAN</button></div>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Material?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">
                 Menghapus <span className="text-red-600 font-black">{itemToDelete.name}</span> akan berdampak pada resep produk yang menggunakannya.
              </p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleConfirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">IYA, HAPUS PERMANEN</button>
                 <button onClick={() => setItemToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
