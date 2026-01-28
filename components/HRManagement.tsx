
import React, { useState } from 'react';
import { useApp } from '../store';
import { StaffMember, UserRole } from '../types';

export const HRManagement: React.FC = () => {
  // Fix: use updateStaff and addStaff instead of non-existent actions
  const { staff, updateStaff, addStaff } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({ name: '', username: '', role: UserRole.CASHIER, status: 'ACTIVE' });

  const handleOnboard = () => {
    if (newStaff.name && newStaff.username) {
      addStaff({ ...newStaff as StaffMember, id: `s-${Date.now()}` });
      setShowAddModal(false);
      setNewStaff({ name: '', username: '', role: UserRole.CASHIER, status: 'ACTIVE' });
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manajemen Karyawan & Akses</h2>
          <p className="text-slate-500 font-medium">Atur hak akses login dan status aktif karyawan</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
        >
          + Tambah Karyawan Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {staff.map(m => (
          <div key={m.id} className="bg-white rounded-3xl border-2 border-slate-100 p-6 shadow-sm hover:border-orange-200 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-slate-50 overflow-hidden ring-4 ring-slate-100">
                <img src={`https://picsum.photos/seed/${m.id}/100/100`} alt={m.name} />
              </div>
              <div>
                <h4 className="font-black text-slate-800">{m.name}</h4>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{m.role}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Username:</span>
                <span className="text-slate-700">{m.username}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Status:</span>
                <span className={m.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}>{m.status === 'ACTIVE' ? 'AKTIF' : 'NON-AKTIF'}</span>
              </div>
            </div>
            <button 
              // Fix: toggle logic using updateStaff
              onClick={() => {
                const updated = { ...m, status: (m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE' };
                updateStaff(updated);
              }}
              className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${m.status === 'ACTIVE' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white'}`}
            >
              {m.status === 'ACTIVE' ? 'Non-aktifkan Akses' : 'Aktifkan Akses'}
            </button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Onboarding Karyawan</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Lengkap</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Username Login</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Jabatan / Role</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value as UserRole})}>
                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Batal</button>
              <button onClick={handleOnboard} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-500/30">Daftarkan Karyawan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
