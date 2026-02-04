
import React, { useState } from 'react';
import { useApp } from '../store';
import { Category } from '../types';

export const CategoryManagement: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories, isSaving } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdd = async () => {
    if (!newCatName) return;
    setErrorMsg('');
    try {
      await addCategory(newCatName);
      setNewCatName('');
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambah kategori.");
    }
  };

  const handleUpdate = async () => {
    if (!editingCat) return;
    setErrorMsg('');
    try {
      await updateCategory(editingCat.id, editingCat.name);
      setEditingCat(null);
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui kategori.");
    }
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  const handleMove = (idx: number, direction: 'up' | 'down') => {
    const newList = [...categories];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    reorderCategories(newList);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Master Kategori</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic tracking-widest">Atur urutan kategori untuk efisiensi kasir</p>
        </div>
        <button 
          onClick={() => { setEditingCat(null); setNewCatName(''); setErrorMsg(''); setShowModal(true); }}
          className="w-full md:w-auto px-6 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 active:scale-95 transition-all"
        >
          + Kategori Baru
        </button>
      </div>

      <div className="space-y-3 max-w-4xl">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="bg-white p-4 md:p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1 mr-2">
                 <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="w-6 h-6 bg-slate-50 rounded-md text-[10px] flex items-center justify-center hover:bg-indigo-500 hover:text-white disabled:opacity-20 transition-all">▲</button>
                 <button onClick={() => handleMove(idx, 'down')} disabled={idx === categories.length - 1} className="w-6 h-6 bg-slate-50 rounded-md text-[10px] flex items-center justify-center hover:bg-indigo-500 hover:text-white disabled:opacity-20 transition-all">▼</button>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xs font-black text-orange-500 group-hover:bg-orange-50 transition-colors shadow-inner">
                {idx + 1}
              </div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs">{cat.name}</h4>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => { setEditingCat(cat); setErrorMsg(''); setShowModal(true); }} 
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
        {categories.length === 0 && (
           <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 opacity-40">
              <p className="text-[10px] font-black uppercase italic tracking-widest">Belum ada kategori terdaftar</p>
           </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT */}
      {showModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">{editingCat ? 'Edit Kategori' : 'Kategori Baru'}</h3>
            
            {errorMsg && (
               <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase border border-red-100">
                  ⚠️ {errorMsg}
               </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Kategori</label>
                <input 
                  disabled={isSaving}
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-orange-500 outline-none transition-all text-slate-900"
                  value={editingCat ? editingCat.name : newCatName}
                  onChange={e => editingCat ? setEditingCat({...editingCat, name: e.target.value}) : setNewCatName(e.target.value)}
                  placeholder="Misal: Corndog Sweet"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                   disabled={isSaving}
                   onClick={editingCat ? handleUpdate : handleAdd} 
                   className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                   {isSaving ? 'SEDANG MENYIMPAN...' : (editingCat ? 'SIMPAN PERUBAHAN 💾' : 'TAMBAH KATEGORI 🚀')}
                </button>
                <button disabled={isSaving} onClick={() => setShowModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] tracking-widest">Batal</button>
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
