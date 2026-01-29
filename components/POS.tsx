
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Product, PaymentMethod, Customer, UserRole } from '../types';

export const POS: React.FC = () => {
  const { 
    products, categories, cart, addToCart, removeFromCart, 
    updateCartQuantity, checkout, customers, selectCustomer, selectedCustomerId,
    membershipTiers, bulkDiscounts, selectedOutletId, loyaltyConfig, inventory, dailyClosings, currentUser
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);

  // Success Toast State
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const isShiftClosed = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER) return false;
    
    const todayStr = new Date().toDateString();
    return dailyClosings.some(c => 
      c.outletId === selectedOutletId && 
      c.staffId === currentUser.id && 
      new Date(c.timestamp).toDateString() === todayStr
    );
  }, [dailyClosings, selectedOutletId, currentUser]);

  const checkStock = (p: Product): boolean => {
    if (p.isCombo && p.comboItems) {
      return p.comboItems.every(ci => {
        const subP = products.find(sp => sp.id === ci.productId);
        return subP ? checkStock(subP) : false;
      });
    }
    return p.bom.every(b => {
      const template = inventory.find(inv => inv.id === b.inventoryItemId);
      const real = inventory.find(inv => inv.outletId === selectedOutletId && inv.name === template?.name);
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

  const getPrice = (p: Product) => p.outletSettings?.[selectedOutletId]?.price || p.price;

  const subtotal = cart.reduce((sum, item) => sum + (getPrice(item.product) * item.quantity), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentCustomer = customers.find(c => c.id === selectedCustomerId);
  
  // DISCOUNT CALCULATIONS
  const tierDiscountPercent = currentCustomer ? (membershipTiers.find(t => t.id === currentCustomer.tierId)?.discountPercent || 0) : 0;
  const bulkDiscountRule = bulkDiscounts.filter(r => r.isActive && totalQty >= r.minQty).sort((a,b) => b.minQty - a.minQty)[0];
  const bulkDiscountPercent = bulkDiscountRule?.discountPercent || 0;
  
  // Logic: Use whichever is higher (don't stack directly for simplicity unless configured otherwise)
  const isBulkBetter = bulkDiscountPercent > tierDiscountPercent;
  const appliedTierDiscount = isBulkBetter ? 0 : (subtotal * (tierDiscountPercent / 100));
  const appliedBulkDiscount = isBulkBetter ? (subtotal * (bulkDiscountPercent / 100)) : 0;
  
  const pointDiscountValue = redeemPoints * loyaltyConfig.redemptionValuePerPoint;
  const total = Math.max(0, subtotal - appliedTierDiscount - appliedBulkDiscount - pointDiscountValue);

  const handleCheckout = (method: PaymentMethod) => {
    if (isShiftClosed) return alert("Akses Ditolak. Anda sudah melakukan tutup shift hari ini.");
    // Pass ALL specific discount components to the store
    checkout(method, redeemPoints, appliedTierDiscount, appliedBulkDiscount);
    setShowCheckout(false);
    setRedeemPoints(0);
    setMobileView('menu');
    setShowSuccessToast(true);
  };

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-slate-50 relative">
      {/* ... (UI code remains the same but now correctly uses the breakdown above) ... */}
      
      {/* SUCCESS TOAST OVERLAY */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-emerald-500/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-400/50">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl animate-bounce">✅</div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Transaksi Berhasil</p>
                <p className="text-[9px] font-bold text-emerald-100 uppercase mt-1">Struk & Stok Telah Diperbarui</p>
              </div>
           </div>
        </div>
      )}

      {isShiftClosed && (
        <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
           <div className="bg-white rounded-[48px] p-10 max-w-sm shadow-2xl border-4 border-orange-500 transform -rotate-2">
              <div className="text-6xl mb-6">🔒</div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">Shift Anda Selesai</h3>
              <p className="text-slate-500 text-xs font-bold uppercase mt-4 leading-relaxed">
                Anda sudah melakukan <span className="text-orange-600">tutup shift</span> hari ini.
              </p>
           </div>
        </div>
      )}

      {/* LEFT: PRODUCTS */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 md:p-6 bg-white border-b border-slate-100 shrink-0 z-10 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Cari Menu..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-orange-500 outline-none font-bold text-xs text-slate-900"
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>
            <button onClick={() => setShowMemberModal(true)} className={`px-4 rounded-xl border-2 transition-all flex items-center gap-2 ${currentCustomer ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <span className="text-sm">👤</span>
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest truncate max-w-[80px]">{currentCustomer?.name || 'MEMBER'}</span>
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${selectedCategory === 'all' ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>All</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${selectedCategory === cat.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{cat.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-32 md:pb-6 touch-pan-y overscroll-behavior-contain">
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
            {filteredProducts.map(product => {
              const inStock = checkStock(product);
              return (
                <button 
                  key={product.id} 
                  disabled={!inStock || isShiftClosed}
                  onClick={() => addToCart(product)} 
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col text-left group relative ${(!inStock || isShiftClosed) ? 'opacity-70 grayscale cursor-not-allowed' : 'active:scale-95'}`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-50 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {!inStock && !isShiftClosed && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-white text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">STOK HABIS</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h5 className="font-black text-slate-800 text-[9px] md:text-[11px] uppercase tracking-tight line-clamp-2 min-h-[2.4em]">{product.name}</h5>
                    <p className={`text-xs md:sm mt-1 font-black ${(!inStock || isShiftClosed) ? 'text-slate-400' : 'text-orange-500'}`}>Rp {getPrice(product).toLocaleString()}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING CART SUMMARY */}
      {mobileView === 'menu' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-[76px] left-0 right-0 px-4 animate-in slide-in-from-bottom-10 z-[60]">
          <button 
            onClick={() => setMobileView('cart')}
            className="w-full bg-orange-600 text-white rounded-2xl p-4 shadow-2xl shadow-orange-900/40 flex justify-between items-center active:scale-95 transition-all border border-orange-400/20"
          >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white text-orange-600 rounded-xl flex items-center justify-center font-black shadow-inner">{totalQty}</div>
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-80">Check Pesanan</p>
                  <p className="text-sm font-black">Rp {total.toLocaleString()}</p>
               </div>
            </div>
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tighter bg-orange-700/50 px-3 py-2 rounded-lg">
               BAYAR 💳
            </div>
          </button>
        </div>
      )}

      {/* RIGHT: CART / CHECKOUT VIEW */}
      <div className={`${mobileView === 'cart' ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 flex-col shadow-2xl relative z-[70] h-full`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
           <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Pesanan ({totalQty})</h4>
           <button onClick={() => setMobileView('menu')} className="md:hidden w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600">✕ Tutup</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
              <span className="text-5xl mb-4">🍢</span>
              <p className="font-black text-slate-400 uppercase text-[9px] tracking-widest">Kosong</p>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-3 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <img src={item.product.image} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[9px] text-slate-800 uppercase truncate">{item.product.name}</p>
                    <p className="text-[9px] text-orange-500 font-black">Rp {getPrice(item.product).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">-</button>
                    <span className="text-[10px] font-black w-4 text-center text-slate-900">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.product.id, 1)} className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">+</button>
                  </div>
                </div>
              ))}
              
              {/* CART DISCOUNT PREVIEW */}
              <div className="mt-6 pt-4 border-t border-dashed border-slate-200 space-y-2">
                 {appliedBulkDiscount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase">
                       <span>Promo Grosir ({bulkDiscountPercent}%)</span>
                       <span>-Rp {appliedBulkDiscount.toLocaleString()}</span>
                    </div>
                 )}
                 {appliedTierDiscount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-orange-600 uppercase">
                       <span>Member: {currentCustomer?.name.split(' ')[0]} ({tierDiscountPercent}%)</span>
                       <span>-Rp {appliedTierDiscount.toLocaleString()}</span>
                    </div>
                 )}
                 {pointDiscountValue > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                       <span>Potongan Poin</span>
                       <span>-Rp {pointDiscountValue.toLocaleString()}</span>
                    </div>
                 )}
              </div>
            </>
          )}
        </div>

        <div className="p-5 bg-slate-900 text-white space-y-3 pb-safe shrink-0">
          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-black pt-2 border-t border-slate-800">
            <span className="uppercase text-xs text-slate-500 tracking-tighter">Total Bayar</span>
            <span className="text-orange-500">Rp {total.toLocaleString()}</span>
          </div>
          
          {/* LOYALTY CONTROLS */}
          {currentCustomer && (
             <div className="bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
                <div className="flex justify-between items-center mb-2">
                   <p className="text-[8px] font-black text-slate-400 uppercase">Gunakan Poin ({currentCustomer.points})</p>
                   <div className="flex gap-1">
                      {[0, 50, 100, 200, 500].filter(p => p <= currentCustomer.points).map(p => (
                        <button key={p} onClick={() => setRedeemPoints(p)} className={`px-2 py-1 rounded text-[8px] font-black ${redeemPoints === p ? 'bg-orange-500 text-white' : 'bg-white/10 text-slate-400'}`}>{p}</button>
                      ))}
                   </div>
                </div>
                <input 
                  type="range" min="0" max={currentCustomer.points} step="10" 
                  className="w-full accent-orange-500 h-1" 
                  value={redeemPoints} onChange={e => setRedeemPoints(parseInt(e.target.value))} 
                />
             </div>
          )}

          <button
            disabled={cart.length === 0 || isShiftClosed}
            onClick={() => setShowCheckout(true)}
            className={`w-full py-5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${ (cart.length === 0 || isShiftClosed) ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95'}`}
          >
            {isShiftClosed ? 'SHIFT ANDA SELESAI' : `BAYAR ${totalQty} ITEM 💳`}
          </button>
        </div>
      </div>

      {/* MODALS REMAINS SAME... */}
      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-md p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Metode Pembayaran</h3>
                <button onClick={() => setShowCheckout(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="space-y-4 mb-10">
                <button onClick={() => handleCheckout(PaymentMethod.CASH)} className="w-full p-6 bg-green-50 border-2 border-green-100 rounded-[32px] flex items-center justify-between group hover:border-green-500 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">💵</div>
                      <div className="text-left"><p className="text-[10px] font-black text-green-600 uppercase">Tunai / Cash</p><p className="text-sm font-black text-slate-800">Bayar di Kasir</p></div>
                   </div>
                   <span className="text-xl opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
                </button>
                <button onClick={() => handleCheckout(PaymentMethod.QRIS)} className="w-full p-6 bg-blue-50 border-2 border-blue-100 rounded-[32px] flex items-center justify-between group hover:border-blue-500 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">📱</div>
                      <div className="text-left"><p className="text-[10px] font-black text-blue-600 uppercase">QRIS / Digital</p><p className="text-sm font-black text-slate-800">Scan Kode QR</p></div>
                   </div>
                   <span className="text-xl opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
                </button>
             </div>
             <div className="h-safe-bottom md:hidden"></div>
          </div>
        </div>
      )}

      {/* MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[210] bg-slate-900/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] w-full max-w-md p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Pilih Member</h3>
                <button onClick={() => setShowMemberModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Cari Nama/HP..." 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-500 text-slate-900"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                />
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                   {customers.filter(c => c.name.toLowerCase().includes(memberQuery.toLowerCase()) || c.phone.includes(memberQuery)).map(c => (
                     <button key={c.id} onClick={() => { selectCustomer(c.id); setShowMemberModal(false); }} className={`w-full p-4 rounded-2xl flex justify-between items-center border-2 transition-all ${selectedCustomerId === c.id ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-50 hover:border-orange-200'}`}>
                        <div className="text-left"><p className="text-xs font-black text-slate-800 uppercase">{c.name}</p><p className="text-[9px] text-slate-400">{c.phone}</p></div>
                        <div className="text-right"><p className="text-[10px] font-black text-orange-500">{c.points.toLocaleString()} PTS</p></div>
                     </button>
                   ))}
                </div>
                {selectedCustomerId && (
                  <button onClick={() => { selectCustomer(null); setShowMemberModal(false); }} className="w-full py-3 text-red-500 font-black text-[10px] uppercase">Lepas Member</button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
