
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItem, MenuSimBOMRow, MenuSimulation } from '../types';

export const MenuEngineering: React.FC = () => {
  const { products, inventory, selectedOutletId, simulations, saveSimulation, deleteSimulation, outlets, transactions } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'simulator'>('audit');
  
  const [activeSimId, setActiveSimId] = useState<string | null>(null);
  const [simName, setSimName] = useState('Draf Menu Baru');
  const [simPrice, setSimPrice] = useState(15000);
  const [shareProfitPercent, setShareProfitPercent] = useState(20);
  const [simBOM, setSimBOM] = useState<MenuSimBOMRow[]>([]);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [simToDelete, setSimToDelete] = useState<MenuSimulation | null>(null);

  // Search/Picker State
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const currentInventory = inventory.filter(i => i.outletId === selectedOutletId);
  const activeOutlet = outlets.find(o => o.id === selectedOutletId);

  const loadSim = (sim: MenuSimulation) => {
    setActiveSimId(sim.id);
    setSimName(sim.name);
    setSimPrice(sim.price);
    setShareProfitPercent(sim.shareProfitPercent);
    setSimBOM(sim.items);
    setActiveSubTab('simulator');
  };

  const createNewSim = () => {
    setActiveSimId(`SIM-${Date.now()}`);
    setSimName('');
    setSimPrice(15000);
    setShareProfitPercent(20);
    setSimBOM([]);
    setActiveSubTab('simulator');
  };

  const handleSave = () => {
    if (!activeSimId) return;
    if (!simName.trim()) return alert("Nama menu tidak boleh kosong.");
    saveSimulation({
      id: activeSimId,
      name: simName,
      price: simPrice,
      shareProfitPercent: shareProfitPercent,
      items: simBOM,
      updatedAt: new Date()
    });
    alert("Projek berhasil disimpan.");
  };

  const rowCalculations = useMemo(() => {
    return simBOM.map(row => {
      const effectiveIsi = row.packageSize * (row.yieldPercent / 100);
      const modal = effectiveIsi > 0 ? (row.purchasePrice / effectiveIsi) * row.recipeQty : 0;
      return { ...row, modal };
    });
  }, [simBOM]);

  const totalVariableCost = rowCalculations.reduce((acc, row) => acc + row.modal, 0);
  const shareProfitAmount = simPrice * (shareProfitPercent / 100);
  const simMargin = simPrice - totalVariableCost - shareProfitAmount;
  const simFCPercent = simPrice > 0 ? (totalVariableCost / simPrice) * 100 : 0;
  
  const profitHealth = useMemo(() => {
    if (simPrice <= 0) return { label: 'INVALID', color: 'text-slate-400', bg: 'bg-slate-50' };
    if (simFCPercent > 45) return { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50' };
    if (simFCPercent > 35) return { label: 'WARNING', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'HEALTHY', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }, [simFCPercent, simPrice]);

  const updateSimRow = (id: string, field: keyof MenuSimBOMRow, val: any) => {
    setSimBOM(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const addSimRow = (invItem?: InventoryItem) => {
    setSimBOM([...simBOM, { 
      id: Math.random().toString(36).substr(2,9), 
      name: invItem ? invItem.name : '', 
      purchasePrice: invItem ? (invItem.costPerUnit || 0) : 0, 
      packageSize: 1, 
      yieldPercent: 100, 
      recipeQty: 0, 
      unit: invItem ? invItem.unit : 'gr'
    }]);
    setShowItemPicker(false);
    setPickerQuery('');
  };

  const auditData = useMemo(() => {
    const closedTxs = transactions.filter(t => t.outletId === selectedOutletId && t.status === 'CLOSED');
    const salesQtyMap: Record<string, number> = {};
    closedTxs.forEach(tx => {
      tx.items.forEach(item => {
        salesQtyMap[item.product.id] = (salesQtyMap[item.product.id] || 0) + item.quantity;
      });
    });

    const metrics = products.map(p => {
      const hpp = p.bom.reduce((acc, bom) => {
        const item = currentInventory.find(inv => inv.id === bom.inventoryItemId);
        return acc + (bom.quantity * (item?.costPerUnit || 0));
      }, 0);
      const margin = p.price - hpp;
      const foodCostPercent = p.price > 0 ? (hpp / p.price) * 100 : 0;
      const qtySold = salesQtyMap[p.id] || 0;
      const totalContribution = margin * qtySold;
      return { ...p, hpp, margin, foodCostPercent, qtySold, totalContribution };
    });

    const totalQty = metrics.reduce((a, b) => a + b.qtySold, 0);
    const avgQty = metrics.length > 0 ? totalQty / metrics.length : 0;
    const avgMargin = metrics.length > 0 ? metrics.reduce((a, b) => a + b.margin, 0) / metrics.length : 0;

    return metrics.map(m => {
      let classification = ""; let classColor = ""; let advice = "";
      if (m.qtySold >= avgQty && m.margin >= avgMargin) { classification = "STARS"; classColor = "bg-emerald-500"; advice = "Sangat Populer & Menguntungkan. Pertahankan!"; }
      else if (m.qtySold >= avgQty && m.margin < avgMargin) { classification = "PLOWHORSES"; classColor = "bg-blue-500"; advice = "Populer tapi margin rendah. Coba naikkan harga atau kurangi HPP."; }
      else if (m.qtySold < avgQty && m.margin >= avgMargin) { classification = "PUZZLES"; classColor = "bg-amber-500"; advice = "Menguntungkan tapi kurang populer. Butuh promosi/marketing."; }
      else { classification = "DOGS"; classColor = "bg-red-500"; advice = "Sudah tidak populer, margin tipis pula. Pertimbangkan dihapus."; }
      return { ...m, classification, classColor, advice };
    }).sort((a, b) => b.totalContribution - a.totalContribution);
  }, [products, currentInventory, transactions, selectedOutletId]);

  const filteredInventoryForPicker = useMemo(() => {
     return currentInventory.filter(i => i.name.toLowerCase().includes(pickerQuery.toLowerCase()));
  }, [currentInventory, pickerQuery]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-700 font-sans">
      {/* HEADER UTAMA */}
      <div className="h-14 border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 no-print bg-white z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setActiveSubTab('audit')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeSubTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Audit</button>
            <button onClick={() => setActiveSubTab('simulator')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeSubTab === 'simulator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Simulator</button>
          </div>
        </div>
        
        {activeSubTab === 'simulator' && (
          <div className="flex items-center gap-2">
             <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase outline-none focus:border-indigo-400 max-w-[100px] md:max-w-none text-slate-900"
                value={activeSimId || ''}
                onChange={(e) => {
                  const sim = simulations.find(s => s.id === e.target.value);
                  if (sim) loadSim(sim);
                  else if (e.target.value === 'new') createNewSim();
                }}
             >
                <option value="" disabled>Pilih Projek</option>
                {simulations.map(sim => <option key={sim.id} value={sim.id}>{sim.name || 'Draft'}</option>)}
                <option value="new">+ BARU</option>
             </select>
             <button onClick={createNewSim} className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm shadow-lg shadow-indigo-100">＋</button>
          </div>
        )}
      </div>

      {activeSubTab === 'audit' && (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
           {/* Summary Cards Audit */}
           <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {[
                   { label: 'STARS', color: 'bg-emerald-500', desc: 'Populer & Untung' },
                   { label: 'PLOWHORSES', color: 'bg-blue-500', desc: 'Laris tapi Tipis' },
                   { label: 'PUZZLES', color: 'bg-amber-500', desc: 'Untung tapi Sepi' },
                   { label: 'DOGS', color: 'bg-red-500', desc: 'Buruk & Tidak Laris' },
                 ].map(item => (
                   <div key={item.label} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className={`w-2 h-10 rounded-full ${item.color}`}></div>
                      <div>
                         <p className="text-[9px] font-black text-slate-900">{item.label}</p>
                         <p className="text-[7px] font-bold text-slate-400 uppercase leading-tight">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Table Audit */}
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                          <th className="py-4 px-6">Nama Menu</th>
                          <th className="py-4 px-2 text-center">Volume</th>
                          <th className="py-4 px-2 text-right">Margin</th>
                          <th className="py-4 px-6 text-right bg-slate-100">Total Profit</th>
                          <th className="py-4 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px]">
                        {auditData.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-3 px-6 font-black text-slate-800 uppercase truncate max-w-[150px]">{p.name}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-400">{p.qtySold} Unit</td>
                            <td className="py-3 px-2 text-right font-black">Rp {p.margin.toLocaleString()}</td>
                            <td className="py-3 px-6 text-right font-black text-indigo-600 bg-indigo-50/20">Rp {p.totalContribution.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                               <span className={`px-2 py-0.5 rounded-md text-[8px] font-black text-white ${p.classColor}`}>{p.classification}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'simulator' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
           {!activeSimId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                 <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center text-4xl mb-6">📐</div>
                 <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter mb-4">Mulai Desain Menu</h3>
                 <button onClick={createNewSim} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100">Buat Projek Baru</button>
              </div>
           ) : (
             <>
               {/* KOLOM 1: WORKSHEET (DAFTAR BAHAN) */}
               <div className="flex-[3] flex flex-col bg-white overflow-hidden border-r border-slate-200">
                  {/* PERSISTENT HEADER WORKSHEET */}
                  <div className="shrink-0 bg-white z-10 border-b">
                      {/* Name Input */}
                      <div className="px-4 py-4 md:px-8 flex justify-between items-center gap-4">
                         <input 
                            type="text"
                            className="flex-1 text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tighter outline-none focus:text-indigo-600 transition-colors bg-transparent placeholder:opacity-20" 
                            value={simName} 
                            onChange={e => setSimName(e.target.value)} 
                            placeholder="Nama Projek..."
                         />
                         <div className="flex gap-2">
                            <button onClick={handleSave} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase border border-emerald-100">SAVE</button>
                            <button onClick={() => setShowDeleteModal(true)} className="bg-red-50 text-red-400 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase">DEL</button>
                         </div>
                      </div>

                      {/* TOMBOL TAMBAH BAHAN - SELALU TERLIHAT DI MOBILE */}
                      <div className="px-4 py-3 bg-slate-50 flex gap-2 md:px-8 border-t border-slate-100">
                         <button 
                           onClick={() => setShowItemPicker(true)}
                           className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                         >
                            <span>📦</span> <span className="truncate">Cari Gudang</span>
                         </button>
                         <button 
                           onClick={() => addSimRow()} 
                           className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                         >
                            <span>➕</span> <span className="truncate">Baris Manual</span>
                         </button>
                      </div>
                  </div>

                  {/* DAFTAR BAHAN BAKU (SCROLLABLE) */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-4 pb-32">
                     {simBOM.length === 0 ? (
                        <div className="py-16 text-center space-y-4">
                           <p className="text-slate-300 font-black uppercase text-[10px] italic">Belum ada bahan baku</p>
                           <div className="flex flex-col gap-2 max-w-[200px] mx-auto opacity-50">
                              <button onClick={() => setShowItemPicker(true)} className="py-3 border-2 border-dashed rounded-2xl text-[9px] font-black uppercase">Ambil dari Gudang</button>
                              <button onClick={() => addSimRow()} className="py-3 border-2 border-dashed rounded-2xl text-[9px] font-black uppercase">Input Manual</button>
                           </div>
                        </div>
                     ) : (
                        rowCalculations.map((row) => (
                           <div key={row.id} className="bg-white border-2 border-slate-100 rounded-3xl p-4 md:p-6 shadow-sm hover:border-indigo-200 transition-all space-y-4 relative overflow-hidden group">
                              <button onClick={() => setSimBOM(prev => prev.filter(s => s.id !== row.id))} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500">✕</button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                 <div className="md:col-span-2">
                                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Nama Bahan Baku</label>
                                    <input type="text" className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-200" value={row.name} onChange={e => updateSimRow(row.id, 'name', e.target.value)} />
                                 </div>
                                 
                                 <div className="grid grid-cols-2 md:grid-cols-4 md:col-span-4 gap-3">
                                    <div>
                                       <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Harga Beli</label>
                                       <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none" value={row.purchasePrice} onChange={e => updateSimRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                       <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Porsi/Yield%</label>
                                       <div className="flex items-center bg-slate-50 rounded-xl px-2">
                                          <input type="number" className="w-full bg-transparent p-3 font-black text-xs outline-none text-indigo-600" value={row.yieldPercent} onChange={e => updateSimRow(row.id, 'yieldPercent', parseFloat(e.target.value) || 100)} />
                                          <span className="text-[9px] font-black text-slate-300">%</span>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Takaran</label>
                                       <input type="number" className="w-full bg-indigo-50 border border-indigo-100 p-3 rounded-xl font-black text-xs text-indigo-700 outline-none" value={row.recipeQty} onChange={e => updateSimRow(row.id, 'recipeQty', parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="text-right">
                                       <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Total HPP</label>
                                       <p className="text-sm font-black text-slate-900 pt-2">Rp {Math.round(row.modal).toLocaleString()}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* KOLOM 2: ANALYTICS (SUMMARY) */}
               <div className="flex-1 bg-slate-50 border-l border-slate-200 overflow-y-auto p-6 space-y-6 shrink-0 custom-scrollbar pb-40">
                  <div className="flex justify-between items-center mb-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Forecast</h4>
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${profitHealth.bg} ${profitHealth.color} border border-current`}>{profitHealth.label}</span>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Retail Selling Price (Rp)</label>
                        <input 
                           type="number" 
                           className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-900 text-center focus:border-indigo-500 outline-none transition-all"
                           value={simPrice}
                           onChange={e => setSimPrice(parseInt(e.target.value) || 0)}
                        />
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-slate-400 uppercase">Cost of Goods (HPP)</span>
                           <span className="text-slate-900">Rp {Math.round(totalVariableCost).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-slate-400 uppercase">Commision ({shareProfitPercent}%)</span>
                           <span className="text-slate-900">Rp {Math.round(shareProfitAmount).toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center">
                           <span className="text-[11px] font-black text-slate-900 uppercase">Net Margin</span>
                           <span className={`text-lg font-black ${simMargin > 0 ? 'text-indigo-600' : 'text-red-500'}`}>Rp {Math.round(simMargin).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>

                  {/* Food Cost Indicator */}
                  <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl">
                     <div className="flex justify-between items-end mb-4">
                        <div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Food Cost Ratio</p>
                           <h3 className={`text-3xl font-black ${simFCPercent > 40 ? 'text-red-400' : 'text-emerald-400'}`}>{simFCPercent.toFixed(1)}%</h3>
                        </div>
                        <p className="text-[7px] font-bold text-slate-500 italic max-w-[100px] text-right">Ideal: 28% - 35%</p>
                     </div>
                     <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${simFCPercent > 40 ? 'bg-red-500' : simFCPercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, simFCPercent)}%` }}></div>
                     </div>
                  </div>
               </div>

               {/* MOBILE STICKY FOOTER SUMMARY */}
               <div className="md:hidden fixed bottom-[64px] left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                  <div>
                     <p className="text-[7px] font-black text-slate-400 uppercase">Est. Net Margin</p>
                     <p className={`text-lg font-black ${simMargin > 0 ? 'text-indigo-600' : 'text-red-500'}`}>Rp {Math.round(simMargin).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[7px] font-black text-slate-400 uppercase">Food Cost</p>
                     <p className={`text-base font-black ${simFCPercent > 35 ? 'text-orange-500' : 'text-emerald-500'}`}>{simFCPercent.toFixed(1)}%</p>
                  </div>
               </div>
             </>
           )}
        </div>
      )}

      {/* MODAL PICKER MATERIAL */}
      {showItemPicker && (
         <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-white font-black uppercase text-lg tracking-tighter">Pilih Bahan Baku</h3>
                  <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest">Master Data Gudang Aktif</p>
               </div>
               <button onClick={() => setShowItemPicker(false)} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center">✕</button>
            </div>
            <input 
               autoFocus
               type="text" 
               placeholder="Ketik nama bahan..." 
               className="w-full p-5 bg-white rounded-2xl font-black text-xl mb-6 outline-none border-4 border-indigo-500 shadow-2xl"
               value={pickerQuery}
               onChange={e => setPickerQuery(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {filteredInventoryForPicker.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => addSimRow(item)}
                    className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] text-left hover:bg-indigo-600 hover:border-indigo-400 transition-all group flex justify-between items-center"
                  >
                     <div>
                        <p className="text-white font-black uppercase text-sm">{item.name}</p>
                        <p className="text-white/40 text-[9px] font-bold uppercase mt-1">HPP Unit: Rp {item.costPerUnit.toLocaleString()} / {item.unit}</p>
                     </div>
                     <span className="text-indigo-400 group-hover:text-white text-xl">＋</span>
                  </button>
               ))}
            </div>
         </div>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">🗑️</div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2">Hapus Projek?</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Data simulasi ini tidak dapat dikembalikan.</p>
            <div className="flex flex-col gap-2">
               <button onClick={() => { if(activeSimId) deleteSimulation(activeSimId); setActiveSimId(null); setShowDeleteModal(false); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg">YA, HAPUS PERMANEN</button>
               <button onClick={() => setShowDeleteModal(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
