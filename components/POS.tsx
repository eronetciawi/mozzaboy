
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Product, PaymentMethod, Customer } from '../types';

export const POS: React.FC = () => {
  const { 
    products, categories, cart, addToCart, removeFromCart, 
    updateCartQuantity, checkout, customers, selectCustomer, selectedCustomerId,
    membershipTiers, bulkDiscounts, selectedOutletId, loyaltyConfig, inventory
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);

  // LOGIC: Check if product has enough raw materials in inventory
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
  
  const tierDiscountPercent = currentCustomer ? (membershipTiers.find(t => t.id === currentCustomer.tierId)?.discountPercent || 0) : 0;
  const bulkDiscountPercent = bulkDiscounts.filter(r => r.isActive && totalQty >= r.minQty).sort((a,b) => b.minQty - a.minQty)[0]?.discountPercent || 0;
  const finalDiscountPercent = Math.max(bulkDiscountPercent, tierDiscountPercent);
  
  const discountAmount = subtotal * (finalDiscountPercent / 100);
  const pointDiscountValue = redeemPoints * loyaltyConfig.redemptionValuePerPoint;
  const total = Math.max(0, subtotal - discountAmount - pointDiscountValue);

  const handleCheckout = (method: PaymentMethod) => {
    checkout(method, redeemPoints);
    setShowCheckout(false);
    setRedeemPoints(0);
    setMobileView('menu');
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* LEFT: PRODUCTS (Hidden on mobile if cart view is active) */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 md:p-6 bg-white border-b border-slate-100 sticky top-0 z-10 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Cari Menu..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-orange-500 outline-none font-bold text-xs"
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>
            <button onClick={() => setShowMemberModal(true)} className={`px-4 rounded-xl border-2 transition-all flex items-center gap-2 ${currentCustomer ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <span className="text-sm">👤</span>
              <span className="hidden lg:block text-[10px] font-black uppercase truncate max-w-[80px]">{currentCustomer?.name || 'MEMBER'}</span>
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${selectedCategory === 'all' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}>All</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${selectedCategory === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}>{cat.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-24 md:pb-6">
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
            {filteredProducts.map(product => {
              const inStock = checkStock(product);
              return (
                <button 
                  key={product.id} 
                  disabled={!inStock}
                  onClick={() => addToCart(product)} 
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col text-left group relative ${!inStock ? 'opacity-70 grayscale cursor-not-allowed' : 'active:scale-95'}`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-50 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    
                    {!inStock && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-2">
                        <div className="bg-red-600 text-white text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl transform -rotate-12 border-2 border-white/20">
                          STOK HABIS
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h5 className="font-black text-slate-800 text-[9px] md:text-[11px] uppercase tracking-tight line-clamp-2 min-h-[2.4em]">{product.name}</h5>
                    <p className={`text-xs md:text-sm mt-1 font-black ${!inStock ? 'text-slate-400' : 'text-orange-500'}`}>
                      Rp {getPrice(product).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: CART (Hidden on mobile if menu view is active) */}
      <div className={`${mobileView === 'cart' ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 flex-col shadow-2xl relative z-20`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
           <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Pesanan ({totalQty})</h4>
           <button onClick={() => setMobileView('menu')} className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-xs">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
              <span className="text-5xl mb-4">🍢</span>
              <p className="font-black text-slate-400 uppercase text-[9px] tracking-widest">Kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <img src={item.product.image} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[9px] text-slate-800 uppercase truncate">{item.product.name}</p>
                  <p className="text-[9px] text-orange-500 font-black">Rp {getPrice(item.product).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateCartQuantity(item.product.id, -1)} className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-bold text-xs">-</button>
                  <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.product.id, 1)} className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-bold text-xs">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-slate-900 text-white space-y-3 pb-safe">
          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[9px] font-black uppercase text-green-500">
              <span>Diskon {finalDiscountPercent}%</span>
              <span>-Rp {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black pt-2 border-t border-slate-800">
            <span className="uppercase text-xs text-slate-500 tracking-tighter">Total</span>
            <span className="text-orange-500">Rp {total.toLocaleString()}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cart.length === 0 ? 'bg-slate-800 text-slate-600' : 'bg-orange-500 text-white shadow-lg active:scale-95'}`}
          >
            BAYAR {totalQty} ITEM 💳
          </button>
        </div>
      </div>

      {/* MOBILE FLOATING CART BUTTON */}
      {mobileView === 'menu' && cart.length > 0 && (
        <button 
          onClick={() => setMobileView('cart')}
          className="md:hidden fixed bottom-20 right-4 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4"
        >
          <div className="relative">
             <span className="text-2xl">🛒</span>
             <span className="absolute -top-2 -right-2 bg-orange-500 text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">{totalQty}</span>
          </div>
          <div className="text-left border-l border-white/10 pl-3">
             <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">TOTAL</p>
             <p className="text-xs font-black text-orange-400">Rp {total.toLocaleString()}</p>
          </div>
        </button>
      )}

      {/* MEMBER MODAL (Full screen on mobile) */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-2xl h-full md:h-auto md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 md:p-10 border-b border-slate-50 shrink-0">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">Cari Member</h3>
                  <button onClick={() => setShowMemberModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xl">✕</button>
               </div>
               <input 
                  type="text" 
                  autoFocus
                  placeholder="Nomor HP / Nama..." 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-orange-500 outline-none"
                  value={memberQuery} onChange={e => setMemberQuery(e.target.value)}
               />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30 custom-scrollbar">
               {customers.filter(c => c.name.toLowerCase().includes(memberQuery.toLowerCase()) || c.phone.includes(memberQuery)).map(member => (
                 <button key={member.id} onClick={() => { selectCustomer(member.id); setShowMemberModal(false); }} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 flex justify-between items-center text-left hover:border-orange-500 transition-all">
                    <div>
                       <p className="font-black text-slate-800 text-xs uppercase">{member.name}</p>
                       <p className="text-[10px] text-slate-400 font-mono">{member.phone}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Points</p>
                       <p className="text-xs font-black text-orange-500">{member.points.toLocaleString()}</p>
                    </div>
                 </button>
               ))}
               <button onClick={() => { selectCustomer(null); setShowMemberModal(false); }} className="w-full p-4 mt-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase">Batalkan / Pelanggan Umum</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (Full Screen on mobile) */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6">
          <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-md h-full md:h-auto shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
            <div className="p-8 border-b border-slate-50 text-center shrink-0">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Pilih Pembayaran</h3>
              <div className="mt-4 text-4xl font-black text-orange-500 tracking-tighter">Rp {total.toLocaleString()}</div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{totalQty} Item Pesanan</p>
            </div>
            
            <div className="flex-1 p-8 grid grid-cols-1 gap-4">
              <button onClick={() => handleCheckout(PaymentMethod.CASH)} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-500 flex items-center gap-6 group transition-all">
                <span className="text-3xl">💵</span>
                <div className="text-left">
                   <p className="font-black text-slate-800 uppercase text-xs">Uang Tunai</p>
                   <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Cash In Drawer</p>
                </div>
              </button>
              <button onClick={() => handleCheckout(PaymentMethod.QRIS)} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-500 flex items-center gap-6 group transition-all">
                <span className="text-3xl">📱</span>
                <div className="text-left">
                   <p className="font-black text-slate-800 uppercase text-xs">QRIS / Digital</p>
                   <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Auto Validate</p>
                </div>
              </button>
            </div>
            
            <div className="p-8 pt-0 flex flex-col gap-2 shrink-0 pb-safe">
              <button onClick={() => setShowCheckout(false)} className="w-full py-4 font-black text-slate-400 uppercase text-[9px] tracking-widest">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
