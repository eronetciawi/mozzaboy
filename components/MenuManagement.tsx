
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Product, BOMComponent, UserRole, ComboItem, OutletSetting } from '../types';

interface UIBOM extends BOMComponent {
  id: string;
}

interface UICombo extends ComboItem {
  id: string;
}

export const MenuManagement: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, inventory, currentUser, outlets, selectedOutletId } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'logic' | 'branches'>('info');

  const [formData, setFormData] = useState<Partial<Product>>({ 
    name: '', price: 0, categoryId: '', image: 'https://api.dicebear.com/7.x/food/svg?seed=food', bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {}
  });

  const [currentBOM, setCurrentBOM] = useState<UIBOM[]>([]);
  const [currentComboItems, setCurrentComboItems] = useState<UICombo[]>([]);

  const handleSaveProduct = () => {
    if (!formData.name || !formData.categoryId) return alert("Nama dan Kategori wajib diisi.");

    const baseData = { 
      ...formData, 
      bom: formData.isCombo ? [] : currentBOM.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity })),
      comboItems: formData.isCombo ? currentComboItems.map(({ productId, quantity }) => ({ productId, quantity })) : []
    };
    
    if (editingProduct) updateProduct({ ...editingProduct, ...baseData } as Product);
    else addProduct({ ...baseData, id: `p-${Date.now()}` } as Product);
    
    setShowModal(false);
    setEditingProduct(null);
    setCurrentBOM([]);
    setCurrentComboItems([]);
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setCurrentBOM(p.bom.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) })));
    setCurrentComboItems((p.comboItems || []).map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
    setActiveModalTab('info');
    setShowModal(true);
  };

  const addBOMRow = () => {
    setCurrentBOM([...currentBOM, { id: Math.random().toString(36).substr(2, 9), inventoryItemId: '', quantity: 1 }]);
  };

  const addComboRow = () => {
    setCurrentComboItems([...currentComboItems, { id: Math.random().toString(36).substr(2, 9), productId: '', quantity: 1 }]);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Katalog Mozza Boy</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic tracking-widest">Manajemen produk tunggal & paket combo</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: 0, categoryId: categories[0]?.id || '', image: `https://api.dicebear.com/7.x/food/svg?seed=${Date.now()}`, bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {} });
            setCurrentBOM([]);
            setCurrentComboItems([]);
            setActiveModalTab('info');
            setShowModal(true);
          }}
          className="w-full md:w-auto px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 active:scale-95 transition-all"
        >
          + Menu Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[40px] border border-slate-100 p-5 flex flex-col shadow-sm hover:border-orange-200 transition-all group relative overflow-hidden">
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-50 overflow-hidden shrink-0 border border-slate-50">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest whitespace-nowrap bg-orange-50 px-2 py-0.5 rounded-md">
                      {categories.find(c => c.id === p.categoryId)?.name || 'UNCLASSIFIED'}
                    </span>
                    {p.isCombo && <span className="bg-purple-600 text-white text-[7px] font-black px-2 py-0.5 rounded-md uppercase whitespace-nowrap shadow-sm">Package</span>}
                </div>
                <h4 className="text-xs md:text-sm font-black text-slate-800 uppercase leading-tight truncate pr-8 mb-1">{p.name}</h4>
                <p className="text-sm font-black text-slate-900">Rp {p.price.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-auto">
               <button 
                 onClick={() => handleEditClick(p)}
                 className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
               >
                 ⚙️ KONFIGURASI
               </button>
               {currentUser?.role === UserRole.OWNER && (
                  <button onClick={() => confirm('Hapus menu?') && deleteProduct(p.id)} className="w-12 h-11 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* PRODUCT CONFIGURATOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
           <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">
                      {editingProduct ? 'Update Produk' : 'Buat Produk Baru'}
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {formData.id || 'NEW_ENTRY'}</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl hover:bg-slate-100 transition-colors">✕</button>
              </div>

              {/* MODAL TABS */}
              <div className="flex bg-slate-50 p-1.5 m-6 rounded-2xl shrink-0">
                  <button onClick={() => setActiveModalTab('info')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'info' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Basic Info</button>
                  <button onClick={() => setActiveModalTab('logic')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'logic' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                    {formData.isCombo ? 'Combo Architect' : 'Recipe / BOM'}
                  </button>
                  <button onClick={() => setActiveModalTab('branches')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'branches' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Availability</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-0 space-y-8 custom-scrollbar">
                 {/* TAB 1: BASIC INFO */}
                 {activeModalTab === 'info' && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex gap-3 bg-slate-100 p-1 rounded-2xl">
                         <button onClick={() => setFormData({...formData, isCombo: false})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!formData.isCombo ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Single Item</button>
                         <button onClick={() => setFormData({...formData, isCombo: true})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.isCombo ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400'}`}>Package / Combo</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Produk</label>
                          <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Corndog Jumbo Cheese" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Kategori Utama</label>
                          <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                             <option value="">-- Pilih Kategori --</option>
                             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Harga Jual (Default)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">Rp</span>
                            <input type="number" className="w-full pl-10 p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} />
                          </div>
                        </div>
                        <div className="col-span-full">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">URL Foto Menu</label>
                          <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs outline-none" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
                        </div>
                      </div>
                   </div>
                 )}

                 {/* TAB 2: COMBO OR BOM LOGIC */}
                 {activeModalTab === 'logic' && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      {formData.isCombo ? (
                        <div className="space-y-4">
                           <div className="bg-purple-50 p-6 rounded-[32px] border-2 border-purple-100 flex items-center gap-4 mb-6">
                              <div className="text-3xl">📦</div>
                              <div>
                                 <p className="text-[11px] font-black text-purple-600 uppercase tracking-widest">Combo Architect</p>
                                 <p className="text-[9px] font-bold text-purple-400 uppercase">Sistem akan otomatis memotong stok dari setiap item di bawah.</p>
                              </div>
                           </div>
                           
                           {currentComboItems.map((item) => (
                              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-3 items-end group">
                                 <div className="flex-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block ml-1">Pilih Produk</label>
                                    <select 
                                       className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-purple-500" 
                                       value={item.productId} 
                                       onChange={e => setCurrentComboItems(prev => prev.map(c => c.id === item.id ? {...c, productId: e.target.value} : c))}
                                    >
                                       <option value="">-- Menu Satuan --</option>
                                       {products.filter(p => !p.isCombo && p.id !== formData.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                 </div>
                                 <div className="w-24">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block ml-1">Porsi</label>
                                    <input 
                                       type="number" 
                                       className="w-full p-3 bg-white border rounded-xl font-black text-xs text-center" 
                                       value={item.quantity} 
                                       onChange={e => setCurrentComboItems(prev => prev.map(c => c.id === item.id ? {...c, quantity: parseInt(e.target.value) || 1} : c))} 
                                    />
                                 </div>
                                 <button 
                                    onClick={() => setCurrentComboItems(prev => prev.filter(c => c.id !== item.id))} 
                                    className="p-3 text-red-300 hover:text-red-500 transition-colors"
                                 >✕</button>
                              </div>
                           ))}
                           
                           <button 
                              onClick={addComboRow}
                              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-purple-500 hover:text-purple-600 transition-all hover:bg-purple-50"
                           >
                              + TAMBAH MENU KE PAKET
                           </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <div className="bg-indigo-50 p-6 rounded-[32px] border-2 border-indigo-100 flex items-center gap-4 mb-6">
                              <div className="text-3xl">🧪</div>
                              <div>
                                 <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Bill of Materials (BOM)</p>
                                 <p className="text-[9px] font-bold text-indigo-400 uppercase">Input resep detail untuk kontrol stok inventori real-time.</p>
                              </div>
                           </div>

                           {currentBOM.map((bom) => (
                              <div key={bom.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-3 items-end">
                                 <div className="flex-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block ml-1">Material Gudang</label>
                                    <select 
                                       className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-indigo-500" 
                                       value={bom.inventoryItemId} 
                                       onChange={e => setCurrentBOM(prev => prev.map(b => b.id === bom.id ? {...b, inventoryItemId: e.target.value} : b))}
                                    >
                                       <option value="">-- Pilih Material --</option>
                                       {inventory.filter(i => i.outletId === selectedOutletId).map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                                    </select>
                                 </div>
                                 <div className="w-24">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block ml-1">Takaran</label>
                                    <input 
                                       type="number" 
                                       step="any"
                                       className="w-full p-3 bg-white border rounded-xl font-black text-xs text-center" 
                                       value={bom.quantity} 
                                       onChange={e => setCurrentBOM(prev => prev.map(b => b.id === bom.id ? {...b, quantity: parseFloat(e.target.value) || 0} : b))} 
                                    />
                                 </div>
                                 <button 
                                    onClick={() => setCurrentBOM(prev => prev.filter(b => b.id !== bom.id))} 
                                    className="p-3 text-red-300 hover:text-red-500"
                                 >✕</button>
                              </div>
                           ))}

                           <button 
                              onClick={addBOMRow}
                              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all hover:bg-indigo-50"
                           >
                              + TAMBAH BAHAN REKAYASA
                           </button>
                        </div>
                      )}
                   </div>
                 )}

                 {/* TAB 3: REGIONAL AVAILABILITY */}
                 {activeModalTab === 'branches' && (
                   <div className="space-y-4 animate-in fade-in duration-300">
                      <p className="text-[10px] text-slate-400 font-black italic uppercase mb-6 text-center tracking-widest">Ketersediaan Menu & Penyesuaian Harga Tiap Cabang</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {outlets.map(o => (
                          <div key={o.id} className="p-5 bg-white rounded-3xl border-2 border-slate-100 flex flex-col gap-4 shadow-sm">
                              <div className="flex justify-between items-center">
                                <h5 className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[120px]">{o.name}</h5>
                                <button 
                                  onClick={() => {
                                      const current = formData.outletSettings || {};
                                      const setting = current[o.id] || { price: formData.price || 0, isAvailable: true };
                                      setFormData({...formData, outletSettings: {...current, [o.id]: {...setting, isAvailable: !setting.isAvailable}}});
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${formData.outletSettings?.[o.id]?.isAvailable !== false ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}
                                >
                                  {formData.outletSettings?.[o.id]?.isAvailable !== false ? 'Dapat Dijual' : 'Sembunyikan'}
                                </button>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <span className="text-[9px] font-black text-slate-300">Rp</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xs text-indigo-600 outline-none" 
                                  value={formData.outletSettings?.[o.id]?.price ?? formData.price} 
                                  onChange={e => {
                                      const current = formData.outletSettings || {};
                                      const setting = current[o.id] || { price: formData.price || 0, isAvailable: true };
                                      setFormData({...formData, outletSettings: {...current, [o.id]: {...setting, price: parseInt(e.target.value) || 0}}});
                                  }}
                                />
                              </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                 <button 
                    onClick={handleSaveProduct} 
                    className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                 >
                    SIMPAN KE DATABASE 💾
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
