
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

  // Filter pengeluaran hanya untuk outlet yang terpilih
  const outletExpenses = expenses.filter(e => e.outletId === selectedOutletId);

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
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase">Catat Pengeluaran</h2>
          <p className="text-slate-500 font-medium">Input biaya operasional harian cabang <span className="text-orange-600 font-bold">{activeOutlet?.name}</span></p>
        </div>
        <div className="flex gap-3">
          {canManageTypes && (
            <button 
              onClick={() => setShowTypeModal(true)}
              className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
            >
              + Jenis Biaya
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl tracking-widest hover:bg-orange-500 transition-all"
          >
            + Catat Pengeluaran
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Biaya Hari Ini ({activeOutlet?.id})</p>
          <h4 className="text-2xl font-black text-red-600">
            Rp {outletExpenses
              .filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString())
              .reduce((acc, e) => acc + e.amount, 0)
              .toLocaleString()}
          </h4>
        </div>
      </div>

      <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] font-black uppercase text-slate-400">
              <th className="py-4 px-6">Waktu</th>
              <th className="py-4 px-6">Jenis Biaya</th>
              <th className="py-4 px-6">Catatan</th>
              <th className="py-4 px-6">Karyawan</th>
              <th className="py-4 px-6 text-right">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {outletExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-300 font-bold italic">Belum ada catatan pengeluaran di cabang ini.</td>
              </tr>
            ) : (
              [...outletExpenses].reverse().map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-xs text-slate-500">
                    <p className="font-bold text-slate-800">{new Date(exp.timestamp).toLocaleDateString()}</p>
                    <p className="text-[10px]">{new Date(exp.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="py-4 px-6 font-black text-slate-700 uppercase text-xs">
                    {expenseTypes.find(t => t.id === exp.typeId)?.name || 'Biaya Lain'}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm italic">"{exp.notes}"</td>
                  <td className="py-4 px-6 text-slate-600 text-sm font-bold">{exp.staffName}</td>
                  <td className="py-4 px-6 text-right font-black text-red-500">Rp {exp.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Tambah Pengeluaran</h3>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-8">CABANG: {activeOutlet?.name}</p>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Pilih Jenis Biaya</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500"
                  value={newExpense.typeId}
                  onChange={e => setNewExpense({...newExpense, typeId: e.target.value})}
                >
                  <option value="">-- Pilih Jenis --</option>
                  {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Jumlah Biaya (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-red-600 focus:outline-none focus:border-orange-500"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Catatan / Detail</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500"
                  value={newExpense.notes}
                  onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                  placeholder="Misal: Beli 2 isi ulang galon"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Batal</button>
              <button onClick={handleAddExpense} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase shadow-xl">Simpan Biaya</button>
            </div>
          </div>
        </div>
      )}

      {showTypeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Tambah Jenis Biaya</h3>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nama Jenis (Contoh: Laundry)</label>
              <input 
                type="text" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
              />
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowTypeModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Batal</button>
              <button onClick={handleAddType} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl text-xs uppercase shadow-xl transition-all">Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
