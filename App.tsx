
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
  const { isAuthenticated, isInitialLoading } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing MozzaBoy Cloud...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
        <Suspense fallback={<div className="p-10 text-center animate-pulse">Memuat...</div>}>
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
