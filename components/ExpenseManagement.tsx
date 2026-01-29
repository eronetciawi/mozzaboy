
import React, { useState } from 'react';
import { useApp } from '../store';

export const ExpenseManagement: React.FC = () => {
  const { expenses, expenseTypes, addExpense, addExpenseType, currentUser, selectedOutletId, outlets } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  
  const [newExpense, setNewExpense] = useState({ typeId: '', amount: 0, notes: '' });
  const [newTypeName, setNewTypeName] = useState('');

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const canManageTypes = currentUser?.permissions.canManageSettings;

  const outletExpenses = expenses.filter(e => e.outletId === selectedOutletId);
  const todayExpenses = outletExpenses.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString());

  const handleAddExpense = () => {
    if (newExpense.typeId && newExpense.amount > 0) {
      addExpense(newExpense);
      setShowAddModal(false);
      setNewExpense({ typeId: '', amount: 0, notes: '' });
    }
  };

  const handleAddType = () => {
    if (newTypeName) {
      addExpenseType(newTypeName);
      setNewTypeName('');
      setShowTypeModal(false);
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
            onClick={() => setShowAddModal(true)}
            className="flex-[2] md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-xl shadow-slate-900/10 hover:bg-orange-500 transition-all"
          >
            + Catat Biaya Baru
          </button>
        </div>
      </div>

      {/* TODAY SUMMARY */}
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
            <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg shrink-0 border border-slate-100">
                  {exp.typeId === 'et1' ? '⛽' : exp.typeId === 'et2' ? '💧' : '📦'}
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
              <div className="text-right shrink-0 ml-3">
                 <p className="text-xs font-black text-red-600">Rp {exp.amount.toLocaleString()}</p>
                 <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{exp.staffName.split(' ')[0]}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Input Biaya</h3>
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
                onClick={handleAddExpense} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all active:scale-95"
              >
                SIMPAN PENGELUARAN 💾
              </button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* TYPE MODAL */}
      {showTypeModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Master Jenis Biaya</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Jenis (Contoh: Kebersihan)</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-orange-500 outline-none"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                />
              </div>
              <button onClick={handleAddType} className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">TAMBAH KE MASTER</button>
              <button onClick={() => setShowTypeModal(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
