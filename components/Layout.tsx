
import React, { useState } from 'react';
import { useApp } from '../store';
import { UserRole } from '../types';

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
  const { currentUser, logout, stockRequests, selectedOutletId, connectedPrinter, leaveRequests } = useApp();
  
  if (!currentUser) return null;

  const { permissions } = currentUser;
  const isCashier = currentUser.role === UserRole.CASHIER;
  const isAdmin = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER;
  
  const pendingRequestsCount = (stockRequests || []).filter(r => (selectedOutletId === 'all' || r.outletId === selectedOutletId) && r.status === 'PENDING').length;
  const pendingLeavesCount = (leaveRequests || []).filter(l => l.status === 'PENDING').length;

  const menuGroups: MenuGroup[] = [
    {
      label: 'Operasional',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', visible: true },
        { id: 'pos', label: 'Kasir Jualan', icon: '🛒', visible: permissions.canProcessSales && selectedOutletId !== 'all' },
        { id: 'attendance', label: 'My Portal', icon: '⏰', visible: true },
        { id: 'expenses', label: 'Pengeluaran', icon: '💸', visible: selectedOutletId !== 'all' },
        { id: 'closing', label: 'Tutup Buku', icon: '📔', visible: permissions.canProcessSales && selectedOutletId !== 'all' },
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
        { id: 'production', label: 'Produksi/Mixing', icon: '🧪', visible: (permissions.canManageInventory || isCashier) && selectedOutletId !== 'all' },
        { id: 'purchases', label: 'Pembelian Stok', icon: '🚛', visible: (permissions.canManageInventory || isCashier) && selectedOutletId !== 'all', badge: pendingRequestsCount > 0 ? pendingRequestsCount : null },
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
        { id: 'staff', label: 'Karyawan', icon: '👥', visible: permissions.canManageStaff, badge: (isAdmin && pendingLeavesCount > 0) ? pendingLeavesCount : null },
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
        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg transform -rotate-2 select-none">M</div>
        <div>
          <div className="font-black text-white text-sm tracking-tighter uppercase leading-none">Mozza Boy</div>
          <div className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">Food OS</div>
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
                  {item.badge && <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-slate-900 animate-pulse">{item.badge}</span>}
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
  const isGlobalManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans select-none">
      <div className="hidden md:block w-56 shrink-0 h-full no-print">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}>
           <div className="w-64 h-full animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} closeDrawer={() => setIsMenuOpen(false)} />
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-16 md:h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between shadow-sm z-40 shrink-0 no-print">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="md:hidden w-12 h-12 flex items-center justify-center text-xl bg-slate-50 rounded-2xl">☰</button>
             <div className="hidden md:block w-1.5 h-8 bg-orange-500 rounded-full"></div>
             <div className="flex flex-col">
               <h1 className="text-[12px] md:text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">
                 {selectedOutletId === 'all' ? 'Network Hub' : accessibleOutlets.find(o=>o.id===selectedOutletId)?.name || 'Outlet'}
               </h1>
               <div className="flex items-center gap-1.5 mt-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-orange-400 animate-pulse' : isCloudConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{isSaving ? 'Syncing...' : 'Live System'}</span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-50 border-2 border-slate-100 p-1.5 md:p-2 rounded-2xl flex items-center gap-2">
              <span className="text-base grayscale hidden sm:block">🏢</span>
              <select 
                className="text-[11px] md:text-[13px] font-black text-orange-600 bg-transparent focus:outline-none cursor-pointer max-w-[120px] md:max-w-none"
                value={selectedOutletId}
                onChange={(e) => switchOutlet(e.target.value)}
              >
                {isGlobalManager && <option value="all">🌍 ALL BRANCHES</option>}
                {accessibleOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>

        <nav className="md:hidden h-20 bg-white border-t border-slate-100 flex items-center justify-around px-4 pb-safe z-50 no-print shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
           <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-slate-300'}`}>
              <span className="text-2xl">📊</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">Stats</span>
           </button>
           <button 
             disabled={selectedOutletId === 'all'}
             onClick={() => setActiveTab('pos')} 
             className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'pos' ? 'text-orange-500' : 'text-slate-300'} ${selectedOutletId === 'all' ? 'opacity-20' : ''}`}
           >
              <span className="text-2xl">🛒</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">POS</span>
           </button>
           <button onClick={() => setActiveTab('attendance')} className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'attendance' ? 'text-orange-500' : 'text-slate-300'}`}>
              <span className="text-2xl">⏰</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">Portal</span>
           </button>
           <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1.5 flex-1 text-slate-300">
              <span className="text-2xl">⚙️</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
           </button>
        </nav>
      </main>
    </div>
  );
};
