
import React, { useState } from 'react';
import { useApp } from '../store';
import { Outlet } from '../types';

export const OutletManagement: React.FC = () => {
  const { outlets, addOutlet, updateOutlet, deleteOutlet, staff, transactions } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  const [formData, setFormData] = useState<Partial<Outlet>>({
    name: '',
    address: '',
    openTime: '10:00',
    closeTime: '18:00'
  });

  const handleSave = () => {
    if (editingOutlet) {
      updateOutlet({ ...editingOutlet, ...formData } as Outlet);
    } else {
      addOutlet({ ...formData, id: `out-${Date.now()}` } as Outlet);
    }
    setShowModal(false);
    setEditingOutlet(null);
    setFormData({ name: '', address: '', openTime: '10:00', closeTime: '18:00' });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Cabang (Outlet)</h2>
          <p className="text-slate-500 font-medium italic text-xs">Atur jam operasional dan lokasi tiap outlet Mozza Boy</p>
        </div>
        <button 
          onClick={() => { setEditingOutlet(null); setFormData({ name: '', address: '', openTime: '10:00', closeTime: '18:00' }); setShowModal(true); }}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
        >
          + Cabang Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {outlets.map(outlet => {
          const staffCount = staff.filter(s => s.assignedOutletIds.includes(outlet.id)).length;
          const revenue = transactions.filter(tx => tx.outletId === outlet.id).reduce((a,b)=>a+b.total, 0);
          
          return (
            <div key={outlet.id} className="bg-white rounded-[40px] border-2 border-slate-100 p-8 shadow-sm hover:border-orange-200 transition-all flex flex-col group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                    🏢
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{outlet.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{outlet.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingOutlet(outlet); setFormData(outlet); setShowModal(true); }}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => { if(confirm('Hapus cabang ini? Seluruh data stok cabang ini akan hilang.')) deleteOutlet(outlet.id); }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="flex-1 mb-6">
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic mb-4">
                  "{outlet.address}"
                </p>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between">
                   <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Jam Operasional</p>
                   <p className="text-sm font-black text-slate-800">{outlet.openTime} - {outlet.closeTime}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Karyawan</p>
                  <p className="text-sm font-black text-slate-800">{staffCount} Orang</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Omzet</p>
                  <p className="text-sm font-black text-orange-600">Rp {revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
              {editingOutlet ? 'Edit Info Cabang' : 'Buka Cabang Baru'}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nama Cabang / Outlet</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Misal: Mozza Boy West Hub"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Alamat Lengkap</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:outline-none focus:border-orange-500 transition-all h-20"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Jalan, Blok, Kota..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Jam Buka</label>
                   <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Jam Tutup</label>
                   <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} />
                 </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => { setShowModal(false); setEditingOutlet(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Batal</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl">Simpan Cabang</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
