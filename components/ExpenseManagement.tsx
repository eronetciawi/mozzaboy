
import React, { useState } from 'react';
import { useApp } from '../store';
import { Expense, ExpenseType } from '../types';

export const ExpenseManagement: React.FC = () => {
  const { 
    expenses, expenseTypes, addExpense, updateExpense, deleteExpense, 
    addExpenseType, updateExpenseType, deleteExpenseType, 
    currentUser, selectedOutletId, outlets 
  } = useApp();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // State for Managing Expense Types
  const [typeToDelete, setTypeToDelete] = useState<ExpenseType | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  const [newExpense, setNewExpense] = useState({ typeId: '', amount: 0, notes: '' });

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const canManageTypes = currentUser?.permissions.canManageSettings;

  const outletExpenses = expenses.filter(e => e.outletId === selectedOutletId);
  const todayExpenses = outletExpenses.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString());

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setNewExpense({ typeId: '', amount: 0, notes: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setNewExpense({ typeId: exp.typeId, amount: exp.amount, notes: exp.notes });
    setShowAddModal(true);
  };

  const handleSaveExpense = () => {
    if (newExpense.typeId && newExpense.amount > 0) {
      if (editingExpense) {
        updateExpense(editingExpense.id, newExpense);
      } else {
        addExpense(newExpense);
      }
      setShowAddModal(false);
      setEditingExpense(null);
      setNewExpense({ typeId: '', amount: 0, notes: '' });
    }
  };

  const handleAddType = () => {
    if (newTypeName) {
      addExpenseType(newTypeName);
      setNewTypeName('');
    }
  };

  const handleStartEditType = (type: ExpenseType) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name);
  };

  const handleSaveEditType = async () => {
    if (editingTypeId && editingTypeName) {
      await updateExpenseType(editingTypeId, editingTypeName);
      setEditingTypeId(null);
      setEditingTypeName('');
    }
  };

  const handleConfirmDeleteType = async () => {
    if (typeToDelete) {
      // Check if type is used in any expense
      const isUsed = expenses.some(e => e.typeId === typeToDelete.id);
      if (isUsed) {
        alert(`Kategori "${typeToDelete.name}" tidak dapat dihapus karena sudah memiliki riwayat catatan biaya. Silakan hapus atau pindahkan catatan biaya terkait terlebih dahulu.`);
      } else {
        await deleteExpenseType(typeToDelete.id);
      }
      setTypeToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Pengeluaran Cabang</h2>
          <p className="text-slate-500 font-medium text-[10px] md:text-xs italic uppercase">Input biaya operasional: <span className="text-orange-600 font-bold">{activeOutlet?.name}</span></p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {canManageTypes && (
            <button 
              onClick={() => setShowTypeModal(true)}
              className="flex-1 md:flex-none px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase hover:bg-slate-50 transition-all"
            >
              Jenis Biaya
            </button>
          )}
          <button 
            onClick={handleOpenAdd}
            className="flex-[2] md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-xl shadow-slate-900/10 hover:bg-orange-500 transition-all"
          >
            + Catat Biaya Baru
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Biaya Hari Ini</p>
          <h4 className="text-2xl font-black text-red-600">Rp {todayExpenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</h4>
        </div>
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-xl">💸</div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Riwayat Pengeluaran</h3>
        {outletExpenses.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
             <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada catatan biaya</p>
          </div>
        ) : (
          [...outletExpenses].reverse().map(exp => (
            <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden">
              <div className="flex items-center gap-4 min-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg shrink-0 border border-slate-100">
                   📦
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-900 uppercase truncate">
                       {expenseTypes.find(t => t.id === exp.typeId)?.name || 'Biaya Lain'}
                    </span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase">{new Date(exp.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium italic truncate">"{exp.notes || 'Tanpa catatan'}"</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="text-right shrink-0">
                    <p className="text-xs font-black text-red-600">Rp {exp.amount.toLocaleString()}</p>
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{exp.staffName.split(' ')[0]}</p>
                 </div>
                 <div className="flex gap-1">
                    <button onClick={() => handleOpenEdit(exp)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-xs hover:bg-blue-500 hover:text-white transition-all">✏️</button>
                    <button onClick={() => setExpenseToDelete(exp)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL INPUT PENGELUARAN */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">
                  {editingExpense ? 'Koreksi Biaya' : 'Input Biaya'}
               </h3>
               <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Kategori Biaya</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-orange-500 outline-none"
                  value={newExpense.typeId}
                  onChange={e => setNewExpense({...newExpense, typeId: e.target.value})}
                >
                  <option value="">-- Pilih Jenis --</option>
                  {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Nominal (Rp)</label>
                <input 
                  type="number" 
                  onFocus={e => e.target.select()}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-red-600 focus:border-orange-500 outline-none"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Catatan Kebutuhan</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm h-24 focus:border-orange-500 outline-none"
                  value={newExpense.notes}
                  onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                  placeholder="Misal: Beli gas LPG 3kg..."
                />
              </div>
              <button 
                onClick={handleSaveExpense} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all active:scale-95"
              >
                {editingExpense ? 'UPDATE DATA BIAYA 💾' : 'SIMPAN PENGELUARAN 💾'}
              </button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* MODAL MANAJEMEN JENIS BIAYA (REFINED) */}
      {showTypeModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Jenis Pengeluaran</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Data Kategori</p>
                 </div>
                 <button onClick={() => setShowTypeModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
              </div>

              <div className="p-8 space-y-6">
                 {/* Tambah Kategori Baru */}
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-orange-500 outline-none" 
                      placeholder="Nama kategori baru..."
                      value={newTypeName}
                      onChange={e => setNewTypeName(e.target.value)}
                    />
                    <button onClick={handleAddType} className="px-6 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Tambah</button>
                 </div>

                 {/* Daftar Kategori */}
                 <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {expenseTypes.length === 0 ? (
                       <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">Belum ada kategori</p>
                    ) : (
                       expenseTypes.map(type => (
                         <div key={type.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                            {editingTypeId === type.id ? (
                               <div className="flex gap-2 w-full">
                                  <input 
                                    autoFocus
                                    className="flex-1 p-2 bg-white border border-orange-500 rounded-xl text-xs font-black uppercase outline-none"
                                    value={editingTypeName}
                                    onChange={e => setEditingTypeName(e.target.value)}
                                  />
                                  <button onClick={handleSaveEditType} className="w-8 h-8 bg-green-500 text-white rounded-xl flex items-center justify-center">✓</button>
                                  <button onClick={() => setEditingTypeId(null)} className="w-8 h-8 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center text-xs">✕</button>
                               </div>
                            ) : (
                               <>
                                 <span className="text-[11px] font-black text-slate-700 uppercase">{type.name}</span>
                                 <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleStartEditType(type)} 
                                      className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-[10px] transition-all"
                                    >✏️</button>
                                    <button 
                                      onClick={() => setTypeToDelete(type)} 
                                      className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center text-[10px] transition-all"
                                    >🗑️</button>
                                 </div>
                               </>
                            )}
                         </div>
                       ))
                    )}
                 </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-slate-50/50 rounded-b-[48px]">
                 <button onClick={() => setShowTypeModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Selesai</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JENIS BIAYA (NEW) */}
      {typeToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Kategori?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Kategori <span className="text-red-600 font-black">"{typeToDelete.name}"</span> akan dihapus dari sistem. Pastikan tidak ada data yang bergantung padanya.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleConfirmDeleteType} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">IYA, HAPUS PERMANEN</button>
                 <button onClick={() => setTypeToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batalkan</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PENGELUARAN */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Catatan?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Data pengeluaran senilai <span className="text-red-600 font-black">Rp {expenseToDelete.amount.toLocaleString()}</span> akan hilang permanen.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => { deleteExpense(expenseToDelete.id); setExpenseToDelete(null); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700">IYA, HAPUS</button>
                 <button onClick={() => setExpenseToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
