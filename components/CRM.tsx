
import React, { useState } from 'react';
import { useApp } from '../store';
import { Customer, UserRole } from '../types';

export const CRM: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, membershipTiers, staff, outlets, selectedOutletId } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showingMemberCard, setShowingMemberCard] = useState<Customer | null>(null);
  
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [formData, setFormData] = useState({ name: '', phone: '', tierId: 't1' });

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const handleSave = () => {
    if (!formData.name || !formData.phone) return;
    if (editingCustomer) updateCustomer({ ...editingCustomer, ...formData });
    else addCustomer(formData);
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', tierId: 't1' });
  };

  const handleAuthorizeDelete = () => {
    const authorized = staff.find(s => s.username === authUsername && s.password === authPassword && (s.role === UserRole.OWNER || s.role === UserRole.MANAGER));
    if (authorized && customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      setAuthError('');
    } else setAuthError('Otorisasi Gagal.');
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Pelanggan</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Database Member & Poin Loyalitas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <input type="text" placeholder="Cari member..." className="w-full md:w-48 pl-10 pr-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-xs shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
          </div>
          <button onClick={() => { setEditingCustomer(null); setFormData({ name: '', phone: '', tierId: 't1' }); setShowModal(true); }} className="px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase shadow-xl hover:bg-orange-500 transition-all whitespace-nowrap">+ Member</button>
        </div>
      </div>

      {/* SUMMARY MOBILE CARDS */}
      <div className="grid grid-cols-2 gap-3 mb-8">
         <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Member</p>
            <h4 className="text-2xl font-black text-slate-800">{customers.length}</h4>
         </div>
         <div className="bg-slate-900 p-5 rounded-[32px] text-white text-center shadow-xl">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Poin</p>
            <h4 className="text-xl font-black text-orange-500">{customers.reduce((acc, c) => acc + c.points, 0).toLocaleString()}</h4>
         </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Daftar Member Aktif</h3>
        {filtered.map(customer => {
          const tier = membershipTiers.find(t => t.id === customer.tierId);
          return (
            <div key={customer.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4 min-w-0">
                 <button onClick={() => setShowingMemberCard(customer)} className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">👤</button>
                 <div className="min-w-0">
                    <h4 className="font-black text-slate-800 uppercase text-[11px] truncate leading-tight">{customer.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{customer.phone} • {tier?.name || 'REGULAR'}</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5 ml-3 shrink-0">
                 <div className="text-lg font-black text-orange-500 leading-none">{customer.points.toLocaleString()} <span className="text-[8px] text-slate-300">PTS</span></div>
                 <div className="flex gap-1.5">
                    <button onClick={() => { setEditingCustomer(customer); setFormData({ name: customer.name, phone: customer.phone, tierId: customer.tierId }); setShowModal(true); }} className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-[10px]">✏️</button>
                    <button onClick={() => setCustomerToDelete(customer)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-[10px]">🗑️</button>
                 </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase italic">Member tidak ditemukan</p>}
      </div>

      {/* MEMBER DIGITAL CARD MODAL */}
      {showingMemberCard && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setShowingMemberCard(null)}>
           <div className="bg-slate-900 rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 border-2 border-white/10" onClick={e => e.stopPropagation()}>
              <div className="p-10 text-center relative">
                 <h4 className="text-[9px] font-black text-orange-500 uppercase tracking-[0.4em] mb-10">MOZZA BOY LOYALTY CARD</h4>
                 <div className="bg-white p-8 rounded-[40px] shadow-2xl mb-10 transform -rotate-2">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${showingMemberCard.phone}&color=0f172a`} alt="Member QR" className="w-full h-auto rounded-xl mx-auto" />
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between px-2">
                       <div className="text-left"><p className="text-[7px] font-black text-slate-400 uppercase">Points</p><p className="text-xl font-black text-slate-900">{showingMemberCard.points.toLocaleString()}</p></div>
                       <div className="text-right"><p className="text-[7px] font-black text-slate-400 uppercase">Tier</p><p className="text-xs font-black text-orange-500 uppercase">{membershipTiers.find(t => t.id === showingMemberCard.tierId)?.name || 'REGULAR'}</p></div>
                    </div>
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{showingMemberCard.name}</h3>
                 <p className="text-xs text-slate-500 font-mono tracking-widest">{showingMemberCard.phone}</p>
                 <button onClick={() => setShowingMemberCard(null)} className="w-full py-4 mt-12 bg-white/5 text-white/40 rounded-2xl font-black text-[9px] uppercase tracking-widest">Tutup Pratinjau</button>
              </div>
           </div>
        </div>
      )}

      {/* FULL SCREEN ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
           <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-md p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-8 uppercase">{editingCustomer ? 'Update Profil' : 'Member Baru'}</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Lengkap</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Budi Santoso" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nomor WhatsApp</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0812..." />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Tier Membership</label>
                    <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm" value={formData.tierId} onChange={e => setFormData({...formData, tierId: e.target.value})}>
                       {membershipTiers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.discountPercent}%)</option>)}
                    </select>
                 </div>
                 <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN DATA MEMBER 🎖️</button>
                 <button onClick={() => setShowModal(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batalkan</button>
              </div>
              <div className="h-safe-bottom md:hidden"></div>
           </div>
        </div>
      )}

      {/* DELETE AUTH MODAL */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[220] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-6 tracking-tighter">Otorisasi Manager<br/><span className="text-red-600 text-xs">(Hapus Member)</span></h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Username Manager" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                 {authError && <p className="text-[8px] font-black text-red-600 uppercase">{authError}</p>}
                 <button onClick={handleAuthorizeDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">HAPUS PERMANEN 🗑️</button>
                 <button onClick={() => { setCustomerToDelete(null); setAuthError(''); }} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
