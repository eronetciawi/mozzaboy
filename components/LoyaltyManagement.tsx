
import React, { useState } from 'react';
import { useApp } from '../store';
import { MembershipTier, BulkDiscountRule, Product, UserRole, LoyaltyConfig } from '../types';

export const LoyaltyManagement: React.FC = () => {
  const { 
    membershipTiers, bulkDiscounts, products, currentUser, loyaltyConfig, updateLoyaltyConfig,
    addMembershipTier, updateMembershipTier, deleteMembershipTier,
    addBulkDiscount, updateBulkDiscount, deleteBulkDiscount 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'tiers' | 'bulk' | 'settings'>('tiers');
  const [showTierModal, setShowTierModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [editingBulk, setEditingBulk] = useState<BulkDiscountRule | null>(null);

  const [tierForm, setTierForm] = useState<Omit<MembershipTier, 'id'>>({ name: '', minPoints: 0, discountPercent: 0 });
  const [bulkForm, setBulkForm] = useState<Omit<BulkDiscountRule, 'id'>>({ name: '', minQty: 5, discountPercent: 0, isActive: true, applicableProductIds: [] });
  
  const [localConfig, setLocalConfig] = useState<LoyaltyConfig>(loyaltyConfig);

  const isAdmin = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  // TIER ACTIONS
  const handleSaveTier = () => {
    if (editingTier) updateMembershipTier({ ...editingTier, ...tierForm });
    else addMembershipTier(tierForm);
    setShowTierModal(false);
    setEditingTier(null);
  };

  // BULK ACTIONS
  const handleSaveBulk = () => {
    if (editingBulk) updateBulkDiscount({ ...editingBulk, ...bulkForm });
    else addBulkDiscount(bulkForm);
    setShowBulkModal(false);
    setEditingBulk(null);
  };

  const handleUpdateConfig = () => {
    updateLoyaltyConfig(localConfig);
    alert("Konfigurasi sistem poin telah diperbarui.");
  };

  const toggleProductInBulk = (pid: string) => {
    setBulkForm(prev => {
      const exists = prev.applicableProductIds.includes(pid);
      if (exists) return { ...prev, applicableProductIds: prev.applicableProductIds.filter(id => id !== pid) };
      return { ...prev, applicableProductIds: [...prev.applicableProductIds, pid] };
    });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Strategi Loyalty & Promo</h2>
          <p className="text-slate-500 font-medium italic text-sm">
            {isAdmin ? 'Kendali penuh atas retensi pelanggan dan strategi harga grosir' : 'Daftar promo dan keuntungan member yang sedang aktif'}
          </p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <button onClick={() => setActiveTab('tiers')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tiers' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Membership</button>
           <button onClick={() => setActiveTab('bulk')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bulk' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Grosir/Bulk</button>
           {isAdmin && (
             <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Pengaturan Poin</button>
           )}
        </div>
      </div>

      <div className="pb-20">
        {activeTab === 'tiers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Level Membership (Tiering)</h3>
              {isAdmin && (
                <button 
                  onClick={() => { setEditingTier(null); setTierForm({ name: '', minPoints: 0, discountPercent: 0 }); setShowTierModal(true); }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-500 transition-all"
                >
                  + Tier Baru
                </button>
              )}
            </div>
            <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="py-4 px-6">Nama Tier</th>
                    <th className="py-4 px-6">Batas Poin</th>
                    <th className="py-4 px-6 text-center">Benefit (%)</th>
                    {isAdmin && <th className="py-4 px-6 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {membershipTiers.sort((a,b) => a.minPoints - b.minPoints).map((t) => (
                    <tr key={t.id} className="group hover:bg-slate-50 transition-all">
                      <td className="py-4 px-6">
                        <span className="font-black text-slate-800 uppercase text-xs">{t.name}</span>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-500">{t.minPoints.toLocaleString()} <span className="text-[8px] uppercase opacity-50">PTS</span></td>
                      <td className="py-4 px-6 text-center">
                         <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full font-black text-[10px] uppercase">Disc {t.discountPercent}%</span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setEditingTier(t); setTierForm(t); setShowTierModal(true); }} className="p-2 bg-white border border-slate-200 rounded-lg text-[10px]">✏️</button>
                              <button onClick={() => { if(confirm('Hapus tier ini?')) deleteMembershipTier(t.id); }} className="p-2 bg-red-50 text-red-500 rounded-lg text-[10px]">🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Promo Grosir (Buy X Get Y%)</h3>
              {isAdmin && (
                <button 
                  onClick={() => { setEditingBulk(null); setBulkForm({ name: '', minQty: 5, discountPercent: 0, isActive: true, applicableProductIds: [] }); setShowBulkModal(true); }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                >
                  + Aturan Promo
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bulkDiscounts.map(rule => (
                <div key={rule.id} className={`bg-white rounded-3xl border-2 p-6 flex items-center gap-6 shadow-sm transition-all hover:border-orange-200 ${!rule.isActive ? 'opacity-50 grayscale' : 'border-slate-100'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl">🎁</div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 uppercase text-xs mb-1">{rule.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Beli min. <span className="text-orange-500 font-black">{rule.minQty}</span> item pilihan → Diskon <span className="text-green-600 font-black">{rule.discountPercent}%</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {rule.applicableProductIds.length === products.length ? (
                        <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-400">Semua Produk</span>
                      ) : (
                        rule.applicableProductIds.slice(0, 3).map(pid => (
                          <span key={pid} className="text-[8px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-400">
                            {products.find(p => p.id === pid)?.name}
                          </span>
                        ))
                      )}
                      {rule.applicableProductIds.length > 3 && <span className="text-[8px] font-black uppercase bg-slate-50 px-2 py-0.5 rounded text-slate-300">+{rule.applicableProductIds.length - 3} Lagi</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => { setEditingBulk(rule); setBulkForm(rule); setShowBulkModal(true); }}
                        className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all text-xs"
                      >✏️</button>
                      <button 
                        onClick={() => { if(confirm('Hapus promo ini?')) deleteBulkDiscount(rule.id); }}
                        className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all text-xs"
                      >🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl space-y-10">
                <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                   <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pengaturan Sistem Poin</h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Atur rasio perolehan dan penukaran poin loyalitas</p>
                   </div>
                   <button 
                    onClick={() => setLocalConfig({...localConfig, isEnabled: !localConfig.isEnabled})}
                    className={`w-16 h-8 rounded-full relative transition-all ${localConfig.isEnabled ? 'bg-green-500' : 'bg-slate-200'}`}
                   >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${localConfig.isEnabled ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>

                {!localConfig.isEnabled ? (
                  <div className="py-12 text-center bg-red-50 rounded-3xl border-2 border-dashed border-red-100">
                     <p className="text-sm font-black text-red-400 uppercase tracking-widest">Sistem Poin Dinonaktifkan</p>
                     <p className="text-[10px] text-red-300 mt-2 italic">Pelanggan tidak akan mendapatkan poin dan tidak bisa menukar poin di kasir.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-l-4 border-orange-500 pl-3">Earning Rules (Dapatkan)</h4>
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Nilai Belanja (Rp) untuk 1 Poin</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">Rp</span>
                              <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-orange-500 outline-none"
                                value={localConfig.earningAmountPerPoint}
                                onChange={e => setLocalConfig({...localConfig, earningAmountPerPoint: parseInt(e.target.value) || 0})}
                              />
                           </div>
                           <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase italic">* Misal 1.000 berarti belanja Rp 1.000 dapat 1 Poin</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Redeem Rules (Tukar)</h4>
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Nilai Tukar 1 Poin (Rp)</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">Rp</span>
                              <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-indigo-500 outline-none"
                                value={localConfig.redemptionValuePerPoint}
                                onChange={e => setLocalConfig({...localConfig, redemptionValuePerPoint: parseInt(e.target.value) || 0})}
                              />
                           </div>
                           <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase italic">* Misal 100 berarti 1 Poin memotong harga Rp 100</p>
                        </div>
                        <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Minimal Poin untuk Tukar</label>
                           <input 
                              type="number" 
                              className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-indigo-500 outline-none"
                              value={localConfig.minRedeemPoints}
                              onChange={e => setLocalConfig({...localConfig, minRedeemPoints: parseInt(e.target.value) || 0})}
                           />
                        </div>
                     </div>
                  </div>
                )}

                <div className="pt-8 border-t border-slate-50 flex gap-4">
                   <button 
                    onClick={() => setLocalConfig(loyaltyConfig)}
                    className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest"
                   >Reset ke default</button>
                   <button 
                    onClick={handleUpdateConfig}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl tracking-[0.2em] hover:bg-orange-600 transition-all"
                   >SIMPAN CONFIG SISTEM</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Tier Modal */}
      {showTierModal && isAdmin && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-md p-12 shadow-2xl animate-in zoom-in-95">
             <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">{editingTier ? 'Update Tier' : 'Buat Tier Baru'}</h3>
             <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Level</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase focus:border-orange-500 outline-none" value={tierForm.name} onChange={e => setTierForm({...tierForm, name: e.target.value})} placeholder="MISAL: PLATINUM" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Min. Poin</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:border-orange-500 outline-none" value={tierForm.minPoints} onChange={e => setTierForm({...tierForm, minPoints: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Diskon (%)</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-green-600 focus:border-orange-500 outline-none" value={tierForm.discountPercent} onChange={e => setTierForm({...tierForm, discountPercent: parseInt(e.target.value)})} />
                  </div>
                </div>
             </div>
             <div className="flex gap-4 mt-10">
                <button onClick={() => setShowTierModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
                <button onClick={handleSaveTier} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl tracking-widest">Simpan Tier</button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk Promo Modal */}
      {showBulkModal && isAdmin && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-4xl p-12 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">{editingBulk ? 'Update Aturan Promo' : 'Buat Aturan Promo Baru'}</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1 overflow-hidden">
                <div className="space-y-6">
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Kampanye Promo</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:border-orange-500 outline-none" value={bulkForm.name} onChange={e => setBulkForm({...bulkForm, name: e.target.value})} placeholder="MISAL: Borongan Corndog" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Minimal Beli (Qty)</label>
                        <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:border-orange-500 outline-none" value={bulkForm.minQty} onChange={e => setBulkForm({...bulkForm, minQty: parseInt(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Diskon (%)</label>
                        <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-orange-600 focus:border-orange-500 outline-none" value={bulkForm.discountPercent} onChange={e => setBulkForm({...bulkForm, discountPercent: parseInt(e.target.value)})} />
                      </div>
                   </div>
                   <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">Audit Summary</p>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                         "Promo ini akan aktif jika pelanggan membeli minimal <b>{bulkForm.minQty} item</b> dari daftar produk yang Anda pilih di samping."
                      </p>
                   </div>
                </div>

                <div className="flex flex-col">
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest ml-1 text-center underline">Pilih Produk yang Masuk Promo</label>
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                      <button 
                        onClick={() => {
                          const allIds = products.map(p => p.id);
                          const isAllSelected = bulkForm.applicableProductIds.length === products.length;
                          setBulkForm({...bulkForm, applicableProductIds: isAllSelected ? [] : allIds});
                        }}
                        className="w-full py-3 bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
                      >
                        {bulkForm.applicableProductIds.length === products.length ? 'Batal Pilih Semua' : 'Pilih Semua Produk'}
                      </button>
                      {products.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => toggleProductInBulk(p.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${bulkForm.applicableProductIds.includes(p.id) ? 'border-orange-500 bg-orange-50' : 'border-slate-50 hover:border-slate-200'}`}
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0">
                                <img src={p.image} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] font-black text-slate-800 uppercase text-left">{p.name}</span>
                           </div>
                           {bulkForm.applicableProductIds.includes(p.id) && <span className="text-orange-500">✓</span>}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                <button onClick={() => setShowBulkModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Batal</button>
                <button onClick={handleSaveBulk} className="flex-1 py-5 bg-orange-500 text-white font-black rounded-3xl text-[10px] uppercase shadow-2xl tracking-[0.2em] shadow-orange-500/20 hover:bg-orange-600 transition-all">Simpan Promo Sekarang</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
