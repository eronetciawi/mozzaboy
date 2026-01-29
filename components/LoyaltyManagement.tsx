
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

  const handleSaveTier = () => {
    if (editingTier) updateMembershipTier({ ...editingTier, ...tierForm });
    else addMembershipTier(tierForm);
    setShowTierModal(false);
    setEditingTier(null);
  };

  const handleSaveBulk = () => {
    if (editingBulk) updateBulkDiscount({ ...editingBulk, ...bulkForm });
    else addBulkDiscount(bulkForm);
    setShowBulkModal(false);
    setEditingBulk(null);
  };

  const toggleProductInBulk = (pid: string) => {
    setBulkForm(prev => {
      const exists = prev.applicableProductIds.includes(pid);
      if (exists) return { ...prev, applicableProductIds: prev.applicableProductIds.filter(id => id !== pid) };
      return { ...prev, applicableProductIds: [...prev.applicableProductIds, pid] };
    });
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Loyalty & Promo</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Strategi retensi & promosi pelanggan</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveTab('tiers')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'tiers' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Membership</button>
           <button onClick={() => setActiveTab('bulk')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'bulk' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Grosir</button>
           {isAdmin && <button onClick={() => setActiveTab('settings')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Poin</button>}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'tiers' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level Membership</h3>
                {isAdmin && <button onClick={() => { setEditingTier(null); setTierForm({ name: '', minPoints: 0, discountPercent: 0 }); setShowTierModal(true); }} className="text-[9px] font-black text-orange-600">+ Tier Baru</button>}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {membershipTiers.map(t => (
                  <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-xl">🏆</div>
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Benefit {t.discountPercent}%</span>
                     </div>
                     <h4 className="text-sm font-black text-slate-800 uppercase mb-1">{t.name}</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Min. {t.minPoints.toLocaleString()} PTS</p>
                     {isAdmin && (
                       <div className="mt-4 flex gap-2 border-t pt-4">
                          <button onClick={() => { setEditingTier(t); setTierForm(t); setShowTierModal(true); }} className="flex-1 py-2 bg-slate-50 text-slate-500 rounded-xl text-[8px] font-black uppercase">Edit</button>
                          <button onClick={() => { if(confirm('Hapus tier?')) deleteMembershipTier(t.id); }} className="p-2 text-red-400">🗑️</button>
                       </div>
                     )}
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'bulk' && (
           <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promo Grosir Aktif</h3>
                 {isAdmin && <button onClick={() => { setEditingBulk(null); setBulkForm({ name: '', minQty: 5, discountPercent: 0, isActive: true, applicableProductIds: [] }); setShowBulkModal(true); }} className="text-[9px] font-black text-orange-600">+ Promo Baru</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {bulkDiscounts.map(rule => (
                   <div key={rule.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden ${!rule.isActive && 'opacity-50'}`}>
                      <div className="flex justify-between items-start mb-3">
                         <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-lg">🎁</div>
                         <span className="bg-indigo-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Diskon {rule.discountPercent}%</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-800 uppercase mb-1">{rule.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Minimal Beli: <span className="text-indigo-600">{rule.minQty} Unit</span></p>
                      <div className="mt-4 flex flex-wrap gap-1">
                         {rule.applicableProductIds.length === products.length ? (
                           <span className="text-[7px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-400">Semua Produk</span>
                         ) : (
                           <span className="text-[7px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-400">{rule.applicableProductIds.length} Menu Terpilih</span>
                         )}
                      </div>
                      {isAdmin && (
                        <div className="mt-4 flex gap-2 border-t pt-4">
                           <button onClick={() => { setEditingBulk(rule); setBulkForm(rule); setShowBulkModal(true); }} className="flex-1 py-2 bg-slate-50 text-slate-500 rounded-xl text-[8px] font-black uppercase">Kelola</button>
                           <button onClick={() => { if(confirm('Hapus promo?')) deleteBulkDiscount(rule.id); }} className="p-2 text-red-400">🗑️</button>
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="max-w-xl mx-auto space-y-6">
             <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-xl">
                <div className="flex items-center justify-between mb-8 border-b pb-6">
                   <h3 className="text-lg font-black text-slate-800 uppercase">Sistem Poin</h3>
                   <button 
                    onClick={() => setLocalConfig({...localConfig, isEnabled: !localConfig.isEnabled})}
                    className={`w-14 h-7 rounded-full relative transition-all ${localConfig.isEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${localConfig.isEnabled ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Belanja Per 1 Poin (Rp)</label>
                      <input type="number" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-xl text-orange-600 focus:outline-none" value={localConfig.earningAmountPerPoint} onChange={e => setLocalConfig({...localConfig, earningAmountPerPoint: parseInt(e.target.value) || 0})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Potongan Per 1 Poin (Rp)</label>
                      <input type="number" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-xl text-green-600 focus:outline-none" value={localConfig.redemptionValuePerPoint} onChange={e => setLocalConfig({...localConfig, redemptionValuePerPoint: parseInt(e.target.value) || 0})} />
                   </div>
                   <button onClick={() => { updateLoyaltyConfig(localConfig); alert("Berhasil!"); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN KONFIGURASI 💾</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* FULL SCREEN MODALS FOR MOBILE */}
      {showTierModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
           <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-md p-8 shadow-2xl animate-in slide-in-from-bottom-10">
              <h3 className="text-xl font-black text-slate-800 mb-8 uppercase">Level Membership</h3>
              <div className="space-y-5">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nama Level</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase" value={tierForm.name} onChange={e => setTierForm({...tierForm, name: e.target.value})} placeholder="PLATINUM" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">Min. Poin</label>
                       <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={tierForm.minPoints} onChange={e => setTierForm({...tierForm, minPoints: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">Diskon (%)</label>
                       <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-green-600" value={tierForm.discountPercent} onChange={e => setTierForm({...tierForm, discountPercent: parseInt(e.target.value) || 0})} />
                    </div>
                 </div>
                 <button onClick={handleSaveTier} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">SIMPAN TIER 🚀</button>
                 <button onClick={() => setShowTierModal(false)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Batalkan</button>
              </div>
              <div className="h-safe-bottom md:hidden"></div>
           </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-6">
           <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Aturan Promo Grosir</h3>
                 <button onClick={() => setShowBulkModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase">Nama Promo</label>
                          <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={bulkForm.name} onChange={e => setBulkForm({...bulkForm, name: e.target.value})} placeholder="Borongan Mozza" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase">Min. Qty</label>
                             <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black" value={bulkForm.minQty} onChange={e => setBulkForm({...bulkForm, minQty: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase">Diskon (%)</label>
                             <input type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-orange-600" value={bulkForm.discountPercent} onChange={e => setBulkForm({...bulkForm, discountPercent: parseInt(e.target.value) || 0})} />
                          </div>
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Berlaku Untuk Produk:</label>
                       <div className="max-h-[300px] overflow-y-auto border-2 border-slate-50 rounded-[32px] p-4 bg-slate-50/50 space-y-2 no-scrollbar">
                          <button onClick={() => setBulkForm({...bulkForm, applicableProductIds: products.map(p => p.id)})} className="w-full py-2 bg-white text-[8px] font-black uppercase rounded-lg border">Pilih Semua</button>
                          {products.map(p => (
                             <button key={p.id} onClick={() => toggleProductInBulk(p.id)} className={`w-full flex justify-between p-3 rounded-xl border-2 transition-all ${bulkForm.applicableProductIds.includes(p.id) ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-transparent'}`}>
                                <span className="text-[9px] font-black uppercase">{p.name}</span>
                                {bulkForm.applicableProductIds.includes(p.id) && <span className="text-indigo-600">✓</span>}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/30 shrink-0">
                 <button onClick={handleSaveBulk} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10">AKTIFKAN STRATEGI PROMO 🚀</button>
                 <div className="h-safe-bottom md:hidden"></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
