
import React, { useState, useMemo } from 'react';
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
      alert("Gagal menyimpan ke database.");
    }
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
      const uniqueNames = new Set();
      return inventory
        .filter(i => {
           const matchesSearch = i.name.toLowerCase().includes(pickerSearch.toLowerCase());
           const isNew = !uniqueNames.has(i.name.toLowerCase());
           if (matchesSearch && isNew) {
              uniqueNames.add(i.name.toLowerCase());
              return true;
           }
           return false;
        });
    } else {
      return products
        .filter(p => !p.isCombo && p.id !== formData.id)
        .filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase()));
    }
  }, [pickerModal, pickerSearch, inventory, products, formData.id]);

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

  const applyToAllBranches = () => {
    const defaultPrice = formData.price || 0;
    const nextSettings: Record<string, OutletSetting> = {};
    outlets.forEach(o => {
      nextSettings[o.id] = {
        price: defaultPrice,
        isAvailable: formData.outletSettings?.[o.id]?.isAvailable ?? true
      };
    });
    setFormData(prev => ({ ...prev, outletSettings: nextSettings }));
  };

  return (
    <div className="p-3 md:p-5 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter">Katalog Menu</h2>
          <p className="text-slate-500 font-medium text-[8px] md:text-[9px] uppercase tracking-widest italic leading-none mt-1">Master Data & Cloud Hosting Optimizaton</p>
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
          className="w-full md:w-auto px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-orange-600 transition-all active:scale-95"
        >
          + Menu Baru
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-2.5 flex flex-col shadow-sm hover:border-orange-200 transition-all group relative overflow-hidden">
            <div className="flex flex-col gap-2 mb-2">
              <div className="aspect-square w-full rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-50 relative">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                {p.isCombo && <div className="absolute top-1 right-1 bg-purple-600 text-white text-[6px] font-black px-1 py-0.5 rounded shadow-lg uppercase">Package</div>}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[6px] font-black text-orange-400 uppercase tracking-tighter">
                  {categories.find(c => c.id === p.categoryId)?.name || 'Kategori'}
                </span>
                <h4 className="text-[9px] font-black text-slate-800 uppercase leading-none truncate mt-0.5">{p.name}</h4>
                <p className="text-[10px] font-black text-slate-900 mt-1">Rp {p.price?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-auto">
               <button onClick={() => handleEditClick(p)} className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-[7px] font-black uppercase tracking-widest active:scale-95 transition-all">⚙️ EDIT</button>
               {currentUser?.role === UserRole.OWNER && <button onClick={() => setProductToDelete(p)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px]">🗑️</button>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-2 md:p-4">
           <div className="bg-white rounded-[24px] md:rounded-[40px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
              
              <div className="p-4 md:px-8 md:py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                 <div>
                    <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">{editingProduct ? 'Update Konfigurasi' : 'Pendaftaran Menu'}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">{formData.name || 'Untitled menu item'}</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
              </div>

              <div className="px-4 md:px-8 py-2 border-b bg-slate-50/50 shrink-0">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setActiveModalTab('info')} className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'info' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Basic Info</button>
                      <button onClick={() => setActiveModalTab('logic')} className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'logic' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>{formData.isCombo ? 'Isi Paket' : 'Resep HPP'}</button>
                      <button onClick={() => setActiveModalTab('branches')} className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'branches' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Cabang</button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                 {activeModalTab === 'info' && (
                   <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                         <button onClick={() => setFormData({...formData, isCombo: false})} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${!formData.isCombo ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Menu Satuan</button>
                         <button onClick={() => setFormData({...formData, isCombo: true})} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${formData.isCombo ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400'}`}>Paket Komplit</button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                         <div className="w-full md:w-32 shrink-0 space-y-2">
                            <div className="aspect-square w-full rounded-2xl bg-slate-50 border-2 border-white shadow-md overflow-hidden relative">
                               <img src={formData.image || 'https://api.dicebear.com/7.x/food/svg?seed=placeholder'} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[7px] text-slate-400 font-bold uppercase text-center">Live Preview</p>
                         </div>

                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                           <div className="col-span-full">
                             <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Nama Produk</label>
                             <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] outline-none focus:border-orange-500 text-slate-900" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Corndog Mozza Jumbo" />
                           </div>

                           <div className="col-span-full">
                             <label className="text-[8px] font-black text-indigo-600 uppercase mb-1 block tracking-widest">Direct Image URL (Flickr, Google Photos, dll)</label>
                             <input 
                                type="text" 
                                className="w-full p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl font-mono text-[9px] outline-none focus:border-indigo-500 text-slate-700" 
                                value={formData.image || ''} 
                                onChange={e => setFormData({...formData, image: e.target.value})} 
                                placeholder="Contoh: https://live.staticflickr.com/.../photo.jpg" 
                             />
                             <p className="text-[7px] text-slate-400 mt-2 italic">*Tempelkan link langsung ke file gambar agar muncul. Cara ini 100% bebas biaya Egress Supabase.</p>
                           </div>

                           <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Kategori</label>
                             <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] outline-none text-slate-900" value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Harga Jual Default</label>
                             <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] outline-none focus:border-orange-500 text-slate-900" value={formData.price ?? 0} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} />
                           </div>
                         </div>
                      </div>
                   </div>
                 )}

                 {activeModalTab === 'logic' && (
                   <div className="space-y-4 animate-in fade-in duration-300">
                      {formData.isCombo ? (
                        <div className="space-y-2">
                           {currentComboItems.map((item) => (
                              <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 items-end shadow-sm">
                                 <div className="flex-1">
                                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Pilih Produk</label>
                                    <button onClick={() => setPickerModal({ rowId: item.id, type: 'product' })} className="w-full p-2 bg-white border rounded-lg font-black text-[9px] text-left text-slate-900 flex justify-between items-center"><span className="truncate">{products.find(p => p.id === item.productId)?.name || '-- Pilih Menu --'}</span><span className="opacity-30">🔍</span></button>
                                 </div>
                                 <div className="w-16">
                                    <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block text-center">Qty</label>
                                    <input type="number" className="w-full p-2 bg-white border rounded-lg font-black text-[9px] text-center text-slate-900" value={item.quantity} onChange={e => setCurrentComboItems(prev => prev.map(c => c.id === item.id ? {...c, quantity: parseInt(e.target.value) || 1} : c))} />
                                 </div>
                                 <button onClick={() => setCurrentComboItems(prev => prev.filter(c => c.id !== item.id))} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg">✕</button>
                              </div>
                           ))}
                           <button onClick={addComboRow} className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-purple-500 transition-all">+ Tambah Menu Ke Paket</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           {currentBOM.map((bom) => {
                              const invItem = inventory.find(i => i.id === bom.inventoryItemId);
                              return (
                                <div key={bom.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 items-end shadow-sm">
                                   <div className="flex-1">
                                      <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block">Bahan Baku</label>
                                      <button onClick={() => setPickerModal({ rowId: bom.id, type: 'material' })} className="w-full p-2 bg-white border rounded-lg font-black text-[9px] text-left text-slate-900 flex justify-between items-center"><span className="truncate">{invItem?.name || '-- Cari Gudang --'}</span><span className="opacity-30">🔍</span></button>
                                   </div>
                                   <div className="w-20">
                                      <label className="text-[7px] font-black text-slate-400 uppercase mb-1 block text-center">Takaran ({invItem?.unit || ''})</label>
                                      <input type="number" step="any" className="w-full p-2 bg-white border rounded-lg font-black text-[9px] text-center text-slate-900" value={bom.quantity} onChange={e => setCurrentBOM(prev => prev.map(b => b.id === bom.id ? {...b, quantity: parseFloat(e.target.value) || 0} : b))} />
                                   </div>
                                   <button onClick={() => setCurrentBOM(prev => prev.filter(b => b.id !== bom.id))} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg transition-all">✕</button>
                                </div>
                              );
                           })}
                           <button onClick={() => setPickerModal({ rowId: 'new', type: 'material' })} className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-indigo-500 transition-all">+ Input Komposisi Bahan</button>
                        </div>
                      )}
                   </div>
                 )}

                 {activeModalTab === 'branches' && (
                   <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center gap-2 shadow-md shrink-0">
                         <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Terapkan harga default ke semua cabang?</p>
                         <button onClick={applyToAllBranches} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[7px] font-black uppercase active:scale-95 transition-all">SINKRON ALL ⚡</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {outlets.map(o => (
                          <div key={o.id} className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2 shadow-sm hover:border-indigo-100">
                              <div className="flex justify-between items-center">
                                <h5 className="text-[9px] font-black text-slate-800 uppercase truncate pr-1">{o.name}</h5>
                                <button onClick={() => {
                                      const current = formData.outletSettings || {};
                                      const setting = current[o.id] || { price: formData.price || 0, isAvailable: true };
                                      setFormData({...formData, outletSettings: {...current, [o.id]: {...setting, isAvailable: !setting.isAvailable}}});
                                  }} className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase transition-all ${formData.outletSettings?.[o.id]?.isAvailable !== false ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                  {formData.outletSettings?.[o.id]?.isAvailable !== false ? 'AKTIF' : 'OFF'}
                                </button>
                              </div>
                              <div className="bg-slate-50 p-1.5 rounded-lg flex items-center gap-1.5 ring-1 ring-slate-100">
                                <span className="text-[8px] font-black text-slate-300">Rp</span>
                                <input type="number" className="w-full bg-transparent font-black text-[10px] text-indigo-600 outline-none" value={formData.outletSettings?.[o.id]?.price ?? formData.price ?? 0} onChange={e => {
                                      const current = formData.outletSettings || {};
                                      const setting = current[o.id] || { price: formData.price || 0, isAvailable: true };
                                      setFormData({...formData, outletSettings: {...current, [o.id]: {...setting, price: parseInt(e.target.value) || 0}}});
                                  }} />
                              </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-4 md:px-8 md:py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                 <button onClick={handleSaveProduct} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">SIMPAN DATA MASTER 💾</button>
              </div>
           </div>
        </div>
      )}

      {/* PICKER MODAL */}
      {pickerModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
           <div className="max-w-xl mx-auto w-full flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Pilih Item Database</h3>
                 </div>
                 <button onClick={() => { setPickerModal(null); setPickerSearch(''); }} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center text-xl">✕</button>
              </div>

              <div className="relative mb-4">
                 <input autoFocus type="text" placeholder="Ketik nama..." className="w-full p-4 bg-white rounded-2xl font-black text-sm text-slate-900 outline-none border-4 border-indigo-50 shadow-2xl" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-10">
                 {filteredPickerItems.map((item: any) => (
                    <button key={item.id} onClick={() => {
                          if (pickerModal.rowId === 'new') addBOMRow(item as InventoryItem);
                          else selectItemForPicker(item.id);
                       }} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all flex justify-between items-center group">
                       <div>
                          <p className="text-white font-black uppercase text-[11px]">{item.name}</p>
                          <p className="text-white/40 text-[8px] font-bold uppercase mt-1">
                             {pickerModal.type === 'material' ? `Unit: ${item.unit}` : `Pilih Menu`}
                          </p>
                       </div>
                       <span className="text-white opacity-20 group-hover:opacity-100">➔</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {productToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-2">Hapus Menu?</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-8">Data <span className="text-red-600">"{productToDelete.name}"</span> akan dihapus selamanya.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { deleteProduct(productToDelete.id); setProductToDelete(null); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">HAPUS PERMANEN</button>
              <button onClick={() => setProductToDelete(null)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Batalkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
