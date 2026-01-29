
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { InventoryItemType } from '../types';

interface UIComponent {
  id: string;
  inventoryItemId: string;
  quantity: number;
}

export const ProductionManagement: React.FC = () => {
  const { inventory, selectedOutletId, processProduction, productionRecords } = useApp();
  const [showModal, setShowModal] = useState(false);
  
  const [resultItemId, setResultItemId] = useState('');
  const [resultQuantity, setResultQuantity] = useState(0);
  const [components, setComponents] = useState<UIComponent[]>([]);

  const rawMaterials = inventory.filter(i => i.outletId === selectedOutletId && i.type === InventoryItemType.RAW);
  const wipMaterials = inventory.filter(i => i.outletId === selectedOutletId && i.type === InventoryItemType.WIP);
  const allMaterials = [...rawMaterials, ...wipMaterials];

  const handleProcess = () => {
    if (!resultItemId || resultQuantity <= 0) return alert("Lengkapi data hasil produksi!");
    const validComponents = components.filter(c => c.inventoryItemId && c.quantity > 0);
    if (validComponents.length === 0) return alert("Pilih minimal satu bahan!");

    processProduction({
      resultItemId,
      resultQuantity,
      components: validComponents.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity }))
    });

    setShowModal(false);
    setResultItemId('');
    setResultQuantity(0);
    setComponents([]);
  };

  const addComponent = () => setComponents([...components, { id: Math.random().toString(36).substr(2, 9), inventoryItemId: '', quantity: 0 }]);
  const updateComponent = (id: string, field: keyof UIComponent, value: any) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeComponent = (id: string) => setComponents(components.filter(c => c.id !== id));

  const estimatedCost = useMemo(() => {
    return components.reduce((acc, comp) => {
      const item = allMaterials.find(m => m.id === comp.inventoryItemId);
      return acc + (comp.quantity * (item?.costPerUnit || 0));
    }, 0);
  }, [components, allMaterials]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Mixing & Cutting</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Pengolahan bahan mentah di dapur</p>
        </div>
        <button 
          onClick={() => { setComponents([{ id: 'init-1', inventoryItemId: '', quantity: 0 }]); setShowModal(true); }}
          className="w-full md:w-auto px-6 py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
        >
          <span>🧪</span> MULAI PROSES BARU
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Riwayat Produksi Dapur</h3>
        {productionRecords.filter(p => p.outletId === selectedOutletId).length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
             <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada aktivitas dapur</p>
          </div>
        ) : (
          [...productionRecords].filter(p => p.outletId === selectedOutletId).reverse().map(record => {
             const resultItem = inventory.find(i => i.id === record.resultItemId);
             return (
               <div key={record.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 group active:scale-[0.99] transition-all">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg">🧪</div>
                        <div>
                           <h4 className="text-xs font-black text-slate-800 uppercase leading-tight">{resultItem?.name || 'WIP Item'}</h4>
                           <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{new Date(record.timestamp).toLocaleString([], {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</p>
                        </div>
                     </div>
                     <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[9px] font-black">+{record.resultQuantity} {resultItem?.unit}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-2 py-3 bg-slate-50 rounded-2xl">
                     <p className="w-full text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Bahan Terpakai:</p>
                     {record.components.map((c, i) => {
                       const item = inventory.find(inv => inv.id === c.inventoryItemId);
                       return (
                         <span key={i} className="bg-white border border-slate-100 px-2 py-1 rounded-lg text-[8px] font-bold text-slate-600 uppercase">
                            {item?.name} (-{c.quantity})
                         </span>
                       );
                     })}
                  </div>
                  <div className="flex justify-between items-center text-[7px] font-black text-slate-300 uppercase px-2 tracking-widest">
                     <span>PIC: {record.staffName}</span>
                     <span>OUTLET ID: {record.outletId}</span>
                  </div>
               </div>
             );
          })
        )}
      </div>

      {/* FULL SCREEN PRODUCTION FORM */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-4xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">Proses Mixing/Potong</h3>
                   <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Konversi bahan baku mentah $\rightarrow$ siap pakai</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                {/* HASIL JADI SECTION */}
                <section>
                   <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-4 border-b-2 border-purple-100 pb-2 ml-1">1. Hasil Akhir (WIP)</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Item Hasil Jadi</label>
                         <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-purple-500" value={resultItemId} onChange={e => setResultItemId(e.target.value)}>
                            <option value="">-- Pilih WIP Item --</option>
                            {wipMaterials.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Jumlah Output</label>
                         <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xl text-purple-600" value={resultQuantity} onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)} />
                      </div>
                   </div>
                </section>

                {/* KOMPONEN SECTION */}
                <section>
                   <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2 ml-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Bahan yang Digunakan</p>
                      <button onClick={addComponent} className="text-[9px] font-black text-purple-600">+ Tambah Bahan</button>
                   </div>
                   <div className="space-y-4">
                      {components.map((comp, idx) => (
                        <div key={comp.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                           <button onClick={() => removeComponent(comp.id)} className="absolute top-4 right-4 md:static text-slate-300 hover:text-red-500">✕</button>
                           <div className="flex-1">
                              <label className="text-[8px] font-black text-slate-300 uppercase mb-1 block">Pilih Bahan Baku</label>
                              <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={comp.inventoryItemId} onChange={e => updateComponent(comp.id, 'inventoryItemId', e.target.value)}>
                                 <option value="">-- Pilih --</option>
                                 {allMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (Sisa: {m.quantity} {m.unit})</option>)}
                              </select>
                           </div>
                           <div className="w-full md:w-32">
                              <label className="text-[8px] font-black text-slate-300 uppercase mb-1 block">Qty Pakai</label>
                              <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-xs" value={comp.quantity} onChange={e => updateComponent(comp.id, 'quantity', parseFloat(e.target.value) || 0)} />
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                {/* COST PREVIEW */}
                <div className="p-8 bg-slate-900 rounded-[40px] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-20 h-full bg-purple-500/10 -skew-x-12 transform -translate-x-10"></div>
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimasi HPP Per Unit</p>
                      <p className="text-2xl font-black text-orange-400">Rp {resultQuantity > 0 ? Math.round(estimatedCost / resultQuantity).toLocaleString() : 0}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Modal</p>
                      <p className="text-sm font-bold text-slate-300 italic">Rp {estimatedCost.toLocaleString()}</p>
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0">
                <button onClick={handleProcess} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/10 transition-all active:scale-95">SELESAIKAN & UPDATE STOK 🚀</button>
                <div className="h-safe-bottom md:hidden"></div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
