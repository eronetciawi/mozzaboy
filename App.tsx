
import React, { useState } from 'react';
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
  const { isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'pos': return <POS setActiveTab={setActiveTab} />;
      case 'attendance': return <Attendance />;
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
        {renderContent()}
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
