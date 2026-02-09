
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
    dailyClosings = [], currentUser, attendance = [], clockIn, isSaving, brandConfig
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

  // FIX: Logika Pengecekan Absensi yang Lebih Tangguh & Langsung
  const checkIsClockedIn = () => {
    if (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) return true;
    if (!currentUser) return false;

    const todayStr = new Date().toLocaleDateString('en-CA');

    // 1. Cek Hot Cache (LocalStorage)
    const savedGuard = localStorage.getItem('mozzaboy_last_clockin');
    if (savedGuard) {
       try {
          const guard = JSON.parse(savedGuard);
          // Jika kru yang sama sudah absen hari ini (di cabang manapun yang dia ditugaskan), izinkan transaksi
          if (guard.date === todayStr && guard.staffId === currentUser.id) {
             return true;
          }
       } catch (e) {}
    }
    
    // 2. Cek Real-time State Array (Fallback & Verifikasi State)
    return (attendance || []).some(a => {
       const recordDateStr = typeof a.date === 'string' ? a.date : new Date(a.date).toLocaleDateString('en-CA');
       const isMe = a.staffId === currentUser.id;
       const isToday = recordDateStr === todayStr;
       return isMe && isToday;
    });
  };

  const isClockedInToday = checkIsClockedIn();

  const isShiftClosed = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (dailyClosings || []).some(c => {
      const closingDate = typeof c.timestamp === 'string' ? new Date(c.timestamp).toLocaleDateString('en-CA') : c.timestamp.toLocaleDateString('en-CA');
      return c.outletId === selectedOutletId && c.staffId === currentUser.id && closingDate === todayStr;
    });
  }, [dailyClosings, selectedOutletId, currentUser]);

  const checkStock = (p: Product): boolean => {
    if (!p) return false;
    if (p.isCombo && p.comboItems) {
      return (p.comboItems || []).every(ci => {
        const subP = products.find(sp => sp.id === ci.productId);
        return subP ? checkStock(subP) : false;
      });
    }
    return (p.bom || []).every(b => {
      const template = inventory.find(inv => inv.id === b.inventoryItemId);
      if (!template) return false;
      const real = inventory.find(inv => inv.outletId === selectedOutletId && inv.name === template.name);
      return (real?.quantity || 0) >= b.quantity;
    });
  };

  const filteredProducts = products.filter(p => {
    const branchSetting = p.outletSettings?.[selectedOutletId];
    const isAvailableInBranch = branchSetting ? branchSetting.isAvailable : p.isAvailable;
    if (!isAvailableInBranch) return false;
    return (selectedCategory === 'all' || p.categoryId === selectedCategory) && 
           p.name.toLowerCase().includes(search.toLowerCase());
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
  
  const pointDiscountValue = redeemPoints * loyaltyConfig.redemptionValuePerPoint;
  const total = Math.max(0, subtotal - appliedTierDiscount - appliedBulkDiscount - pointDiscountValue);

  const handleCheckout = async (method: PaymentMethod) => {
    if (isShiftClosed) return alert("Akses Ditolak. Anda sudah melakukan tutup shift hari ini.");
    if (isSaving) return;

    if (!checkIsClockedIn()) {
       setShowAttendanceToast(true);
       return;
    }
    
    try {
      await checkout(method, redeemPoints, appliedTierDiscount, appliedBulkDiscount);
      setShowCheckout(false);
      setRedeemPoints(0);
      setMobileView('menu');
      setShowSuccessToast(true);
    } catch (err) {
      alert("Terjadi kesalahan saat memproses pembayaran.");
    }
  };

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showAttendanceToast) {
      const timer = setTimeout(() => setShowAttendanceToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showAttendanceToast]);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-white relative">
      
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
              <span className="text-xl">✅</span>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest">Transaksi Berhasil</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase">Data telah tersinkron ke cloud.</p>
              </div>
           </div>
        </div>
      )}

      {showAttendanceToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-sm:w-80 px-4">
           <div className="bg-rose-600 text-white px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 border-rose-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0 animate-bounce">⚠️</div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Akses Kasir Terkunci</p>
                 <p className="text-[11px] font-bold text-rose-100 uppercase leading-tight">Wajib Absen Masuk Terlebih Dahulu di Menu Portal!</p>
              </div>
           </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col min-w-0 h-full ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 md:px-6 md:py-4 bg-white border-b border-slate-100 shrink-0 z-20 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Cari produk / menu..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl focus:bg-white ring-2 ring-transparent focus:ring-indigo-500/20 outline-none font-bold text-xs transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-sm">🔍</span>
            </div>
            
            <div className="flex gap-1.5 shrink-0">
               <button onClick={() => setActiveTab('production')} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all flex flex-col items-center justify-center min-w-[50px]">
                  <span className="text-sm">🧪</span>
                  <span className="text-[7px] font-black uppercase mt-0.5">MIX</span>
               </button>
               <button onClick={() => setActiveTab('purchases')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex flex-col items-center justify-center min-w-[50px]">
                  <span className="text-sm">🚚</span>
                  <span className="text-[7px] font-black uppercase mt-0.5">STOK</span>
               </button>
               <button onClick={() => setShowMemberModal(true)} className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center min-w-[50px] ${currentCustomer ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500'}`}>
                  <span className="text-sm">👤</span>
                  <span className="text-[7px] font-black uppercase mt-0.5">{currentCustomer ? 'MEMBER' : 'JOIN'}</span>
               </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button 
              onClick={() => setSelectedCategory('all')} 
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all border-2 ${selectedCategory === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              Semua
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)} 
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all border-2 ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                style={selectedCategory === cat.id ? { backgroundColor: brandConfig.primaryColor, borderColor: brandConfig.primaryColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-slate-50/50 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-32 md:pb-6 touch-pan-y">
           <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 md:gap-4">
            {filteredProducts.map(product => {
              const inStock = checkStock(product);
              const displayPrice = getPrice(product);
              return (
                <button 
                  key={product.id} 
                  disabled={!inStock || isShiftClosed || isSaving}
                  onClick={() => addToCart(product)} 
                  className={`bg-white rounded-xl md:rounded-[28px] overflow-hidden border-2 flex flex-col text-left group transition-all active:scale-[0.96] h-full shadow-sm ${(!inStock || isShiftClosed) ? 'opacity-40 border-slate-200 grayscale' : 'border-white hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1'}`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-100 relative shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    {!inStock && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-1 text-white">
                         <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center">STOK HABIS</span>
                      </div>
                    )}
                    {product.isCombo && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[6px] md:text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg uppercase">Paket</div>
                    )}
                  </div>
                  <div className="p-2 md:p-3 flex-1 flex flex-col justify-center">
                    <h5 className="font-extrabold text-slate-800 text-[8px] md:text-[11px] uppercase leading-tight line-clamp-2">{product.name}</h5>
                    <p className={`text-[9px] md:text-[13px] font-black font-mono tracking-tighter mt-1 ${(!inStock || isShiftClosed) ? 'text-slate-300' : 'text-indigo-600'}`} style={(!inStock || isShiftClosed) ? {} : { color: brandConfig.primaryColor }}>
                      Rp {(displayPrice).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mobileView === 'menu' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-20 left-0 right-0 px-4 z-[60] animate-in slide-in-from-bottom-5">
          <button 
            onClick={() => {
              if (!checkIsClockedIn()) {
                  setShowAttendanceToast(true);
              } else {
                  setMobileView('cart');
              }
            }}
            className="w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex justify-between items-center active:scale-95"
          >
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: brandConfig.primaryColor }}>{totalQty}</div>
               <p className="text-sm font-black tracking-tight">Rp {total.toLocaleString()}</p>
            </div>
            <span className="font-black text-[9px] uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-lg">Check ➔</span>
          </button>
        </div>
      )}

      <div className={`${mobileView === 'cart' ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 bg-slate-50 border-l border-slate-200 flex-col relative z-[70] h-full`}>
        <div className="p-4 md:p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
           <div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tighter">Pesanan Aktif</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase">{totalQty} ITEM TERPILIH</p>
           </div>
           <button onClick={() => setMobileView('menu')} className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-100 rounded-xl text-xs font-black">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20">
              <span className="text-5xl mb-4">🥡</span>
              <p className="font-black uppercase text-[9px] tracking-widest leading-relaxed">Pilih menu di kiri <br/>untuk memesan</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-50">
                   <img src={item.product.image} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[10px] text-slate-800 uppercase truncate leading-tight">{item.product.name}</p>
                  <p className="text-[11px] font-black font-mono" style={{ color: brandConfig.primaryColor }}>Rp {getPrice(item.product).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border">
                  <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 hover:text-red-500 transition-all text-xs font-black shadow-sm">－</button>
                  <span className="w-4 text-center text-[11px] font-black text-slate-900">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white hover:bg-green-50 hover:text-green-500 transition-all text-xs font-black shadow-sm">＋</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 md:p-8 bg-white border-t border-slate-200 space-y-5 rounded-t-[40px] shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span>Subtotal</span>
                <span className="font-mono">Rp {subtotal.toLocaleString()}</span>
             </div>
             {(appliedTierDiscount + appliedBulkDiscount + pointDiscountValue) > 0 && (
                <div className="flex justify-between text-[10px] font-black uppercase text-rose-500 italic">
                   <span>Potongan Diskon</span>
                   <span className="font-mono">-Rp {(appliedTierDiscount + appliedBulkDiscount + pointDiscountValue).toLocaleString()}</span>
                </div>
             )}
          </div>
          <div className="flex justify-between items-end pt-3 border-t border-slate-100">
            <span className="uppercase text-[9px] font-black text-slate-400 tracking-widest mb-1">Total Netto</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">Rp {total.toLocaleString()}</span>
          </div>
          <button
            disabled={cart.length === 0 || isShiftClosed || isSaving}
            onClick={() => {
              if (!checkIsClockedIn()) {
                  setShowAttendanceToast(true);
              } else {
                  setShowCheckout(true);
              }
            }}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-slate-800 active:scale-95 disabled:opacity-30 transition-all"
            style={cart.length > 0 && !isShiftClosed && !isSaving ? { backgroundColor: brandConfig.primaryColor } : {}}
          >
            {isShiftClosed ? 'SHIFT CLOSED' : isSaving ? 'PROCESSING...' : `PROSES BAYAR ➔`}
          </button>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[32px] md:rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Pilih Metode Bayar</h3>
                <button 
                  disabled={isSaving}
                  onClick={() => setShowCheckout(false)} 
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 disabled:opacity-20"
                >
                  ✕
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3 mb-8">
                <button 
                  disabled={isSaving}
                  onClick={() => handleCheckout(PaymentMethod.CASH)} 
                  className={`w-full p-5 bg-green-50 border-2 border-transparent rounded-3xl flex items-center gap-4 group transition-all ${isSaving ? 'opacity-50 grayscale' : 'hover:border-green-500'}`}
                >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                      {isSaving ? <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div> : '💵'}
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-green-600 uppercase">Tunai (Cash)</p>
                      <p className="text-sm font-black text-slate-800">{isSaving ? 'MEMPROSES...' : 'Uang Fisik'}</p>
                   </div>
                </button>

                <button 
                  disabled={isSaving}
                  onClick={() => handleCheckout(PaymentMethod.QRIS)} 
                  className={`w-full p-5 bg-blue-50 border-2 border-transparent rounded-3xl flex items-center gap-4 group transition-all ${isSaving ? 'opacity-50 grayscale' : 'hover:border-blue-500'}`}
                >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                      {isSaving ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : '📱'}
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-blue-600 uppercase">Digital (QRIS)</p>
                      <p className="text-sm font-black text-slate-800">{isSaving ? 'MEMPROSES...' : 'Bank / E-Wallet'}</p>
                   </div>
                </button>
             </div>
             <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[32px] md:rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Cari Member CRM</h3>
                <button onClick={() => setShowMemberModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-xs">✕</button>
             </div>
             <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Ketik Nama / No. WhatsApp..." 
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs outline-none ring-2 ring-transparent focus:ring-indigo-500/20 transition-all"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                />
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                   {(customers || []).filter(c => c.name.toLowerCase().includes(memberQuery.toLowerCase()) || c.phone.includes(memberQuery)).map(c => (
                     <button key={c.id} onClick={() => { selectCustomer(c.id); setShowMemberModal(false); }} className={`w-full p-4 rounded-2xl flex justify-between items-center border-2 transition-all ${selectedCustomerId === c.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent hover:bg-white hover:border-indigo-200'}`}>
                        <div className="text-left">
                           <p className="text-[10px] font-black uppercase leading-none">{c.name}</p>
                           <p className={`text-[8px] font-bold uppercase mt-1 ${selectedCustomerId === c.id ? 'text-indigo-100' : 'text-slate-400'}`}>{c.phone}</p>
                        </div>
                        <p className={`text-[10px] font-black font-mono ${selectedCustomerId === c.id ? 'text-white' : 'text-indigo-600'}`}>{c.points} PTS</p>
                     </button>
                   ))}
                </div>
                {selectedCustomerId && (
                  <button onClick={() => { selectCustomer(null); setShowMemberModal(false); }} className="w-full py-3 text-red-500 bg-red-50 rounded-xl font-black text-[8px] uppercase tracking-widest mt-2">Batalkan Member</button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
