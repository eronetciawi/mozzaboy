
import React, { useState } from 'react';
import { useApp } from '../store';
import { Product, BOMComponent, UserRole, ComboItem, OutletSetting } from '../types';

interface UIBOM extends BOMComponent {
  id: string;
}

export const MenuManagement: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, inventory, currentUser, outlets, selectedOutletId } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBOMProduct, setEditingBOMProduct] = useState<Product | null>(null);
  const [editingComboProduct, setEditingComboProduct] = useState<Product | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'branches'>('info');

  const [formData, setFormData] = useState<Partial<Product>>({ 
    name: '', price: 0, categoryId: '', image: 'https://api.dicebear.com/7.x/food/svg?seed=food', bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {}
  });

  const [currentBOM, setCurrentBOM] = useState<UIBOM[]>([]);
  const [currentComboItems, setCurrentComboItems] = useState<ComboItem[]>([]);

  const handleSaveProduct = () => {
    const baseData = { ...formData, bom: formData.isCombo ? [] : formData.bom, comboItems: formData.isCombo ? formData.comboItems : [] };
    if (editingProduct) updateProduct({ ...editingProduct, ...baseData } as Product);
    else addProduct({ ...baseData, id: `p-${Date.now()}` } as Product);
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSaveBOM = () => {
    if (editingBOMProduct) {
      updateProduct({ ...editingBOMProduct, bom: currentBOM.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity })) });
      setEditingBOMProduct(null);
    }
  };

  const handleSaveCombo = () => {
    if (editingComboProduct) {
      updateProduct({ ...editingComboProduct, comboItems: currentComboItems });
      setEditingComboProduct(null);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Katalog Menu</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Manajemen produk & paket combo cabang</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: 0, categoryId: categories[0]?.id || '', image: `https://api.dicebear.com/7.x/food/svg?seed=${Date.now()}`, bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {} });
            setShowModal(true);
          }}
          className="w-full md:w-auto px-6 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl"
        >
          + Menu / Combo Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[40px] border border-slate-100 p-5 flex gap-5 shadow-sm hover:border-orange-200 transition-all group relative overflow-hidden">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-50 overflow-hidden shrink-0 border border-slate-50">
              <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest whitespace-nowrap">{categories.find(c => c.id === p.categoryId)?.name}</span>
                  {p.isCombo && <span className="bg-purple-100 text-purple-600 text-[7px] font-black px-2 py-0.5 rounded-full uppercase whitespace-nowrap">Combo</span>}
               </div>
               <h4 className="text-xs md:text-sm font-black text-slate-800 uppercase leading-tight truncate pr-8">{p.name}</h4>
               <p className="text-sm font-black text-slate-900 mt-2">Rp {p.price.toLocaleString()}</p>
               
               <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => {
                      if(p.isCombo) { setEditingComboProduct(p); setCurrentComboItems(p.comboItems || []); }
                      else { setEditingBOMProduct(p); setCurrentBOM(p.bom.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) }))); }
                    }}
                    className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${p.isCombo ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white'}`}
                  >
                    {p.isCombo ? 'Isi Combo' : 'Resep'}
                  </button>
                  <button 
                    onClick={() => { setEditingProduct(p); setFormData(p); setActiveModalTab('info'); setShowModal(true); }}
                    className="flex-1 py-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[8px] font-black uppercase"
                  >Settings</button>
               </div>
            </div>
            {currentUser?.role === UserRole.OWNER && (
               <button onClick={() => confirm('Hapus menu?') && deleteProduct(p.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">✕</button>
            )}
          </div>
        ))}
      </div>

      {/* FULL SCREEN MENU EDITOR */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
           <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Konfigurasi Produk</h3>
                 <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
              </div>
              <div className="flex bg-slate-50 p-2 m-4 rounded-2xl shrink-0">
                  <button onClick={() => setActiveModalTab('info')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'info' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Info Dasar</button>
                  <button onClick={() => setActiveModalTab('branches')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'branches' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Harga Cabang</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                 {activeModalTab === 'info' ? (
                   <div className="space-y-6">
                      <div className="flex gap-3">
                         <button onClick={() => setFormData({...formData, isCombo: false})} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${!formData.isCombo ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-slate-300'}`}>Menu Satuan</button>
                         <button onClick={() => setFormData({...formData, isCombo: true})} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${formData.isCombo ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-slate-300'}`}>Paket Combo</button>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Produk</label>
                        <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Harga Default</label>
                            <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xl text-orange-600" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Kategori</label>
                            <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                         </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">URL Gambar Produk</label>
                        <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <p className="text-[10px] text-slate-400 font-bold italic uppercase mb-6 text-center">Tentukan harga khusus di tiap outlet</p>
                      {outlets.map(o => (
                         <div key={o.id} className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                               <h5 className="text-[11px] font-black text-slate-800 uppercase">{o.name}</h5>
                               <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black text-slate-400 uppercase">Dijual?</span>
                                  <input type="checkbox" className="w-5 h-5 rounded accent-orange-500" checked={formData.outletSettings?.[o.id]?.isAvailable ?? true} />
                               </div>
                            </div>
                            <input type="number" placeholder="Atur Harga Khusus..." className="w-full p-3 bg-white border rounded-xl font-black text-sm text-blue-600" value={formData.outletSettings?.[o.id]?.price || formData.price} />
                         </div>
                      ))}
                   </div>
                 )}
              </div>
              <div className="p-6 md:p-10 border-t border-slate-50 bg-white shrink-0">
                 <button onClick={handleSaveProduct} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN PERUBAHAN 💾</button>
                 <div className="h-safe-bottom md:hidden"></div>
              </div>
           </div>
        </div>
      )}

      {/* FULL SCREEN RECIPE (BOM) EDITOR */}
      {editingBOMProduct && (
        <div className="fixed inset-0 z-[210] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6">
           <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-50 shrink-0">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 uppercase">Resep: {editingBOMProduct.name}</h3>
                    <button onClick={() => setEditingBOMProduct(null)} className="text-slate-400">✕</button>
                 </div>
                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2">Bahan yang digunakan untuk 1 porsi jual</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3 custom-scrollbar">
                 {currentBOM.map((bom, idx) => (
                    <div key={bom.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 items-end relative">
                       <div className="flex-1">
                          <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">Bahan Baku</label>
                          <select className="w-full p-3 bg-white border rounded-xl font-bold text-[10px]" value={bom.inventoryItemId} onChange={e => setCurrentBOM(prev => prev.map(it => it.id === bom.id ? {...it, inventoryItemId: e.target.value} : it))}>
                             <option value="">-- Pilih --</option>
                             {inventory.filter(i => i.outletId === selectedOutletId).map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                          </select>
                       </div>
                       <div className="w-20">
                          <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1">Qty</label>
                          <input type="number" className="w-full p-3 bg-white border rounded-xl font-black text-[10px]" value={bom.quantity} onChange={e => setCurrentBOM(prev => prev.map(it => it.id === bom.id ? {...it, quantity: parseFloat(e.target.value) || 0} : it))} />
                       </div>
                       <button onClick={() => setCurrentBOM(prev => prev.filter(it => it.id !== bom.id))} className="p-3 text-red-300">✕</button>
                    </div>
                 ))}
                 <button onClick={() => setCurrentBOM([...currentBOM, { id: Math.random().toString(36).substr(2, 9), inventoryItemId: '', quantity: 1 }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-[9px] hover:border-orange-500 hover:text-orange-500 transition-all">+ Tambah Bahan</button>
              </div>
              <div className="p-6 md:p-8 border-t bg-slate-50/50 shrink-0">
                 <button onClick={handleSaveBOM} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-xl">SIMPAN RESEP 🧪</button>
                 <div className="h-safe-bottom md:hidden"></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
