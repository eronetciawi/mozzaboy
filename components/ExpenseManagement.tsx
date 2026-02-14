
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { Expense, ExpenseType, UserRole } from '../types';

export const ExpenseManagement: React.FC = () => {
  const { 
    expenses, expenseTypes, addExpense, updateExpense, deleteExpense, 
    addExpenseType, updateExpenseType, deleteExpenseType, 
    currentUser, selectedOutletId, outlets, isSaving, dailyClosings = [],
    attendance = []
  } = useApp();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  const [typeToDelete, setTypeToDelete] = useState<ExpenseType | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  const [newExpense, setNewExpense] = useState({ typeId: '', amount: 0, notes: '' });

  const todayStr = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // LOGIKA SHIFT: Cari absensi aktif kasir ini
  const myCurrentAttendance = useMemo(() => {
    if (!currentUser) return null;
    return (attendance || []).find(a => a.staffId === currentUser.id && a.outletId === selectedOutletId && !a.clockOut);
  }, [attendance, currentUser, selectedOutletId]);

  const isShiftClosed = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CASHIER) return false;
    return (dailyClosings || []).some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toLocaleDateString('en-CA') === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser, todayStr]);

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const isAdmin = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
  const canManageTypes = currentUser?.permissions.canManageSettings;

  /** 
   * LOGIKA CLEAN SLATE: 
   * Jika bukan Admin, hanya tampilkan pengeluaran yang diinput oleh USER INI 
   * DAN dilakukan SETELAH waktu Clock-In terakhir (Session Aktif).
   */
  const outletExpenses = useMemo(() => {
    return expenses.filter(e => {
        const isCorrectOutlet = e.outletId === selectedOutletId;
        if (!isCorrectOutlet) return false;

        if (isAdmin) {
          return new Date(e.timestamp).toLocaleDateString('en-CA') === todayStr;
        }

        // Untuk Kasir: Filter berdasarkan Session Shift
        if (!myCurrentAttendance) return false; // Jika tidak absen, jangan tampilkan apapun
        const clockInTime = new Date(myCurrentAttendance.clockIn).getTime();
        const expenseTime = new Date(e.timestamp).getTime();
        
        return e.staffId === currentUser?.id && expenseTime >= clockInTime;
    });
  }, [expenses, selectedOutletId, todayStr, isAdmin, myCurrentAttendance, currentUser]);

  const todayExpensesAmount = useMemo(() => outletExpenses.reduce((acc, e) => acc + e.amount, 0), [outletExpenses]);

  const handleOpenAdd = () => {
    if (isShiftClosed) return alert("Akses Terkunci. Anda sudah melakukan tutup buku hari ini.");
    if (!myCurrentAttendance && !isAdmin) return alert("Anda harus Absen Masuk terlebih dahulu!");
    setEditingExpense(null);
    setNewExpense({ typeId: '', amount: 0, notes: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    if (!isAdmin) return;
    setEditingExpense(exp);
    setNewExpense({ typeId: exp.typeId, amount: exp.amount, notes: exp.notes });
    setShowAddModal(true);
  };

  const handleSaveExpense = async () => {
    if (isShiftClosed || isSaving) return;
    if (!newExpense.typeId || newExpense.amount <= 0) {
        setToast({ message: "Lengkapi kategori dan nominal!", type: 'error' });
        return;
    }
    
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, newExpense);
        setToast({ message: "Catatan biaya berhasil diperbarui! ✨", type: 'success' });
      } else {
        await addExpense(newExpense);
        setToast({ message: "Pengeluaran berhasil dicatat! 💸", type: 'success' });
      }
      setShowAddModal(false);
      setEditingExpense(null);
      setNewExpense({ typeId: '', amount: 0, notes: '' });
    } catch (err) {
      setToast({ message: "Gagal menyimpan ke database.", type: 'error' });
    }
  };

  const handleAddType = async () => {
    if (newTypeName) {
      await addExpenseType(newTypeName);
      setNewTypeName('');
      setToast({ message: "Kategori biaya ditambahkan.", type: 'success' });
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
      setToast({ message: "Kategori biaya diperbarui.", type: 'success' });
    }
  };

  const handleConfirmDeleteType = async () => {
    if (typeToDelete) {
      const isUsed = expenses.some(e => e.typeId === typeToDelete.id);
      if (isUsed) {
        setToast({ message: "Kategori masih digunakan di transaksi!", type: 'error' });
      } else {
        await deleteExpenseType(typeToDelete.id);
        setToast({ message: "Kategori berhasil dihapus.", type: 'success' });
      }
      setTypeToDelete(null);
    }
  };

  const handleDeleteRecord = async () => {
    if (expenseToDelete) {
        try {
            await deleteExpense(expenseToDelete.id);
            setToast({ message: "Catatan pengeluaran telah dihapus.", type: 'success' });
            setExpenseToDelete(null);
        } catch (err) {
            setToast({ message: "Gagal menghapus data.", type: 'error' });
        }
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8 relative">
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-rose-600 border-rose-400 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'success' ? '✅' : '❌'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Audit Keuangan</p>
                <p className="text-[11px] font-bold opacity-95 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

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
            disabled={isShiftClosed}
            onClick={handleOpenAdd}
            className={`flex-[2] md:flex-none px-6 py-3 rounded-xl font-black text-[9px] uppercase shadow-xl transition-all ${isShiftClosed ? 'bg-slate-200 text-slate-400 grayscale cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-orange-500 shadow-slate-900/10'}`}
          >
            {isShiftClosed ? '🔒 SHIFT CLOSED' : '+ Catat Biaya Baru'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Biaya Shift Ini</p>
          <h4 className="text-2xl font-black text-red-600">Rp {todayExpensesAmount.toLocaleString()}</h4>
        </div>
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-xl">💸</div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center ml-2 mb-2">
           <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 {isAdmin ? "Log Keseluruhan Hari Ini" : "Log Aktivitas Shift Anda"}
              </h3>
              <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                 {isAdmin ? `Tanggal: ${todayStr}` : `Mulai Absen: ${myCurrentAttendance ? new Date(myCurrentAttendance.clockIn).toLocaleTimeString() : '--'}`}
              </p>
           </div>
           {isShiftClosed && <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">Akses Terkunci: Sudah Tutup Buku</span>}
        </div>
        
        {outletExpenses.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
             <p className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada catatan biaya di session ini</p>
          </div>
        ) : (
          [...outletExpenses].reverse().map(exp => {
            const isAuto = exp.id.startsWith('exp-auto-') || exp.typeId === 'purchase-auto' || exp.notes.includes('Belanja');
            const rawCategory = expenseTypes.find(t => t.id === exp.typeId)?.name || 'Lain-lain';
            
            let displayTitle = rawCategory;
            let displaySub = exp.notes || 'Tanpa catatan';
            let icon = "📦";

            if (isAuto) {
               icon = "🚚";
               const match = exp.notes.match(/Belanja (.*?) \(/);
               if (match && match[1]) {
                  displayTitle = match[1];
                  displaySub = `Belanja Stok (Otomatis)`;
               } else {
                  displayTitle = "BELANJA STOK";
               }
            }

            return (
              <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border border-slate-100 ${isAuto ? 'bg-orange-50 text-orange-600' : 'bg-slate-50'}`}>
                     {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase truncate ${isAuto ? 'text-orange-600' : 'text-slate-900'}`}>
                         {displayTitle}
                      </span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase">{new Date(exp.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium italic truncate">"{displaySub}"</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                   <div className="text-right shrink-0">
                      <p className="text-xs font-black text-red-600">Rp {exp.amount.toLocaleString()}</p>
                      <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{exp.staffName.split(' ')[0]}</p>
                   </div>
                   
                   {isAdmin && (
                     <div className="flex gap-1">
                        {!isAuto && (
                          <button onClick={() => handleOpenEdit(exp)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs hover:bg-blue-500 hover:text-white transition-all">✏️</button>
                        )}
                        <button onClick={() => setExpenseToDelete(exp)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                     </div>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>

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
                  inputMode="numeric"
                  onFocus={e => e.currentTarget.select()}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-red-600 focus:border-orange-500 outline-none"
                  value={newExpense.amount === 0 ? "" : newExpense.amount}
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
                disabled={isSaving}
                onClick={handleSaveExpense} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                <span>{isSaving ? 'SEDANG MENYIMPAN...' : (editingExpense ? 'UPDATE DATA BIAYA 💾' : 'SIMPAN PENGELUARAN 💾')}</span>
              </button>
            </div>
            <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* MODAL PENGELOLAAN JENIS BIAYA (EXPENSE TYPES) */}
      {showTypeModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 md:p-12 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kategori Biaya</h3>
                <button onClick={() => setShowTypeModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex gap-2 mb-8 shrink-0">
                <input 
                  type="text" 
                  className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-orange-500"
                  placeholder="Nama Kategori Baru..."
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                />
                <button onClick={handleAddType} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">TAMBAH</button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {expenseTypes.map(type => (
                   <div key={type.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                      {editingTypeId === type.id ? (
                        <input 
                          autoFocus
                          className="flex-1 bg-white p-2 rounded-lg font-bold text-xs outline-none border border-orange-500"
                          value={editingTypeName}
                          onChange={e => setEditingTypeName(e.target.value)}
                          onBlur={handleSaveEditType}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEditType()}
                        />
                      ) : (
                        <span className="font-black text-slate-700 uppercase text-[11px]">{type.name}</span>
                      )}
                      <div className="flex gap-1">
                         <button onClick={() => handleStartEditType(type)} className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-xs">✏️</button>
                         <button onClick={() => setTypeToDelete(type)} className="w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs">🗑️</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PENGELUARAN */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🗑️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Catatan?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Catatan pengeluaran <span className="text-red-600 font-black">Rp {expenseToDelete.amount.toLocaleString()}</span> akan dihapus permanen.
              </p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleDeleteRecord} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700">IYA, HAPUS PERMANEN</button>
                 <button onClick={() => setExpenseToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batal</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JENIS BIAYA */}
      {typeToDelete && (
        <div className="fixed inset-0 z-[260] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter">Hapus Kategori?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Kategori <span className="text-red-600 font-black">"{typeToDelete.name}"</span> akan dihapus. Pastikan tidak ada pengeluaran aktif dengan kategori ini.
              </p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleConfirmDeleteType} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700">IYA, HAPUS</button>
                 <button onClick={() => setTypeToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
