
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItem, MenuSimBOMRow, MenuSimulation } from '../types';

type SimView = 'library' | 'editor' | 'analytics';

export const MenuEngineering: React.FC = () => {
  const { products, inventory, selectedOutletId, simulations, saveSimulation, deleteSimulation, outlets, transactions } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'simulator'>('audit');
  
  // Mobile specific view state
  const [mobileSimView, setMobileSimView] = useState<SimView>('editor');

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
    setMobileSimView('editor');
  };

  const createNewSim = () => {
    setActiveSimId(`SIM-${Date.now()}`);
    setSimName('');
    setSimPrice(15000);
    setShareProfitPercent(20);
    setSimBOM([]);
    setActiveSubTab('simulator');
    setMobileSimView('editor');
  };

  const duplicateSim = (sim: MenuSimulation) => {
    const newSim = { ...sim, id: `SIM-${Date.now()}`, name: sim.name + ' (Copy)' };
    saveSimulation(newSim);
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
    alert("Projek berhasil disimpan ke library.");
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

  // --- MENU ENGINEERING AUDIT LOGIC (USING REAL DATA) ---
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
      let classification = "";
      let classColor = "";
      let advice = "";

      if (m.qtySold >= avgQty && m.margin >= avgMargin) {
        classification = "STARS";
        classColor = "bg-emerald-500";
        advice = "Pertahankan!";
      } else if (m.qtySold >= avgQty && m.margin < avgMargin) {
        classification = "PLOWHORSES";
        classColor = "bg-blue-500";
        advice = "Coba naikkan harga sedikit.";
      } else if (m.qtySold < avgQty && m.margin >= avgMargin) {
        classification = "PUZZLES";
        classColor = "bg-amber-500";
        advice = "Butuh promosi lebih.";
      } else {
        classification = "DOGS";
        classColor = "bg-red-500";
        advice = "Pertimbangkan untuk dihapus.";
      }

      return { ...m, classification, classColor, advice };
    }).sort((a, b) => b.totalContribution - a.totalContribution);
  }, [products, currentInventory, transactions, selectedOutletId]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-700 font-sans">
      {/* GLOBAL HEADER */}
      <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 no-print bg-white z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">Lab</h2>
          <div className="flex gap-1">
            <button onClick={() => setActiveSubTab('audit')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${activeSubTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Engineering Audit</button>
            <button onClick={() => setActiveSubTab('simulator')} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${activeSubTab === 'simulator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Simulator</button>
          </div>
        </div>
      </div>

      {activeSubTab === 'audit' && (
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
           <div className="max-w-6xl mx-auto space-y-4">
              {/* AUDIT SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Menu Populer</p>
                   <h3 className="text-xl font-black text-slate-900">{auditData.filter(d => d.qtySold > 0).length} Aktif</h3>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl shadow-lg border-l-4 border-emerald-500">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stars (Pertahankan)</p>
                   <h3 className="text-xl font-black text-emerald-400">
                     {auditData.filter(d => d.classification === "STARS").length} Menu
                   </h3>
                </div>
                <div className="md:col-span-2 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Saran Manajemen:</p>
                      <p className="text-[10px] font-bold text-indigo-900 mt-1">Gunakan audit ini untuk menentukan menu yang perlu dipromosikan atau disesuaikan harganya.</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Outlet</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{activeOutlet?.name}</p>
                   </div>
                </div>
              </div>

              {/* AUDIT TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                   <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Menu Engineering Matrix & Strategic Advice</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[850px]">
                    <thead className="bg-slate-50 text-[8px] font-black uppercase text-slate-400">
                        <tr>
                          <th className="py-3 px-4" style={{ width: '20%' }}>Nama Menu</th>
                          <th className="py-3 px-4 text-center" style={{ width: '10%' }}>Terjual</th>
                          <th className="py-3 px-4 text-right" style={{ width: '12%' }}>Margin / Unit</th>
                          <th className="py-3 px-4 text-center" style={{ width: '10%' }}>Food Cost</th>
                          <th className="py-3 px-4 text-right bg-slate-100" style={{ width: '15%' }}>Profit Kontribusi</th>
                          <th className="py-3 px-4 text-center" style={{ width: '10%' }}>Klasifikasi</th>
                          <th className="py-3 px-4 text-left" style={{ width: '23%' }}>Saran Tindakan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                        {auditData.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-3 px-4 font-black text-slate-800 uppercase leading-tight">{p.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-400 group-hover:text-slate-900 transition-colors">{p.qtySold} <span className="text-[7px] opacity-60">QTY</span></td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">Rp {p.margin.toLocaleString()}</td>
                            <td className="py-3 px-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full ${p.foodCostPercent > 40 ? 'bg-red-500' : p.foodCostPercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(100, p.foodCostPercent)}%`}}></div>
                                  </div>
                                  <span className="font-black text-[8px]">{Math.round(p.foodCostPercent)}%</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-indigo-600 bg-indigo-50/20">
                               Rp {p.totalContribution.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                               <span className={`px-2 py-0.5 rounded-md text-[7px] font-black text-white shadow-sm ${p.classColor}`}>
                                 {p.classification}
                               </span>
                            </td>
                            <td className="py-3 px-4">
                               <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.classColor}`}></div>
                                  <span className={`font-bold italic uppercase text-[9px] ${p.classification === 'DOGS' ? 'text-red-500' : p.classification === 'STARS' ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {p.advice}
                                  </span>
                               </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MATRIX LEGEND */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <h5 className="text-[9px] font-black text-emerald-600 uppercase mb-1">Stars (High/High)</h5>
                  <p className="text-[8px] text-emerald-800 leading-tight">Menu paling menguntungkan dan laris. Jangan diubah-ubah!</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h5 className="text-[9px] font-black text-blue-600 uppercase mb-1">Plowhorses (Low/High)</h5>
                  <p className="text-[8px] text-blue-800 leading-tight">Laris tapi margin tipis. Rekomendasi naikkan harga atau ganti bahan lebih murah.</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <h5 className="text-[9px] font-black text-amber-600 uppercase mb-1">Puzzles (High/Low)</h5>
                  <p className="text-[8px] text-amber-800 leading-tight">Untung besar tapi jarang dibeli. Perlu promosi atau diskon menarik.</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <h5 className="text-[9px] font-black text-red-600 uppercase mb-1">Dogs (Low/Low)</h5>
                  <p className="text-[8px] text-red-800 leading-tight">Tidak untung dan tidak laku. Sebaiknya dihapus dari daftar menu.</p>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'simulator' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* MOBILE SUB-NAVIGATION */}
          <div className="md:hidden flex bg-white border-b border-slate-200 no-print shrink-0 p-1 z-10">
             <button onClick={() => setMobileSimView('library')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-colors ${mobileSimView === 'library' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Library</button>
             <button onClick={() => setMobileSimView('editor')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-colors ${mobileSimView === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Editor</button>
             <button onClick={() => setMobileSimView('analytics')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-colors ${mobileSimView === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Stats</button>
          </div>

           {/* LEFT: MINI LIBRARY */}
           <div className={`${mobileSimView === 'library' ? 'flex' : 'hidden'} md:flex w-full md:w-48 border-r border-slate-200 flex-col shrink-0 no-print bg-white`}>
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                 <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Projects</h4>
                 <button onClick={createNewSim} className="px-2 py-1 bg-indigo-600 text-white rounded font-black text-[8px] uppercase">+ NEW</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {simulations.length === 0 ? (
                   <div className="p-4 text-center opacity-30">
                      <p className="text-[8px] font-black uppercase italic">Empty</p>
                   </div>
                 ) : (
                   simulations.slice().reverse().map(sim => (
                    <div key={sim.id} className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${activeSimId === sim.id ? 'bg-indigo-50 border-indigo-200' : 'bg-transparent border-transparent hover:bg-slate-50'}`} onClick={() => loadSim(sim)}>
                        <p className="text-[9px] font-black text-slate-900 uppercase truncate pr-4">{sim.name || 'Untitled'}</p>
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">Rp {sim.price.toLocaleString()}</p>
                        <div className="absolute right-1 top-2 hidden group-hover:flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); duplicateSim(sim); }} className="text-[8px] text-slate-400 hover:text-indigo-600">🗐</button>
                        </div>
                    </div>
                   ))
                 )}
              </div>
           </div>

           {/* CENTER: MAIN WORKSHEET */}
           <div className={`${mobileSimView === 'editor' ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-white overflow-hidden relative`}>
              {!activeSimId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                   <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Recipe Simulator</h3>
                   <button onClick={createNewSim} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase">+ New Calculation</button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                   {/* COMPACT HEADER */}
                   <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 no-print shrink-0 bg-white">
                      <div className="flex items-center justify-between gap-4">
                        <input 
                           type="text"
                           className="flex-1 text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight outline-none focus:text-indigo-600 transition-colors bg-transparent border-b border-transparent focus:border-indigo-100 placeholder:opacity-20" 
                           value={simName} 
                           onChange={e => setSimName(e.target.value)} 
                           placeholder="Nama Menu..."
                        />
                        <div className="flex gap-2">
                           <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow hover:bg-emerald-700 transition-all">Save</button>
                           <button onClick={() => window.print()} className="px-4 py-1.5 bg-slate-100 text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">PDF</button>
                           <button onClick={() => setActiveSimId(null)} className="px-2 text-slate-300 hover:text-red-500">✕</button>
                        </div>
                      </div>
                   </div>

                   {/* COMPONENTS AREA - EXTREME COMPACT */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-white pb-20 md:pb-4">
                      <div className="p-2 md:p-4">
                        <div className="flex items-center justify-between mb-3 no-print px-2">
                           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Materials ({simBOM.length})</h4>
                           <div className="flex gap-1.5">
                              <button onClick={() => addSimRow()} className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[8px] font-black uppercase hover:bg-slate-50 transition-colors">+ Row</button>
                              <div className="relative group">
                                 <button className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[8px] font-black uppercase shadow hover:bg-indigo-700">Add Stock</button>
                                 <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl p-2 w-[240px] hidden group-hover:block z-50 animate-in fade-in zoom-in-95">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-1 text-center">Select Material</p>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1 space-y-0.5">
                                       {currentInventory.map(i => (
                                          <button key={i.id} onClick={() => addSimRow(i)} className="w-full text-left p-1.5 hover:bg-indigo-50 rounded-md text-[9px] font-black text-slate-800 uppercase flex justify-between">
                                             <span className="truncate mr-2">{i.name}</span>
                                             <span className="text-slate-400 shrink-0">{i.unit}</span>
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* DESKTOP TABLE VIEW - STRICT PERCENTAGE & NO SCROLL */}
                        <div className="hidden md:block overflow-hidden border border-slate-100 rounded-xl">
                           <table className="w-full border-collapse table-fixed bg-white">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                 <tr className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                                    <th className="py-2 px-2 text-left" style={{ width: '30%' }}>Bahan / Deskripsi</th>
                                    <th className="py-2 px-1 text-center" style={{ width: '15%' }}>Harga Beli</th>
                                    <th className="py-2 px-1 text-center" style={{ width: '10%' }}>Isi/Pack</th>
                                    <th className="py-2 px-1 text-center" style={{ width: '8%' }}>Yield%</th>
                                    <th className="py-2 px-1 text-center" style={{ width: '12%' }}>Takaran</th>
                                    <th className="py-2 px-0.5 text-center" style={{ width: '6%' }}>Unit</th>
                                    <th className="py-2 px-2 text-right" style={{ width: '15%' }}>Net Cost</th>
                                    <th className="py-2 px-1 no-print text-center" style={{ width: '4%' }}></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {rowCalculations.length === 0 ? (
                                   <tr><td colSpan={8} className="py-12 text-center text-slate-300 text-[8px] font-black uppercase tracking-widest italic opacity-40">Belum Ada Komponen</td></tr>
                                 ) : (
                                   rowCalculations.map((row) => (
                                      <tr key={row.id} className="hover:bg-indigo-50/30 group transition-colors">
                                         <td className="py-1.5 px-2">
                                            <input 
                                              type="text" 
                                              className="w-full bg-transparent font-black text-slate-800 uppercase text-[10px] outline-none border-b border-transparent focus:border-indigo-400 py-0.5" 
                                              value={row.name} 
                                              onChange={e => updateSimRow(row.id, 'name', e.target.value)} 
                                              placeholder="Bahan..." 
                                            />
                                         </td>
                                         <td className="py-1.5 px-0.5">
                                            <div className="flex items-center gap-0.5 bg-slate-50/50 rounded-md px-1 py-0.5 border border-transparent focus-within:border-indigo-200 focus-within:bg-white transition-all">
                                              <span className="text-[7px] font-black text-slate-300">Rp</span>
                                              <input 
                                                type="number" 
                                                className="w-full bg-transparent text-center font-black text-[10px] outline-none text-slate-900" 
                                                value={row.purchasePrice} 
                                                onChange={e => updateSimRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)} 
                                              />
                                            </div>
                                         </td>
                                         <td className="py-1.5 px-0.5 text-center">
                                            <input 
                                              type="number" 
                                              className="w-[90%] text-center bg-slate-50/50 rounded-md py-0.5 font-black text-[10px] outline-none focus:bg-white border border-transparent focus:border-indigo-100" 
                                              value={row.packageSize} 
                                              onChange={e => updateSimRow(row.id, 'packageSize', parseFloat(e.target.value) || 1)} 
                                            />
                                         </td>
                                         <td className="py-1.5 px-0.5 text-center">
                                            <input 
                                              type="number" 
                                              className="w-[90%] text-center bg-slate-50/50 rounded-md py-0.5 font-black text-[10px] outline-none focus:bg-white border border-transparent focus:border-indigo-100" 
                                              value={row.yieldPercent} 
                                              onChange={e => updateSimRow(row.id, 'yieldPercent', parseFloat(e.target.value) || 100)} 
                                            />
                                         </td>
                                         <td className="py-1.5 px-0.5 text-center">
                                            <input 
                                              type="number" 
                                              className="w-[90%] text-center bg-indigo-50/30 border border-indigo-100/50 rounded-md py-0.5 font-black text-[10px] text-indigo-700 outline-none focus:bg-white" 
                                              value={row.recipeQty} 
                                              onChange={e => updateSimRow(row.id, 'recipeQty', parseFloat(e.target.value) || 0)} 
                                            />
                                         </td>
                                         <td className="py-1.5 px-0.5 text-center">
                                            <input 
                                              type="text" 
                                              className="w-full text-center bg-transparent py-0.5 font-black text-[8px] uppercase outline-none" 
                                              value={row.unit} 
                                              onChange={e => updateSimRow(row.id, 'unit', e.target.value)} 
                                              placeholder="gr" 
                                            />
                                         </td>
                                         <td className="py-1.5 px-2 text-right font-black text-slate-900 text-[10px] tabular-nums whitespace-nowrap">
                                            Rp {Math.round(row.modal).toLocaleString()}
                                         </td>
                                         <td className="py-1.5 px-1 text-center no-print">
                                            <button onClick={() => setSimBOM(prev => prev.filter(s => s.id !== row.id))} className="text-slate-200 hover:text-red-500 transition-all font-black text-[8px]">✕</button>
                                         </td>
                                      </tr>
                                   ))
                                 )}
                              </tbody>
                           </table>
                        </div>

                        {/* MOBILE CARD VIEW - Compacted */}
                        <div className="md:hidden space-y-3 pb-20">
                           {rowCalculations.map((row) => (
                                <div key={row.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
                                   <div className="flex justify-between items-center mb-4">
                                      <input 
                                         type="text" 
                                         className="flex-1 text-xs font-black text-slate-800 uppercase bg-transparent outline-none border-b border-transparent focus:border-indigo-200" 
                                         value={row.name} 
                                         onChange={e => updateSimRow(row.id, 'name', e.target.value)} 
                                         placeholder="Bahan..." 
                                      />
                                      <button onClick={() => setSimBOM(prev => prev.filter(s => s.id !== row.id))} className="w-6 h-6 text-red-300 hover:text-red-500 font-black ml-2">✕</button>
                                   </div>
                                   <div className="grid grid-cols-3 gap-2">
                                      <div>
                                         <label className="block text-[7px] font-black text-slate-300 uppercase mb-1 tracking-widest">HARGA</label>
                                         <input type="number" className="w-full bg-slate-50 p-2 rounded-lg font-black text-[10px] outline-none" value={row.purchasePrice} onChange={e => updateSimRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div>
                                         <label className="block text-[7px] font-black text-slate-300 uppercase mb-1 tracking-widest">QTY/UNIT</label>
                                         <div className="flex bg-slate-50 p-2 rounded-lg items-center">
                                            <input type="number" className="w-full bg-transparent font-black text-[10px] outline-none" value={row.recipeQty} onChange={e => updateSimRow(row.id, 'recipeQty', parseFloat(e.target.value) || 0)} />
                                            <span className="text-[7px] font-black text-slate-400 ml-1">{row.unit}</span>
                                         </div>
                                      </div>
                                      <div className="text-right flex flex-col justify-end">
                                         <p className="text-[7px] font-black text-slate-300 uppercase mb-1">HPP</p>
                                         <p className="text-xs font-black text-indigo-600">Rp {Math.round(row.modal).toLocaleString()}</p>
                                      </div>
                                   </div>
                                </div>
                             ))
                           }
                        </div>
                      </div>
                   </div>

                   {/* MOBILE SUMMARY STICKY BAR */}
                   <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-xl z-20 no-print flex items-center justify-between">
                      <div className="min-w-0">
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">COGS</p>
                         <p className="text-lg font-black text-slate-900 leading-none">Rp {Math.round(totalVariableCost).toLocaleString()}</p>
                      </div>
                      <button onClick={() => setMobileSimView('analytics')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-indigo-100">Stats 📊</button>
                   </div>
                </div>
              )}
           </div>

           {/* RIGHT: ANALYTICS PANEL - SUPER COMPACT */}
           <div className={`${mobileSimView === 'analytics' ? 'flex' : 'hidden md:flex'} w-full md:w-64 border-l border-slate-200 bg-slate-50 flex-col shrink-0 no-print overflow-y-auto custom-scrollbar shadow-inner`}>
              {!activeSimId ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-30 grayscale">
                    <p className="text-[8px] font-black uppercase tracking-widest">Idle</p>
                 </div>
              ) : (
                <div className="p-4 space-y-4 pb-20 md:pb-4">
                   <section className="space-y-2">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Price (Jual)</label>
                         <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                            <span className="text-xs font-black text-slate-300">Rp</span>
                            <input 
                              type="number" 
                              className="bg-transparent text-xl font-black text-slate-900 outline-none w-full tabular-nums"
                              value={simPrice}
                              onChange={e => setSimPrice(parseInt(e.target.value) || 0)}
                            />
                         </div>
                         <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                            <p className="text-[8px] font-black text-slate-400 uppercase">COGS</p>
                            <p className="text-xs font-black text-slate-800">Rp {Math.round(totalVariableCost).toLocaleString()}</p>
                         </div>
                      </div>
                   </section>

                   <section className="space-y-2">
                      <div className={`p-5 rounded-[24px] border transition-all ${
                         simMargin > (simPrice * 0.4) ? 'bg-white border-emerald-500/20' :
                         simMargin > (simPrice * 0.2) ? 'bg-white border-amber-500/20' :
                         'bg-white border-red-500/20'
                      }`}>
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Operational Margin</p>
                         <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                            Rp {Math.round(simMargin).toLocaleString()}
                         </h3>
                         
                         <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                               <span className="text-slate-400">FOOD COST %</span>
                               <span className={simFCPercent > 40 ? 'text-red-600' : 'text-slate-900'}>{simFCPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                               <div className={`h-full transition-all duration-1000 ${simFCPercent > 40 ? 'bg-red-500' : simFCPercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, simFCPercent)}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </section>

                   <section className="bg-slate-900 p-5 rounded-[24px] text-white shadow-lg relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                           <p className="text-[8px] font-black text-slate-500 uppercase">PLATFORM %</p>
                           <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md border border-white/5 shadow-inner">
                              <input 
                                type="number" 
                                className="w-6 bg-transparent text-[10px] font-black text-center text-orange-400 outline-none" 
                                value={shareProfitPercent} 
                                onChange={e => setShareProfitPercent(parseInt(e.target.value) || 0)} 
                              />
                              <span className="text-[8px] font-black text-slate-500">%</span>
                           </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase">FEE</span>
                           <span className="text-sm font-black text-white">Rp {Math.round(shareProfitAmount).toLocaleString()}</span>
                        </div>
                   </section>
                </div>
              )}
           </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-sm font-black text-slate-900 uppercase mb-4">Hapus Projek?</h3>
            <div className="flex flex-col gap-2">
               <button onClick={confirmDelete} className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Confirm Delete</button>
               <button onClick={() => setShowDeleteModal(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 rounded-xl">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <div className="hidden print:block bg-white text-slate-900 p-8">
         <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Production Audit Report</p>
               <h1 className="text-3xl font-black uppercase tracking-tight leading-none">{simName || 'Unnamed Recipe'}</h1>
            </div>
            <div className="text-right text-[10px]">
               <p className="font-black uppercase text-slate-400">Date Generated</p>
               <p className="font-black">{new Date().toLocaleString()}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="p-6 border-2 border-slate-900 rounded-2xl">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Financials</h3>
               <div className="space-y-3 text-xs">
                  <div className="flex justify-between font-bold text-slate-500"><span>Target Jual:</span><span className="font-black text-slate-900">Rp {simPrice.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-slate-500"><span>Est. COGS:</span><span className="font-black text-slate-900">Rp {Math.round(totalVariableCost).toLocaleString()}</span></div>
                  <div className="pt-4 border-t-2 border-slate-900 border-dotted flex justify-between text-2xl font-black text-indigo-600 uppercase"><span>Net Margin:</span><span>Rp {Math.round(simMargin).toLocaleString()}</span></div>
               </div>
            </div>
            <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col justify-center items-center text-center shadow-2xl">
               <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Food Cost Index</p>
               <h3 className="text-6xl font-black tracking-tighter">{simFCPercent.toFixed(1)}%</h3>
            </div>
         </div>

         <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px]">
               <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 font-black uppercase tracking-widest">
                     <th className="py-4 px-4">Material Name</th>
                     <th className="py-4 px-4 text-center">Pack Info</th>
                     <th className="py-4 px-4 text-center">Usage</th>
                     <th className="py-4 px-4 text-right bg-slate-200">Total Cost</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 uppercase">
                  {rowCalculations.map(row => (
                    <tr key={row.id}>
                       <td className="py-3 px-4 font-black">{row.name}</td>
                       <td className="py-3 px-4 text-center text-slate-500">{row.packageSize} {row.unit} @ {row.yieldPercent}%</td>
                       <td className="py-3 px-4 text-center font-black">{row.recipeQty} {row.unit}</td>
                       <td className="py-3 px-4 text-right font-black bg-slate-50">Rp {Math.round(row.modal).toLocaleString()}</td>
                    </tr>
                  ))}
               </tbody>
               <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                     <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-widest text-[8px] opacity-60">Estimated Total Cost per Portion</td>
                     <td className="py-4 px-4 text-right text-2xl tracking-tight">Rp {Math.round(totalVariableCost).toLocaleString()}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
    </div>
  );
};
