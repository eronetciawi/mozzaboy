
import React, { useState } from 'react';
import { useApp } from '../store';
import { Category } from '../types';

export const CategoryManagement: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = () => {
    if (newCatName) {
      addCategory(newCatName);
      setNewCatName('');
      // Fix: setShowAddModal was a typo, changing to setShowModal
      setShowModal(false);
    }
  };

  const handleUpdate = () => {
    if (editingCat) {
      updateCategory(editingCat.id, editingCat.name);
      setEditingCat(null);
      setShowModal(false);
    }
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Master Kategori</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic tracking-widest">Pengelompokan menu untuk efisiensi kasir</p>
        </div>
        <button 
          onClick={() => { setEditingCat(null); setNewCatName(''); setShowModal(true); }}
          className="w-full md:w-auto px-6 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 active:scale-95 transition-all"
        >
          + Kategori Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-bold text-orange-500 group-hover:bg-orange-50 transition-colors shadow-inner">
                #
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs">{cat.name}</h4>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => { setEditingCat(cat); setShowModal(true); }} 
                className="w-9 h-9 flex items-center justify-center bg-slate-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
              >
                ✏️
              </button>
              <button 
                onClick={() => setCategoryToDelete(cat)} 
                className="w-9 h-9 flex items-center justify-center bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL TAMBAH / EDIT */}
      {showModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">{editingCat ? 'Edit Kategori' : 'Kategori Baru'}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Kategori</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-orange-500 outline-none transition-all"
                  value={editingCat ? editingCat.name : newCatName}
                  onChange={e => editingCat ? setEditingCat({...editingCat, name: e.target.value}) : setNewCatName(e.target.value)}
                  placeholder="Misal: Corndog Sweet"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                   onClick={editingCat ? handleUpdate : handleAdd} 
                   className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all active:scale-95"
                >
                   {editingCat ? 'SIMPAN PERUBAHAN' : 'TAMBAH KATEGORI'}
                </button>
                <button onClick={() => setShowModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] tracking-widest">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[160] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
              ⚠️
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Kategori?</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed px-4 uppercase">
              Kategori <span className="text-red-600 font-black">"{categoryToDelete.name}"</span> akan dihapus. Produk di dalamnya tidak akan terhapus namun kategori mereka akan kosong.
            </p>
            
            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={confirmDelete}
                className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all active:scale-95"
              >
                HAPUS PERMANEN 🗑️
              </button>
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600"
              >
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
