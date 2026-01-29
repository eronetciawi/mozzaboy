
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

  const handleDeleteClick = (e: React.MouseEvent, sim: MenuSimulation) => {
    e.stopPropagation();
    setSimToDelete(sim);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (simToDelete) {
      deleteSimulation(simToDelete.id);
      if (activeSimId === simToDelete.id) setActiveSimId(null);
      setShowDeleteModal(false);
      setSimToDelete(null);
    }
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

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-700 font-sans">
      {/* HEADER */}
      <div className="h-14 border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 no-print bg-white z-20">
        <div className="flex items-center gap-3 md:gap-6">
          <h2 className="hidden md:block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Simulation Lab</h2>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setActiveSubTab('audit')} className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeSubTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Audit</button>
            <button onClick={() => setActiveSubTab('simulator')} className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${activeSubTab === 'simulator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Simulator</button>
          </div>
        </div>
        
        {activeSubTab === 'simulator' && (
          <div className="flex items-center gap-2">
             <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 md:px-4 py-2 text-[9px] md:text-[10px] font-black uppercase outline-none focus:border-indigo-400 max-w-[120px] md:max-w-none"
                value={activeSimId || ''}
                onChange={(e) => {
                  const sim = simulations.find(s => s.id === e.target.value);
                  if (sim) loadSim(sim);
                  else if (e.target.value === 'new') createNewSim();
                }}
             >
                <option value="" disabled>Pilih Projek</option>
                {simulations.map(sim => (
                  <option key={sim.id} value={sim.id}>{sim.name || 'Draft'}</option>
                ))}
                <option value="new" className="text-indigo-600">+ BUAT BARU</option>
             </select>
             <button onClick={createNewSim} className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">＋</button>
          </div>
        )}
      </div>

      {activeSubTab === 'audit' && (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
           <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {[
                   { label: 'STARS', color: 'bg-emerald-500', desc: 'Populer & Untung' },
                   { label: 'PLOWHORSES', color: 'bg-blue-500', desc: 'Laris tapi Tipis' },
                   { label: 'PUZZLES', color: 'bg-amber-500', desc: 'Untung tapi Sepi' },
                   { label: 'DOGS', color: 'bg-red-500', desc: 'Buruk & Tidak Laris' },
                 ].map(item => (
                   <div key={item.label} className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className={`w-2 md:w-3 h-8 md:h-12 rounded-full ${item.color}`}></div>
                      <div>
                         <p className="text-[8px] md:text-[10px] font-black text-slate-900">{item.label}</p>
                         <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase leading-tight">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="bg-white rounded-3xl md:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px] md:min-w-[900px]">
                    <thead className="bg-slate-50 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <tr>
                          <th className="py-4 px-6 md:px-8">Nama Menu</th>
                          <th className="py-4 px-2 text-center">Volume</th>
                          <th className="py-4 px-2 text-right">Margin</th>
                          <th className="py-4 px-2 text-center">FC %</th>
                          <th className="py-4 px-6 text-right bg-slate-100">Total Profit</th>
                          <th className="py-4 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px] md:text-[11px]">
                        {auditData.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-3 px-6 md:px-8 font-black text-slate-800 uppercase leading-tight">{p.name}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-400">{p.qtySold} Unit</td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">Rp {p.margin.toLocaleString()}</td>
                            <td className="py-3 px-2 text-center font-black">{Math.round(p.foodCostPercent)}%</td>
                            <td className="py-3 px-6 text-right font-black text-indigo-600 bg-indigo-50/20">Rp {p.totalContribution.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                               <span className={`px-2 py-0.5 rounded-md text-[7px] md:text-[8px] font-black text-white ${p.classColor}`}>
                                 {p.classification}
                               </span>
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
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-30">
                 <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center text-4xl mb-6">📐</div>
                 <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter mb-2">Recipe Lab</h3>
                 <button onClick={createNewSim} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Mulai Simulasi</button>
              </div>
           ) : (
             <>
               {/* COLUMN 1: WORKSHEET (Responsive) */}
               <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-slate-200">
                  <div className="px-6 md:px-10 py-4 md:py-8 border-b border-slate-50 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest">Recipe Design</p>
                        <div className="flex gap-2">
                           <button onClick={handleSave} className="text-[9px] font-black uppercase text-emerald-600 px-2 py-1">Save 💾</button>
                           <button onClick={() => { setSimToDelete(simulations.find(s => s.id === activeSimId) || null); setShowDeleteModal(true); }} className="text-[9px] font-black uppercase text-red-400 px-2 py-1">Delete 🗑️</button>
                        </div>
                      </div>
                      <input 
                         type="text"
                         className="w-full text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter outline-none focus:text-indigo-600 transition-colors bg-transparent border-b-2 border-transparent focus:border-indigo-100 placeholder:opacity-20" 
                         value={simName} 
                         onChange={e => setSimName(e.target.value)} 
                         placeholder="Nama Menu..."
                      />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 space-y-6 md:space-y-8 pb-32 md:pb-10">
                     {/* ADD ACTIONS */}
                     <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative group flex-1">
                           <button className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-indigo-100">📦 Dari Gudang</button>
                           <div className="absolute left-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 w-full hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                              {currentInventory.map(i => (
                                <button key={i.id} onClick={() => addSimRow(i)} className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl text-[10px] font-black text-slate-800 uppercase flex justify-between border-b border-slate-50 last:border-0 transition-colors">
                                   <span className="truncate mr-2">{i.name}</span>
                                   <span className="text-slate-400 shrink-0 font-bold">Rp{i.costPerUnit} / {i.unit}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                        <button onClick={() => addSimRow()} className="flex-1 py-3 md:py-4 border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase">➕ Baris Manual</button>
                     </div>

                     {/* REVISED DESKTOP TABLE WITH USER REQUESTED COLUMNS */}
                     <div className="hidden md:block overflow-hidden rounded-[32px] border-2 border-slate-100 bg-white shadow-sm">
                        <table className="w-full border-collapse table-fixed">
                           <thead className="bg-slate-50 border-b-2 border-slate-100">
                              <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                 <th className="py-4 px-6 text-left w-[24%]">Bahan Baku</th>
                                 <th className="py-4 px-2 text-center w-[8%]">Unit</th>
                                 <th className="py-4 px-2 text-right w-[15%]">Harga Beli</th>
                                 <th className="py-4 px-2 text-center w-[10%]">Isi</th>
                                 <th className="py-4 px-2 text-center w-[12%]">Pemanfaatan</th>
                                 <th className="py-4 px-2 text-center w-[13%]">Takaran</th>
                                 <th className="py-4 px-6 text-right bg-slate-100 w-[14%]">Total HPP</th>
                                 <th className="py-4 px-2 text-center w-[4%]"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 text-[11px]">
                              {simBOM.length === 0 ? (
                                <tr><td colSpan={8} className="py-24 text-center text-slate-300 font-black uppercase italic tracking-widest opacity-40">Belum ada bahan baku</td></tr>
                              ) : (
                                rowCalculations.map((row) => (
                                   <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                      <td className="py-4 px-6">
                                         <input type="text" className="w-full bg-transparent font-black text-slate-800 uppercase outline-none border-b border-transparent focus:border-indigo-200" value={row.name} onChange={e => updateSimRow(row.id, 'name', e.target.value)} />
                                      </td>
                                      <td className="py-4 px-2 text-center">
                                         <input type="text" className="w-full bg-transparent text-center font-bold text-slate-400 uppercase outline-none" value={row.unit} onChange={e => updateSimRow(row.id, 'unit', e.target.value)} />
                                      </td>
                                      <td className="py-4 px-2">
                                         <div className="flex items-center gap-1 bg-slate-100/50 rounded-lg px-2 py-2">
                                           <span className="text-[9px] font-black text-slate-300">Rp</span>
                                           <input type="number" onFocus={e => e.target.select()} className="w-full bg-transparent text-right font-black outline-none tabular-nums" value={row.purchasePrice} onChange={e => updateSimRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                                         </div>
                                      </td>
                                      <td className="py-4 px-2 text-center">
                                         <input type="number" onFocus={e => e.target.select()} className="w-full text-center bg-slate-50 rounded-lg p-1.5 font-black outline-none border border-transparent focus:border-indigo-100" value={row.packageSize} onChange={e => updateSimRow(row.id, 'packageSize', parseFloat(e.target.value) || 1)} />
                                      </td>
                                      <td className="py-4 px-2 text-center">
                                         <div className="flex items-center justify-center bg-slate-50 rounded-lg p-1.5 border border-transparent focus-within:border-indigo-100">
                                            <input type="number" onFocus={e => e.target.select()} className="w-10 text-center bg-transparent font-black outline-none text-indigo-500" value={row.yieldPercent} onChange={e => updateSimRow(row.id, 'yieldPercent', parseFloat(e.target.value) || 100)} />
                                            <span className="text-[8px] font-black text-slate-300">%</span>
                                         </div>
                                      </td>
                                      <td className="py-4 px-2 text-center">
                                         <input type="number" onFocus={e => e.target.select()} className="w-full text-center bg-indigo-50 border border-indigo-100 rounded-xl py-2 font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-200" value={row.recipeQty} onChange={e => updateSimRow(row.id, 'recipeQty', parseFloat(e.target.value) || 0)} />
                                      </td>
                                      <td className="py-4 px-6 text-right font-black text-slate-900 bg-slate-50/40 tabular-nums">Rp {Math.round(row.modal).toLocaleString()}</td>
                                      <td className="py-4 px-2 text-center">
                                         <button onClick={() => setSimBOM(prev => prev.filter(s => s.id !== row.id))} className="text-slate-300 hover:text-red-500 transition-all">✕</button>
                                      </td>
                                   </tr>
                                ))
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* MOBILE CARD LIST (Already adaptive but keep refined) */}
                     <div className="md:hidden space-y-4">
                        {simBOM.length === 0 ? (
                           <div className="py-20 text-center opacity-30 italic text-[10px] font-black uppercase">Belum ada bahan</div>
                        ) : (
                           rowCalculations.map((row) => (
                             <div key={row.id} className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 relative">
                                <button onClick={() => setSimBOM(prev => prev.filter(s => s.id !== row.id))} className="absolute top-4 right-4 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-xs">✕</button>
                                
                                <div className="grid grid-cols-3 gap-3 items-end">
                                   <div className="col-span-2">
                                      <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Bahan Baku</label>
                                      <input type="text" className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs uppercase outline-none" value={row.name} onChange={e => updateSimRow(row.id, 'name', e.target.value)} />
                                   </div>
                                   <div>
                                      <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block text-center">Unit</label>
                                      <input type="text" className="w-full bg-slate-50 p-3 rounded-xl font-black text-[10px] uppercase outline-none text-center" value={row.unit} onChange={e => updateSimRow(row.id, 'unit', e.target.value)} />
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                   <div>
                                      <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Harga Beli (Rp)</label>
                                      <input type="number" onFocus={e => e.target.select()} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none" value={row.purchasePrice} onChange={e => updateSimRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                                   </div>
                                   <div className="grid grid-cols-2 gap-2">
                                      <div>
                                         <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block text-center">Isi</label>
                                         <input type="number" onFocus={e => e.target.select()} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none text-center" value={row.packageSize} onChange={e => updateSimRow(row.id, 'packageSize', parseFloat(e.target.value) || 1)} />
                                      </div>
                                      <div>
                                         <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block text-center">Yield%</label>
                                         <input type="number" onFocus={e => e.target.select()} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs text-indigo-600 outline-none text-center" value={row.yieldPercent} onChange={e => updateSimRow(row.id, 'yieldPercent', parseFloat(e.target.value) || 100)} />
                                      </div>
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                                   <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                         <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Takaran Resep</label>
                                         <div className="flex items-center bg-indigo-50 rounded-xl overflow-hidden">
                                            <input type="number" onFocus={e => e.target.select()} className="w-full p-3 bg-transparent font-black text-xs text-indigo-700 outline-none text-center" value={row.recipeQty} onChange={e => updateSimRow(row.id, 'recipeQty', parseFloat(e.target.value) || 0)} />
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex flex-col justify-end items-end">
                                      <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Sub-Total HPP</p>
                                      <p className="text-sm font-black text-slate-900">Rp {Math.round(row.modal).toLocaleString()}</p>
                                   </div>
                                </div>
                             </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>

               {/* COLUMN 2: ANALYTICS (Stacked on mobile) */}
               <div className="w-full md:w-80 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col p-6 space-y-6 no-print shadow-inner border-l border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Insights</h3>
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${profitHealth.bg} ${profitHealth.color} border border-current opacity-70`}>{profitHealth.label}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {/* Retail Price Config */}
                      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Retail Price</label>
                         <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 focus-within:border-indigo-400 transition-all">
                            <span className="text-xs font-black text-slate-300">Rp</span>
                            <input 
                              type="number" 
                              onFocus={e => e.target.select()}
                              className="bg-transparent text-lg font-black text-slate-900 outline-none w-full tabular-nums"
                              value={simPrice}
                              onChange={e => setSimPrice(parseInt(e.target.value) || 0)}
                            />
                         </div>
                         <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase">Platform Fee %</p>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                               <input 
                                 type="number" 
                                 onFocus={e => e.target.select()}
                                 className="w-6 bg-transparent text-[11px] font-black text-center text-orange-600 outline-none" 
                                 value={shareProfitPercent} 
                                 onChange={e => setShareProfitPercent(parseInt(e.target.value) || 0)} 
                               />
                               <span className="text-[9px] font-black text-slate-400">%</span>
                            </div>
                         </div>
                      </div>

                      {/* Economics Detail */}
                      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-slate-400">Total BOM Cost</span>
                           <span className="text-slate-900">Rp {Math.round(totalVariableCost).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-slate-400">Platform Fee</span>
                           <span className="text-slate-900">Rp {Math.round(shareProfitAmount).toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                           <span className="text-[9px] font-black text-slate-400 uppercase">Total Variabel</span>
                           <span className="text-xs font-black text-red-500">Rp {Math.round(totalVariableCost + shareProfitAmount).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Summary Display (Desktop View Only inside this panel) */}
                      <div className={`hidden md:block p-6 rounded-[32px] border-2 shadow-lg transition-all duration-500 ${
                         profitHealth.label === 'HEALTHY' ? 'bg-slate-900 border-emerald-500/30' : 
                         profitHealth.label === 'WARNING' ? 'bg-slate-900 border-amber-500/30' : 
                         'bg-slate-900 border-red-500/30'
                      }`}>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Margin Per Unit</p>
                         <h3 className={`text-2xl font-black tracking-tight leading-none mb-6 ${simMargin > 0 ? 'text-white' : 'text-red-400'}`}>
                            Rp {Math.round(simMargin).toLocaleString()}
                         </h3>
                         <div className="w-full space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                               <span className="text-slate-500">FOOD COST %</span>
                               <span className={simFCPercent > 40 ? 'text-red-400' : simFCPercent > 35 ? 'text-amber-400' : 'text-emerald-400'}>{simFCPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                               <div className={`h-full transition-all duration-1000 ${simFCPercent > 40 ? 'bg-red-500' : simFCPercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, simFCPercent)}%` }}></div>
                            </div>
                         </div>
                      </div>
                  </div>

                  <p className="text-[8px] font-medium text-indigo-400 italic text-center px-4">
                    *Estimasi laba belum termasuk biaya tetap (OPEX).
                  </p>
               </div>

               {/* MOBILE STICKY SUMMARY BAR */}
               <div className="md:hidden fixed bottom-[64px] left-0 right-0 bg-slate-900 text-white p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] z-40 border-t border-white/10 flex justify-between items-center animate-in slide-in-from-bottom-full duration-500">
                  <div className="flex-1">
                     <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Estimated Net Margin</p>
                     <p className={`text-lg font-black tracking-tight ${simMargin > 0 ? 'text-white' : 'text-red-400'}`}>Rp {Math.round(simMargin).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Food Cost %</p>
                     <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${simFCPercent > 40 ? 'text-red-400' : simFCPercent > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>{simFCPercent.toFixed(1)}%</span>
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                           <div className={`h-full ${simFCPercent > 40 ? 'bg-red-500' : simFCPercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, simFCPercent)}%` }}></div>
                        </div>
                     </div>
                  </div>
               </div>
             </>
           )}
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">🗑️</div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2">Hapus Draf Ini?</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Data tidak dapat dikembalikan</p>
            <div className="flex flex-col gap-3">
               <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">YA, HAPUS PERMANEN</button>
               <button onClick={() => setShowDeleteModal(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
