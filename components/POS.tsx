
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Product, PaymentMethod, Customer, UserRole } from '../types';

interface POSProps {
  setActiveTab: (tab: string) => void;
}

export const POS: React.FC<POSProps> = ({ setActiveTab }) => {
  const { 
    products = [], categories = [], cart = [], addToCart, 
    updateCartQuantity, checkout, customers = [], selectCustomer, selectedCustomerId,
    membershipTiers = [], bulkDiscounts = [], selectedOutletId, loyaltyConfig, inventory = [], 
    dailyClosings = [], currentUser, attendance = [], isSaving, brandConfig, isFetching
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showAttendanceToast, setShowAttendanceToast] = useState(false);
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Helper: Cek apakah stok bahan baku cukup
  const checkStockAvailability = (product: Product) => {
    if (selectedOutletId === 'all') return true;
    if (!product.bom || product.bom.length === 0) return true; 
    if (isFetching && inventory.length === 0) return true;

    return product.bom.every(bomItem => {
      const originalRef = inventory.find(i => i.id === bomItem.inventoryItemId);
      if (!originalRef) return true;
      const localInvItem = inventory.find(i => i.name === originalRef.name && i.outletId === selectedOutletId);
      if (!localInvItem) return true;
      const inCartQty = cart.find(c => c.product.id === product.id)?.quantity || 0;
      const totalNeeded = bomItem.quantity * (inCartQty + 1);
      return localInvItem.quantity >= totalNeeded;
    });
  };

  const safeCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const checkIsClockedIn = () => {
    if (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) return true;
    if (!currentUser) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const savedGuard = localStorage.getItem('mozzaboy_last_clockin');
    if (savedGuard) {
       try {
          const guard = JSON.parse(savedGuard);
          if (guard.date === todayStr && guard.staffId === currentUser.id) return true;
       } catch (e) {}
    }
    return (attendance || []).some(a => {
       const recordDateStr = typeof a.date === 'string' ? a.date : new Date(a.date).toLocaleDateString('en-CA');
       return a.staffId === currentUser.id && recordDateStr === todayStr;
    });
  };

  const isShiftClosed = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (dailyClosings || []).some(c => {
      const closingDate = typeof c.timestamp === 'string' ? new Date(c.timestamp).toLocaleDateString('en-CA') : c.timestamp.toLocaleDateString('en-CA');
      return c.outletId === selectedOutletId && c.staffId === currentUser.id && closingDate === todayStr;
    });
  }, [dailyClosings, selectedOutletId, currentUser]);

  const filteredProducts = products.filter(p => {
    const branchSetting = p.outletSettings?.[selectedOutletId];
    const isAvailableInBranch = branchSetting ? branchSetting.isAvailable : p.isAvailable;
    if (!isAvailableInBranch) return false;
    const catMatch = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const searchMatch = p.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const getPrice = (p: Product) => p?.outletSettings?.[selectedOutletId]?.price || p?.price || 0;
  const subtotal = cart.reduce((sum, item) => sum + (getPrice(item.product) * item.quantity), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentCustomer = customers.find(c => c.id === selectedCustomerId);
  const tierDiscountPercent = currentCustomer ? (membershipTiers.find(t => t.id === currentCustomer.tierId)?.discountPercent || 0) : 0;
  const bulkDiscountRule = bulkDiscounts.filter(r => r.isActive && totalQty >= r.minQty).sort((a,b) => b.minQty - a.minQty)[0];
  const bulkDiscountPercent = bulkDiscountRule?.discountPercent || 0;
  const isBulkBetter = bulkDiscountPercent > tierDiscountPercent;
  const appliedTierDiscount = isBulkBetter ? 0 : (subtotal * (tierDiscountPercent / 100));
  const appliedBulkDiscount = isBulkBetter ? (subtotal * (bulkDiscountPercent / 100)) : 0;
  const total = Math.max(0, subtotal - appliedTierDiscount - appliedBulkDiscount - (redeemPoints * loyaltyConfig.redemptionValuePerPoint));

  const handleCheckout = async (method: PaymentMethod) => {
    if (selectedOutletId === 'all') return alert("Pilih cabang jualan terlebih dahulu di bagian atas!");
    if (isShiftClosed) return;
    if (!checkIsClockedIn()) { setShowAttendanceToast(true); return; }
    
    // INSTANT FEEDBACK: Tutup modal dan tampilkan sukses segera!
    setShowCheckout(false);
    setShowSuccessToast(true);
    setRedeemPoints(0);
    setMobileView('menu');

    // Proses sinkronisasi di latar belakang (melalui store.tsx action)
    try {
      await checkout(method, redeemPoints, appliedTierDiscount, appliedBulkDiscount);
    } catch (err) { 
      // Kegagalan jaringan akan di-handle oleh sync queue di store.tsx
      console.warn("Background checkout initiated.");
    }
  };

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-white relative">
      <style>{`
        @keyframes checkout-pulse {
          0% { transform: translate(-50%, 0) scale(1); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2); }
          50% { transform: translate(-50%, -5px) scale(1.02); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); }
          100% { transform: translate(-50%, 0) scale(1); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2); }
        }
        @keyframes shine-fast {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }
        .animate-checkout-pill {
          animation: checkout-pulse 3s infinite ease-in-out;
        }
        .animate-shine-pill {
          animation: shine-fast 4s infinite linear;
        }
      `}</style>

      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
              <span className="text-xl">✅</span>
              <p className="text-[10px] font-black uppercase tracking-widest">Transaksi Dicatat</p>
           </div>
        </div>
      )}

      {showAttendanceToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-sm:w-80 px-4">
           <div className="bg-rose-600 text-white px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 border-rose-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">⚠️</div>
              <p className="text-[11px] font-bold text-rose-100 uppercase leading-tight">Wajib Absen Masuk!</p>
           </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col min-w-0 h-full ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-2 md:px-6 md:py-4 bg-white border-b border-slate-100 shrink-0 z-20 space-y-2">
          <div className="flex gap-1.5 items-center">
            {/* SEARCH BOX */}
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Cari produk..." 
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl focus:bg-white border-2 border-transparent focus:border-indigo-100 outline-none font-bold text-xs transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-sm">🔍</span>
            </div>
            
            {/* QUICK SHORTCUTS - AESTHETIC REPLACEMENT */}
            <div className="flex gap-1.5 shrink-0">
               <button 
                onClick={() => setActiveTab('production')}
                title="Input Produksi"
                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
               >
                 🥣
               </button>
               <button 
                onClick={() => setActiveTab('purchases')}
                title="Belanja Stok"
                className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center text-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95"
               >
                 📦
               </button>
               <button onClick={() => setShowMemberModal(true)} className={`w-10 h-10 rounded-xl border transition-all flex flex-col items-center justify-center shadow-sm active:scale-95 ${currentCustomer ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <span className="text-xs">👤</span>
                  <span className="text-[6px] font-black uppercase mt-0.5 leading-none">{currentCustomer ? 'VIP' : 'JOIN'}</span>
               </button>
            </div>
          </div>
          
          {/* CATEGORIES WRAPPED (NO HORIZONTAL SCROLL) */}
          <div className="flex flex-wrap gap-1 md:gap-1.5 pt-1">
            <button 
              onClick={() => setSelectedCategory('all')} 
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border whitespace-nowrap ${selectedCategory === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              Semua
            </button>
            {safeCategories.length === 0 ? (
               <button onClick={() => setActiveTab('categories')} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-200 border-dashed animate-pulse">
                  + Kategori
               </button>
            ) : (
               safeCategories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)} 
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border whitespace-nowrap ${selectedCategory === cat.id ? 'text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  style={selectedCategory === cat.id ? { backgroundColor: brandConfig.primaryColor, borderColor: brandConfig.primaryColor } : {}}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-50/50 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-32 md:pb-6">
           {selectedOutletId === 'all' && (
             <div className="mb-4 p-3 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-center">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">⚠️ Mode Pusat: Pilih cabang untuk mulai transaksi</p>
             </div>
           )}
           <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4">
            {filteredProducts.map(product => {
              const displayPrice = getPrice(product);
              const isAvailableByStock = checkStockAvailability(product);
              
              return (
                <button 
                  key={product.id} 
                  disabled={isShiftClosed || isSaving || (!isAvailableByStock && selectedOutletId !== 'all')}
                  onClick={() => addToCart(product)} 
                  className={`bg-white rounded-xl md:rounded-[28px] overflow-hidden border-2 flex flex-col text-left group transition-all active:scale-[0.96] h-full shadow-sm relative ${isShiftClosed || (!isAvailableByStock && selectedOutletId !== 'all') ? 'opacity-40 grayscale' : 'border-white hover:border-indigo-500'}`}
                >
                  {!isAvailableByStock && selectedOutletId !== 'all' && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 pointer-events-none">
                      <span className="bg-red-600 text-white text-[7px] md:text-[9px] font-black px-2 py-1 rounded-lg shadow-xl uppercase transform -rotate-12">Stok Habis</span>
                    </div>
                  )}
                  <div className="aspect-square w-full overflow-hidden bg-slate-100 relative shrink-0">
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-2 md:p-3 flex-1 flex flex-col justify-center">
                    <h5 className="font-extrabold text-slate-800 text-[8px] md:text-[11px] uppercase leading-tight line-clamp-2">{product.name}</h5>
                    <p className={`text-[9px] md:text-[13px] font-black font-mono tracking-tighter mt-1`} style={{ color: brandConfig.primaryColor }}>
                      Rp {(displayPrice).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
             <div className="py-20 text-center opacity-30 italic text-xs font-black uppercase">Tidak ada menu di kategori ini</div>
          )}
        </div>
      </div>

      <div className={`${mobileView === 'cart' ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 bg-slate-50 border-l border-slate-200 flex-col h-full`}>
        <div className="p-4 md:p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
           <h4 className="text-base font-black text-slate-900 uppercase tracking-tighter">Pesanan</h4>
           <button onClick={() => setMobileView('menu')} className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-100 rounded-xl text-xs font-black">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 text-center">
              <span className="text-5xl mb-4">🥡</span>
              <p className="font-black uppercase text-[9px]">Pilih menu...</p>
            </div>
          ) : (
            cart.map(item => {
              const canAddMore = checkStockAvailability(item.product);
              return (
                <div key={item.product.id} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[10px] text-slate-800 uppercase truncate">{item.product.name}</p>
                    <p className="text-[11px] font-black font-mono" style={{ color: brandConfig.primaryColor }}>Rp {getPrice(item.product).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-7 h-7 bg-white rounded-lg text-xs font-black shadow-sm">－</button>
                    <span className="w-4 text-center text-[11px] font-black text-slate-900">{item.quantity}</span>
                    <button 
                      disabled={!canAddMore && selectedOutletId !== 'all'}
                      onClick={() => updateCartQuantity(item.product.id, 1)} 
                      className={`w-7 h-7 bg-white rounded-lg text-xs font-black shadow-sm ${!canAddMore && selectedOutletId !== 'all' ? 'opacity-20' : ''}`}
                    >＋</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 md:p-8 bg-white border-t border-slate-200 space-y-5 rounded-t-[40px] shadow-lg">
          <div className="flex justify-between items-end pt-3 border-t border-slate-100">
            <span className="uppercase text-[9px] font-black text-slate-400">Total Netto</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">Rp {total.toLocaleString()}</span>
          </div>
          <button
            disabled={cart.length === 0 || isShiftClosed || selectedOutletId === 'all'}
            onClick={() => setShowCheckout(true)}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-30 transition-all"
            style={cart.length > 0 && !isShiftClosed && selectedOutletId !== 'all' ? { backgroundColor: brandConfig.primaryColor } : {}}
          >
            {selectedOutletId === 'all' ? 'PILIH CABANG' : isShiftClosed ? 'SHIFT CLOSED' : `PROSES BAYAR ➔`}
          </button>
        </div>
      </div>
      
      {/* FLOATING CHECKOUT PILL */}
      {cart.length > 0 && mobileView === 'menu' && (
        <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 w-[94%] max-w-sm z-[100] animate-checkout-pill transition-all">
          <button 
            onClick={() => setMobileView('cart')}
            className="w-full h-16 rounded-[28px] flex items-center justify-between px-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] border-2 border-white/40 overflow-hidden active:scale-95 transition-all relative"
            style={{ 
              background: `linear-gradient(135deg, ${brandConfig.primaryColor}, ${brandConfig.primaryColor}dd)`,
              boxShadow: `0 15px 40px -10px ${brandConfig.primaryColor}66`
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
               <div className="w-10 h-10 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-inner">
                  <span className="text-white font-black text-base drop-shadow-sm">{cart.reduce((a,b)=>a+b.quantity, 0)}</span>
               </div>
               <span className="text-white font-black text-[8px] uppercase tracking-[0.2em] drop-shadow-sm">Menu</span>
            </div>

            <div className="text-center relative z-10">
               <p className="text-[16px] font-black text-white font-mono tracking-tighter drop-shadow-md">Rp {total.toLocaleString()}</p>
               <p className="text-[7px] font-black text-white/80 uppercase tracking-widest leading-none">Total Bayar</p>
            </div>

            <div className="flex items-center gap-2 relative z-10">
               <span className="text-[10px] font-black text-white uppercase tracking-[0.1em] drop-shadow-sm">Check</span>
               <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <span className="text-xs" style={{ color: brandConfig.primaryColor }}>➔</span>
               </div>
            </div>

            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-45deg] animate-shine-pill pointer-events-none"></div>
            <div className="absolute inset-0 bg-white/10 opacity-50 pointer-events-none"></div>
          </button>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[32px] md:rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 uppercase">Pilih Metode Bayar</h3>
                <button onClick={() => setShowCheckout(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleCheckout(PaymentMethod.CASH)} 
                  className={`w-full p-5 bg-green-50 border-2 border-transparent rounded-3xl flex items-center gap-4 group transition-all hover:border-green-500`}
                >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">💵</div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-green-600 uppercase">TUNAI</p>
                      <p className="text-sm font-black">Uang Fisik</p>
                   </div>
                </button>
                <button 
                  onClick={() => handleCheckout(PaymentMethod.QRIS)} 
                  className={`w-full p-5 bg-blue-50 border-2 border-transparent rounded-3xl flex items-center gap-4 group transition-all hover:border-blue-500`}
                >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">📱</div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-blue-600 uppercase">QRIS</p>
                      <p className="text-sm font-black">Bank / E-Wallet</p>
                   </div>
                </button>
             </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[32px] md:rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-slate-800 uppercase">Cari Member</h3>
                <button onClick={() => setShowMemberModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Ketik Nama / No. WA..." 
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                />
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                   {(customers || []).filter(c => c.name.toLowerCase().includes(memberQuery.toLowerCase()) || c.phone.includes(memberQuery)).map(c => (
                     <button key={c.id} onClick={() => { selectCustomer(c.id); setShowMemberModal(false); }} className={`w-full p-4 rounded-2xl flex justify-between items-center border-2 transition-all ${selectedCustomerId === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 border-transparent hover:border-indigo-200'}`}>
                        <div className="text-left">
                           <p className="text-[10px] font-black uppercase leading-none">{c.name}</p>
                           <p className="text-[8px] font-bold uppercase mt-1 opacity-60">{c.phone}</p>
                        </div>
                        <p className="text-[10px] font-black">{c.points} PTS</p>
                     </button>
                   ))}
                </div>
                {selectedCustomerId && (
                  <button onClick={() => { selectCustomer(null); setShowMemberModal(false); }} className="w-full py-3 text-red-500 bg-red-50 rounded-xl font-black text-[8px] uppercase">Batalkan Member</button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
