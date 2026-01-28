
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
    if (!resultItemId) return alert("Pilih item hasil produksi!");
    if (resultQuantity <= 0) return alert("Jumlah hasil tidak boleh nol!");
    
    const validComponents = components.filter(c => c.inventoryItemId && c.quantity > 0);
    if (validComponents.length === 0) return alert("Pilih minimal satu bahan!");

    // Cek Stok Cukup
    let outOfStock = false;
    let missingItemName = "";
    
    validComponents.forEach(comp => {
      const inv = allMaterials.find(m => m.id === comp.inventoryItemId);
      if (inv && inv.quantity < comp.quantity) {
        outOfStock = true;
        missingItemName = inv.name;
      }
    });

    if (outOfStock) return alert(`Stok ${missingItemName} tidak mencukupi!`);

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
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Kitchen Mixing & Cutting</h2>
          <p className="text-slate-500 font-medium italic text-sm">Proses Bahan Mentah $\rightarrow$ Potongan $\rightarrow$ Produk Siap Masak (WIP)</p>
        </div>
        <button 
          onClick={() => { 
            setComponents([{ id: 'init-1', inventoryItemId: '', quantity: 0 }]); 
            setShowModal(true); 
          }}
          className="px-8 py-4 bg-purple-600 text-white rounded-[24px] font-black text-xs uppercase shadow-2xl shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center gap-2 group"
        >
          <span className="text-lg">🧪</span>
          Mulai Proses / Potong Bahan
        </button>
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Log Aktivitas Dapur (Audit Produksi)</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="py-4 px-8">Waktu</th>
              <th className="py-4 px-6">Hasil Produksi</th>
              <th className="py-4 px-6 text-center">Output</th>
              <th className="py-4 px-6">Bahan Dikonsumsi</th>
              <th className="py-4 px-8 text-right">PIC Dapur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {productionRecords.filter(p => p.outletId === selectedOutletId).length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic">Belum ada aktivitas dapur terekam.</td></tr>
            ) : (
              productionRecords.filter(p => p.outletId === selectedOutletId).map(record => {
                const resultItem = inventory.find(i => i.id === record.resultItemId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-5 px-8 text-[10px] font-bold text-slate-500">{new Date(record.timestamp).toLocaleString()}</td>
                    <td className="py-5 px-6 font-black text-purple-600 uppercase text-xs">{resultItem?.name || 'WIP Item'}</td>
                    <td className="py-5 px-6 text-center">
                      <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg font-black text-[10px]">+{record.resultQuantity.toLocaleString()} {resultItem?.unit}</span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-wrap gap-1">
                        {record.components.map((c, i) => {
                          const item = inventory.find(inv => inv.id === c.inventoryItemId);
                          return (
                            <span key={i} className="text-[8px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                              {item?.name} (-{c.quantity})
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right font-black text-slate-400 text-[10px] uppercase">{record.staffName}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-5xl p-10 shadow-2xl flex flex-col h-[90vh] animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Form Cutting & Perakitan</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gunakan untuk memotong Mozza/Sosis atau merakit Sosis-Mozza</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 transition-all font-black">✕</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-5 gap-10 flex-1 overflow-hidden">
                <div className="md:col-span-2 space-y-6 flex flex-col overflow-y-auto">
                   <div className="p-8 bg-purple-50 rounded-[32px] border-2 border-purple-100 shadow-inner">
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6">HASIL JADI (WIP)</p>
                      <div className="space-y-6">
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Hasil (Contoh: Mozza Potong / Stick Sosmo)</label>
                            <select 
                              className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-purple-500 outline-none"
                              value={resultItemId}
                              onChange={e => setResultItemId(e.target.value)}
                            >
                               <option value="">-- Pilih WIP Item --</option>
                               {wipMaterials.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Jumlah Hasil Jadi</label>
                            <input 
                              type="number" 
                              className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-2xl text-purple-600 focus:border-purple-500 outline-none"
                              value={resultQuantity}
                              onChange={e => setResultQuantity(parseFloat(e.target.value) || 0)}
                            />
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Estimasi Biaya Produksi</h4>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Modal Bahan</span>
                            <span className="text-xl font-black text-orange-500">Rp {estimatedCost.toLocaleString()}</span>
                         </div>
                         <div className="h-px bg-slate-800"></div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">HPP Per Unit Hasil</span>
                            <span className="text-xl font-black text-white">Rp {resultQuantity > 0 ? Math.round(estimatedCost / resultQuantity).toLocaleString() : 0}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-3 flex flex-col h-full overflow-hidden">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">BAHAN YANG DIPAKAI / DIPOTONG</p>
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4 pb-10">
                      {components.map((comp, idx) => (
                        <div key={comp.id} className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex gap-4 items-end relative shadow-sm">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Bahan (Raw/WIP)</label>
                              <select 
                                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-purple-500 outline-none"
                                value={comp.inventoryItemId}
                                onChange={e => updateComponent(comp.id, 'inventoryItemId', e.target.value)}
                              >
                                 <option value="">-- Pilih Bahan --</option>
                                 {allMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (Stok: {m.quantity.toLocaleString()} {m.unit})</option>)}
                              </select>
                           </div>
                           <div className="w-28">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Qty Pakai</label>
                              <input 
                                type="number" 
                                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-purple-500 outline-none"
                                value={comp.quantity}
                                onChange={e => updateComponent(comp.id, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                           </div>
                           <button onClick={() => removeComponent(comp.id)} className="p-3.5 text-slate-300 hover:text-red-500 transition-all">✕</button>
                        </div>
                      ))}
                      <button 
                        onClick={addComponent}
                        className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[28px] text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:border-purple-500 hover:text-purple-500 transition-all flex items-center justify-center gap-2"
                      >
                        + Tambah Bahan Lain
                      </button>
                   </div>
                </div>
             </div>

             <div className="flex gap-4 mt-6 pt-6 border-t border-slate-100 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Batal</button>
                <button onClick={handleProcess} className="flex-[2] py-5 bg-purple-600 text-white font-black rounded-[24px] text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-purple-700 transition-all">Selesaikan Proses 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
