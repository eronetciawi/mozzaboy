
import React, { useState } from 'react';
import { useApp } from '../store';
import { Outlet } from '../types';

export const OutletManagement: React.FC = () => {
  const { outlets, addOutlet, updateOutlet, deleteOutlet, staff, transactions, brandConfig } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);

  const [formData, setFormData] = useState<Partial<Outlet>>({
    name: '',
    address: '',
    openTime: '10:00',
    closeTime: '22:00',
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
    if (!formData.name) return alert("Nama cabang wajib diisi.");
    if (editingOutlet) {
      updateOutlet({ ...editingOutlet, ...formData } as Outlet);
    } else {
      addOutlet({ ...formData, id: `out-${Date.now()}` } as Outlet);
    }
    setShowModal(false);
    setEditingOutlet(null);
  };

  const handleConfirmDelete = () => {
    if (outletToDelete) {
      deleteOutlet(outletToDelete.id);
      setOutletToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-[#fcfdfe] pb-40">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-1.5">Network Infrastructure</p>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Branch Control</h2>
        </div>
        <button 
          onClick={() => { setEditingOutlet(null); setFormData({ name: '', address: '', openTime: '10:00', closeTime: '22:00', latitude: 0, longitude: 0 }); setShowModal(true); }}
          className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95 border-b-4 border-slate-950"
        >
          + Add New Branch
        </button>
      </div>

      {/* BRANCH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {outlets.map(outlet => {
          const staffCount = staff.filter(s => s.assignedOutletIds.includes(outlet.id)).length;
          const revenue = transactions.filter(tx => tx.outletId === outlet.id).reduce((a,b)=>a+(b.total || 0), 0);
          
          return (
            <div key={outlet.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col group relative overflow-hidden active:scale-[0.99]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[60px] -mr-12 -mt-12 group-hover:bg-indigo-50 transition-colors duration-500"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-lg border-2 border-white">🏢</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{outlet.name}</h3>
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1.5">ID: {outlet.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditingOutlet(outlet); setFormData(outlet); setShowModal(true); }} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 shadow-sm">✏️</button>
                  <button onClick={() => setOutletToDelete(outlet)} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all border border-slate-100 shadow-sm">🗑️</button>
                </div>
              </div>

              <div className="flex-1 mb-6 relative z-10 space-y-4">
                <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                   <span className="text-base">⏰</span>
                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{outlet.openTime} — {outlet.closeTime}</p>
                </div>
                
                <div className="px-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
                  <p className="text-[11px] font-black text-slate-500 leading-tight uppercase line-clamp-2">{outlet.address || 'No address data.'}</p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border-l-4 border-indigo-500 shadow-inner">
                  <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">GPS COORDS</p>
                  <p className="text-[9px] text-slate-400 font-mono tracking-tighter">{outlet.latitude?.toFixed(4) || '0.0000'} , {outlet.longitude?.toFixed(4) || '0.0000'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Crew</span>
                  <span className="text-base font-black text-slate-800">{staffCount} <span className="text-[9px] text-slate-400">PPL</span></span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Revenue</span>
                  <span className="text-base font-black text-indigo-600">Rp {(revenue/1000).toFixed(0)}k</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPACT & SCROLLABLE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 border border-white/10 overflow-hidden">
             
             {/* FIXED MODAL HEADER */}
             <div className="p-6 md:px-10 border-b border-slate-50 flex justify-between items-center shrink-0 bg-white">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{editingOutlet ? 'Modify Node' : 'Provision Node'}</h3>
                   <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">Access Control Configuration</p>
                </div>
                <button onClick={() => { setShowModal(false); setEditingOutlet(null); }} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-inner">✕</button>
             </div>
             
             {/* SCROLLABLE MODAL BODY */}
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Name</label>
                      <input 
                        type="text" 
                        placeholder="Outlet Name"
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[11px] text-slate-900 focus:border-indigo-500 outline-none transition-all" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Open</label>
                         <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-900 focus:border-indigo-500 outline-none" value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Close</label>
                         <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-900 focus:border-indigo-500 outline-none" value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                   <textarea 
                     placeholder="Detailed address..."
                     className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[11px] text-slate-600 h-20 focus:border-indigo-500 outline-none resize-none transition-all shadow-inner" 
                     value={formData.address} 
                     onChange={e => setFormData({...formData, address: e.target.value})} 
                   />
                </div>

                <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 text-5xl opacity-5">🛰️</div>
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                         <h4 className="text-sm font-black uppercase tracking-tight">Geofencing Intel</h4>
                         <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Automatic Node Registration</p>
                      </div>
                      <button 
                        onClick={handleGetCurrentLocation}
                        className={`px-5 py-2.5 bg-indigo-600 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2 ${isGettingLocation ? 'animate-pulse opacity-50' : 'active:scale-95'}`}
                      >
                        {isGettingLocation ? 'SYNCING...' : 'CAPTURE GPS 📍'}
                      </button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Latitude</label>
                         <input type="number" step="any" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[10px] text-white outline-none focus:border-indigo-500" value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Longitude</label>
                         <input type="number" step="any" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[10px] text-white outline-none focus:border-indigo-500" value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
                      </div>
                   </div>
                </div>
             </div>

             {/* FIXED MODAL FOOTER */}
             <div className="p-6 md:px-10 border-t border-slate-50 bg-slate-50 shrink-0">
                <button 
                   onClick={handleSave} 
                   className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-xl active:scale-[0.98] transition-all border-b-4 border-slate-950 flex items-center justify-center gap-3"
                >
                  COMMIT CHANGES 🚀
                </button>
             </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {outletToDelete && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter leading-none">De-provision Node?</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Akses cabang <span className="text-rose-600 font-black">"{outletToDelete.name}"</span> akan dicabut dari infrastruktur cloud secara permanen.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                    onClick={handleConfirmDelete} 
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-rose-700 transition-all active:scale-95"
                 >
                    IYA, CABUT AKSES CABANG 🗑️
                 </button>
                 <button onClick={() => setOutletToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-600 transition-colors">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
