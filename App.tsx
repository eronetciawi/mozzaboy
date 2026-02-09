
import React, { useState, Suspense } from 'react';
import { AppProvider, useApp } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { ProductionManagement } from './components/ProductionManagement';
import { MenuManagement } from './components/MenuManagement';
import { StaffManagement } from './components/StaffManagement';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { ExpenseManagement } from './components/ExpenseManagement';
import { ClosingManagement } from './components/ClosingManagement';
import { CategoryManagement } from './components/CategoryManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { OutletManagement } from './components/OutletManagement';
import { StockTransferManagement } from './components/StockTransferManagement';
import { PrinterSettings } from './components/PrinterSettings';
import { CRM } from './components/CRM';
import { LoyaltyManagement } from './components/LoyaltyManagement';
import { Attendance } from './components/Attendance';
import { MenuEngineering } from './components/MenuEngineering';
import { Maintenance } from './components/Maintenance';

const MainApp: React.FC = () => {
  const { isAuthenticated, isInitialLoading, brandConfig } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  // SPEED-OF-LIGHT BOOTING: 
  // Jika belum login, jangan tampilkan loading apapun. Langsung lempar ke form login.
  if (!isAuthenticated) {
    return <Login />;
  }

  // Jika sudah login, loading screen hanya muncul saat inisialisasi cloud yang sangat kritis
  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-6" style={{ borderColor: brandConfig.primaryColor || '#f97316', borderTopColor: 'transparent' }}></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Synchronizing {brandConfig.name || 'Mozza Boy'}...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'pos': return <POS setActiveTab={setActiveTab} />;
      case 'attendance': return <Attendance setActiveTab={setActiveTab} />;
      case 'crm': return <CRM />;
      case 'loyalty': return <LoyaltyManagement />;
      case 'printer': return <PrinterSettings />;
      case 'inventory': return <Inventory />;
      case 'production': return <ProductionManagement setActiveTab={setActiveTab} />;
      case 'transfers': return <StockTransferManagement />;
      case 'purchases': return <PurchaseManagement />;
      case 'menu': return <MenuManagement />;
      case 'categories': return <CategoryManagement />;
      case 'expenses': return <ExpenseManagement />;
      case 'closing': return <ClosingManagement />;
      case 'reports': return <Reports />;
      case 'staff': return <StaffManagement />;
      case 'outlets': return <OutletManagement />;
      case 'engineering': return <MenuEngineering />;
      case 'maintenance': return <Maintenance />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="h-full relative">
        <Suspense fallback={<div className="p-10 text-center animate-pulse">Memuat Modul...</div>}>
          {renderContent()}
        </Suspense>
      </div>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
