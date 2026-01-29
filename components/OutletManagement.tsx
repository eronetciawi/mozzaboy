
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
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Cabang</h2>
          <p className="text-slate-500 font-medium italic text-[10px] uppercase tracking-widest">Konfigurasi operasional outlet Mozza Boy</p>
        </div>
        <button 
          onClick={() => { setEditingOutlet(null); setFormData({ name: '', address: '', openTime: '10:00', closeTime: '18:00' }); setShowModal(true); }}
          className="w-full md:w-auto px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-500 transition-all"
        >
          + Cabang Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {outlets.map(outlet => {
          const staffCount = staff.filter(s => s.assignedOutletIds.includes(outlet.id)).length;
          const revenue = transactions.filter(tx => tx.outletId === outlet.id).reduce((a,b)=>a+b.total, 0);
          
          return (
            <div key={outlet.id} className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 p-6 md:p-8 shadow-sm hover:border-orange-200 transition-all flex flex-col group relative overflow-hidden">
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[80px] -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm border border-slate-50">
                    🏢
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight">{outlet.name}</h3>
                    <p className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-widest">{outlet.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingOutlet(outlet); setFormData(outlet); setShowModal(true); }}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 text-blue-500 rounded-xl transition-all border border-slate-50"
                  >✏️</button>
                  <button 
                    onClick={() => { if(confirm('Hapus cabang?')) deleteOutlet(outlet.id); }}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-red-50 text-red-500 rounded-xl transition-all border border-slate-50"
                  >🗑️</button>
                </div>
              </div>

              <div className="flex-1 mb-6 relative z-10">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat</p>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed line-clamp-2">
                    {outlet.address}
                  </p>
                </div>
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{outlet.openTime} - {outlet.closeTime}</p>
                   </div>
                   <span className="text-[7px] font-black text-slate-300 uppercase italic">Operational Hours</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Karyawan</p>
                  <p className="text-sm font-black text-slate-800">{staffCount} <span className="text-[8px] text-slate-400">PPL</span></p>
                </div>
                <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                  <p className="text-[7px] font-black text-orange-400 uppercase mb-1">Revenue</p>
                  <p className="text-sm font-black text-orange-600">Rp {(revenue/1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL SCREEN OUTLET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-lg h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                  {editingOutlet ? 'Update Info Cabang' : 'Buka Cabang Baru'}
                </h3>
                <button onClick={() => { setShowModal(false); setEditingOutlet(null); }} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Cabang / Identitas</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-lg focus:border-orange-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Misal: Mozza Boy West Hub" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Alamat Lengkap (Lokal)</label>
                   <textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-24 focus:border-orange-500 outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Jalan, Blok, Kota..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jam Buka</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Jam Tutup</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} />
                   </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[32px] text-white flex items-center gap-4 border border-white/5">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">🏢</div>
                   <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">Cabang baru akan langsung tersedia di menu dropdown perpindahan outlet bagi Owner.</p>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button onClick={handleSave} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/10">PUBLIKASIKAN CABANG 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
