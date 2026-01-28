
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Customer, Product, PaymentMethod, Transaction } from '../types';

export const CustomerPortal: React.FC = () => {
  const { 
    customers, products, categories, transactions, 
    membershipTiers, selectedOutletId, checkout, cart, 
    addToCart, updateCartQuantity, clearCart, loyaltyConfig,
    selectCustomer
  } = useApp();

  const [loggedInCustomer, setLoggedInCustomer] = useState<Customer | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [view, setView] = useState<'home' | 'order' | 'history'>('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Self-Order Redemption State
  const [usePoints, setUsePoints] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.phone === phoneInput);
    if (customer) {
      setLoggedInCustomer(customer);
      selectCustomer(customer.id); // Sync with store for points calculation
    } else {
      alert("Nomor HP tidak terdaftar sebagai member. Silakan daftar di Kasir Mozza Boy terdekat!");
    }
  };

  const handleLogout = () => {
    setLoggedInCustomer(null);
    selectCustomer(null);
    setView('home');
    setPhoneInput('');
    setUsePoints(false);
  };

  const myTransactions = useMemo(() => {
    if (!loggedInCustomer) return [];
    return transactions.filter(t => t.customerId === loggedInCustomer.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, loggedInCustomer]);

  const customerTier = useMemo(() => {
    if (!loggedInCustomer) return null;
    return membershipTiers.find(t => t.id === loggedInCustomer.tierId);
  }, [loggedInCustomer, membershipTiers]);

  const filteredProducts = products.filter(p => {
    const isAvailable = p.outletSettings?.[selectedOutletId]?.isAvailable ?? p.isAvailable;
    return isAvailable && (selectedCategory === 'all' || p.categoryId === selectedCategory);
  });

  const cartSubtotal = cart.reduce((sum, item) => {
    const branchPrice = item.product.outletSettings?.[selectedOutletId]?.price ?? item.product.price;
    return sum + (branchPrice * item.quantity);
  }, 0);

  const maxPossibleRedeem = Math.floor(cartSubtotal / (loyaltyConfig.redemptionValuePerPoint || 100));
  const pointsToRedeem = usePoints ? Math.min(loggedInCustomer?.points || 0, maxPossibleRedeem) : 0;
  const pointDiscountValue = pointsToRedeem * (loyaltyConfig.redemptionValuePerPoint || 100);
  const finalTotal = Math.max(0, cartSubtotal - pointDiscountValue);

  const handleSelfCheckout = () => {
    if (cart.length === 0) return;
    // Apply points redemption in store checkout action
    checkout(PaymentMethod.QRIS, pointsToRedeem);
    alert("Pesanan Berhasil! Silakan tunjukkan layar ini ke kru kami untuk scan QRIS.");
    setUsePoints(false);
    setView('history');
  };

  if (!loggedInCustomer) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-md bg-white rounded-[48px] p-10 shadow-2xl relative z-10 border border-white/20">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-orange-500 rounded-[32px] flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 shadow-xl shadow-orange-500/20 transform -rotate-3">M</div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Portal Member</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Masuk untuk Cek Poin & Pesan Menu</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest text-center">Masukkan Nomor Handphone</label>
              <input 
                type="text" 
                autoFocus
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-2xl focus:border-orange-500 outline-none transition-all placeholder:text-slate-200 text-center"
                placeholder="0812..."
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                required
              />
            </div>
            <button className="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-500 transition-all transform active:scale-95">
              AKSES DASHBOARD SAYA 🚀
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
             <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Belum jadi member?</p>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Daftar gratis di setiap outlet Mozza Boy!</p>
          </div>
        </div>
        
        <p className="mt-10 text-[9px] font-black text-slate-600 uppercase tracking-widest">© 2025 Mozza Boy Smart System</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* APP HEADER */}
      <header className="bg-white px-6 pt-10 pb-6 rounded-b-[40px] shadow-sm shrink-0 border-b border-slate-100 sticky top-0 z-50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20">M</div>
             <div>
                <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">Halo, {loggedInCustomer.name.split(' ')[0]}!</h1>
                <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{customerTier?.name || 'REGULAR'} MEMBER</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xs">Keluar</button>
        </div>

        {/* POINTS CARD */}
        <div className="bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
           <div className="relative z-10">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Poin Loyalitas</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="text-4xl font-black text-white leading-none tracking-tighter">{loggedInCustomer.points.toLocaleString()}</h3>
                 <span className="text-[10px] font-black text-orange-500 uppercase">Points</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full mt-6 overflow-hidden">
                 <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (loggedInCustomer.points/1000)*100)}%` }}></div>
              </div>
              <p className="text-[7px] font-black text-slate-500 uppercase mt-2 tracking-widest">Gunakan poin untuk diskon belanja Anda!</p>
           </div>
        </div>
      </header>

      {/* VIEW CONTENT */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-40">
        {view === 'home' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setView('order')} className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:bg-orange-500 transition-all active:scale-95">
                   <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:bg-white transition-colors">🛒</div>
                   <h4 className="text-[10px] font-black text-slate-800 uppercase group-hover:text-white">Order Menu</h4>
                </button>
                <button onClick={() => setView('history')} className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:bg-slate-900 transition-all active:scale-95">
                   <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:bg-white/10 group-hover:text-white transition-colors">📜</div>
                   <h4 className="text-[10px] font-black text-slate-800 uppercase group-hover:text-white">Transaksi</h4>
                </button>
             </div>

             <section>
                <div className="p-6 bg-indigo-600 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl transform rotate-12">🎁</div>
                   <h5 className="text-lg font-black uppercase tracking-tight leading-tight">Keuntungan <br/>Jadi Member!</h5>
                   <p className="text-[9px] text-indigo-200 mt-2 font-medium leading-relaxed">Dapatkan diskon spesial {customerTier?.discountPercent}% langsung dan kumpulkan poin setiap transaksi.</p>
                </div>
             </section>

             <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Pesanan Terakhir</h4>
                <div className="space-y-3">
                   {myTransactions.slice(0, 3).map(tx => (
                     <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">🍢</div>
                           <div>
                              <p className="text-[9px] font-black text-slate-800 uppercase truncate max-w-[120px]">
                                {tx.items.map(i => i.product.name).join(', ')}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(tx.timestamp).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <p className="text-xs font-black text-orange-500">Rp {tx.total.toLocaleString()}</p>
                     </div>
                   ))}
                   {myTransactions.length === 0 && <p className="text-[10px] text-center text-slate-300 italic py-8 border-2 border-dashed border-slate-100 rounded-3xl">Belum ada riwayat pesanan.</p>}
                </div>
             </section>
          </div>
        )}

        {view === 'order' && (
          <div className="animate-in fade-in duration-300">
             <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 sticky top-0 bg-slate-50 py-2 z-10">
                <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'all' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Semua</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === c.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{c.name}</button>
                ))}
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {filteredProducts.map(p => {
                  const displayPrice = p.outletSettings?.[selectedOutletId]?.price ?? p.price;
                  return (
                    <div key={p.id} className="bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm flex flex-col group active:scale-95 transition-transform">
                       <div className="aspect-square bg-slate-50 relative overflow-hidden">
                          <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       </div>
                       <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                             <h5 className="text-[10px] font-black text-slate-800 uppercase leading-tight line-clamp-2">{p.name}</h5>
                             <p className="text-orange-500 font-black text-xs mt-1">Rp {displayPrice.toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => addToCart(p)}
                            className="w-full py-3 mt-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-500"
                          >
                            + Add
                          </button>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-4 ml-2">Jejak Belanja</h3>
             {myTransactions.map(tx => (
               <div key={tx.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Order ID</p>
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">#{tx.id.split('-')[1]?.slice(-6) || 'TX'}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${tx.paymentMethod === 'QRIS' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600'}`}>{tx.paymentMethod}</span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                     {tx.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between text-[10px] font-medium text-slate-500">
                          <span>{item.product.name} (x{item.quantity})</span>
                          <span className="font-black text-slate-700">Rp {((item.product.outletSettings?.[selectedOutletId]?.price ?? item.product.price) * item.quantity).toLocaleString()}</span>
                       </div>
                     ))}
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                     <div>
                        <p className="text-[7px] font-black text-green-500 uppercase tracking-widest">+ {tx.pointsEarned} Poin Didapat</p>
                        <p className="text-lg font-black text-slate-900 mt-1">Rp {tx.total.toLocaleString()}</p>
                     </div>
                     <p className="text-[8px] font-bold text-slate-300 uppercase">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
               </div>
             ))}
             {myTransactions.length === 0 && (
               <div className="py-20 text-center opacity-30">
                  <div className="text-4xl mb-4">📜</div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Transaksi</p>
               </div>
             )}
          </div>
        )}
      </main>

      {/* BOTTOM NAV BAR */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-5 flex justify-around items-center z-[100] rounded-t-[40px] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]">
         <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-orange-500' : 'text-slate-300'}`}>
            <span className="text-2xl transform transition-transform active:scale-75">🏠</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Home</span>
         </button>
         <button onClick={() => setView('order')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'order' ? 'text-orange-500' : 'text-slate-300'}`}>
            <span className="text-2xl transform transition-transform active:scale-75">🥡</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Order</span>
         </button>
         <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'history' ? 'text-orange-500' : 'text-slate-300'}`}>
            <span className="text-2xl transform transition-transform active:scale-75">📜</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">History</span>
         </button>
      </nav>

      {/* SELF-ORDER CHECKOUT PANEL - WITH POINT REDEMPTION */}
      {view === 'order' && cart.length > 0 && (
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 w-full max-w-md px-6 animate-in slide-in-from-bottom-6 z-[90]">
           <div className="bg-slate-900 text-white rounded-[40px] p-6 shadow-2xl shadow-slate-900/40 space-y-6">
              {/* POINT REDEMPTION TOGGLE */}
              {loggedInCustomer && loggedInCustomer.points > 0 && (
                <div className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${usePoints ? 'bg-orange-500/10 border-orange-500' : 'bg-white/5 border-white/10'}`}>
                   <div className="flex items-center gap-3">
                      <span className="text-xl">💎</span>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tukarkan Poin?</p>
                        <p className="text-[10px] font-black text-white">Saldo: {loggedInCustomer.points} PTS</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => setUsePoints(!usePoints)}
                    className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${usePoints ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/10 text-white/50'}`}
                   >
                     {usePoints ? 'AKTIF ✓' : 'GUNAKAN'}
                   </button>
                </div>
              )}

              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl shadow-orange-500/20">{cart.reduce((a,b)=>a+b.quantity, 0)}</div>
                    <div>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Bayar</p>
                       <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black text-white leading-none">Rp {finalTotal.toLocaleString()}</p>
                          {usePoints && <p className="text-[9px] text-slate-500 line-through">Rp {cartSubtotal.toLocaleString()}</p>}
                       </div>
                    </div>
                 </div>
                 <button 
                   onClick={handleSelfCheckout}
                   className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 shadow-xl shadow-white/5"
                 >
                   CHECKOUT 🏁
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
