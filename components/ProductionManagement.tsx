
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
    inventory = [], selectedOutletId, outlets = [], processProduction, 
    wipRecipes = [], addWIPRecipe, updateWIPRecipe, deleteWIPRecipe, productionRecords = [],
    currentUser, fetchFromCloud, isSaving
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'logs'>('recipes');
  const [activeRecipe, setActiveRecipe] = useState<WIPRecipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<WIPRecipe | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  
  // Form State
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [resultItemId, setResultItemId] = useState('');
  const [resultQuantity, setResultQuantity] = useState(1);
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [isCashierOperatedFlag, setIsCashierOperatedFlag] = useState(false);

  // Search Logic
  const [globalSearch, setGlobalSearch] = useState('');
  const [pickerModal, setPickerModal] = useState<{rowId: string, type: 'wip' | 'material'} | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const isGlobalView = selectedOutletId === 'all';
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  useEffect(() => {
    fetchFromCloud();
  }, []);
  
  const allMaterials = useMemo(() => 
    isGlobalView ? inventory : inventory.filter(i => i.outletId === selectedOutletId), 
    [inventory, selectedOutletId, isGlobalView]
  );

  const filteredRecipes = useMemo(() => {
    let base = wipRecipes.filter(r => isGlobalView || (r.assignedOutletIds || []).includes(selectedOutletId));
    if (isCashier) base = base.filter(r => r.isCashierOperated === true);
    return base.filter(r => r.name.toLowerCase().includes(globalSearch.toLowerCase()));
  }, [wipRecipes, globalSearch, selectedOutletId, isCashier, isGlobalView]);

  const filteredLogs = useMemo(() => {
    if (!productionRecords || !Array.isArray(productionRecords)) return [];
    return productionRecords
      .filter(p => isGlobalView || p.outletId === selectedOutletId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [productionRecords, selectedOutletId, isGlobalView]);

  useEffect(() => {
    if (activeRecipe && !isEditingMode) {
       const ratio = resultQuantity / activeRecipe.resultQuantity;
       setComponents((activeRecipe.components || []).map(c => ({
          id: Math.random().toString(36).substr(2, 9),
          inventoryItemId: c.inventoryItemId,
          quantity: Number((c.quantity * ratio).toFixed(3))
       })));
    }
  }, [resultQuantity, activeRecipe, isEditingMode]);

  const startNewRecipe = () => {
    setRecipeName(''); setResultItemId(''); setResultQuantity(1); setComponents([]);
    setIsCashierOperatedFlag(false); setSelectedBranches(isGlobalView ? [outlets[0]?.id] : [selectedOutletId]);
    setIsEditingMode(true); setView('form'); setActiveRecipe(null);
  };

  const handleEditRecipe = (r: WIPRecipe) => {
    setActiveRecipe(r); setRecipeName(r.name); setResultItemId(r.resultItemId);
    setResultQuantity(r.resultQuantity); setIsCashierOperatedFlag(r.isCashierOperated || false);
    setSelectedBranches(r.assignedOutletIds || []);
    setComponents((r.components || []).map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
    setIsEditingMode(true); setView('form');
  };

  const handleDeleteRecipe = async () => {
    if (recipeToDelete) {
      await deleteWIPRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
      await fetchFromCloud();
    }
  };

  const handleExecuteMode = (r: WIPRecipe) => {
    if (isGlobalView) return alert("Pilih cabang spesifik terlebih dahulu!");
    setActiveRecipe(r); 
    setResultItemId(r.resultItemId);
    setResultQuantity(r.resultQuantity); 
    setIsEditingMode(false); 
    setView('form');
  };

  const saveMaster = async () => {
    if (!recipeName || !resultItemId || components.length === 0) return alert("Mohon lengkapi Nama Resep, Item Hasil, dan Bahan Baku!");
    setIsProcessingLocal(true);
    const payload = {
      name: recipeName, 
      resultItemId, 
      resultQuantity, 
      isCashierOperated: isCashierOperatedFlag,
      assignedOutletIds: selectedBranches,
      components: components.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity }))
    };
    if (activeRecipe) await updateWIPRecipe({ ...activeRecipe, ...payload });
    else await addWIPRecipe(payload);
    setView('list');
    setIsProcessingLocal(false);
    await fetchFromCloud();
  };

  const finishProduction = async () => {
    const insufficient = components.filter(c => {
       const mat = allMaterials.find(m => m.id === c.inventoryItemId);
       return (mat?.quantity || 0) < c.quantity;
    });
    
    if (insufficient.length > 0) return alert("Stok bahan di gudang tidak mencukupi untuk batch ini!");
    
    setIsProcessingLocal(true);
    try {
      await processProduction({ resultItemId, resultQuantity, components });
      setShowSuccessToast(true);
      
      // Delay for toast effect and view transition
      setTimeout(async () => {
        setShowSuccessToast(false);
        await fetchFromCloud();
        setView('list');
        setActiveSubTab('logs');
        setIsProcessingLocal(false);
      }, 1800);
    } catch (err) {
      alert("Terjadi kesalahan teknis saat memproses produksi.");
      setIsProcessingLocal(false);
    }
  };

  const addComponentRow = (item?: InventoryItem) => {
    const id = Math.random().toString(36).substr(2, 9);
    setComponents([...components, { 
      id, 
      inventoryItemId: item?.id || '', 
      quantity: 1 
    }]);
    setPickerModal(null);
  };

  const filteredPickerItems = useMemo(() => {
    if (!pickerModal) return [];
    return inventory
      .filter(i => isGlobalView ? true : i.outletId === selectedOutletId)
      .filter(i => pickerModal.type === 'wip' ? i.type === InventoryItemType.WIP : i.type === InventoryItemType.RAW)
      .filter(i => i.name.toLowerCase().includes(pickerQuery.toLowerCase()));
  }, [pickerModal, pickerQuery, inventory, selectedOutletId, isGlobalView]);

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden relative">
      {/* TOAST SUCCESS PRECISE */}
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-10 py-5 rounded-[40px] shadow-2xl flex items-center gap-5 border-2 border-indigo-500/30">
              <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-lg animate-bounce">👨‍🍳</div>
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.3em] leading-none text-indigo-400">Produksi Berhasil!</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1.5 tracking-widest">Stok WIP bertambah, bahan baku dikurangi.</p>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border-b shrink-0 z-20 shadow-sm">
         <div className="p-4 md:p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">🧪</div>
               <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Produksi & Mixing</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-[0.2em]">{isGlobalView ? 'Global Monitoring' : activeOutlet?.name}</p>
               </div>
            </div>
            {view === 'list' && !isCashier && activeSubTab === 'recipes' && (
              <button onClick={startNewRecipe} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all">+ Master Baru</button>
            )}
            {view === 'form' && (
               <button onClick={() => setView('list')} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
            )}
         </div>

         {view === 'list' && (
           <div className="px-4 md:px-6 pb-3">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit border shadow-inner">
                 <button onClick={() => setActiveSubTab('recipes')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'recipes' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>Master Resep</button>
                 <button onClick={() => setActiveSubTab('logs')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'logs' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                   Riwayat
                   {filteredLogs.length > 0 && <span className="ml-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[8px]">{filteredLogs.length}</span>}
                 </button>
              </div>
           </div>
         )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-40">
        {view === 'list' ? (
          <div className="max-w-7xl mx-auto">
             {activeSubTab === 'recipes' ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecipes.map(r => (
                    <div key={r.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-500 hover:shadow-2xl transition-all">
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-indigo-50 rounded-[28px] flex items-center justify-center text-3xl shadow-inner text-indigo-600">🍳</div>
                             <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{r.name}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Standard Batch: {r.resultQuantity} {inventory.find(i => i.id === r.resultItemId)?.unit || 'Unit'}</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-3">
                          <button onClick={() => handleExecuteMode(r)} className="flex-[4] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all">MULAI MASAK ⚡</button>
                          {!isCashier && (
                            <div className="flex flex-1 gap-2">
                               <button onClick={() => handleEditRecipe(r)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[11px] uppercase border border-slate-100 hover:bg-slate-100 transition-all text-center">Edit</button>
                               <button onClick={() => setRecipeToDelete(r)} className="w-12 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center border border-red-100 hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20">
                       <p className="text-sm font-black uppercase italic">Belum ada resep terdaftar.</p>
                    </div>
                  )}
               </div>
             ) : (
               <div className="space-y-4">
                  {filteredLogs.map(log => {
                    const resultItem = inventory.find(i => i.id === log.resultItemId);
                    return (
                      <div key={log.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col gap-6">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex gap-5 items-center">
                               <div className="w-16 h-16 bg-slate-900 rounded-[32px] flex items-center justify-center shrink-0">
                                  <span className="text-[14px] font-black text-white">{(new Date(log.timestamp)).getHours().toString().padStart(2,'0')}:{(new Date(log.timestamp)).getMinutes().toString().padStart(2,'0')}</span>
                               </div>
                               <div>
                                  <h4 className="text-base font-black text-slate-900 uppercase">{resultItem?.name || 'Item Olahan'}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">PIC: {log.staffName} • {new Date(log.timestamp).toLocaleDateString()}</p>
                               </div>
                            </div>
                            <p className="text-2xl font-black text-indigo-600">+{log.resultQuantity} {resultItem?.unit}</p>
                         </div>
                         <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {log.components.map((comp, idx) => (
                               <div key={idx} className="bg-white p-3 rounded-xl border flex justify-between items-center">
                                  <span className="text-[9px] font-black uppercase text-slate-500 truncate pr-2">{inventory.find(i => i.id === comp.inventoryItemId)?.name || '??'}</span>
                                  <span className="text-[10px] font-black text-red-500">-{comp.quantity}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <div className="py-20 text-center opacity-20">
                       <p className="text-sm font-black uppercase italic">Belum ada riwayat produksi.</p>
                    </div>
                  )}
               </div>
             )}
          </div>
        ) : (
           <div className="max-w-3xl mx-auto pb-20">
              {isEditingMode ? (
                 <div className="space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="bg-white p-8 md:p-10 rounded-[48px] border-2 border-indigo-100 shadow-xl space-y-8">
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter text-center">Konfigurasi Master Resep</h3>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Resep</label>
                          <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" placeholder="Contoh: Adonan Corndog Original" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Item Hasil (WIP)</label>
                             <button onClick={() => setPickerModal({rowId: 'result', type: 'wip'})} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs text-left flex justify-between items-center hover:bg-slate-100 transition-colors">
                                <span>{inventory.find(i => i.id === resultItemId)?.name || '-- Pilih Produk Jadi --'}</span>
                                <span className="opacity-30">🔍</span>
                             </button>
                          </div>
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Hasil per Batch ({inventory.find(i => i.id === resultItemId)?.unit || ''})</label>
                             <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 1)} />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Komposisi Bahan Baku (RAW)</label>
                             <button onClick={() => setPickerModal({rowId: 'new', type: 'material'})} className="text-[9px] font-black text-indigo-600">+ Tambah Bahan</button>
                          </div>
                          <div className="space-y-3">
                             {components.map(comp => {
                                const item = inventory.find(i => i.id === comp.inventoryItemId);
                                return (
                                   <div key={comp.id} className="p-4 bg-white border-2 border-slate-50 rounded-2xl flex items-center gap-4 group hover:border-indigo-200 transition-all">
                                      <div className="flex-1 min-w-0">
                                         <p className="text-[11px] font-black text-slate-800 uppercase truncate">{item?.name || 'Pilih Bahan...'}</p>
                                         <p className="text-[8px] font-bold text-slate-400 uppercase">{item?.unit}</p>
                                      </div>
                                      <input type="number" step="any" className="w-24 p-2 bg-slate-50 border rounded-xl font-black text-center text-xs outline-none focus:ring-2 focus:ring-indigo-200" value={comp.quantity} onChange={e => setComponents(prev => prev.map(c => c.id === comp.id ? {...c, quantity: parseFloat(e.target.value) || 0} : c))} />
                                      <button onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))} className="text-red-400 opacity-20 group-hover:opacity-100 hover:text-red-600 transition-all">✕</button>
                                   </div>
                                );
                             })}
                             {components.length === 0 && (
                                <button onClick={() => setPickerModal({rowId: 'new', type: 'material'})} className="w-full py-10 border-4 border-dashed rounded-[32px] text-slate-300 font-black uppercase text-[10px] hover:border-indigo-400 hover:text-indigo-400 transition-all">Pilih Bahan Baku Resep</button>
                             )}
                          </div>
                       </div>
                       <button 
                         disabled={isProcessingLocal}
                         onClick={saveMaster} 
                         className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                       >
                         {isProcessingLocal ? 'MENYIMPAN...' : 'SIMPAN MASTER RESEP 💾'}
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6 animate-in slide-in-from-bottom-5">
                    <div className="bg-white p-10 rounded-[56px] shadow-2xl border-4 border-indigo-50 text-center relative overflow-hidden">
                       <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-8">Berapa Banyak {activeRecipe?.name} yang dibuat?</p>
                       <div className="flex items-center justify-center gap-5">
                          <input 
                            type="number" onFocus={e => e.target.select()}
                            className="bg-slate-50 border-4 border-indigo-600 font-black text-6xl text-center outline-none w-44 h-28 rounded-[40px] text-slate-900 shadow-inner focus:bg-white transition-all" 
                            value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} 
                          />
                          <span className="text-3xl font-black text-slate-300 uppercase">{inventory.find(m => m.id === resultItemId)?.unit}</span>
                       </div>
                    </div>
                    <div className="bg-white p-10 rounded-[56px] border-2 border-slate-100 shadow-xl space-y-6">
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b pb-4 mb-4">Checklist Penggunaan Stok</p>
                       <div className="space-y-3">
                          {components.map(comp => {
                             const material = inventory.find(m => m.id === comp.inventoryItemId);
                             const isShort = (material?.quantity || 0) < comp.quantity;
                             return (
                               <div key={comp.id} className={`p-5 rounded-[28px] border-2 flex justify-between items-center transition-all ${isShort ? 'bg-red-50 border-red-200 shadow-inner' : 'bg-slate-50 border-slate-100'}`}>
                                  <div>
                                     <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1.5">{material?.name || '??'}</p>
                                     <p className={`text-[8px] font-bold uppercase ${isShort ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                        {isShort ? `⚠️ KURANG: ${(comp.quantity - (material?.quantity || 0)).toFixed(1)} ${material?.unit}` : `Ready: ${material?.quantity} ${material?.unit}`}
                                     </p>
                                  </div>
                                  <div className="text-right">
                                     <p className={`text-xl font-black ${isShort ? 'text-red-700' : 'text-indigo-600'}`}>{comp.quantity} <span className="text-[9px] uppercase">{material?.unit}</span></p>
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                    <button 
                      disabled={isProcessingLocal}
                      onClick={finishProduction} 
                      className="w-full py-8 bg-indigo-600 text-white rounded-[40px] font-black text-sm uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-4"
                    >
                       {isProcessingLocal ? (
                         <>
                           <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                           <span>MEMPROSES...</span>
                         </>
                       ) : (
                         <>
                           <span>KONFIRMASI PROSES MASAK</span>
                           <span className="text-2xl">✅</span>
                         </>
                       )}
                    </button>
                 </div>
              )}
           </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-[400] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[48px] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-4 tracking-tighter">Hapus Resep?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase mb-10 leading-relaxed px-4">Resep <span className="text-red-600 font-black">"{recipeToDelete.name}"</span> akan dihapus permanen dari sistem.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleDeleteRecipe} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700">IYA, HAPUS PERMANEN</button>
                 <button onClick={() => setRecipeToDelete(null)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase">Batal</button>
              </div>
           </div>
        </div>
      )}

      {/* PICKER MODAL */}
      {pickerModal && (
         <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-white font-black uppercase text-lg">Pilih dari Gudang</h3>
               <button onClick={() => setPickerModal(null)} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center">✕</button>
            </div>
            <input autoFocus type="text" placeholder="Cari nama item..." className="w-full p-5 bg-white rounded-2xl font-black text-xl mb-6 outline-none border-4 border-indigo-50 shadow-2xl text-slate-900" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} />
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {filteredPickerItems.map(item => (
                  <button key={item.id} onClick={() => {
                        if (pickerModal.rowId === 'result') setResultItemId(item.id);
                        else if (pickerModal.rowId === 'new') addComponentRow(item);
                        setPickerModal(null); setPickerQuery('');
                    }} className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] text-left hover:bg-indigo-600 transition-all group flex justify-between items-center">
                     <div>
                        <p className="text-white font-black uppercase text-sm">{item.name}</p>
                        <p className="text-white/40 text-[9px] font-bold uppercase mt-1">Gudang: {item.quantity} {item.unit}</p>
                     </div>
                     <span className="text-indigo-400 group-hover:text-white text-xl">＋</span>
                  </button>
               ))}
               {filteredPickerItems.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                     <p className="text-white font-black uppercase text-xs">Item tidak ditemukan di gudang cabang ini.</p>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};
