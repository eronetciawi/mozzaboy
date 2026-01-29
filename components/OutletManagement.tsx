
import React, { useState } from 'react';
import { useApp } from '../store';
import { Outlet } from '../types';

export const OutletManagement: React.FC = () => {
  const { outlets, addOutlet, updateOutlet, deleteOutlet, staff, transactions } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState<Partial<Outlet>>({
    name: '',
    address: '',
    openTime: '10:00',
    closeTime: '18:00',
    latitude: 0,
    longitude: 0
  });

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setIsGettingLocation(false);
      },
      (err) => {
        alert("Gagal mengambil lokasi. Mohon masukkan manual.");
        setIsGettingLocation(false);
      }
    );
  };

  const handleSave = () => {
    if (editingOutlet) {
      updateOutlet({ ...editingOutlet, ...formData } as Outlet);
    } else {
      addOutlet({ ...formData, id: `out-${Date.now()}` } as Outlet);
    }
    setShowModal(false);
    setEditingOutlet(null);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Cabang</h2>
          <p className="text-slate-500 font-medium italic text-[10px] uppercase tracking-widest">Konfigurasi operasional outlet Mozza Boy</p>
        </div>
        <button 
          onClick={() => { setEditingOutlet(null); setFormData({ name: '', address: '', openTime: '10:00', closeTime: '18:00', latitude: 0, longitude: 0 }); setShowModal(true); }}
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
                  <button onClick={() => { setEditingOutlet(outlet); setFormData(outlet); setShowModal(true); }} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 text-blue-500 rounded-xl transition-all border border-slate-50">✏️</button>
                  <button onClick={() => { if(confirm('Hapus cabang?')) deleteOutlet(outlet.id); }} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-red-50 text-red-500 rounded-xl transition-all border border-slate-50">🗑️</button>
                </div>
              </div>

              <div className="flex-1 mb-6 relative z-10">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">GPS Coordinates</p>
                  <p className="text-[10px] text-slate-600 font-mono">LAT: {outlet.latitude || '0'}, LNG: {outlet.longitude || '0'}</p>
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

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-lg h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingOutlet ? 'Update Info Cabang' : 'Buka Cabang Baru'}</h3>
                <button onClick={() => { setShowModal(false); setEditingOutlet(null); }} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Cabang</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Alamat</label>
                   <textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                   <div className="flex justify-between items-center mb-4">
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em]">Geofencing Setup</p>
                      <button 
                        onClick={handleGetCurrentLocation}
                        className={`px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase hover:bg-orange-500 transition-all ${isGettingLocation ? 'animate-pulse' : ''}`}
                      >
                        {isGettingLocation ? 'Wait...' : 'Get Location'}
                      </button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Latitude</label>
                         <input type="number" step="any" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[10px] outline-none focus:border-orange-500" value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                         <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Longitude</label>
                         <input type="number" step="any" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[10px] outline-none focus:border-orange-500" value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
                      </div>
                   </div>
                   <p className="text-[7px] text-slate-500 mt-4 uppercase italic">Koordinat ini digunakan sebagai titik pusat validasi absen karyawan.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Jam Buka</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Jam Tutup</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} />
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button onClick={handleSave} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN KONFIGURASI 🚀</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
