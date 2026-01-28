
import React, { useState } from 'react';
import { useApp } from '../store';
import { Product, BOMComponent, UserRole, ComboItem, OutletSetting } from '../types';

interface UIBOM extends BOMComponent {
  id: string;
}

export const MenuManagement: React.FC = () => {
  // Fix: Destructure selectedOutletId from useApp
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
    if (editingProduct) {
      updateProduct({ ...editingProduct, ...baseData } as Product);
    } else {
      addProduct({ ...baseData, id: `p-${Date.now()}` } as Product);
    }
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', price: 0, categoryId: categories[0]?.id || '', image: 'https://api.dicebear.com/7.x/food/svg?seed=food', bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {} });
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

  const updateBranchSetting = (outletId: string, field: keyof OutletSetting, value: any) => {
    setFormData(prev => {
      const currentSettings = { ...(prev.outletSettings || {}) };
      const currentOutletSetting = currentSettings[outletId] || { price: prev.price || 0, isAvailable: true };
      
      currentSettings[outletId] = {
        ...currentOutletSetting,
        [field]: value
      };

      return { ...prev, outletSettings: currentSettings };
    });
  };

  const removeBranchOverride = (outletId: string) => {
    setFormData(prev => {
      const currentSettings = { ...(prev.outletSettings || {}) };
      delete currentSettings[outletId];
      return { ...prev, outletSettings: currentSettings };
    });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Daftar Menu & Combo</h2>
          <p className="text-slate-500 font-medium italic">Atur menu satuan atau paket combo hemat di sini</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setActiveModalTab('info');
            setFormData({ name: '', price: 0, categoryId: categories[0]?.id || '', image: `https://api.dicebear.com/7.x/food/svg?seed=${Date.now()}`, bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {} });
            setShowModal(true);
          }}
          className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl"
        >
          + Menu / Combo Baru
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-3xl border-2 border-slate-100 p-6 flex gap-6 shadow-sm hover:border-orange-200 transition-all group">
            <div className="w-24 h-24 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
              <img src={p.image} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{categories.find(c => c.id === p.categoryId)?.name}</span>
                    {p.isCombo && <span className="bg-purple-100 text-purple-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Combo Paket</span>}
                    {Object.keys(p.outletSettings || {}).length > 0 && (
                      <span className="bg-blue-50 text-blue-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-blue-100">Custom Branch Prices</span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase leading-tight">{p.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">Rp {p.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {p.isCombo ? (
                   <button 
                    onClick={() => { setEditingComboProduct(p); setCurrentComboItems(p.comboItems || []); }}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700"
                  >
                    Isi Paket
                  </button>
                ) : (
                  <button 
                    onClick={() => { setEditingBOMProduct(p); setCurrentBOM(p.bom.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) }))); }}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500"
                  >
                    Resep (BOM)
                  </button>
                )}
                <button 
                  onClick={() => { setEditingProduct(p); setFormData(p); setActiveModalTab('info'); setShowModal(true); }}
                  className="px-4 py-2 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50"
                >
                  Edit / Branch Settings
                </button>
                {currentUser?.role === UserRole.OWNER && (
                  <button 
                    onClick={() => { if(confirm('Hapus menu ini?')) deleteProduct(p.id); }}
                    className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 shrink-0">
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {editingProduct ? 'Update Menu' : 'Tambah Menu Baru'}
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                  onClick={() => setActiveModalTab('info')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'info' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                 >Info Dasar</button>
                 <button 
                  onClick={() => setActiveModalTab('branches')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'branches' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                 >Harga Per Cabang</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {activeModalTab === 'info' ? (
                <div className="space-y-6">
                  <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <button 
                      onClick={() => setFormData({...formData, isCombo: false})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isCombo ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      Menu Satuan
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, isCombo: true})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isCombo ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      Paket Combo
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nama Menu / Paket</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Harga Default (Rp)</label>
                      <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-orange-600 focus:outline-none focus:border-orange-500" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} />
                      <p className="text-[8px] text-slate-400 mt-1 italic uppercase font-bold">* Digunakan jika tidak ada setting harga khusus cabang</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Kategori</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                        <option value="">-- Pilih --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">URL Gambar</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <input 
                      type="checkbox" 
                      id="availGlobal"
                      className="w-5 h-5 rounded accent-orange-500"
                      checked={formData.isAvailable} 
                      onChange={e => setFormData({...formData, isAvailable: e.target.checked})} 
                    />
                    <label htmlFor="availGlobal" className="text-xs font-black text-blue-800 uppercase tracking-tight cursor-pointer">
                      Tersedia Secara Global (Default)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-6">
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">💡 Tips Branch Override</p>
                     <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                       Gunakan seksi ini untuk membedakan harga di tiap cabang. Jika sebuah cabang tidak mencentang <b>"Dijual Di Sini"</b>, menu ini <b>TIDAK AKAN MUNCUL</b> di kasir cabang tersebut.
                     </p>
                  </div>
                  
                  {outlets.map(outlet => {
                    const settings = formData.outletSettings?.[outlet.id] || { price: formData.price || 0, isAvailable: true };
                    const hasOverride = !!formData.outletSettings?.[outlet.id];

                    return (
                      <div key={outlet.id} className={`p-6 rounded-[32px] border-2 transition-all ${hasOverride ? 'border-blue-200 bg-blue-50/30 shadow-md' : 'border-slate-50 bg-slate-50/50 opacity-80'}`}>
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{outlet.name}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{outlet.id}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DIJUAL DI SINI?</span>
                              <button 
                                onClick={() => updateBranchSetting(outlet.id, 'isAvailable', !settings.isAvailable)}
                                className={`w-12 h-6 rounded-full relative transition-all ${settings.isAvailable ? 'bg-green-500' : 'bg-slate-300'}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isAvailable ? 'right-1' : 'left-1'}`}></div>
                              </button>
                           </div>
                        </div>
                        
                        <div className="flex items-end gap-6">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Harga Khusus Cabang Ini (Rp)</label>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">Rp</span>
                                 <input 
                                  type="number" 
                                  disabled={!settings.isAvailable}
                                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-blue-500 outline-none disabled:opacity-40"
                                  value={settings.price}
                                  onChange={e => updateBranchSetting(outlet.id, 'price', parseInt(e.target.value) || 0)}
                                 />
                              </div>
                           </div>
                           {hasOverride ? (
                             <button 
                              onClick={() => removeBranchOverride(outlet.id)}
                              className="px-4 py-3 bg-white text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase hover:bg-red-50 transition-all"
                             >Reset Default</button>
                           ) : (
                             <button 
                              onClick={() => updateBranchSetting(outlet.id, 'price', formData.price || 0)}
                              className="px-4 py-3 bg-white text-blue-500 border border-blue-100 rounded-xl text-[9px] font-black uppercase hover:bg-blue-50 transition-all"
                             >Atur Harga Cabang</button>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8 pt-8 border-t border-slate-50 shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Batal</button>
              <button onClick={handleSaveProduct} className="flex-[2] py-4 bg-orange-500 text-white font-black rounded-2xl text-xs uppercase shadow-xl tracking-widest">Simpan Semua Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {editingBOMProduct && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl flex flex-col h-[80vh]">
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter shrink-0">Resep Menu: <span className="text-orange-500">{editingBOMProduct.name}</span></h3>
            <p className="text-slate-400 font-bold text-[10px] mb-8 uppercase tracking-widest shrink-0">Bahan yang digunakan untuk 1 porsi jual (Bisa banyak item)</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-10">
              {currentBOM.map((bom, idx) => (
                <div key={bom.id} className="flex gap-3 items-end bg-slate-50 p-4 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300 relative shadow-sm">
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center font-black text-[8px] text-slate-400 shadow-sm z-10">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Bahan Baku (Raw/WIP)</label>
                    <select 
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:border-orange-500 outline-none"
                      value={bom.inventoryItemId}
                      onChange={e => {
                        setCurrentBOM(prev => prev.map(item => item.id === bom.id ? { ...item, inventoryItemId: e.target.value } : item));
                      }}
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {/* Fix: use selectedOutletId instead of non-existent currentUser.outletId */}
                      {inventory.filter(i => i.outletId === selectedOutletId).map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Jumlah</label>
                    <input 
                      type="number" 
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:border-orange-500 outline-none"
                      value={bom.quantity}
                      onChange={e => {
                        setCurrentBOM(prev => prev.map(item => item.id === bom.id ? { ...item, quantity: parseFloat(e.target.value) || 0 } : item));
                      }}
                    />
                  </div>
                  <button onClick={() => setCurrentBOM(prev => prev.filter(item => item.id !== bom.id))} className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                </div>
              ))}
              <button 
                onClick={() => setCurrentBOM([...currentBOM, { id: Math.random().toString(36).substr(2, 9), inventoryItemId: '', quantity: 1 }])} 
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
              >
                + Tambah Bahan Baku Baru
              </button>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditingBOMProduct(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Batal</button>
              <button onClick={handleSaveBOM} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase shadow-xl tracking-widest">Simpan Semua Bahan Baku</button>
            </div>
          </div>
        </div>
      )}

      {editingComboProduct && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl flex flex-col h-[80vh]">
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter shrink-0">Isi Paket: <span className="text-purple-600">{editingComboProduct.name}</span></h3>
            <p className="text-slate-400 font-bold text-[10px] mb-8 uppercase tracking-widest shrink-0">Menu yang termasuk dalam paket combo ini</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-10">
              {currentComboItems.map((ci, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-slate-50 p-4 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300 shadow-sm">
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Pilih Produk</label>
                    <select 
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:border-purple-500 outline-none"
                      value={ci.productId}
                      onChange={e => {
                        const next = [...currentComboItems];
                        next[idx].productId = e.target.value;
                        setCurrentComboItems(next);
                      }}
                    >
                      <option value="">-- Pilih Menu --</option>
                      {products.filter(p => !p.isCombo).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Jumlah</label>
                    <input 
                      type="number" 
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:border-purple-500 outline-none"
                      value={ci.quantity}
                      onChange={e => {
                        const next = [...currentComboItems];
                        next[idx].quantity = parseInt(e.target.value) || 1;
                        setCurrentComboItems(next);
                      }}
                    />
                  </div>
                  <button onClick={() => setCurrentComboItems(currentComboItems.filter((_, i) => i !== idx))} className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                </div>
              ))}
              <button 
                onClick={() => setCurrentComboItems([...currentComboItems, { productId: '', quantity: 1 }])} 
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-purple-500 hover:text-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
              >
                + Tambah Menu ke Paket
              </button>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditingComboProduct(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Batal</button>
              <button onClick={handleSaveCombo} className="flex-1 py-4 bg-purple-600 text-white font-black rounded-2xl text-xs uppercase shadow-xl tracking-widest">Simpan Paket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
