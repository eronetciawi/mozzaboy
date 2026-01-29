
import React, { useState } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

// Add interfaces for menu items to ensure consistent typing
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  badge?: number | string | null;
  status?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  closeDrawer?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, closeDrawer }) => {
  const { currentUser, logout, stockRequests, selectedOutletId, connectedPrinter } = useApp();
  
  if (!currentUser) return null;

  const { permissions } = currentUser;
  const pendingRequestsCount = stockRequests.filter(r => r.outletId === selectedOutletId && r.status === 'PENDING').length;

  const menuGroups: MenuGroup[] = [
    {
      label: 'Operasional',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', visible: true },
        { id: 'pos', label: 'Kasir Jualan', icon: '🛒', visible: permissions.canProcessSales },
        { id: 'attendance', label: 'My Portal', icon: '⏰', visible: true },
        { id: 'expenses', label: 'Pengeluaran', icon: '💸', visible: true },
        { id: 'closing', label: 'Tutup Buku', icon: '📔', visible: permissions.canProcessSales },
      ]
    },
    {
      label: 'Strategi & Owner',
      items: [
        { id: 'reports', label: 'Laporan Bisnis', icon: '📈', visible: permissions.canAccessReports },
        { id: 'engineering', label: 'Menu Engineering', icon: '📐', visible: currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER },
        { id: 'loyalty', label: 'Loyalty & Promo', icon: '🎁', visible: true },
      ]
    },
    {
      label: 'Logistik & Stok',
      items: [
        { id: 'inventory', label: 'Stok Barang', icon: '📦', visible: true }, 
        { id: 'production', label: 'Produksi/Mixing', icon: '🧪', visible: permissions.canManageInventory },
        { id: 'purchases', label: 'Pembelian Stok', icon: '🚛', visible: permissions.canManageInventory, badge: pendingRequestsCount > 0 ? pendingRequestsCount : null },
        { id: 'transfers', label: 'Mutasi Stok', icon: '🔄', visible: permissions.canManageInventory },
      ]
    },
    {
      label: 'Katalog & Pelanggan',
      items: [
        { id: 'menu', label: 'Daftar Menu', icon: '📜', visible: permissions.canManageMenu },
        { id: 'categories', label: 'Kategori Menu', icon: '🏷️', visible: permissions.canManageMenu },
        { id: 'crm', label: 'Data Pelanggan', icon: '🎖️', visible: true },
      ]
    },
    {
      label: 'Pengaturan',
      items: [
        { id: 'staff', label: 'Karyawan', icon: '👥', visible: permissions.canManageStaff },
        { id: 'outlets', label: 'Daftar Cabang', icon: '🏢', visible: currentUser.role === UserRole.OWNER },
        { id: 'printer', label: 'Printer BT', icon: '🖨️', visible: true, status: connectedPrinter ? 'connected' : 'none' },
        { id: 'maintenance', label: 'Maintenance', icon: '🛠️', visible: currentUser.role === UserRole.OWNER },
      ]
    }
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    if (closeDrawer) closeDrawer();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-orange-500/20 transform -rotate-3">M</div>
        <div>
          <div className="font-black text-white text-sm tracking-tighter uppercase leading-none">Mozza Boy</div>
          <div className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">Enterprise ROS</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto custom-scrollbar pb-10">
        {menuGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter(i => i.visible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={gIdx} className="space-y-1">
              <h5 className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{group.label}</h5>
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 group relative ${
                    activeTab === item.id 
                      ? 'bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20' 
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest flex-1 text-left">{item.label}</span>
                  {item.badge && <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-slate-900">{item.badge}</span>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-800 mb-3">
          <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-[10px] font-black text-white uppercase">{currentUser.name.charAt(0)}</div>
          <div className="text-[9px] truncate flex-1">
            <p className="text-white font-black uppercase truncate">{currentUser.name}</p>
            <p className="text-slate-500 font-bold uppercase mt-0.5">{currentUser.role}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full text-[8px] font-black tracking-[0.2em] py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10">LOGOUT</button>
      </div>
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { outlets, selectedOutletId, switchOutlet, isSaving, isCloudConnected, currentUser } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const accessibleOutlets = currentUser?.role === UserRole.OWNER ? outlets : outlets.filter(o => currentUser?.assignedOutletIds.includes(o.id));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans select-none">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:block w-56 shrink-0 h-full no-print">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
           <div className="w-64 h-full animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} closeDrawer={() => setIsMenuOpen(false)} />
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* TOP BAR - OPTIMIZED FOR MOBILE */}
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm z-40 shrink-0 no-print">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center text-xl bg-slate-50 rounded-xl">☰</button>
             <div className="hidden md:block w-1.5 h-6 bg-orange-500 rounded-full"></div>
             <h1 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
               {activeTab === 'pos' ? `Cashier / ${currentUser?.name}` : activeTab.toUpperCase()}
             </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-orange-400 animate-pulse' : isCloudConnected ? 'bg-indigo-500' : 'bg-emerald-400'}`}></div>
            
            <div className="flex flex-col items-end">
              <select 
                className="text-[9px] md:text-[11px] font-black text-orange-600 bg-transparent focus:outline-none cursor-pointer max-w-[100px] md:max-w-none"
                value={selectedOutletId}
                onChange={(e) => switchOutlet(e.target.value)}
              >
                {accessibleOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="md:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 pb-safe z-50 no-print shrink-0">
           <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-slate-400'}`}>
              <span className="text-lg">📊</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Stats</span>
           </button>
           <button onClick={() => setActiveTab('pos')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'pos' ? 'text-orange-500' : 'text-slate-400'}`}>
              <span className="text-lg">🛒</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Kasir</span>
           </button>
           <button onClick={() => setActiveTab('attendance')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'attendance' ? 'text-orange-500' : 'text-slate-400'}`}>
              <span className="text-lg">⏰</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Portal</span>
           </button>
           <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 flex-1 text-slate-400">
              <span className="text-lg">⚙️</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Menu</span>
           </button>
        </nav>
      </main>
    </div>
  );
};
