
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Product, Category, InventoryItem, Transaction, Outlet, 
  CartItem, PaymentMethod, OrderStatus, UserRole, StaffMember, Permissions,
  Customer, Expense, ExpenseType, DailyClosing, Purchase, StockTransfer, StockRequest,
  MembershipTier, BulkDiscountRule, InventoryItemType, ProductionRecord, Attendance, LeaveRequest,
  MenuSimulation, LoyaltyConfig, WIPRecipe, BrandConfig
} from './types';
import { OUTLETS } from './constants';

const STORAGE_USER_KEY = 'foodos_session_user';
const STORAGE_OUTLET_KEY = 'foodos_active_outlet';
const STORAGE_CLOUD_CONFIG = 'mozzaboy_cloud_config';
const STORAGE_BRAND_CONFIG = 'mozzaboy_brand_settings';
const STORAGE_EXTERNAL_DB = 'mozzaboy_external_db';

export const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

// DATA DATABASE BARU (Baseline)
const DEFAULT_CLOUD = { 
  url: 'https://wwpexrtpnvwksgdpresl.supabase.co', 
  key: 'sb_publishable_YjGlVWY7EqTVNLkG2ggbjg_Y7RDPXAH' 
};

const loadCloudConfig = () => {
  const saved = localStorage.getItem(STORAGE_CLOUD_CONFIG);
  if (!saved) return DEFAULT_CLOUD;
  try {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.url?.includes('http') && parsed.key) return parsed;
    return DEFAULT_CLOUD;
  } catch (e) { return DEFAULT_CLOUD; }
};

const activeConfig = loadCloudConfig();
let supabase = createClient(activeConfig.url, activeConfig.key);

const DEFAULT_BRAND: BrandConfig = { 
  name: 'Mozza Boy', 
  tagline: 'Premium Korean Street Food', 
  logoUrl: '', 
  primaryColor: '#f97316' 
};

export const getBrandConfig = (): BrandConfig => {
  const saved = localStorage.getItem(STORAGE_BRAND_CONFIG);
  if (!saved) return DEFAULT_BRAND;
  try {
    const parsed = JSON.parse(saved);
    return {
      name: parsed.name || DEFAULT_BRAND.name,
      tagline: parsed.tagline || DEFAULT_BRAND.tagline,
      logoUrl: parsed.logoUrl || parsed.logourl || DEFAULT_BRAND.logoUrl,
      primaryColor: parsed.primaryColor || parsed.primarycolor || DEFAULT_BRAND.primaryColor
    };
  } catch (e) { return DEFAULT_BRAND; }
};

export const getPermissionsByRole = (role: UserRole): Permissions => {
  const isAdmin = role === UserRole.OWNER || role === UserRole.MANAGER;
  return {
    canAccessReports: isAdmin, canManageStaff: isAdmin, canManageMenu: isAdmin,
    canManageInventory: true, canProcessSales: true, canVoidTransactions: isAdmin, canManageSettings: isAdmin,
  };
};

interface AppState {
  products: Product[]; categories: Category[]; inventory: InventoryItem[]; stockTransfers: StockTransfer[]; stockRequests: StockRequest[]; productionRecords: ProductionRecord[]; wipRecipes: WIPRecipe[]; transactions: Transaction[]; filteredTransactions: Transaction[]; outlets: Outlet[]; currentUser: StaffMember | null; isAuthenticated: boolean; cart: CartItem[]; staff: StaffMember[]; attendance: Attendance[]; leaveRequests: LeaveRequest[]; selectedOutletId: string; customers: Customer[]; selectedCustomerId: string | null; expenses: Expense[]; expenseTypes: ExpenseType[]; dailyClosings: DailyClosing[]; purchases: Purchase[]; connectedPrinter: any | null; membershipTiers: MembershipTier[]; bulkDiscounts: BulkDiscountRule[]; simulations: MenuSimulation[]; loyaltyConfig: LoyaltyConfig; brandConfig: BrandConfig; isSaving: boolean; isInitialLoading: boolean; isFetching: boolean; cloudConfig: { url: string; key: string }; externalDbConfig: any;
}

