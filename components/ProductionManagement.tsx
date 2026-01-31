
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { InventoryItemType, WIPRecipe, ProductionComponent, UserRole, InventoryItem } from '../types';

interface UIComponent {
  id: string;
  inventoryItemId: string;
  quantity: number;
}

interface ProductionManagementProps {
  setActiveTab?: (tab: string) => void;
}

export const ProductionManagement: React.FC<ProductionManagementProps> = ({ setActiveTab }) => {
  const { 
    inventory, selectedOutletId, outlets, processProduction, 
    wipRecipes, addWIPRecipe, updateWIPRecipe, deleteWIPRecipe, productionRecords,
    currentUser 
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'logs'>('recipes');
  const [activeRecipe, setActiveRecipe] = useState<WIPRecipe | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<WIPRecipe | null>(null);
  
  // Form State
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [resultItemId, setResultItemId] = useState('');
  const [resultQuantity, setResultQuantity] = useState(1);
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [isCashierOperatedFlag, setIsCashierOperatedFlag] = useState(false);

  // Search Logic
  const [globalSearch, setGlobalSearch] = useState('');
  const [itemSearchModal, setItemSearchModal] = useState<{rowId: string, type: 'wip' | 'material'} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const isAdmin = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const allMaterials = useMemo(() => inventory.filter(i => i.outletId === selectedOutletId), [inventory, selectedOutletId]);

  const filteredRecipes = useMemo(() => {
    let base = wipRecipes.filter(r => (r.assignedOutletIds || []).includes(selectedOutletId));
    if (isCashier) base = base.filter(r => r.isCashierOperated === true);
    return base.filter(r => r.name.toLowerCase().includes(globalSearch.toLowerCase()));
  }, [wipRecipes, globalSearch, selectedOutletId, isCashier]);

  const filteredLogs = useMemo(() => {
    return productionRecords
      .filter(p => p.outletId === selectedOutletId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [productionRecords, selectedOutletId]);

  useEffect(() => {
    if (activeRecipe && !isEditingMode) {
       const ratio = resultQuantity / activeRecipe.resultQuantity;
       setComponents(activeRecipe.components.map(c => ({
          id: Math.random().toString(36).substr(2, 9),
          inventoryItemId: c.inventoryItemId,
          quantity: Number((c.quantity * ratio).toFixed(3))
       })));
    }
  }, [resultQuantity, activeRecipe, isEditingMode]);

  const startNewRecipe = () => {
    setRecipeName(''); setResultItemId(''); setResultQuantity(1); setComponents([]);
    setIsCashierOperatedFlag(false); setSelectedBranches([selectedOutletId]);
    setIsEditingMode(true); setView('form'); setActiveRecipe(null);
  };

  const handleEditRecipe = (r: WIPRecipe) => {
    setActiveRecipe(r); setRecipeName(r.name); setResultItemId(r.resultItemId);
    setResultQuantity(r.resultQuantity); setIsCashierOperatedFlag(r.isCashierOperated || false);
    setSelectedBranches(r.assignedOutletIds || []);
    setComponents(r.components.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
    setIsEditingMode(true); setView('form');
  };

  const handleExecuteMode = (r: WIPRecipe) => {
    setActiveRecipe(r); setResultQuantity(r.resultQuantity); setIsEditingMode(false); setView('form');
  };

  const saveMaster = async () => {
    if (!recipeName || !resultItemId || components.length === 0) return alert("Lengkapi data!");
    const payload = {
      name: recipeName, resultItemId, resultQuantity, isCashierOperated: isCashierOperatedFlag,
      assignedOutletIds: selectedBranches,
      components: components.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity }))
    };
    if (activeRecipe) await updateWIPRecipe({ ...activeRecipe, ...payload });
    else await addWIPRecipe(payload);
    setView('list');
  };

  const confirmDeleteRecipe = async () => {
    if (recipeToDelete) {
      await deleteWIPRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
    }
  };

  const finishProduction = async () => {
    const insufficient = components.filter(c => (allMaterials.find(m => m.id === c.inventoryItemId)?.quantity || 0) < c.quantity);
    if (insufficient.length > 0) return alert("Bahan baku tidak cukup!");
    await processProduction({ resultItemId, resultQuantity, components });
    
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      if (setActiveTab) {
        setActiveTab('pos');
      } else {
        setView('list');
        setActiveSubTab('logs');
      }
    }, 1500);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden relative">
      {/* SUCCESS TOAST OVERLAY */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-indigo-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-indigo-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">👨‍🍳</div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Produksi Berhasil</p>
                <p className="text-[9px] font-bold text-indigo-200 uppercase mt-1">Stok telah diperbarui.</p>
              </div>
           </div>
        </div>
      )}

      {/* HEADER WITH SUB-TAB NAVIGATION */}
      <div className="bg-white border-b shrink-0 z-20 shadow-sm">
         <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">P</div>
               <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">Produksi Dapur</h2>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{activeOutlet?.name}</p>
               </div>
            </div>
            {view === 'list' && !isCashier && activeSubTab === 'recipes' && (
              <button onClick={startNewRecipe} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-indigo-100">+ Resep Baru</button>
            )}
            {view === 'form' && (
               <button onClick={() => setView('list')} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">✕</button>
            )}
         </div>

         {view === 'list' && (
           <div className="px-4 pb-2">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-fit">
                 <button 
                   onClick={() => setActiveSubTab('recipes')} 
                   className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'recipes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   Resep Produksi
                 </button>
                 <button 
                   onClick={() => setActiveSubTab('logs')} 
                   className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   Log Produksi
                 </button>
              </div>
           </div>
         )}
      </div>

      {itemSearchModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col">
           <div className="flex justify-between items-center mb-6 text-white">
              <h3 className="font-black uppercase text-xs tracking-widest">Pilih {itemSearchModal.type === 'wip' ? 'Hasil Jadi' : 'Bahan Baku'}</h3>
              <button onClick={() => setItemSearchModal(null)} className="text-2xl">✕</button>
           </div>
           <input 
              autoFocus type="text" placeholder="Ketik nama untuk mencari..." 
              className="w-full p-4 bg-white rounded-2xl font-black text-lg mb-6 outline-none border-4 border-indigo-500 shadow-2xl text-slate-900"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
           />
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {allMaterials
                .filter(m => itemSearchModal.type === 'wip' ? m.type === InventoryItemType.WIP : m.id !== resultItemId)
                .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => {
                       if(itemSearchModal.type === 'wip') setResultItemId(m.id);
                       else setComponents(prev => prev.map(c => c.id === itemSearchModal.rowId ? {...c, inventoryItemId: m.id} : c));
                       setItemSearchModal(null); setSearchQuery('');
                    }}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all flex justify-between items-center"
                  >
                     <div>
                        <p className="text-white font-black uppercase text-sm">{m.name}</p>
                        <p className="text-white/40 text-[9px] font-bold uppercase mt-1">Stok: {m.quantity} {m.unit}</p>
                     </div>
                     <span className="text-indigo-400 text-lg">➔</span>
                  </button>
                ))
              }
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32">
        {view === 'list' ? (
          <div className="max-w-6xl mx-auto space-y-6">
             {activeSubTab === 'recipes' ? (
               <>
                 <div className="relative">
                    <input 
                      type="text" placeholder="Cari Resep..." 
                      className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl font-bold text-xs shadow-sm outline-none focus:border-indigo-500"
                      value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-30">🔍</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRecipes.map(r => (
                      <div key={r.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-500 transition-all">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shadow-inner text-indigo-600">🍳</div>
                               <div>
                                  <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{r.name}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Yield: {r.resultQuantity} {allMaterials.find(m=>m.id===r.resultItemId)?.unit}</p>
                               </div>
                            </div>
                            {r.isCashierOperated && <span className="bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-emerald-100">KASIR</span>}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => handleExecuteMode(r)} className="flex-[3] py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all">MASAK ⚡</button>
                            {!isCashier && (
                              <div className="flex flex-1 gap-1">
                                <button onClick={() => handleEditRecipe(r)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase border active:bg-slate-100 transition-all text-center">Edit</button>
                                {isAdmin && (
                                  <button onClick={() => setRecipeToDelete(r)} className="w-10 py-3 bg-red-50 text-red-400 rounded-xl font-black text-[9px] uppercase border border-red-100 flex items-center justify-center active:bg-red-500 active:text-white transition-all">🗑️</button>
                                )}
                              </div>
                            )}
                         </div>
                      </div>
                    ))}
                    {filteredRecipes.length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl opacity-40 grayscale">🧪</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic px-10 leading-relaxed text-center">
                            {isCashier 
                              ? "Belum ada resep Mixing yang diizinkan untuk Kasir. Hubungi Manager untuk aktivasi 'Akses Kasir'." 
                              : "Belum ada resep terdaftar."}
                         </p>
                      </div>
                    )}
                 </div>
               </>
             ) : (
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Riwayat Produksi Dapur</h3>
                  {filteredLogs.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                       <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada riwayat produksi</p>
                    </div>
                  ) : (
                    filteredLogs.map(log => {
                      const resultItem = inventory.find(i => i.id === log.resultItemId);
                      return (
                        <div key={log.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group transition-all space-y-4">
                           <div className="flex justify-between items-center">
                              <div className="flex gap-4 items-center">
                                 <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-900 leading-none">{(new Date(log.timestamp)).getDate()}</span>
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">{(new Date(log.timestamp)).toLocaleString('id-ID', { month: 'short' })}</span>
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <h4 className="text-[12px] font-black text-slate-900 uppercase leading-none">{resultItem?.name || 'Produk'}</h4>
                                       <span className="text-[7px] font-bold text-slate-300 uppercase bg-slate-50 px-1.5 py-0.5 rounded border">#{log.id.slice(-4).toUpperCase()}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">PIC: {log.staffName} • {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-lg font-black text-indigo-600 leading-none">+{log.resultQuantity.toLocaleString()} <span className="text-[9px] text-slate-400 font-bold">{resultItem?.unit}</span></p>
                                 <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mt-1">DIPRODUKSI</p>
                              </div>
                           </div>
                           
                           {/* DETAIL KOMPONEN YANG TERPAKAI */}
                           <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Bahan Baku Terpakai (Auto-Deduct):</p>
                              <div className="flex flex-wrap gap-2">
                                 {log.components.map((comp, idx) => {
                                    const material = inventory.find(i => i.id === comp.inventoryItemId);
                                    return (
                                       <div key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                          <span className="text-[9px] font-black text-slate-700 uppercase">{material?.name || '??'}</span>
                                          <span className="text-[9px] font-bold text-slate-400">{comp.quantity.toLocaleString()} {material?.unit}</span>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                      );
                    })
                  )}
               </div>
             )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4 animate-in slide-in-from-bottom-4">
             {isEditingMode ? (
               <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-4">
                     <input 
                        type="text" placeholder="Nama Resep..." 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-sm outline-none focus:border-indigo-500 text-slate-900"
                        value={recipeName} onChange={e => setRecipeName(e.target.value)}
                     />
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setItemSearchModal({rowId: '', type: 'wip'})} className="p-4 bg-slate-900 text-white rounded-xl text-left shadow-lg overflow-hidden">
                           <p className="text-[7px] font-black text-white/50 uppercase mb-1">Hasil Jadi</p>
                           <p className="font-black uppercase text-[10px] truncate">{allMaterials.find(m => m.id === resultItemId)?.name || '-- Pilih --'}</p>
                        </button>
                        <div className="p-4 bg-slate-50 border-2 rounded-xl flex flex-col justify-center">
                           <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Yield Standar</p>
                           <div className="flex items-center gap-1">
                              <input type="number" className="bg-transparent font-black text-sm outline-none w-14 text-slate-900" value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 1)} />
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{allMaterials.find(m => m.id === resultItemId)?.unit || 'Unit'}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-3">
                     <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komposisi Bahan Baku</p>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                             <p className="text-[7px] font-black text-slate-400 uppercase">Visibilitas Kasir</p>
                             <button 
                                onClick={() => setIsCashierOperatedFlag(!isCashierOperatedFlag)} 
                                className={`w-12 h-6 rounded-full relative transition-all ${isCashierOperatedFlag ? 'bg-emerald-500' : 'bg-slate-300'}`}
                             >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isCashierOperatedFlag ? 'right-1' : 'left-1'}`}></div>
                             </button>
                          </div>
                        )}
                     </div>
                     <div className="space-y-2">
                        {components.map(comp => (
                          <div key={comp.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border animate-in fade-in">
                             <button onClick={() => setItemSearchModal({rowId: comp.id, type: 'material'})} className="flex-1 bg-white p-2.5 rounded-lg border font-black text-[10px] uppercase text-left truncate shadow-sm text-slate-900">
                                {allMaterials.find(m => m.id === comp.inventoryItemId)?.name || 'Pilih Material...'}
                             </button>
                             <input type="number" className="w-16 bg-white border rounded-lg p-2.5 font-black text-[10px] text-center outline-none text-slate-900" value={comp.quantity} onChange={e => setComponents(prev => prev.map(c => c.id === comp.id ? {...c, quantity: parseFloat(e.target.value) || 0} : c))} />
                             <button onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))} className="text-red-400 p-2">✕</button>
                          </div>
                        ))}
                        <button onClick={() => setComponents([...components, {id: Math.random().toString(36).substr(2,9), inventoryItemId: '', quantity: 1}])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl font-black text-[9px] uppercase text-slate-400 hover:text-indigo-600 transition-all">+ Bahan Baku</button>
                     </div>
                  </div>
                  <button onClick={saveMaster} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">SIMPAN MASTER RESEP 💾</button>
               </div>
             ) : (
               <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[40px] text-slate-900 shadow-xl border-4 border-indigo-100 text-center relative overflow-hidden">
                     <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Input Target Produksi</p>
                     <div className="flex items-center justify-center gap-4 mb-2">
                        <input 
                          type="number" onFocus={e => e.target.select()}
                          className="bg-slate-50 border-4 border-indigo-600 font-black text-5xl text-center outline-none w-36 h-24 rounded-3xl text-slate-900 shadow-inner" 
                          value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} 
                        />
                        <span className="text-2xl font-black text-slate-400 uppercase">{allMaterials.find(m => m.id === resultItemId)?.unit}</span>
                     </div>
                     <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-400 truncate mt-2">Resep: {activeRecipe?.name}</h3>
                  </div>

                  <div className="bg-white p-6 rounded-[40px] border-2 border-slate-100 shadow-xl space-y-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b pb-3">Checklist Persiapan Bahan</p>
                     <div className="space-y-2.5">
                        {components.map(comp => {
                           const material = allMaterials.find(m => m.id === comp.inventoryItemId);
                           const isShort = (material?.quantity || 0) < comp.quantity;
                           return (
                             <div key={comp.id} className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${isShort ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div>
                                   <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{material?.name || '??'}</p>
                                   <p className={`text-[8px] font-bold uppercase ${isShort ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                      {isShort ? `! KURANG ${Math.abs((material?.quantity || 0) - comp.quantity).toFixed(1)} ${material?.unit}` : `Ready: ${material?.quantity} ${material?.unit}`}
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className={`text-base font-black ${isShort ? 'text-red-700' : 'text-indigo-600'}`}>{comp.quantity.toLocaleString()} <span className="text-[8px] uppercase">{material?.unit}</span></p>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                  <button onClick={finishProduction} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-100 active:scale-95 transition-all">SELESAIKAN PRODUKSI ✅</button>
               </div>
             )}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
              ⚠️
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Resep?</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed px-4 uppercase">
              Resep <span className="text-red-600 font-black">"{recipeToDelete.name}"</span> akan dihapus permanen. Data produksi yang sudah terjadi tidak akan berubah.
            </p>
            
            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={confirmDeleteRecipe}
                className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all active:scale-95"
              >
                HAPUS PERMANEN 🗑️
              </button>
              <button 
                onClick={() => setRecipeToDelete(null)}
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
