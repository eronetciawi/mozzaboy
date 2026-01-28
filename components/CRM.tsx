
import React, { useState } from 'react';
import { useApp } from '../store';
import { Customer, UserRole } from '../types';

export const CRM: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, membershipTiers, staff } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingDetail, setViewingDetail] = useState<Customer | null>(null);
  const [showingMemberCard, setShowingMemberCard] = useState<Customer | null>(null);
  
  // Authorization State for Deletion
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    tierId: 't1'
  });

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const getTierStyle = (tierName: string) => {
    switch(tierName) {
      case 'VIP': return 'bg-purple-500 text-white shadow-purple-500/20';
      case 'GOLD': return 'bg-orange-500 text-white shadow-orange-500/20';
      default: return 'bg-slate-200 text-slate-600 shadow-slate-200/20';
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone) return;
    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...formData });
    } else {
      addCustomer(formData);
    }
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', tierId: 't1' });
  };

  const handleAuthorizeDelete = () => {
    if (!customerToDelete) return;

    const authorizedStaff = staff.find(s => 
      s.username === authUsername && 
      s.password === authPassword && 
      (s.role === UserRole.OWNER || s.role === UserRole.MANAGER)
    );

    if (authorizedStaff) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      setAuthUsername('');
      setAuthPassword('');
      setAuthError('');
      alert(`Member ${customerToDelete.name} berhasil dihapus.`);
    } else {
      setAuthError('Otorisasi Gagal: User bukan Manager/Owner atau password salah.');
    }
  };

  const vipTierId = membershipTiers.find(t => t.name === 'VIP')?.id;

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Manajemen Pelanggan (CRM)</h2>
          <p className="text-slate-500 font-medium italic text-xs">Pendaftaran member, akumulasi poin, dan riwayat pendaftaran</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari nama atau telepon..." 
              className="pl-10 pr-6 py-3 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-xs shadow-sm w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
          <button 
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: '', phone: '', tierId: 't1' });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all"
          >
            + Member Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Total Member Terdaftar</p>
          <h3 className="text-4xl font-black text-slate-800">{customers.length}</h3>
          <p className="text-[9px] text-green-600 font-black mt-3 uppercase">Database Pusat</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Total Poin Loyalitas</p>
          <h3 className="text-4xl font-black text-orange-500">{customers.reduce((acc, c) => acc + c.points, 0).toLocaleString()}</h3>
          <p className="text-[9px] text-slate-400 font-black mt-3 uppercase tracking-tighter">Point Liability</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl flex flex-col justify-center text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 text-white">👑</div>
           <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Customer VIP</p>
           <h3 className="text-4xl font-black text-white">{customers.filter(c => c.tierId === vipTierId).length}</h3>
           <p className="text-[9px] text-orange-500 font-black mt-3 uppercase">Top Tier Spender</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Audit Database Member</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
              <th className="py-6 px-8">Data Pelanggan</th>
              <th className="py-6 px-4 text-center">Membership</th>
              <th className="py-6 px-4">Poin</th>
              <th className="py-6 px-4">Pendaftaran</th>
              <th className="py-6 px-4">Cabang Daftar</th>
              <th className="py-6 px-8 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(customer => {
              const tier = membershipTiers.find(t => t.id === customer.tierId);
              return (
                <tr key={customer.id} className="group hover:bg-slate-50/80 transition-all">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 uppercase">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${getTierStyle(tier?.name || '')}`}>
                      {tier?.name || 'REGULAR'}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="font-black text-orange-500 text-sm">{customer.points.toLocaleString()} <span className="text-[8px] text-slate-400 uppercase">PTS</span></span>
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Last: {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'New'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-[10px] font-black text-slate-800">{new Date(customer.registeredAt).toLocaleDateString()}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Oleh: {customer.registeredByStaffName}</p>
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-[10px] font-black text-slate-700 uppercase">{customer.registeredAtOutletName}</p>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setShowingMemberCard(customer)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          title="Tampilkan Digital Card"
                        >
                          🎫
                        </button>
                        <button 
                          onClick={() => setViewingDetail(customer)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          title="Detail Audit"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCustomer(customer);
                            setFormData({ name: customer.name, phone: customer.phone, tierId: customer.tierId });
                            setShowModal(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => setCustomerToDelete(customer)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          🗑️
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic tracking-[0.2em]">Data member tidak ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Authorization Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <div className="p-10 bg-red-500 text-white text-center">
                 <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-4 animate-pulse">🔒</div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter">Otorisasi Penghapusan</h3>
                 <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-2 px-4">Tindakan ini permanen. Poin member akan hangus.</p>
              </div>

              <div className="p-10 space-y-6">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Target Penghapusan:</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{customerToDelete.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{customerToDelete.phone}</p>
                 </div>

                 {authError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[9px] font-black text-center uppercase border border-red-100">
                       {authError}
                    </div>
                 )}

                 <div className="space-y-4">
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Username Manager/Owner</label>
                       <input 
                        type="text" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-red-500 outline-none transition-all"
                        value={authUsername}
                        onChange={e => setAuthUsername(e.target.value)}
                        placeholder="Username Atasan"
                       />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Password Otorisasi</label>
                       <input 
                        type="password" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-red-500 outline-none transition-all"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                       />
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={handleAuthorizeDelete}
                      className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                    >
                       KONFIRMASI HAPUS PERMANEN 🗑️
                    </button>
                    <button 
                      onClick={() => {
                        setCustomerToDelete(null);
                        setAuthError('');
                        setAuthUsername('');
                        setAuthPassword('');
                      }}
                      className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600"
                    >
                       BATALKAN
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-md p-12 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
              {editingCustomer ? 'Update Profil Member' : 'Pendaftaran Member'}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:border-orange-500 transition-all outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Misal: Budi Santoso" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:border-orange-500 transition-all outline-none" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="0812..." 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Level Membership</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm focus:border-orange-500 transition-all outline-none"
                  value={formData.tierId}
                  onChange={e => setFormData({...formData, tierId: e.target.value})}
                >
                  {membershipTiers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (DISC {t.discountPercent}%)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
              <button onClick={handleSave} className="flex-1 py-5 bg-slate-900 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-2xl">Simpan Profil</button>
            </div>
          </div>
        </div>
      )}

      {showingMemberCard && (
        <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setShowingMemberCard(null)}>
           <div className="bg-slate-900 rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 border-2 border-white/10" onClick={e => e.stopPropagation()}>
              <div className="p-10 text-center relative">
                 <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
                 <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-8">MOZZA BOY LOYALTY CARD</h4>
                 
                 <div className="bg-white p-6 rounded-[32px] shadow-2xl mb-8 relative z-10">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${showingMemberCard.phone}&color=0f172a`} 
                      alt="Member QR" 
                      className="w-full h-auto rounded-xl"
                    />
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center px-2">
                       <div className="text-left">
                          <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Point Balance</p>
                          <p className="text-xl font-black text-slate-900">{showingMemberCard.points.toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Tier</p>
                          <p className="text-xs font-black text-orange-500 uppercase">{membershipTiers.find(t => t.id === showingMemberCard.tierId)?.name || 'REGULAR'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1 relative z-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{showingMemberCard.name}</h3>
                    <p className="text-xs text-slate-500 font-mono tracking-widest">{showingMemberCard.phone}</p>
                 </div>
                 
                 <button 
                  onClick={() => setShowingMemberCard(null)}
                  className="w-full py-4 mt-10 bg-white/5 text-white/40 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all"
                 >
                   CLOSE CARD VIEW
                 </button>
              </div>
           </div>
        </div>
      )}

      {viewingDetail && (
        <div className="fixed inset-0 z-[120] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5">
              <div className="p-10 bg-slate-900 text-white flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-3xl bg-orange-500 flex items-center justify-center text-3xl font-black mb-4 shadow-xl shadow-orange-500/20">
                    {viewingDetail.name.charAt(0)}
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tight">{viewingDetail.name}</h3>
                 <p className="text-xs text-slate-400 mt-1">{viewingDetail.phone}</p>
                 <div className="mt-6 px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                    AUDIT REGISTRATION LOG
                 </div>
              </div>
              <div className="p-10 space-y-6">
                 <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Daftar</span>
                    <span className="text-xs font-bold text-slate-800">{new Date(viewingDetail.registeredAt).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff Pendaftar</span>
                    <span className="text-xs font-bold text-slate-800 uppercase">{viewingDetail.registeredByStaffName}</span>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lokasi Outlet</span>
                    <span className="text-xs font-bold text-orange-600 uppercase">{viewingDetail.registeredAtOutletName}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poin Saat Ini</span>
                    <span className="text-xs font-black text-slate-800">{viewingDetail.points.toLocaleString()} PTS</span>
                 </div>
                 <button 
                  onClick={() => setViewingDetail(null)}
                  className="w-full py-4 mt-6 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Tutup Detail
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
