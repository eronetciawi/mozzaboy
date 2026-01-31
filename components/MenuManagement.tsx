
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { Product, BOMComponent, UserRole, ComboItem, OutletSetting, InventoryItem } from '../types';

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
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({ 
    name: '', price: 0, categoryId: '', image: '', bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {}
  });

  const [currentBOM, setCurrentBOM] = useState<UIBOM[]>([]);
  const [currentComboItems, setCurrentComboItems] = useState<UICombo[]>([]);
  
  // Picker State
  const [pickerModal, setPickerModal] = useState<{rowId: string, type: 'material' | 'product'} | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const handleSaveProduct = () => {
    if (!formData.name || !formData.categoryId) return alert("Nama dan Kategori wajib diisi.");
    
    // Filter out incomplete rows before saving
    const finalBOM = currentBOM
      .filter(b => b.inventoryItemId && b.quantity > 0)
      .map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity }));

    const finalCombo = currentComboItems
      .filter(c => c.productId && c.quantity > 0)
      .map(({ productId, quantity }) => ({ productId, quantity }));

    const baseData = { 
      ...formData, 
      image: formData.image || `https://api.dicebear.com/7.x/food/svg?seed=${formData.name || Date.now()}`,
      bom: formData.isCombo ? [] : finalBOM,
      comboItems: formData.isCombo ? finalCombo : []
    };

    try {
      if (editingProduct) {
        updateProduct({ ...editingProduct, ...baseData } as Product);
      } else {
        addProduct({ ...baseData, id: `p-${Date.now()}` } as Product);
      }
      setShowModal(false);
      setEditingProduct(null);
      setCurrentBOM([]);
      setCurrentComboItems([]);
    } catch (err) {
      alert("Gagal menyimpan ke database. Periksa koneksi internet Anda.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const applyToAllBranches = () => {
     if (!formData.price) return alert("Masukkan harga default dulu.");
     const newSettings: Record<string, OutletSetting> = {};
     outlets.forEach(o => {
        newSettings[o.id] = { price: formData.price || 0, isAvailable: true };
     });
     setFormData({ ...formData, outletSettings: newSettings });
     alert("Konfigurasi diterapkan ke semua cabang!");
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setCurrentBOM((p.bom || []).map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) })));
    setCurrentComboItems((p.comboItems || []).map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) })));
    setActiveModalTab('info');
    setShowModal(true);
  };

  const addBOMRow = (item?: InventoryItem) => {
    const id = Math.random().toString(36).substr(2, 9);
    setCurrentBOM([...currentBOM, { 
      id, 
      inventoryItemId: item?.id || '', 
      quantity: 1 
    }]);
    setPickerModal(null);
    setPickerSearch('');
  };

  const addComboRow = () => {
    setCurrentComboItems([...currentComboItems, { id: Math.random().toString(36).substr(2, 9), productId: '', quantity: 1 }]);
  };

  const filteredPickerItems = useMemo(() => {
    if (!pickerModal) return [];
    if (pickerModal.type === 'material') {
      return inventory
        .filter(i => i.outletId === selectedOutletId)
        .filter(i => i.name.toLowerCase().includes(pickerSearch.toLowerCase()));
    } else {
      return products
        .filter(p => !p.isCombo && p.id !== formData.id)
        .filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase()));
    }
  }, [pickerModal, pickerSearch, inventory, products, selectedOutletId, formData.id]);

  const selectItemForPicker = (id: string) => {
    if (!pickerModal) return;
    if (pickerModal.type === 'material') {
      setCurrentBOM(prev => prev.map(row => row.id === pickerModal.rowId ? { ...row, inventoryItemId: id } : row));
    } else {
      setCurrentComboItems(prev => prev.map(row => row.id === pickerModal.rowId ? { ...row, productId: id } : row));
    }
    setPickerModal(null);
    setPickerSearch('');
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Katalog Menu</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest italic">Konfigurasi BOM, Combo & Regional Sync</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: 0, categoryId: categories[0]?.id || '', image: '', bom: [], isAvailable: true, isCombo: false, comboItems: [], outletSettings: {} });
            setCurrentBOM([]);
            setCurrentComboItems([]);
            setActiveModalTab('info');
            setShowModal(true);
          }}
          className="w-full md:w-auto px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all active:scale-95"
        >
          + Menu Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[40px] border border-slate-100 p-6 flex flex-col shadow-sm hover:border-orange-200 transition-all group relative overflow-hidden">
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-50 overflow-hidden shrink-0 border border-slate-50">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest whitespace-nowrap bg-orange-50 px-2 py-0.5 rounded-md">
                      {categories.find(c => c.id === p.categoryId)?.name || 'UNCLASSIFIED'}
                    </span>
                    {p.isCombo && <span className="bg-purple-600 text-white text-[7px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">Package</span>}
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase leading-tight truncate mb-1">{p.name}</h4>
                <p className="text-sm font-black text-slate-900">Rp {p.price?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
               <button onClick={() => handleEditClick(p)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 active:scale-95 transition-all">⚙️ KONFIGURASI</button>
               {currentUser?.role === UserRole.OWNER && <button onClick={() => setProductToDelete(p)} className="w-12 h-11 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
           <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-4xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">{editingProduct ? 'Update Produk' : 'Buat Produk Baru'}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem sinkronisasi otomatis ke seluruh cabang</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl hover:bg-slate-100 transition-colors">✕</button>
              </div>

              <div className="flex bg-slate-50 p-1.5 m-6 rounded-2xl shrink-0">
                  <button onClick={() => setActiveModalTab('info')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'info' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Basic Info</button>
                  <button onClick={() => setActiveModalTab('logic')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'logic' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>{formData.isCombo ? 'Combo Logic' : 'Recipe / BOM'}</button>
                  <button onClick={() => setActiveModalTab('branches')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'branches' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Branch Pricing</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-0 space-y-8 custom-scrollbar">
                 {activeModalTab === 'info' && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex gap-3 bg-slate-100 p-1 rounded-2xl">
                         <button onClick={() => setFormData({...formData, isCombo: false})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!formData.isCombo ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Single Item</button>
                         <button onClick={() => setFormData({...formData, isCombo: true})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.isCombo ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400'}`}>Package / Combo</button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                         <div className="w-full md:w-48 shrink-0 space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase block ml-1 tracking-widest text-center">Foto Produk</label>
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square w-full rounded-[40px] bg-slate-50 border-4 border-white shadow-xl overflow-hidden cursor-pointer group relative"
                            >
                               <img src={formData.image || 'https://api.dicebear.com/7.x/food/svg?seed=placeholder'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-white font-black text-[10px] uppercase">Ganti Foto</span>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <p className="text-[7px] text-slate-400 text-center uppercase font-bold">Klik gambar untuk unggah foto</p>
                         </div>

                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                           <div className="col-span-full">
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Produk</label>
                             <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500 shadow-sm text-slate-900" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Corndog Mozza Jumbo" />
                           </div>
                           <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Kategori</label>
                             <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none shadow-sm text-slate-900" value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Harga Default</label>
                             <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm outline-none focus:border-orange-500 shadow-sm text-slate-900" value={formData.price ?? 0} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} />
                           </div>
                           <div className="col-span-full">
                              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Atau Gunakan URL Gambar</label>
                              <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-medium text-xs outline-none focus:border-orange-500 shadow-sm text-slate-900" value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
                           </div>
                         </div>
                      </div>
                   </div>
                 )}

                 {activeModalTab === 'logic' && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      {formData.isCombo ? (
                        <div className="space-y-4">
                           {currentComboItems.map((item) => (
                              <div key={item.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 flex gap-4 items-end shadow-sm">
                                 <div className="flex-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Pilih Produk Tunggal</label>
                                    <button 
                                      onClick={() => setPickerModal({ rowId: item.id, type: 'product' })}
                                      className="w-full p-3 bg-white border-2 rounded-2xl font-black text-xs text-left text-slate-900 outline-none flex justify-between items-center"
                                    >
                                       <span>{products.find(p => p.id === item.productId)?.name || '-- Pilih Produk --'}</span>
                                       <span className="opacity-30">🔍</span>
                                    </button>
                                 </div>
                                 <div className="w-24 text-center">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Qty</label>
                                    <input type="number" className="w-full p-3 bg-white border-2 rounded-2xl font-black text-xs text-center outline-none shadow-inner text-slate-900" value={item.quantity} onChange={e => setCurrentComboItems(prev => prev.map(c => c.id === item.id ? {...c, quantity: parseInt(e.target.value) || 1} : c))} />
                                 </div>
                                 <button onClick={() => setCurrentComboItems(prev => prev.filter(c => c.id !== item.id))} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl">✕</button>
                              </div>
                           ))}
                           <button onClick={addComboRow} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black uppercase text-slate-400 hover:border-purple-500 hover:text-purple-600 transition-all">+ TAMBAH PRODUK KE PAKET</button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {currentBOM.map((bom) => (
                              <div key={bom.id} className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-end shadow-sm">
                                 <div className="flex-1 w-full space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Material Bahan Baku</label>
                                    <button 
                                      onClick={() => setPickerModal({ rowId: bom.id, type: 'material' })}
                                      className="w-full p-3 bg-white border-2 rounded-2xl font-black text-xs text-left text-slate-900 outline-none flex justify-between items-center"
                                    >
                                       <span>{inventory.find(i => i.id === bom.inventoryItemId)?.name || '-- Cari Bahan Baku --'}</span>
                                       <span className="opacity-30">🔍</span>
                                    </button>
                                 </div>
                                 <div className="w-full md:w-32">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block text-center">Takaran</label>
                                    <input type="number" step="any" className="w-full p-3 bg-white border-2 rounded-2xl font-black text-xs text-center outline-none shadow-inner text-slate-900" value={bom.quantity} onChange={e => setCurrentBOM(prev => prev.map(b => b.id === bom.id ? {...b, quantity: parseFloat(e.target.value) || 0} : b))} />
                                 </div>
                                 <button onClick={() => setCurrentBOM(prev => prev.filter(b => b.id !== bom.id))} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">✕</button>
                              </div>
                           ))}
                           <button onClick={() => setPickerModal({ rowId: 'new', type: 'material' })} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-500 transition-all">+ TAMBAH BARIS BAHAN BAKU</button>
                        </div>
                      )}
                   </div>
                 )}

                 {activeModalTab === 'branches' && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-slate-900 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                         <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Apply Harga Default ke Semua Cabang?</p>
                         <button onClick={applyToAllBranches} className="px-6 py-3 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95">APPLY TO ALL BRANCHES ⚡</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {outlets.map(o => (
                          <div key={o.id} className="p-5 bg-white rounded-[32px] border-2 border-slate-100 flex flex-col gap-4 shadow-sm">
                              <div className="flex justify-between items-center">
                                <h5 className="text-[11px] font-black text-slate-800 uppercase truncate">{o.name}</h5>
                                <button 
                                  onClick={() => {
                                      const current = formData.outletSettings || {};
                                      const setting = current[o.id] || { price: formData.price || 0, isAvailable: true };
                                      setFormData({...formData, outletSettings: {...current, [o.id]: {...setting, isAvailable: !setting.isAvailable}}});
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${formData.outletSettings?.[o.id]?.isAvailable !== false ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}
                                >
                                  {formData.outletSettings?.[o.id]?.isAvailable !== false ? 'Aktif' : 'Off'}
                                </button>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 ring-2 ring-slate-100">
                                <span className="text-[9px] font-black text-slate-300">Rp</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xs text-indigo-600 outline-none" 
                                  value={formData.outletSettings?.[o.id]?.price ?? formData.price ?? 0} 
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

              <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe rounded-b-[48px]">
                 <button onClick={handleSaveProduct} className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">SIMPAN DATABASE 💾</button>
              </div>
           </div>
        </div>
      )}

      {/* SEARCHABLE PICKER MODAL */}
      {pickerModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 md:p-12 animate-in fade-in duration-200">
           <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Pilih {pickerModal.type === 'material' ? 'Bahan Baku' : 'Menu Satuan'}</h3>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Master Database {selectedOutletId}</p>
                 </div>
                 <button onClick={() => { setPickerModal(null); setPickerSearch(''); }} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-xl">✕</button>
              </div>

              <div className="relative mb-6">
                 <input 
                    autoFocus
                    type="text" 
                    placeholder="Ketik nama untuk mencari..." 
                    className="w-full p-6 bg-white rounded-3xl font-black text-xl text-slate-900 outline-none border-4 border-indigo-500 shadow-2xl"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                 />
                 <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl opacity-20">🔍</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pb-10">
                 {filteredPickerItems.map((item: any) => (
                    <button 
                       key={item.id} 
                       onClick={() => {
                          if (pickerModal.rowId === 'new') addBOMRow(item as InventoryItem);
                          else selectItemForPicker(item.id);
                       }}
                       className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] text-left hover:bg-white/10 transition-all flex justify-between items-center group"
                    >
                       <div>
                          <p className="text-white font-black uppercase text-sm group-hover:text-indigo-400 transition-colors">{item.name}</p>
                          <p className="text-white/40 text-[9px] font-bold uppercase mt-1">
                             {pickerModal.type === 'material' ? `Stok: ${item.quantity} ${item.unit}` : `Kategori: ${categories.find(c => c.id === item.categoryId)?.name}`}
                          </p>
                       </div>
                       <span className="text-white opacity-20 text-xl group-hover:opacity-100 transition-opacity">➔</span>
                    </button>
                 ))}
                 {filteredPickerItems.length === 0 && (
                    <div className="py-20 text-center opacity-30 text-white">
                       <p className="text-2xl mb-4">🚫</p>
                       <p className="text-[10px] font-black uppercase tracking-widest italic">Item tidak ditemukan</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {productToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Menu?</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed px-4 uppercase mb-10">Data <span className="text-red-600">"{productToDelete.name}"</span> akan dihapus permanen dari katalog.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { deleteProduct(productToDelete.id); setProductToDelete(null); }} className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase shadow-xl active:scale-95 transition-all">HAPUS PERMANEN 🗑️</button>
              <button onClick={() => setProductToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATALKAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