interface AppActions {
  updateCloudConfig: (url: string, key: string) => void; login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>; logout: () => void; switchOutlet: (id: string) => void; addToCart: (product: Product) => void; removeFromCart: (productId: string) => void; updateCartQuantity: (productId: string, delta: number) => void; clearCart: () => void; checkout: (paymentMethod: PaymentMethod, redeemPoints?: number, membershipDiscount?: number, bulkDiscount?: number) => Promise<void>; addStaff: (member: StaffMember) => Promise<void>; updateStaff: (member: StaffMember) => Promise<void>; deleteStaff: (id: string) => Promise<void>; clockIn: () => Promise<{ success: boolean; message?: string }>; clockOut: () => Promise<void>; addProduct: (product: Product) => Promise<void>; updateProduct: (product: Product) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addInventoryItem: (item: any, outletIds?: string[]) => Promise<void>; updateInventoryItem: (item: InventoryItem) => Promise<void>; deleteInventoryItem: (id: string) => Promise<void>; performClosing: (cash: number, notes: string, opening: number, shift: string, cashSales: number, qrisSales: number, expenses: number, discrepancy: number) => Promise<void>; addPurchase: (purchase: any) => Promise<void>; selectCustomer: (id: string | null) => void; addCustomer: (customer: any) => Promise<void>; updateCustomer: (customer: Customer) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; processProduction: (data: { resultItemId: string; resultQuantity: number; components: { inventoryItemId: string; quantity: number }[] }) => Promise<void>; fetchFromCloud: () => Promise<void>; syncToCloud: () => void; addExpense: (expense: any) => Promise<void>; updateExpense: (id: string, expense: any) => Promise<void>; deleteExpense: (id: string) => Promise<void>; addExpenseType: (name: string) => Promise<void>; updateExpenseType: (id: string, name: string) => Promise<void>; deleteExpenseType: (id: string) => Promise<void>; addCategory: (name: string) => Promise<void>; updateCategory: (id: string, name: string) => Promise<void>; deleteCategory: (id: string) => Promise<void>; reorderCategories: (categories: Category[]) => Promise<void>; updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>; addOutlet: (outlet: any) => Promise<void>; updateOutlet: (outlet: Outlet) => Promise<void>; deleteOutlet: (id: string) => Promise<void>; transferStock: (fromOutletId: string, toOutletId: string, itemName: string, quantity: number) => Promise<void>; respondToTransfer: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>; updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>; addMembershipTier: (tier: any) => Promise<void>; updateMembershipTier: (tier: MembershipTier) => Promise<void>; deleteMembershipTier: (id: string) => Promise<void>; addBulkDiscount: (rule: any) => Promise<void>; updateBulkDiscount: (rule: BulkDiscountRule) => Promise<void>; deleteBulkDiscount: (id: string) => Promise<void>; addWIPRecipe: (recipe: any) => Promise<void>; updateWIPRecipe: (recipe: WIPRecipe) => Promise<void>; deleteWIPRecipe: (id: string) => Promise<void>; submitLeave: (data: { startDate: string; endDate: string; reason: string }) => Promise<void>; saveSimulation: (simulation: MenuSimulation) => Promise<void>; deleteSimulation: (id: string) => Promise<void>; resetOutletData: (id: string) => Promise<void>; resetGlobalData: () => Promise<void>; updateBrandConfig: (config: BrandConfig) => Promise<void>; updateExternalDbConfig: (config: any) => void; exportDatabaseSQL: () => Promise<void>; importSystemBackup: (jsonString: string) => Promise<{ success: boolean; message: string }>; exportTableToCSV: (table: string) => void; exportSystemBackup: () => Promise<void>; setConnectedPrinter: (device: any) => void;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!currentUser);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>(OUTLETS);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(getBrandConfig());
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [wipRecipes, setWipRecipes] = useState<WIPRecipe[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscountRule[]>([]);
  const [simulations, setSimulations] = useState<MenuSimulation[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({ isEnabled: true, earningAmountPerPoint: 1000, redemptionValuePerPoint: 100, minRedeemPoints: 50 });

  const [selectedOutletId, setSelectedOutletId] = useState<string>(localStorage.getItem(STORAGE_OUTLET_KEY) || 'all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<any | null>(null);
  const [cloudConfig, setCloudConfig] = useState(loadCloudConfig());
  
  const [externalDbConfig, setExternalDbConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_EXTERNAL_DB);
    return saved ? JSON.parse(saved) : { gatewayUrl: '', host: '', port: '5432', user: '', password: '', status: 'IDLE' };
  });

  const fetchPublicConfig = async () => {
    try {
      const [brandData, loyaltyData] = await Promise.all([
        supabase.from('brand_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle()
      ]);

      if (brandData.data) {
        const mappedBrand: BrandConfig = {
          name: brandData.data.name,
          tagline: brandData.data.tagline || '',
          logoUrl: brandData.data.logourl || '',
          primaryColor: brandData.data.primarycolor || '#f97316'
        };
        setBrandConfig(mappedBrand);
        localStorage.setItem(STORAGE_BRAND_CONFIG, JSON.stringify(mappedBrand));
      }
      if (loyaltyData.data) setLoyaltyConfig(loyaltyData.data);
    } catch (e) {
      console.warn("Public Config fetch error:", e);
    }
  };

  const fetchFromCloud = async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      const [catsData, prodsData, outletsData, staffData, invData, custData, tierData, discData, simData, recipeData, trxData, closeData, expData, expTypesData, attendData, leaveData, buyData, trfData, prodData] = await Promise.all([
        supabase.from('categories').select('*').order('sortOrder', { ascending: true }),
        supabase.from('products').select('*'),
        supabase.from('outlets').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('membership_tiers').select('*'),
        supabase.from('bulk_discounts').select('*'),
        supabase.from('simulations').select('*'),
        supabase.from('wip_recipes').select('*'),
        supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(300),
        supabase.from('daily_closings').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('expenses').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('expense_types').select('*'),
        supabase.from('attendance').select('*').order('date', { ascending: false }).limit(300),
        supabase.from('leave_requests').select('*'),
        supabase.from('purchases').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('stock_transfers').select('*').order('timestamp', { ascending: false }),
        supabase.from('production_records').select('*')
      ]);

      if (catsData.data) setCategories(catsData.data);
      if (prodsData.data) setProducts(prodsData.data);
      if (outletsData.data) setOutlets(outletsData.data);
      if (staffData.data) setStaff(staffData.data);
      if (invData.data) setInventory(invData.data);
      if (custData.data) setCustomers(custData.data);
      if (tierData.data) setMembershipTiers(tierData.data);
      if (discData.data) setBulkDiscounts(discData.data);
      if (simData.data) setSimulations(simData.data);
      if (recipeData.data) setWipRecipes(recipeData.data);
      if (expTypesData.data) setExpenseTypes(expTypesData.data);
      
      if (trxData.data) {
        setTransactions(trxData.data.map((t: any) => ({
          ...t,
          outletId: t.outletId || t.outlet_id,
          cashierId: t.cashierId || t.cashier_id,
          cashierName: t.cashierName || t.cashier_name,
          customerId: t.customerId || t.customer_id
        })));
      }
      if (closeData.data) {
        setDailyClosings(closeData.data.map((c: any) => ({
          ...c,
          outletId: c.outletId || c.outlet_id,
          staffId: c.staffId || c.staff_id,
          staffName: c.staffName || c.staff_name
        })));
      }
      if (expData.data) {
        setExpenses(expData.data.map((e: any) => ({
          ...e,
          outletId: e.outletId || e.outlet_id,
          typeId: e.typeId || e.type_id,
          staffId: e.staffId || e.staff_id,
          staffName: e.staffName || e.staff_name
        })));
      }
      if (attendData.data) {
        setAttendance(attendData.data.map((a: any) => ({
          ...a,
          staffId: a.staffId || a.staff_id,
          staffName: a.staffName || a.staff_name,
          clockIn: a.clockIn || a.clock_in,
          clockOut: a.clockOut || a.clock_out,
          outletId: a.outletId || a.outlet_id
        })));
      }
      if (leaveData.data) {
        setLeaveRequests(leaveData.data.map((l: any) => ({
          ...l,
          staffId: l.staffId || l.staff_id,
          staffName: l.staffName || l.staff_name,
          startDate: l.startDate || l.start_date,
          endDate: l.endDate || l.end_date,
          requestedAt: l.requestedAt || l.requested_at,
          outletId: l.outletId || l.outlet_id || 'all'
        })));
      }
      if (buyData.data) {
        setPurchases(buyData.data.map((p: any) => ({
          ...p,
          outletId: p.outletId || p.outlet_id,
          inventoryItemId: p.inventoryItemId || p.inventory_item_id,
          itemName: p.itemName || p.item_name,
          staffId: p.staffId || p.staff_id,
          staffName: p.staffName || p.staff_name
        })));
      }

      if (trfData.data) {
        setStockTransfers(trfData.data.map((t: any) => ({
          ...t,
          fromOutletId: t.fromOutletId || t.from_outlet_id,
          fromOutletName: t.fromOutletName || t.from_outlet_name,
          toOutletId: t.toOutletId || t.to_outlet_id,
          toOutletName: t.toOutletName || t.to_outlet_name,
          itemName: t.itemName || t.item_name,
          staffId: t.staffId || t.staff_id,
          staffName: t.staffName || t.staff_name,
          status: t.status || 'PENDING'
        })));
      }
      
      if (prodData.data) {
        setProductionRecords(prodData.data.map((p: any) => ({
          ...p,
          outletId: p.outletId || p.outlet_id,
          resultItemId: p.resultItemId || p.result_item_id,
          resultQuantity: p.resultQuantity || p.result_quantity,
          staffId: p.staffId || p.staff_id,
          staffName: p.staffName || p.staff_name
        })));
      }
      await fetchPublicConfig(); // Refresh brand & loyalty to be sure
    } catch (e) {
      console.error("Cloud Retrieval Error:", e);
    } finally {
      setIsFetching(false);
    }
  };

  const actions: AppActions = {
    fetchFromCloud,
    updateCloudConfig: (url: string, key: string) => {
      let finalUrl = url.trim();
      let finalKey = key.trim();
      const config = { url: finalUrl, key: finalKey };
      localStorage.setItem(STORAGE_CLOUD_CONFIG, JSON.stringify(config));
      localStorage.removeItem(STORAGE_USER_KEY);
      window.location.reload();
    },
    updateBrandConfig: async (config: BrandConfig) => { 
       setIsSaving(true);
       try {
          localStorage.setItem(STORAGE_BRAND_CONFIG, JSON.stringify(config));
          setBrandConfig(config);
          await supabase.from('brand_config').upsert({ id: 'global', name: config.name, tagline: config.tagline, logourl: config.logoUrl, primarycolor: config.primaryColor });
       } finally { setIsSaving(false); }
    },
    updateExternalDbConfig: (config: any) => {
       setExternalDbConfig(config);
       localStorage.setItem(STORAGE_EXTERNAL_DB, JSON.stringify(config));
    },
    exportTableToCSV: (table: string) => {
      let dataToExport: any[] = [];
      let filename = `Audit_${table.toUpperCase()}_${Date.now()}.csv`;
      switch(table) {
        case 'products': dataToExport = products; break;
        case 'inventory': dataToExport = inventory; break;
        case 'staff': dataToExport = staff; break;
        case 'outlets': dataToExport = outlets; break;
        case 'transactions': dataToExport = transactions; break;
        case 'expenses': dataToExport = expenses; break;
        default: return;
      }
      if (!dataToExport || dataToExport.length === 0) return alert("Data kosong.");
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(obj => {
         return Object.values(obj).map(val => {
            if (val === null || val === undefined) return '""';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
         }).join(',');
      });
      const csvContent = headers + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    login: async (username, password) => {
      const { data, error } = await supabase.from('staff').select('*').eq('username', username).eq('password', password).maybeSingle();
      if (data) {
        setCurrentUser(data);
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
        return { success: true };
      }
      return { success: false, message: error ? `Database error: ${error.message}` : "Login Gagal." };
    },
    logout: () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_USER_KEY);
    },
    switchOutlet: (id) => {
      setSelectedOutletId(id);
      localStorage.setItem(STORAGE_OUTLET_KEY, id);
    },
    addToCart: (p) => setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    }),
    removeFromCart: (pid) => setCart(prev => prev.filter(i => i.product.id !== pid)),
    updateCartQuantity: (pid, delta) => setCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)),
    clearCart: () => setCart([]),
    checkout: async (method, redeem = 0, membershipDiscount = 0, bulkDiscount = 0) => {
      setIsSaving(true);
      try {
        const sub = cart.reduce((sum, i) => sum + ((i.product.outletSettings?.[selectedOutletId]?.price || i.product.price) * i.quantity), 0);
        const pointVal = redeem * (loyaltyConfig.redemptionValuePerPoint || 100);
        const tx = {
          id: `TX-${Date.now()}`,
          outletId: selectedOutletId,
          customerId: selectedCustomerId,
          items: cart,
          subtotal: sub,
          total: Math.max(0, sub - membershipDiscount - bulkDiscount - pointVal),
          paymentMethod: method,
          status: OrderStatus.CLOSED,
          timestamp: new Date().toISOString(),
          cashierId: currentUser?.id,
          cashierName: currentUser?.name,
          pointsRedeemed: redeem,
          pointDiscountValue: pointVal,
          membershipDiscount: membershipDiscount,
          bulkDiscount: bulkDiscount,
          pointsEarned: Math.floor(sub / (loyaltyConfig.earningAmountPerPoint || 1000))
        };
        
        for (const cartItem of cart) {
           for (const bom of (cartItem.product.bom || [])) {
              const refItem = inventory.find(i => i.id === bom.inventoryItemId);
              if (refItem) {
                 const { data: localItem } = await supabase.from('inventory')
                    .select('id, quantity')
                    .eq('name', refItem.name)
                    .eq('outletId', selectedOutletId)
                    .maybeSingle();

                 if (localItem) {
                    await supabase.from('inventory')
                       .update({ quantity: localItem.quantity - (bom.quantity * cartItem.quantity) })
                       .eq('id', localItem.id);
                 }
              }
           }
        }
        
        await supabase.from('transactions').insert([tx]);
        setCart([]);
        await fetchFromCloud(); 
      } finally { setIsSaving(false); }
    },
    addStaff: async (s) => { await supabase.from('staff').insert([s]); await fetchFromCloud(); },
    updateStaff: async (s) => { await supabase.from('staff').update(s).eq('id', s.id); await fetchFromCloud(); },
    deleteStaff: async (id) => { await supabase.from('staff').delete().eq('id', id); await fetchFromCloud(); },
    clockIn: async () => { 
       const today = getTodayDateString();
       const att = { 
         id: `att-${Date.now()}`, 
         staffId: currentUser?.id, 
         staffName: currentUser?.name, 
         outletId: selectedOutletId, 
         date: today, 
         clockIn: new Date().toISOString(), 
         status: 'PRESENT' 
       };
       const { error } = await supabase.from('attendance').insert([att]);
       if (error) return { success: false, message: error.message };
       await fetchFromCloud();
       return { success: true }; 
    },
    clockOut: async () => { 
       const active = attendance.find(a => a.staffId === currentUser?.id && !a.clockOut);
       if (active) {
          const now = new Date().toISOString();
          await supabase.from('attendance').update({ clockOut: now }).eq('id', active.id);
          await fetchFromCloud();
       }
    },
    addProduct: async (p) => { await supabase.from('products').insert([p]); await fetchFromCloud(); },
    updateProduct: async (p) => { await supabase.from('products').update(p).eq('id', p.id); await fetchFromCloud(); },
    deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); await fetchFromCloud(); },
    addInventoryItem: async (item, oids) => { 
       const items = (oids || [selectedOutletId]).map(oid => ({ ...item, id: `inv-${oid}-${Date.now()}`, outletId: oid }));
       await supabase.from('inventory').insert(items);
       await fetchFromCloud();
    },
    updateInventoryItem: async (i) => { await supabase.from('inventory').update(i).eq('id', i.id); await fetchFromCloud(); },
    deleteInventoryItem: async (id) => { await supabase.from('inventory').delete().eq('id', id); await fetchFromCloud(); },
    performClosing: async (c, n, o, s, cs, qs, ex, d) => { 
       const closing = { 
         id: `cl-${Date.now()}`, 
         outletId: selectedOutletId, 
         staffId: currentUser?.id, 
         staffName: currentUser?.name, 
         timestamp: new Date().toISOString(), 
         shiftName: s, 
         openingBalance: o, 
         totalSalesCash: cs, 
         totalSalesQRIS: qs, 
         totalExpenses: ex, 
         actualCash: c, 
         discrepancy: d, 
         notes: n, 
         status: 'PENDING' 
       };
       await supabase.from('daily_closings').insert([closing]);
       await fetchFromCloud();
    },
    addPurchase: async (p) => { 
       const purId = `pur-${Date.now()}`;
       const invItem = inventory.find(i => i.id === p.inventoryItemId);
       const pur = { 
         ...p, 
         id: purId, 
         outletId: selectedOutletId, 
         itemName: (invItem?.name || ''), 
         staffId: currentUser?.id, 
         staffName: currentUser?.name, 
         timestamp: new Date().toISOString(),
         totalPrice: p.totalPrice || p.unitPrice || 0 
       };
       
       const { data: latest } = await supabase.from('inventory').select('quantity').eq('id', p.inventoryItemId).maybeSingle();
       if (latest) await supabase.from('inventory').update({ quantity: latest.quantity + p.quantity }).eq('id', p.inventoryItemId);
       
       await supabase.from('purchases').insert([pur]);
       
       await supabase.from('expenses').insert([{ 
         id: `exp-auto-${purId}`, 
         outletId: selectedOutletId, 
         typeId: 'purchase-auto', 
         amount: pur.totalPrice, 
         notes: `Belanja ${pur.itemName} (${p.quantity} ${invItem?.unit || ''})`, 
         staffId: currentUser?.id, 
         staffName: currentUser?.name, 
         timestamp: new Date().toISOString() 
       }]);
       
       await fetchFromCloud();
    },
    selectCustomer: (id) => setSelectedCustomerId(id),
    addCustomer: async (c) => { await supabase.from('customers').insert([{...c, id: `cust-${Date.now()}`, registeredAt: new Date().toISOString()}]); await fetchFromCloud(); },
    updateCustomer: async (c) => { await supabase.from('customers').update(c).eq('id', c.id); await fetchFromCloud(); },
    deleteCustomer: async (id) => { await supabase.from('customers').delete().eq('id', id); await fetchFromCloud(); },
    processProduction: async (d) => { 
       setIsSaving(true);
       try {
          const prodId = `prod-${Date.now()}`;
          const rec = { 
            ...d, 
            id: prodId, 
            outletId: selectedOutletId, 
            timestamp: new Date().toISOString(), 
            staffId: currentUser?.id, 
            staffName: currentUser?.name
          };
          for (const comp of d.components) {
             const { data: latestMat } = await supabase.from('inventory').select('quantity').eq('id', comp.inventoryItemId).maybeSingle();
             if (latestMat) await supabase.from('inventory').update({ quantity: latestMat.quantity - comp.quantity }).eq('id', comp.inventoryItemId);
          }
          const { data: latestRes } = await supabase.from('inventory').select('quantity').eq('id', d.resultItemId).maybeSingle();
          if (latestRes) await supabase.from('inventory').update({ quantity: latestRes.quantity + d.resultQuantity }).eq('id', d.resultItemId);
          await supabase.from('production_records').insert([rec]);
          await fetchFromCloud(); 
       } finally { setIsSaving(false); }
    },
    syncToCloud: () => { fetchFromCloud(); },
    addExpense: async (e) => { 
       await supabase.from('expenses').insert([{
         ...e, 
         id: `exp-${Date.now()}`, 
         outletId: selectedOutletId, 
         staffId: currentUser?.id, 
         staffName: currentUser?.name, 
         timestamp: new Date().toISOString()
       }]); 
       await fetchFromCloud(); 
    },
    updateExpense: async (id, e) => { await supabase.from('expenses').update(e).eq('id', id); await fetchFromCloud(); },
    deleteExpense: async (id) => { await supabase.from('expenses').delete().eq('id', id); await fetchFromCloud(); },
    addExpenseType: async (n) => { await supabase.from('expense_types').insert([{id: `et-${Date.now()}`, name: n}]); await fetchFromCloud(); },
    updateExpenseType: async (id, n) => { await supabase.from('expense_types').update({name: n}).eq('id', id); await fetchFromCloud(); },
    deleteExpenseType: async (id) => { await supabase.from('expense_types').delete().eq('id', id); await fetchFromCloud(); },
    addCategory: async (n) => { await supabase.from('categories').insert([{ id: `cat-${Date.now()}`, name: n.toUpperCase(), sortOrder: categories.length }]); await fetchFromCloud(); },
    updateCategory: async (id, n) => { await supabase.from('categories').update({ name: n.toUpperCase() }).eq('id', id); await fetchFromCloud(); },
    deleteCategory: async (id) => { await supabase.from('categories').delete().eq('id', id); await fetchFromCloud(); },
    reorderCategories: async (newCats: Category[]) => {
      setIsSaving(true);
      try {
        const updates = newCats.map((c, idx) => ({ id: c.id, name: c.name, sortOrder: idx }));
        await supabase.from('categories').upsert(updates);
        await fetchFromCloud();
      } finally { setIsSaving(false); }
    },
    updateLeaveStatus: async (id, status) => { await supabase.from('leave_requests').update({ status }).eq('id', id); await fetchFromCloud(); },
    addOutlet: async (o) => { await supabase.from('outlets').insert([o]); await fetchFromCloud(); },
    updateOutlet: async (o) => { await supabase.from('outlets').update(o).eq('id', o.id); await fetchFromCloud(); },
    deleteOutlet: async (id) => { await supabase.from('outlets').delete().eq('id', id); await fetchFromCloud(); },
    
    transferStock: async (f, t, n, q) => { 
       setIsSaving(true);
       try {
          const trfId = `trf-${Date.now()}`;
          const fromName = outlets.find(o=>o.id===f)?.name || '';
          const toName = outlets.find(o=>o.id===t)?.name || '';
          const unit = inventory.find(i=>i.name===n)?.unit || '';

          // Menggunakan camelCase karena SQL User mendefinisikan dengan tanda kutip "fromOutletId"
          const dbPayload = { 
            id: trfId, 
            fromOutletId: f, 
            fromOutletName: fromName, 
            toOutletId: t, 
            toOutletName: toName, 
            itemName: n, 
            quantity: q, 
            unit,
            status: 'PENDING', 
            timestamp: new Date().toISOString(), 
            staffId: currentUser?.id, 
            staffName: currentUser?.name
          };
          await supabase.from('stock_transfers').insert([dbPayload]);

          const { data: senderItem } = await supabase.from('inventory')
            .select('id, quantity')
            .eq('name', n)
            .eq('outletId', f)
            .maybeSingle();

          if (senderItem) {
             await supabase.from('inventory').update({ quantity: senderItem.quantity - q }).eq('id', senderItem.id);
          }
          await fetchFromCloud();
       } finally { setIsSaving(false); }
    },
    respondToTransfer: async (id, status) => { 
       setIsSaving(true);
       try {
          const { data: trf } = await supabase.from('stock_transfers').select('*').eq('id', id).maybeSingle();
          if (!trf) return;

          const fId = trf.fromOutletId || trf.from_outlet_id;
          const tId = trf.toOutletId || trf.to_outlet_id;
          const name = trf.itemName || trf.item_name;
          const qty = trf.quantity;

          await supabase.from('stock_transfers').update({ status }).eq('id', id);

          if (status === 'ACCEPTED') {
             const { data: receiverItem } = await supabase.from('inventory')
               .select('id, quantity')
               .eq('name', name)
               .eq('outletId', tId)
               .maybeSingle();

             if (receiverItem) {
                await supabase.from('inventory').update({ quantity: receiverItem.quantity + qty }).eq('id', receiverItem.id);
             }
          } else if (status === 'REJECTED') {
             const { data: senderItem } = await supabase.from('inventory')
               .select('id, quantity')
               .eq('name', name)
               .eq('outletId', fId)
               .maybeSingle();

             if (senderItem) {
                await supabase.from('inventory').update({ quantity: senderItem.quantity + qty }).eq('id', senderItem.id);
             }
          }
          await fetchFromCloud();
       } finally { setIsSaving(false); }
    },
    updateLoyaltyConfig: async (config) => { await supabase.from('loyalty_config').upsert({ id: 'global', ...config }); setLoyaltyConfig(config); },
    addMembershipTier: async (t) => { await supabase.from('membership_tiers').insert([{id: `t-${Date.now()}`, ...t}]); await fetchFromCloud(); },
    updateMembershipTier: async (t) => { await supabase.from('membership_tiers').update(t).eq('id', t.id); await fetchFromCloud(); },
    deleteMembershipTier: async (id) => { await supabase.from('membership_tiers').delete().eq('id', id); await fetchFromCloud(); },
    addBulkDiscount: async (r) => { await supabase.from('bulk_discounts').insert([{id: `bd-${Date.now()}`, ...r}]); await fetchFromCloud(); },
    updateBulkDiscount: async (r) => { await supabase.from('bulk_discounts').update(r).eq('id', r.id); await fetchFromCloud(); },
    deleteBulkDiscount: async (id) => { await supabase.from('bulk_discounts').delete().eq('id', id); await fetchFromCloud(); },
    addWIPRecipe: async (r) => { await supabase.from('wip_recipes').insert([{id: `wr-${Date.now()}`, ...r}]); await fetchFromCloud(); },
    updateWIPRecipe: async (r) => { await supabase.from('wip_recipes').update(r).eq('id', r.id); await fetchFromCloud(); },
    deleteWIPRecipe: async (id) => { await supabase.from('wip_recipes').delete().eq('id', id); await fetchFromCloud(); },
    submitLeave: async (d) => { 
       const now = new Date().toISOString();
       const payload = {
         id: `lr-${Date.now()}`, 
         "staffId": currentUser?.id,      
         "staffName": currentUser?.name,  
         "startDate": d.startDate,        
         "endDate": d.endDate,            
         "reason": d.reason, 
         "requestedAt": now,              
         "status": 'PENDING',
         "outletId": selectedOutletId     
       };
       await supabase.from('leave_requests').insert([payload]); 
       await fetchFromCloud(); 
    },
    saveSimulation: async (s) => { await supabase.from('simulations').upsert(s); await fetchFromCloud(); },
    deleteSimulation: async (id) => { await supabase.from('simulations').delete().eq('id', id); await fetchFromCloud(); },
    resetOutletData: async (id) => { 
       const tables = ['transactions', 'expenses', 'attendance', 'purchases', 'production_records', 'stock_transfers', 'daily_closings', 'leave_requests'];
       
       // Pembersihan state lokal secara optimis dan instan agar UI bersih seketika
       setTransactions(prev => prev.filter(tx => (tx.outletId || (tx as any).outlet_id) !== id));
       setExpenses(prev => prev.filter(e => (e.outletId || (e as any).outlet_id) !== id));
       setAttendance(prev => prev.filter(a => (a.outletId || (a as any).outlet_id) !== id));
       setPurchases(prev => prev.filter(p => (p.outletId || (p as any).outlet_id) !== id));
       setProductionRecords(prev => prev.filter(pr => (pr.outletId || (pr as any).outlet_id) !== id));
       setStockTransfers(prev => prev.filter(st => (st.fromOutletId || (st as any).from_outlet_id) !== id && (st.toOutletId || (st as any).to_outlet_id) !== id));
       setDailyClosings(prev => prev.filter(dc => (dc.outletId || (dc as any).outlet_id) !== id));
       setLeaveRequests(prev => prev.filter(lr => (lr.outletId || (lr as any).outlet_id) !== id));

       for (const t of tables) {
          // Robust deletion handling for varying conventions
          await supabase.from(t).delete().eq('outletId', id);
          await supabase.from(t).delete().eq('outlet_id', id);
          await supabase.from(t).delete().eq('"outletId"', id); // Ensure double-quoted identifier case
          
          if (t === 'stock_transfers') {
             await supabase.from(t).delete().eq('fromOutletId', id);
             await supabase.from(t).delete().eq('toOutletId', id);
          }
       }
       await fetchFromCloud(); 
    },
    resetGlobalData: async () => { 
       const tables = ['transactions', 'expenses', 'attendance', 'purchases', 'production_records', 'stock_transfers', 'daily_closings', 'customers', 'leave_requests'];
       
       // Instant local state clearing
       setTransactions([]); setExpenses([]); setAttendance([]); setPurchases([]); setProductionRecords([]); setStockTransfers([]); setDailyClosings([]); setCustomers([]); setLeaveRequests([]);

       // Use the most absolute filter to empty tables in Supabase
       // Ini memastikan semua log cuti (leave_requests) hilang tanpa memandang filter kolom.
       for (const t of tables) {
          await supabase.from(t).delete().not('id', 'is', null); 
       }
       await fetchFromCloud(); 
    },
    exportDatabaseSQL: async () => {
       try {
          const tables = ['brand_config', 'loyalty_config', 'outlets', 'categories', 'membership_tiers', 'expense_types', 'staff', 'inventory', 'products', 'wip_recipes', 'bulk_discounts', 'simulations', 'transactions', 'expenses', 'purchases', 'production_records', 'attendance', 'leave_requests', 'daily_closings', 'stock_transfers', 'customers'];
          let sql = "-- MOZZA BOY SQL MIGRATION DUMP\n\n";
          for (const table of tables) {
            const { data } = await supabase.from(table).select('*');
            if (data && data.length > 0) {
              data.forEach(row => {
                const keys = Object.keys(row).map(k => `"${k}"`).join(', ');
                const vals = Object.values(row).map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ');
                sql += `INSERT INTO public.${table} (${keys}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${Object.keys(row).map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')};\n`;
              });
            }
          }
          const blob = new Blob([sql], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `Full_Dump_${Date.now()}.sql`;
          a.click();
       } catch (e) { alert("SQL Dump failed."); }
    },
    importSystemBackup: async (jsonString: string) => { 
       try {
          const data = JSON.parse(jsonString);
          for (const table in data) if (Array.isArray(data[table]) && data[table].length > 0) await supabase.from(table).upsert(data[table]);
          await fetchFromCloud();
          return { success: true, message: 'Restored!' };
       } catch (e) { return { success: false, message: 'Invalid JSON.' }; }
    },
    exportSystemBackup: async () => {
      try {
        const tables = ['brand_config', 'loyalty_config', 'outlets', 'categories', 'membership_tiers', 'expense_types', 'staff', 'inventory', 'products', 'wip_recipes', 'bulk_discounts', 'simulations', 'transactions', 'expenses', 'purchases', 'production_records', 'attendance', 'leave_requests', 'daily_closings', 'stock_transfers', 'customers'];
        const backup: any = {};
        for (const table of tables) {
          const { data } = await supabase.from(table).select('*');
          backup[table] = data || [];
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Backup_${Date.now()}.json`;
        a.click();
      } catch (e) { alert("JSON Backup failed."); }
    },
    setConnectedPrinter: (d) => setConnectedPrinter(d)
  };

  useEffect(() => { 
    fetchPublicConfig(); 
  }, []);

  useEffect(() => { if (isAuthenticated) fetchFromCloud(); }, [isAuthenticated]);
  const filteredTransactions = selectedOutletId === 'all' ? transactions : transactions.filter(tx => tx.outletId === selectedOutletId);

  return (
    <AppContext.Provider value={{ ...actions, products, categories, inventory, stockTransfers, stockRequests: [], productionRecords, wipRecipes, transactions, filteredTransactions, outlets, currentUser, isAuthenticated, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, brandConfig, isSaving, isInitialLoading, isFetching, cloudConfig, externalDbConfig }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
