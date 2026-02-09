
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
    currentUser, isSaving, dailyClosings = []
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'recipes' | 'logs'>('recipes');
  const [activeRecipe, setActiveRecipe] = useState<WIPRecipe | null>(null);
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

  // Search/Picker State
  const [globalSearch, setGlobalSearch] = useState('');
  const [pickerModal, setPickerModal] = useState<{rowId: string, type: 'wip' | 'material'} | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const isShiftClosed = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CASHIER) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (dailyClosings || []).some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser]);

  const isCashier = currentUser?.role === UserRole.CASHIER;
  const isGlobalView = selectedOutletId === 'all';
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

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

  // Dinamis menghitung kebutuhan bahan real-time berdasarkan input kuantitas produksi
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
    
    // VALIDASI STOK: Pastikan semua bahan di outlet ini cukup
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
      
      // Update store & cloud
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
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-10 py-5 rounded-[40px] shadow-2xl flex items-center gap-5 border-2 border-indigo-500/30">
              <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-lg animate-bounce">👨‍🍳</div>
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.3em] leading-none text-indigo-400">Berhasil!</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1.5 tracking-widest">Stok telah diperbarui.</p>
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
              <button 
                disabled={isShiftClosed || isProcessingLocal}
                onClick={startNewRecipe} 
                className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all ${isShiftClosed || isProcessingLocal ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                + Master Baru
              </button>
            )}
            {view === 'form' && (
               <button onClick={() => setView('list')} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
            )}
         </div>

         {view === 'list' && (
           <div className="px-4 md:px-6 pb-3">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit border shadow-inner">
                 <button onClick={() => setActiveSubTab('recipes')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'recipes' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>Master Resep</button>
                 <button onClick={() => setActiveSubTab('logs')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'logs' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>Riwayat</button>
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
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 bg-indigo-50 rounded-[28px] flex items-center justify-center text-3xl shadow-inner text-indigo-600">🍳</div>
                          <div>
                             <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{r.name}</h4>
                             <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Standard Batch: {r.resultQuantity} {inventory.find(i => i.id === r.resultItemId)?.unit || 'Unit'}</p>
                          </div>
                       </div>
                       <div className="flex gap-3">
                          <button 
                            disabled={isShiftClosed || isProcessingLocal}
                            onClick={() => handleExecuteMode(r)} 
                            className={`flex-[4] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${isShiftClosed || isProcessingLocal ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white active:scale-95'}`}
                          >
                            MULAI MASAK ⚡
                          </button>
                          {!isCashier && (
                            <button onClick={() => handleEditRecipe(r)} className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">✏️</button>
                          )}
                       </div>
                    </div>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-30 italic text-xs font-black uppercase">Belum ada resep produksi</div>
                  )}
               </div>
             ) : (
               <div className="space-y-4">
                  {filteredLogs.map(log => {
                    const resultItem = inventory.find(i => i.id === log.resultItemId);
                    return (
                      <div key={log.id} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col gap-6">
                         <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex gap-5 items-center">
                               <div className="w-16 h-16 bg-slate-900 rounded-[32px] flex items-center justify-center shrink-0">
                                  <span className="text-[14px] font-black text-white">{new Date(log.timestamp).getHours().toString().padStart(2,'0')}:{new Date(log.timestamp).getMinutes().toString().padStart(2,'0')}</span>
                               </div>
                               <div>
                                  <h4 className="text-base font-black text-slate-900 uppercase">{resultItem?.name}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Operator: {log.staffName}</p>
                               </div>
                            </div>
                            <p className="text-2xl font-black text-indigo-600">+ {log.resultQuantity} {resultItem?.unit}</p>
                         </div>
                      </div>
                    );
                  })}
               </div>
             )}
          </div>
        ) : (
           <div className="max-w-5xl mx-auto pb-20">
              {isEditingMode ? (
                 <div className="bg-white p-8 md:p-10 rounded-[48px] border shadow-xl space-y-8 animate-in slide-in-from-bottom-5">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter text-center">Master Resep & Mixing</h3>
                    <div className="space-y-6">
                       <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" placeholder="Nama Hasil Mixing..." value={recipeName} onChange={e => setRecipeName(e.target.value)} />
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setPickerModal({rowId: 'result', type: 'wip'})} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs text-left truncate">
                             {inventory.find(i => i.id === resultItemId)?.name || '-- Pilih Item Hasil --'}
                          </button>
                          <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Komposisi Bahan Baku (BOM)</label>
                          {components.map(comp => (
                             <div key={comp.id} className="p-4 bg-white border-2 border-slate-50 rounded-2xl flex items-center gap-4">
                                <span className="flex-1 font-black uppercase text-[11px] truncate">{inventory.find(i => i.id === comp.inventoryItemId)?.name || 'Pilih Bahan'}</span>
                                <div className="flex items-center gap-2">
                                  <input type="number" step="any" className="w-24 p-2 bg-slate-50 border rounded-xl font-black text-center text-xs" value={comp.quantity} onChange={e => setComponents(prev => prev.map(c => c.id === comp.id ? {...c, quantity: parseFloat(e.target.value) || 0} : c))} />
                                  <button onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))} className="text-rose-500 p-2">✕</button>
                                </div>
                             </div>
                          ))}
                          <button onClick={() => setPickerModal({rowId: 'new', type: 'material'})} className="w-full py-4 border-2 border-dashed rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-400 transition-all">+ Tambah Bahan</button>
                       </div>
                       <button onClick={saveMaster} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN MASTER 💾</button>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6 animate-in slide-in-from-bottom-5">
                    {/* LEGA & PROFESSIONAL FORM EXECUTION */}
                    <div className="bg-white p-8 md:p-14 rounded-[56px] shadow-2xl">
                       <div className="text-center mb-12">
                          <p className="text-[11px] font-black text-indigo-600 uppercase mb-4 tracking-[0.3em]">PROSES MASAK: {activeRecipe?.name}</p>
                          <div className="flex items-center justify-center gap-6">
                             <div className="relative">
                                <input 
                                   type="number" 
                                   className="bg-slate-50 border-4 border-indigo-600 font-black text-6xl text-center w-48 h-32 rounded-[40px] text-slate-900 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100" 
                                   value={resultQuantity} 
                                   onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} 
                                />
                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">QTY</div>
                             </div>
                             <span className="text-4xl font-black text-slate-300 uppercase tracking-tighter">{inventory.find(m => m.id === resultItemId)?.unit}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-6 italic">Ubah kuantitas di atas, takaran bahan di bawah otomatis menyesuaikan.</p>
                       </div>

                       {/* DETAIL BAHAN BAKU - RAPI & LEGA */}
                       <div className="text-left bg-slate-50 p-6 md:p-10 rounded-[48px] border-2 border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b pb-4">Estimasi Penggunaan Material:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {components.map((comp, idx) => {
                                const baseItem = inventory.find(i => i.id === comp.inventoryItemId);
                                const realStok = inventory.find(i => i.name === baseItem?.name && i.outletId === selectedOutletId);
                                const isShort = (realStok?.quantity || 0) < comp.quantity;
                                
                                return (
                                   <div key={idx} className={`flex justify-between items-center p-5 bg-white rounded-[28px] border-2 transition-all ${isShort ? 'border-rose-200 bg-rose-50/30' : 'border-slate-50 shadow-sm'}`}>
                                      <div className="min-w-0 flex-1 pr-4">
                                         <p className="text-[11px] font-black uppercase text-slate-800 truncate">{baseItem?.name}</p>
                                         <p className={`text-[8px] font-bold uppercase mt-1 ${isShort ? 'text-rose-500' : 'text-slate-400'}`}>
                                            Stok: <span className="font-black">{(realStok?.quantity || 0).toLocaleString()} {baseItem?.unit}</span>
                                         </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                         <p className={`text-sm font-black ${isShort ? 'text-rose-600' : 'text-indigo-600'}`}>
                                            -{comp.quantity.toLocaleString()}
                                         </p>
                                         <p className="text-[7px] font-black text-slate-300 uppercase">{baseItem?.unit}</p>
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       </div>
                    </div>

                    <div className="px-2">
                       <button 
                          onClick={finishProduction} 
                          disabled={isProcessingLocal} 
                          className="w-full py-8 bg-indigo-600 text-white rounded-[40px] font-black text-sm uppercase shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-4 border-b-8 border-indigo-800 transition-all disabled:opacity-50"
                       >
                          {isProcessingLocal ? (
                             <>
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>MEMPROSES DATA...</span>
                             </>
                          ) : (
                             <>
                                <span>KONFIRMASI PROSES MASAK</span>
                                <span className="text-2xl">✅</span>
                             </>
                          )}
                       </button>
                    </div>
                 </div>
              )}
           </div>
        )}
      </div>

      {pickerModal && (
         <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6 text-white max-w-2xl mx-auto w-full">
               <h3 className="font-black uppercase text-lg">Pilih Item Database</h3>
               <button onClick={() => setPickerModal(null)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">✕</button>
            </div>
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
               <input autoFocus type="text" placeholder="Cari item..." className="w-full p-5 bg-white rounded-2xl font-black text-xl mb-6 outline-none border-4 border-indigo-50 shadow-2xl text-slate-900" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} />
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 pb-10">
                  {filteredPickerItems.map(item => (
                     <button key={item.id} onClick={() => {
                           if (pickerModal.rowId === 'result') setResultItemId(item.id);
                           else if (pickerModal.rowId === 'new') addComponentRow(item);
                           setPickerModal(null); setPickerQuery('');
                       }} className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] text-left hover:bg-indigo-600 transition-all text-white flex justify-between items-center group">
                        <div>
                           <p className="font-black uppercase text-sm group-hover:text-white transition-colors">{item.name}</p>
                           <p className="text-white/40 text-[9px] uppercase mt-1">Unit: {item.unit}</p>
                        </div>
                        <span className="text-indigo-400 group-hover:text-white transition-colors">＋</span>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
