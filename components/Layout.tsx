
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

interface SidebarProps { activeTab: string; setActiveTab: (tab: string) => void; closeDrawer?: () => void; }

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, closeDrawer }) => {
  const { currentUser, logout, selectedOutletId, brandConfig } = useApp();
  
  if (!currentUser) return <div className="h-full bg-slate-900 animate-pulse"></div>;

  const isAdmin = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER;
  const isOutletSelected = selectedOutletId !== 'all';
  
  const menuGroups = [
    { 
      label: 'Manajemen Operasional', 
      items: [
        { id: 'dashboard', label: 'Dashboard Utama', icon: '📊', visible: true },
        { id: 'pos', label: 'Sistem Kasir', icon: '🛒', visible: isOutletSelected },
        { id: 'expenses', label: 'Pengeluaran', icon: '💸', visible: isOutletSelected },
        { id: 'closing', label: 'Tutup Shift', icon: '🏁', visible: isOutletSelected },
        { id: 'attendance', label: 'Crew Access', icon: '⏰', visible: true },
      ]
    },
    { 
      label: 'Logistik & Persediaan', 
      items: [
        { id: 'inventory', label: 'Stok', icon: '📦', visible: true },
        { id: 'production', label: 'Produksi & Mixing', icon: '🧪', visible: isOutletSelected },
        { id: 'transfers', label: 'Transfer Stok', icon: '🚚', visible: isOutletSelected },
        { id: 'purchases', label: 'Belanja', icon: '🚛', visible: isOutletSelected },
      ]
    },
    { 
      label: 'Kecerdasan Bisnis', 
      items: [
        { id: 'menu', label: 'Produk & Menu', icon: '📜', visible: isAdmin },
        { id: 'categories', label: 'Kategori', icon: '🏷️', visible: isAdmin },
        { id: 'engineering', label: 'Menu Engineering', icon: '📐', visible: isAdmin },
        { id: 'reports', label: 'Laporan Keuangan', icon: '📈', visible: isAdmin },
      ]
    },
    { 
      label: 'CRM & Pemasaran', 
      items: [
        { id: 'crm', label: 'Database Member', icon: '👤', visible: true },
        { id: 'loyalty', label: 'Loyalty Program', icon: '🎁', visible: true },
      ]
    },
    { 
      label: 'Administrasi Sistem', 
      items: [
        { id: 'outlets', label: 'Data Outlet', icon: '🏢', visible: isAdmin },
        { id: 'staff', label: 'Manajemen Kru', icon: '👥', visible: isAdmin },
        { id: 'printer', label: 'Printer & Hardware', icon: '🖨️', visible: true },
        { id: 'maintenance', label: 'Maintenance', icon: '🛠️', visible: currentUser.role === UserRole.OWNER },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 shrink-0 mb-2 border-b border-slate-800/50">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transform -rotate-3 shrink-0" style={{ backgroundColor: brandConfig.primaryColor }}>
          {brandConfig.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="font-black text-white text-[13px] tracking-tight uppercase leading-none truncate">{brandConfig.name}</div>
          <div className="text-[7px] font-bold uppercase tracking-[0.1em] mt-1.5 text-slate-500 truncate">{brandConfig.tagline}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-6 overflow-y-auto custom-scrollbar pb-10">
        {menuGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter(i => i.visible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={gIdx} className="space-y-1">
              <h5 className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2 opacity-70">{group.label}</h5>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => { setActiveTab(item.id); if(closeDrawer) closeDrawer(); }} 
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                    style={activeTab === item.id ? { backgroundColor: brandConfig.primaryColor } : {}}
                  >
                    <span className={`text-[16px] w-6 flex justify-center shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'opacity-100' : 'opacity-50'}`}>
                      {item.icon}
                    </span>
                    <span className={`text-[11px] font-semibold tracking-normal whitespace-nowrap truncate ${activeTab === item.id ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800/50 shrink-0 bg-slate-900/40">
        <div className="flex items-center gap-3 px-2 mb-4">
           <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shrink-0">👤</div>
           <div className="min-w-0">
              <p className="text-[10px] font-bold text-white truncate leading-none uppercase">{currentUser.name}</p>
              <p className="text-[8px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{currentUser.role}</p>
           </div>
        </div>
        <button 
          onClick={logout} 
          className="w-full text-[10px] font-black tracking-widest py-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 uppercase"
        >
          Keluar Sesi
        </button>
      </div>
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { outlets = [], selectedOutletId, switchOutlet, isSaving, assetsOptimized, brandConfig, currentUser } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // SECURITY FILTER: Hanya tampilkan cabang yang diizinkan untuk user aktif
  const allowedOutlets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER) {
        return outlets;
    }
    return outlets.filter(o => currentUser.assignedOutletIds.includes(o.id));
  }, [outlets, currentUser]);

  const showGlobalOption = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans select-none text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-60 shrink-0 h-full no-print">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden bg-slate-950/80 backdrop-blur-sm transition-all duration-300" onClick={() => setIsMenuOpen(false)}>
           <div className="w-64 h-full animate-in slide-in-from-left duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} closeDrawer={() => setIsMenuOpen(false)} />
           </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-slate-100 px-4 lg:px-8 flex items-center justify-between shadow-sm z-40 shrink-0 no-print">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsMenuOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center text-xl bg-slate-50 border border-slate-100 rounded-xl text-slate-600">☰</button>
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest">Cabang Aktif:</span>
                 <h1 className="text-[11px] lg:text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">
                   {selectedOutletId === 'all' ? 'Pusat Kontrol Global' : outlets.find(o=>o.id===selectedOutletId)?.name || 'Outlet'}
                 </h1>
               </div>
               <div className="flex items-center gap-1.5 mt-1.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'animate-pulse bg-orange-500' : 'bg-emerald-500'}`}></div>
                 <span className="text-[7px] lg:text-[8px] font-bold uppercase tracking-widest text-slate-400">
                    {isSaving ? 'Menyinkronkan Cloud...' : assetsOptimized ? 'Terhubung & Terverifikasi ✓' : 'Mengoptimalkan Aset...'}
                 </span>
               </div>
             </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 group hover:border-orange-200 transition-all">
            <span className="text-xs opacity-40">🌍</span>
            <select 
              className="text-[10px] font-black bg-transparent outline-none cursor-pointer text-slate-700 uppercase tracking-wider" 
              value={selectedOutletId} 
              onChange={(e) => switchOutlet(e.target.value)}
            >
              {showGlobalOption && <option value="all">Kontrol Global</option>}
              {allowedOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-[#fcfdfe]">
          {children}
        </div>

        {/* Mobile Quick Nav */}
        <nav className="lg:hidden h-16 bg-white border-t border-slate-100 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
           <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'dashboard' ? 'text-orange-600 scale-110' : 'text-slate-300 opacity-60'}`}>
              <span className="text-xl">📊</span>
              <span className="text-[7px] font-black uppercase tracking-tighter">Stats</span>
           </button>
           <button disabled={selectedOutletId === 'all'} onClick={() => setActiveTab('pos')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'pos' ? 'text-orange-600 scale-110' : 'text-slate-300 opacity-60'} ${selectedOutletId === 'all' ? 'opacity-20 grayscale' : ''}`}>
              <span className="text-xl">🛒</span>
              <span className="text-[7px] font-black uppercase tracking-tighter">Kasir</span>
           </button>
           <button onClick={() => setActiveTab('attendance')} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'attendance' ? 'text-orange-600 scale-110' : 'text-slate-300 opacity-60'}`}>
              <span className="text-xl">⏰</span>
              <span className="text-[7px] font-black uppercase tracking-tighter">Portal</span>
           </button>
           <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-300 opacity-60">
              <span className="text-xl">☰</span>
              <span className="text-[7px] font-black uppercase tracking-tighter">Menu</span>
           </button>
        </nav>
      </main>
    </div>
  );
};
