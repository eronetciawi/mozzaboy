
import React, { useState } from 'react';
import { useApp } from '../store';
import { Category } from '../types';

export const CategoryManagement: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = () => {
    if (newCatName) {
      addCategory(newCatName);
      setNewCatName('');
      setShowAddModal(false);
    }
  };

  const handleUpdate = () => {
    if (editingCat) {
      updateCategory(editingCat.id, editingCat.name);
      setEditingCat(null);
    }
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Kategori Produk</h2>
          <p className="text-slate-500 font-medium text-xs italic">Kelompokkan menu jualan Anda agar kasir lebih mudah mencari</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest hover:bg-orange-600 transition-all"
        >
          + Kategori Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl font-bold text-orange-500 group-hover:bg-orange-50 transition-colors">
                #
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs">{cat.name}</h4>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={() => setEditingCat(cat)} 
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all shadow-sm"
              >
                ✏️
              </button>
              <button 
                onClick={() => setCategoryToDelete(cat)} 
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Kategori */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Kategori Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Kategori</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-orange-500 outline-none transition-all"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Misal: Snack Malam"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
              <button onClick={handleAdd} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">Tambah</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Kategori */}
      {editingCat && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Edit Kategori</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Kategori</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-orange-500 outline-none transition-all"
                  value={editingCat.name}
                  onChange={e => setEditingCat({...editingCat, name: e.target.value})}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setEditingCat(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus (Fitur Baru) */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
              ⚠️
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Hapus Kategori?</h3>
            <p className="text-slate-500 text-xs font-medium leading-relaxed px-4">
              Anda akan menghapus kategori <span className="text-red-600 font-black uppercase">"{categoryToDelete.name}"</span>. 
              <br/><br/>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Produk di dalam kategori ini tidak akan terhapus, namun tidak akan memiliki kategori.</span>
            </p>
            
            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={confirmDelete}
                className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
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
