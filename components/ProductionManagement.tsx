
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
    currentUser, isSaving, dailyClosings = [], brandConfig
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'logs'>('recipes');
  const [activeRecipe, setActiveRecipe] = useState<WIPRecipe | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<WIPRecipe | null>(null);
  
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [resultItemId, setResultItemId] = useState('');
  const [resultQuantity, setResultQuantity] = useState(1);
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [isCashierOperatedFlag, setIsCashierOperatedFlag] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [pickerModal, setPickerModal] = useState<{rowId: string, type: 'wip' | 'material'} | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA');

  const isShiftClosed = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CASHIER) return false;
    return (dailyClosings || []).some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser, todayStr]);

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const isGlobalView = selectedOutletId === 'all';
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  const filteredRecipes = useMemo(() => {
    let base = wipRecipes.filter(r => isGlobalView || (r.assignedOutletIds || []).includes(selectedOutletId));
    if (isCashier) base = base.filter(r => r.isCashierOperated === true);
    return base.filter(r => r.name.toLowerCase().includes(globalSearch.toLowerCase()));
  }, [wipRecipes, globalSearch, selectedOutletId, isCashier, isGlobalView]);

  // UPDATE: Log produksi difilter hari ini saja
  const filteredLogs = useMemo(() => {
    if (!productionRecords || !Array.isArray(productionRecords)) return [];
    return productionRecords
      .filter(p => {
        const isCorrectOutlet = isGlobalView || p.outletId === selectedOutletId;
        const isToday = new Date(p.timestamp).toLocaleDateString('en-CA') === todayStr;
        return isCorrectOutlet && isToday;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [productionRecords, selectedOutletId, isGlobalView, todayStr]);

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
    if (isShiftClosed) return alert("Akses Terkunci. Anda sudah melakukan Tutup Shift hari ini.");
    setRecipeName(''); setResultItemId(''); setResultQuantity(1); setComponents([]);
    setIsCashierOperatedFlag(false); 
    setSelectedBranches(isGlobalView ? outlets.map(o => o.id) : [selectedOutletId]);
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
    if (!recipeToDelete) return;
    try {
      await deleteWIPRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
    } catch (err) {
      alert("Gagal menghapus resep.");
    }
  };

  const handleExecuteMode = (r: WIPRecipe) => {
    if (isShiftClosed) return alert("Akses Terkunci. Anda sudah melakukan Tutup Shift hari ini.");
    if (isGlobalView) return alert("Pilih cabang spesifik terlebih dahulu!");
    setActiveRecipe(r); 
    setResultItemId(r.resultItemId);
    setResultQuantity(r.resultQuantity); 
    setIsEditingMode(false); 
    setView('form');
  };

  const finishProduction = async () => {
    if (isProcessingLocal) return;
    const insufficient = components.filter(c => {
       const sourceItemInfo = inventory.find(i => i.id === c.inventoryItemId);
       if (!sourceItemInfo) return true;
       const localMat = inventory.find(i => i.name === sourceItemInfo.name && i.outletId === selectedOutletId);
       return (localMat?.quantity || 0) < c.quantity;
    });
    if (insufficient.length > 0) {
       const firstBadItem = inventory.find(i => i.id === insufficient[0].inventoryItemId)?.name;
       return alert(`⚠️ STOK TIDAK CUKUP: ${firstBadItem} tidak mencukupi untuk batch ini!`);
    }
    setIsProcessingLocal(true);
    try {
      setShowSuccessToast(true);
      setView('list');
      setActiveSubTab('logs');
      await processProduction({ resultItemId, resultQuantity, components });
      setTimeout(() => {
        setShowSuccessToast(false);
        setIsProcessingLocal(false);
      }, 1500);
    } catch (err) {
      setIsProcessingLocal(false);
      alert("⚠️ Gangguan koneksi saat update database.");
    }
  };

  const saveMaster = async () => {
    if (isProcessingLocal) return;
    if (!recipeName || !resultItemId || components.length === 0) return alert("Lengkapi data master resep!");
    setIsProcessingLocal(true);
    try {
      const payload = {
        name: recipeName, resultItemId, resultQuantity, 
        isCashierOperated: isCashierOperatedFlag,
        assignedOutletIds: selectedBranches,
        components: components.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity }))
      };
      if (activeRecipe) await updateWIPRecipe({ ...activeRecipe, ...payload });
      else await addWIPRecipe(payload);
      setView('list');
    } finally {
      setIsProcessingLocal(false);
    }
  };

  const addComponentRow = (item?: InventoryItem) => {
    const id = Math.random().toString(36).substr(2, 9);
    setComponents([...components, { id, inventoryItemId: item?.id || '', quantity: 1 }]);
    setPickerModal(null);
  };

  const filteredPickerItems = useMemo(() => {
    if (!pickerModal) return [];
    const uniqueNames = new Set();
    return inventory.filter(i => {
         const matchesSearch = i.name.toLowerCase().includes(pickerQuery.toLowerCase());
         const isCorrectType = pickerModal.type === 'wip' ? i.type === InventoryItemType.WIP : true;
         const isNew = !uniqueNames.has(i.name.toLowerCase());
         if (matchesSearch && isCorrectType && isNew) {
            uniqueNames.add(i.name.toLowerCase());
            return true;
         }
         return false;
      });
  }, [pickerModal, pickerQuery, inventory]);

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden relative">
      {/* TOAST NOTIF */}
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
              <span className="text-xl">✅</span>
              <p className="text-[11px] font-black uppercase tracking-widest">Produksi Dicatat</p>
           </div>
        </div>
      )}

      {/* COMPACT HEADER */}
      <div className="bg-white border-b shrink-0 z-20 shadow-sm">
         <div className="p-3 md:px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm shadow-md">🧪</div>
               <div>
                  <h2 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tighter leading-none">Produksi & Mixing</h2>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{isGlobalView ? 'Global Control' : activeOutlet?.name}</p>
               </div>
            </div>
            <div className="flex gap-2">
                {view === 'list' && !isCashier && activeSubTab === 'recipes' && (
                <button 
                    disabled={isShiftClosed || isProcessingLocal}
                    onClick={startNewRecipe} 
                    className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-md transition-all ${isShiftClosed || isProcessingLocal ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-orange-600'}`}
                >
                    + Master Baru
                </button>
                )}
                {view === 'form' && (
                <button onClick={() => setView('list')} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-inner">✕</button>
                )}
            </div>
         </div>

         {view === 'list' && (
           <div className="px-3 md:px-6 pb-2">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit border shadow-inner">
                 <button onClick={() => setActiveSubTab('recipes')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeSubTab === 'recipes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Resep</button>
                 <button onClick={() => setActiveSubTab('logs')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeSubTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Log</button>
              </div>
           </div>
         )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-24">
        {view === 'list' ? (
          <div className="max-w-7xl mx-auto">
             {activeSubTab === 'recipes' ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredRecipes.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-500 transition-all active:scale-[0.98]">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shadow-inner text-indigo-600">🍳</div>
                          <div className="min-w-0">
                             <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight truncate">{r.name}</h4>
                             <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 truncate">Batch: {r.resultQuantity} {inventory.find(i => i.id === r.resultItemId)?.unit}</p>
                          </div>
                       </div>
                       <div className="flex gap-1.5">
                          <button 
                            disabled={isShiftClosed || isProcessingLocal}
                            onClick={() => handleExecuteMode(r)} 
                            className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md transition-all ${isShiftClosed || isProcessingLocal ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white'}`}
                          >
                            MASAK
                          </button>
                          {!isCashier && (
                            <div className="flex gap-1">
                              <button onClick={() => handleEditRecipe(r)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-100 hover:bg-slate-100">✏️</button>
                              <button onClick={(e) => { e.stopPropagation(); setRecipeToDelete(r); }} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center border border-red-100 hover:bg-red-100">🗑️</button>
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="space-y-2">
                  <div className="flex justify-between items-center mb-4 px-1">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produksi Hari Ini</h4>
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter">Tanggal: {todayStr}</p>
                      </div>
                  </div>
                  {filteredLogs.map(log => {
                    const resultItem = inventory.find(i => i.id === log.resultItemId);
                    return (
                      <div key={log.id} className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                         <div className="flex gap-4 items-center min-w-0">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                               <span className="text-[10px] font-black text-white">{new Date(log.timestamp).getHours().toString().padStart(2,'0')}:{new Date(log.timestamp).getMinutes().toString().padStart(2,'0')}</span>
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-[11px] font-black text-slate-900 uppercase truncate">{resultItem?.name}</h4>
                               <p className="text-[8px] font-bold text-slate-400 uppercase">{log.staffName.split(' ')[0]} • {new Date(log.timestamp).toLocaleDateString()}</p>
                            </div>
                         </div>
                         <p className="text-sm font-black text-indigo-600 shrink-0">+ {log.resultQuantity} {resultItem?.unit}</p>
                      </div>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                     <div className="py-20 text-center opacity-20 italic text-[10px] uppercase font-black border-2 border-dashed rounded-[32px]">Belum ada produksi hari ini</div>
                  )}
               </div>
             )}
          </div>
        ) : (
           <div className="max-w-4xl mx-auto">
              {isEditingMode ? (
                 <div className="bg-white p-6 md:p-8 rounded-[32px] border shadow-xl space-y-6 animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Konfigurasi Master Resep</h3>
                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">BUILDER MODE</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Nama Resep/Hasil</label>
                                <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" placeholder="Contoh: Mozzarella Batangan..." value={recipeName} onChange={e => setRecipeName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Item Output</label>
                                    <button onClick={() => setPickerModal({rowId: 'result', type: 'wip'})} className="w-full p-3 bg-slate-50 border rounded-xl font-black text-[10px] text-left truncate">
                                        {inventory.find(i => i.id === resultItemId)?.name || 'Pilih...'}
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Qty Standard</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-black text-slate-500 uppercase flex-1">Izinkan Kasir Masak Sendiri?</span>
                                <button onClick={() => setIsCashierOperatedFlag(!isCashierOperatedFlag)} className={`w-10 h-5 rounded-full relative transition-all ${isCashierOperatedFlag ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isCashierOperatedFlag ? 'right-0.5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Bill of Materials (Komposisi)</label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {components.map(comp => (
                                    <div key={comp.id} className="p-3 bg-white border rounded-xl flex items-center gap-3 shadow-sm">
                                        <span className="flex-1 font-black uppercase text-[10px] truncate">{inventory.find(i => i.id === comp.inventoryItemId)?.name || 'Pilih...'}</span>
                                        <input type="number" step="any" className="w-16 p-1.5 bg-slate-50 border rounded-lg font-black text-center text-[10px]" value={comp.quantity} onChange={e => setComponents(prev => prev.map(c => c.id === comp.id ? {...c, quantity: parseFloat(e.target.value) || 0} : c))} />
                                        <button onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))} className="text-rose-500 font-black">✕</button>
                                    </div>
                                ))}
                                <button onClick={() => setPickerModal({rowId: 'new', type: 'material'})} className="w-full py-3 border-2 border-dashed rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-indigo-400">+ Tambah Bahan</button>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={saveMaster} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95">SIMPAN KONFIGURASI 💾</button>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in slide-in-from-bottom-3">
                    {/* LEFT PANEL: QTY CONTROL */}
                    <div className="md:col-span-4 space-y-4">
                       <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">MASAK: {activeRecipe?.name}</p>
                          <div className="w-full relative">
                             <input 
                                type="number" 
                                className="w-full bg-slate-50 border-2 border-indigo-600 font-black text-4xl text-center py-5 rounded-2xl text-slate-900 outline-none" 
                                value={resultQuantity} 
                                onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} 
                             />
                             <div className="mt-2 text-[10px] font-black text-slate-400 uppercase">{inventory.find(m => m.id === resultItemId)?.unit} HASIL AKHIR</div>
                          </div>
                       </div>
                       <div className="bg-slate-900 p-5 rounded-[24px] text-white">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Cabang Aktif</p>
                          <p className="text-xs font-black uppercase">{activeOutlet?.name}</p>
                       </div>
                    </div>

                    {/* RIGHT PANEL: MATERIAL LIST (COMPACT LIST) */}
                    <div className="md:col-span-8 flex flex-col gap-4">
                       <div className="bg-white p-4 md:p-6 rounded-[32px] shadow-sm border border-slate-100 flex-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Daftar Penggunaan Bahan:</h4>
                          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                             {components.map((comp, idx) => {
                                const baseItem = inventory.find(i => i.id === comp.inventoryItemId);
                                const realStok = inventory.find(i => i.name === baseItem?.name && i.outletId === selectedOutletId);
                                const isShort = (realStok?.quantity || 0) < comp.quantity;
                                return (
                                   <div key={idx} className={`flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all ${isShort ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                      <div className="min-w-0 flex-1 pr-4">
                                         <p className="text-[10px] font-black uppercase text-slate-800 truncate">{baseItem?.name}</p>
                                         <p className={`text-[7px] font-bold uppercase ${isShort ? 'text-rose-500' : 'text-slate-400'}`}>Stok Ready: {(realStok?.quantity || 0).toLocaleString()} {baseItem?.unit}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className={`text-[11px] font-black ${isShort ? 'text-rose-600' : 'text-slate-900'}`}>-{comp.quantity.toLocaleString()} <span className="text-[7px] text-slate-400 uppercase">{baseItem?.unit}</span></p>
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       </div>
                       
                       <button 
                          onClick={finishProduction} 
                          disabled={isProcessingLocal} 
                          className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                       >
                          {isProcessingLocal ? 'SYNCING...' : 'FINISH & UPDATE STOK ✓'}
                       </button>
                    </div>
                 </div>
              )}
           </div>
        )}
      </div>

      {/* PICKER MODAL */}
      {pickerModal && (
         <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6 text-white max-w-xl mx-auto w-full px-2">
               <h3 className="font-black uppercase text-lg tracking-tighter">Pilih Item Database</h3>
               <button onClick={() => { setPickerModal(null); setPickerQuery(''); }} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">✕</button>
            </div>
            <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
               <input autoFocus type="text" placeholder="Cari..." className="w-full p-4 bg-white rounded-2xl font-black text-sm mb-4 outline-none border-4 border-indigo-50 shadow-2xl text-slate-900" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} />
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-10">
                  {filteredPickerItems.map(item => (
                     <button key={item.id} onClick={() => {
                           if (pickerModal.rowId === 'result') setResultItemId(item.id);
                           else if (pickerModal.rowId === 'new') addComponentRow(item);
                           setPickerModal(null); setPickerQuery('');
                       }} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all text-white flex justify-between items-center group">
                        <div>
                           <p className="font-black uppercase text-[11px]">{item.name}</p>
                           <p className="text-white/40 text-[8px] uppercase mt-1">Unit: {item.unit}</p>
                        </div>
                        <span className="text-indigo-400 group-hover:text-white transition-colors">＋</span>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Resep?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Master resep <span className="text-red-600 font-black">"{recipeToDelete.name}"</span> akan dihapus permanen dari sistem.
              </p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleDeleteRecipe} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700 active:scale-95 transition-all">IYA, HAPUS PERMANEN</button>
                 <button onClick={() => setRecipeToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-600 transition-colors">Batal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
