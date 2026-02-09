
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Product, Category, InventoryItem, Transaction, Outlet, 
  CartItem, PaymentMethod, OrderStatus, UserRole, StaffMember, Permissions,
  Customer, Expense, ExpenseType, DailyClosing, Purchase, StockTransfer, StockRequest,
  MembershipTier, BulkDiscountRule, InventoryItemType, ProductionRecord, Attendance, LeaveRequest,
  MenuSimulation, LoyaltyConfig, WIPRecipe, BrandConfig
} from './types';
import { OUTLETS, INITIAL_STAFF } from './constants';

const STORAGE_USER_KEY = 'foodos_session_user';
const STORAGE_OUTLET_KEY = 'foodos_active_outlet';
const STORAGE_MANIFEST_KEY = 'mozzaboy_system_cache_vFinal_Fixed'; 
const STORAGE_CLOUD_CONFIG = 'mozzaboy_cloud_config';

export const getCloudConfig = () => {
  const saved = localStorage.getItem(STORAGE_CLOUD_CONFIG);
  return saved ? JSON.parse(saved) : { url: 'https://qpawptimafvxhppeuqel.supabase.co', key: 'sb_publishable_Kaye1xn88d9J_S9A32t4AA_e2ZIz2Az' };
};

let { url: initialUrl, key: initialKey } = getCloudConfig();
let supabase = createClient(initialUrl, initialKey);

const getSyncCache = () => {
  try {
    const cached = localStorage.getItem(STORAGE_MANIFEST_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        products: parsed.products || [],
        categories: parsed.categories || [],
        outlets: parsed.outlets || OUTLETS,
        brandConfig: parsed.brandConfig || null,
        loyaltyConfig: parsed.loyaltyConfig || null
      };
    }
    return {};
  } catch (e) { return {}; }
};

const initialCache = getSyncCache();
export const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

export const getPermissionsByRole = (role: UserRole): Permissions => {
  const isAdmin = role === UserRole.OWNER || role === UserRole.MANAGER;
  return {
    canAccessReports: isAdmin, canManageStaff: isAdmin, canManageMenu: isAdmin,
    canManageInventory: true, canProcessSales: true, canVoidTransactions: isAdmin, canManageSettings: isAdmin,
  };
};

interface AppState {
  products: Product[]; categories: Category[]; inventory: InventoryItem[]; stockTransfers: StockTransfer[]; stockRequests: StockRequest[]; productionRecords: ProductionRecord[]; wipRecipes: WIPRecipe[]; transactions: Transaction[]; filteredTransactions: Transaction[]; outlets: Outlet[]; currentUser: StaffMember | null; isAuthenticated: boolean; loginTime: Date | null; cart: CartItem[]; staff: StaffMember[]; attendance: Attendance[]; leaveRequests: LeaveRequest[]; selectedOutletId: string; customers: Customer[]; selectedCustomerId: string | null; expenses: Expense[]; expenseTypes: ExpenseType[]; dailyClosings: DailyClosing[]; purchases: Purchase[]; connectedPrinter: any | null; membershipTiers: MembershipTier[]; bulkDiscounts: BulkDiscountRule[]; simulations: MenuSimulation[]; loyaltyConfig: LoyaltyConfig; brandConfig: BrandConfig; isSaving: boolean; isInitialLoading: boolean; isFetching: boolean; assetsOptimized: boolean; isDbConnected: boolean; cloudConfig: {url: string, key: string};
}

interface AppActions {
  updateCloudConfig: (url: string, key: string) => void; login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>; logout: () => void; clearSession: () => void; switchOutlet: (id: string) => void; addToCart: (product: Product) => void; removeFromCart: (productId: string) => void; updateCartQuantity: (productId: string, delta: number) => void; clearCart: () => void; checkout: (paymentMethod: PaymentMethod, redeemPoints?: number, membershipDiscount?: number, bulkDiscount?: number) => Promise<void>; addStaff: (member: StaffMember) => Promise<void>; updateStaff: (member: StaffMember) => Promise<void>; deleteStaff: (id: string) => Promise<void>; clockIn: (lat?: number, lng?: number, notes?: string) => Promise<{ success: boolean; message?: string }>; clockOut: () => Promise<void>; submitLeave: (leave: any) => Promise<void>; updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>; addProduct: (product: Product) => Promise<void>; updateProduct: (product: Product) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addInventoryItem: (item: any, outletIds?: string[]) => Promise<void>; updateInventoryItem: (item: InventoryItem) => Promise<void>; deleteInventoryItem: (id: string) => Promise<void>; performClosing: (actualCash: number, notes: string, openingBalance: number, shiftName: string, cashSales: number, qrisSales: number, totalExpenses: number, discrepancy: number) => Promise<void>; addPurchase: (purchase: { inventoryItemId: string; quantity: number; unitPrice: number; requestId?: string }) => Promise<void>; selectCustomer: (id: string | null) => void; addCustomer: (customer: any) => Promise<void>; updateCustomer: (customer: Customer) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; addOutlet: (outlet: Outlet) => Promise<void>; updateOutlet: (outlet: Outlet) => Promise<void>; deleteOutlet: (id: string) => Promise<void>; setConnectedPrinter: (device: any) => void; processProduction: (data: { resultItemId: string; resultQuantity: number; components: { inventoryItemId: string; quantity: number }[] }) => Promise<void>; addWIPRecipe: (recipe: Omit<WIPRecipe, 'id'>) => Promise<void>; updateWIPRecipe: (recipe: WIPRecipe) => Promise<void>; deleteWIPRecipe: (id: string) => Promise<void>; transferStock: (from: string, to: string, item: string, qty: number) => Promise<void>; respondToTransfer: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>; addMembershipTier: (tier: any) => Promise<void>; updateMembershipTier: (tier: any) => Promise<void>; deleteMembershipTier: (id: string) => Promise<void>; addBulkDiscount: (rule: any) => Promise<void>; updateBulkDiscount: (rule: any) => Promise<void>; deleteBulkDiscount: (id: string) => Promise<void>; saveSimulation: (sim: MenuSimulation) => Promise<void>; deleteSimulation: (id: string) => Promise<void>; updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>; updateBrandConfig: (config: BrandConfig) => Promise<void>; resetOutletData: (outletId: string) => Promise<void>; voidTransaction: (txId: string) => Promise<void>; fetchFromCloud: () => Promise<void>; resetGlobalData: () => Promise<void>; resetAttendanceLogs: () => Promise<void>; syncToCloud: () => void; exportTableToCSV: (tableName: string) => void; exportSystemBackup: () => Promise<void>; importSystemBackup: (jsonString: string) => Promise<{ success: boolean; message: string }>; addExpense: (expense: any) => Promise<void>; updateExpense: (id: string, expense: any) => Promise<void>; deleteExpense: (id: string) => Promise<void>; addExpenseType: (name: string) => Promise<void>; updateExpenseType: (id: string, name: string) => Promise<void>; deleteExpenseType: (id: string) => Promise<void>; addCategory: (name: string) => Promise<void>; updateCategory: (id: string, name: string) => Promise<void>; deleteCategory: (id: string) => Promise<void>; reorderCategories: (categories: Category[]) => Promise<void>;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

const hydrateDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(hydrateDates);
  const newObj: any = {};
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      newObj[key] = isNaN(d.getTime()) ? val : d;
    } else {
      newObj[key] = val;
    }
  }
  return newObj;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!currentUser);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assetsOptimized, setAssetsOptimized] = useState(true);
  const [cloudConfig, setCloudConfig] = useState(getCloudConfig());

  // Data States
  const [products, setProducts] = useState<Product[]>(initialCache.products || []);
  const [categories, setCategories] = useState<Category[]>(initialCache.categories || []);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>(initialCache.outlets || OUTLETS);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [wipRecipes, setWipRecipes] = useState<WIPRecipe[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscountRule[]>([]);
  const [simulations, setSimulations] = useState<MenuSimulation[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(initialCache.loyaltyConfig || { isEnabled: true, earningAmountPerPoint: 1000, redemptionValuePerPoint: 100, minRedeemPoints: 50 });
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(initialCache.brandConfig || { name: 'Mozza Boy', tagline: 'Premium Korean Street Food', logoUrl: '', primaryColor: '#f97316' });

  const [selectedOutletId, setSelectedOutletId] = useState<string>(localStorage.getItem(STORAGE_OUTLET_KEY) || 'all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<any | null>(null);

  const updateManifestCache = (updates: any) => {
    try {
      const current = getSyncCache();
      const { transactions, expenses, attendance, leave_requests, daily_closings, ...safeUpdates } = updates;
      const next = { ...current, ...safeUpdates };
      localStorage.setItem(STORAGE_MANIFEST_KEY, JSON.stringify(next));
    } catch (e) {
      localStorage.removeItem(STORAGE_MANIFEST_KEY);
    }
  };

  const actions: AppActions = {
    fetchFromCloud: async () => {
      if (isSaving || isFetching) return;
      setIsFetching(true);
      try {
        const [brand, loyalty, staffData, outletsData, cats, prods, inv, wip, mt, bd, sim, etypes] = await Promise.all([
          supabase.from('brand_config').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('staff').select('*'),
          supabase.from('outlets').select('*'),
          supabase.from('categories').select('*').order('sortOrder'),
          supabase.from('products').select('*'),
          supabase.from('inventory').select('*'),
          supabase.from('wip_recipes').select('*'),
          supabase.from('membership_tiers').select('*'),
          supabase.from('bulk_discounts').select('*'),
          supabase.from('simulations').select('*'),
          supabase.from('expense_types').select('*'),
        ]);
        
        if (isSaving) return;

        if (brand.data) setBrandConfig(hydrateDates(brand.data));
        if (loyalty.data) setLoyaltyConfig(hydrateDates(loyalty.data));
        if (staffData.data) setStaff(hydrateDates(staffData.data));
        if (outletsData.data) setOutlets(hydrateDates(outletsData.data));
        if (cats.data) setCategories(hydrateDates(cats.data));
        if (prods.data) setProducts(hydrateDates(prods.data));
        if (inv.data) setInventory(hydrateDates(inv.data));
        if (wip.data) setWipRecipes(hydrateDates(wip.data));
        if (mt.data) setMembershipTiers(hydrateDates(mt.data));
        if (bd.data) setBulkDiscounts(hydrateDates(bd.data));
        if (sim.data) setSimulations(hydrateDates(sim.data));
        if (etypes.data) setExpenseTypes(hydrateDates(etypes.data));
        
        const { data: trx } = await supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(100);
        if (trx) setTransactions(hydrateDates(trx));
        const { data: exp } = await supabase.from('expenses').select('*').order('timestamp', { ascending: false }).limit(50);
        if (exp) setExpenses(hydrateDates(exp));
        const { data: att } = await supabase.from('attendance').select('*').order('clockIn', { ascending: false }).limit(100);
        if (att) setAttendance(hydrateDates(att));
        const { data: cls } = await supabase.from('daily_closings').select('*').order('timestamp', { ascending: false }).limit(30);
        if (cls) setDailyClosings(hydrateDates(cls));
        
        updateManifestCache({
          products: prods.data, categories: cats.data, outlets: outletsData.data, brandConfig: brand.data
        });
      } catch (e) {
        console.error("Cloud Fetch Fault:", e);
      } finally { 
        setIsFetching(false); 
      }
    },
    updateCloudConfig: (url, key) => {
        localStorage.setItem(STORAGE_CLOUD_CONFIG, JSON.stringify({ url, key }));
        setCloudConfig({ url, key });
        supabase = createClient(url, key);
        actions.fetchFromCloud();
    },
    login: async (username, password) => {
      const { data } = await supabase.from('staff').select('*').eq('username', username).eq('password', password).maybeSingle();
      if (data) {
          const mapped = hydrateDates(data) as StaffMember;
          setCurrentUser(mapped); 
          setIsAuthenticated(true);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mapped));
          
          if (mapped.role !== UserRole.OWNER && mapped.role !== UserRole.MANAGER) {
              const firstAllowed = mapped.assignedOutletIds[0] || 'none';
              actions.switchOutlet(firstAllowed);
          }
          
          return { success: true };
      }
      return { success: false, message: "Username atau Password salah." };
    },
    logout: () => { 
      setIsAuthenticated(false); 
      setCurrentUser(null); 
      localStorage.removeItem(STORAGE_USER_KEY); 
      localStorage.removeItem('mozzaboy_last_clockin');
    },
    clearSession: () => { localStorage.clear(); window.location.reload(); },
    switchOutlet: (id) => { 
      if (currentUser && currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.MANAGER) {
          if (!currentUser.assignedOutletIds.includes(id)) {
              console.warn("Unauthorized outlet switch attempt blocked.");
              return; 
          }
      }
      setSelectedOutletId(id); 
      localStorage.setItem(STORAGE_OUTLET_KEY, id); 
    },
    addToCart: (p) => setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    }),
    updateCartQuantity: (pid, delta) => setCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)),
    removeFromCart: (pid) => setCart(prev => prev.filter(i => i.product.id !== pid)),
    clearCart: () => setCart([]),
    checkout: async (method, redeem = 0, memberDisc = 0, bulkDisc = 0) => {
      setIsSaving(true);
      try {
        const sub = cart.reduce((s,i) => s + ((i.product.outletSettings?.[selectedOutletId]?.price || i.product.price) * i.quantity), 0);
        const txPayload = { 
          id: `TX-${Date.now()}`, outletId: selectedOutletId, customerId: selectedCustomerId, items: cart, 
          subtotal: sub, total: sub - redeem - memberDisc - bulkDisc, paymentMethod: method, 
          status: OrderStatus.CLOSED, timestamp: new Date().toISOString(), cashierId: currentUser?.id, 
          cashierName: currentUser?.name 
        };
        setTransactions(prev => [hydrateDates(txPayload), ...prev]);
        setCart([]); 
        await supabase.from('transactions').insert(txPayload);
      } finally { setIsSaving(false); }
    },
    clockIn: async () => {
      const today = getTodayDateString();
      const payload = { 
        id: `att-${Date.now()}`, 
        staffId: currentUser?.id, 
        staffName: currentUser?.name, 
        date: today, 
        clockIn: new Date().toISOString(), 
        status: 'PRESENT', 
        outletId: selectedOutletId 
      };
      
      localStorage.setItem('mozzaboy_last_clockin', JSON.stringify({
        date: today,
        staffId: currentUser?.id,
        outletId: selectedOutletId,
        timestamp: Date.now()
      }));

      setAttendance(prev => [hydrateDates(payload), ...prev]);
      supabase.from('attendance').insert(payload).then(() => {
          console.debug("Clock-in synced with cloud.");
      });
      return { success: true };
    },
    clockOut: async () => {
      const active = attendance.find(a => a.staffId === currentUser?.id && !a.clockOut);
      if (active) {
        setAttendance(prev => prev.map(a => a.id === active.id ? { ...a, clockOut: new Date() } : a));
        await supabase.from('attendance').update({ clockOut: new Date().toISOString() }).eq('id', active.id);
        localStorage.removeItem('mozzaboy_last_clockin');
      }
    },
    addStaff: async (s) => { setStaff(prev => [...prev, s]); await supabase.from('staff').insert(s); },
    updateStaff: async (s) => { 
        setStaff(prev => prev.map(m => m.id === s.id ? s : m)); 
        if (currentUser?.id === s.id) {
            setCurrentUser(s);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(s));
        }
        await supabase.from('staff').update(s).eq('id', s.id); 
    },
    deleteStaff: async (id) => { setStaff(prev => prev.filter(m => m.id !== id)); await supabase.from('staff').delete().eq('id', id); },
    addProduct: async (p) => { setProducts(prev => [...prev, p]); await supabase.from('products').insert(p); },
    updateProduct: async (p) => { setProducts(prev => prev.map(m => m.id === p.id ? p : m)); await supabase.from('products').update(p).eq('id', p.id); },
    deleteProduct: async (id) => { setProducts(prev => prev.filter(m => m.id !== id)); await supabase.from('products').delete().eq('id', id); },
    addInventoryItem: async (i, oids = []) => { 
      const payloads = oids.map(oid => ({ ...i, id: `inv-${oid}-${Date.now()}`, outletId: oid })); 
      setInventory(prev => [...prev, ...payloads]); await supabase.from('inventory').insert(payloads); 
    },
    updateInventoryItem: async (i) => { setInventory(prev => prev.map(m => m.id === i.id ? i : m)); await supabase.from('inventory').update(i).eq('id', i.id); },
    deleteInventoryItem: async (id) => { setInventory(prev => prev.filter(m => m.id !== id)); await supabase.from('inventory').delete().eq('id', id); },
    performClosing: async (cash, notes, opening, shift, cashSales, qrisSales, expenses, discrepancy) => {
      const payload = { 
        id: `CLS-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser?.id, staffName: currentUser?.name, timestamp: new Date().toISOString(), 
        actualCash: cash, notes, openingBalance: opening, shiftName: shift, status: 'APPROVED', 
        totalSalesCash: cashSales, totalSalesQRIS: qrisSales, totalExpenses: expenses, discrepancy: discrepancy
      };
      setDailyClosings(prev => [hydrateDates(payload), ...prev]);
      await supabase.from('daily_closings').insert(payload);
    },
    addPurchase: async (p) => { 
      const item = inventory.find(inv => inv.id === p.inventoryItemId); if (!item) return;
      const now = new Date().toISOString();
      const purchasePayload = { 
        ...p, 
        id: `pur-${Date.now()}`, 
        timestamp: now, 
        outletId: selectedOutletId, 
        staffId: currentUser?.id, 
        staffName: currentUser?.name, 
        totalPrice: p.unitPrice, 
        itemName: item.name 
      };

      // OTOMATIS TAMBAH KE PENGELUARAN (EXPENSES)
      const autoExpense = {
        id: `exp-auto-${Date.now()}`,
        outletId: selectedOutletId,
        typeId: 'purchase-auto', // Flag khusus untuk belanja stok
        amount: p.unitPrice, // unitPrice di form PurchaseManagement sebenarnya adalah TOTAL NOMINAL NOTA
        notes: `Belanja ${item.name} (${p.quantity} ${item.unit})`,
        staffId: currentUser?.id,
        staffName: currentUser?.name,
        timestamp: now
      };

      setPurchases(prev => [hydrateDates(purchasePayload), ...prev]);
      setExpenses(prev => [hydrateDates(autoExpense), ...prev]);
      setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, quantity: inv.quantity + p.quantity } : inv)); 
      
      // Fix: Use any[] to avoid deep type instantiation errors with Supabase builders
      await Promise.all([
        supabase.from('purchases').insert(purchasePayload),
        supabase.from('expenses').insert(autoExpense),
        supabase.from('inventory').update({ quantity: item.quantity + p.quantity }).eq('id', item.id)
      ] as any[]);
    },
    addCustomer: async (c) => {
      const payload = { ...c, id: `cust-${Date.now()}`, points: 0, registeredAt: new Date().toISOString(), registeredByStaffId: currentUser?.id, registeredByStaffName: currentUser?.name, registeredAtOutletId: selectedOutletId };
      setCustomers(prev => [...prev, hydrateDates(payload)]); await supabase.from('customers').insert(payload);
    },
    updateCustomer: async (c) => { setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust)); await supabase.from('customers').update(c).eq('id', c.id); },
    deleteCustomer: async (id) => { setCustomers(prev => prev.filter(cust => cust.id !== id)); await supabase.from('customers').delete().eq('id', id); },
    addOutlet: async (o) => { setOutlets(prev => [...prev, o]); await supabase.from('outlets').insert(o); },
    updateOutlet: async (o) => { setOutlets(prev => prev.map(out => out.id === o.id ? o : out)); await supabase.from('outlets').update(o).eq('id', o.id); },
    deleteOutlet: async (id) => { setOutlets(prev => prev.filter(out => out.id !== id)); await supabase.from('outlets').delete().eq('id', id); },
    processProduction: async (data) => {
      setIsSaving(true);
      try {
        const payload = { ...data, id: `prod-${Date.now()}`, timestamp: new Date().toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId };
        
        // 1. UPDATE LOKAL ATOMIK (SUMBER KEBENARAN UTAMA)
        let updatedInventory: InventoryItem[] = [];
        setInventory(prevInventory => {
          updatedInventory = prevInventory.map(inv => {
            if (inv.id === data.resultItemId) { return { ...inv, quantity: inv.quantity + data.resultQuantity }; }
            const comp = data.components.find(c => c.inventoryItemId === inv.id);
            if (comp) { return { ...inv, quantity: inv.quantity - comp.quantity }; }
            return inv;
          });
          return updatedInventory;
        });

        setProductionRecords(prev => [hydrateDates(payload), ...prev]);
        
        // 2. SINKRONISASI KE CLOUD SECARA PARALEL (SANGAT CEPAT)
        // Fix: Use any[] to avoid builder type mismatch and excessively deep instantiation errors
        const updates: any[] = [supabase.from('production_records').insert(payload)];
        
        const resultItem = inventory.find(i => i.id === data.resultItemId);
        if (resultItem) {
           updates.push(supabase.from('inventory').update({ quantity: resultItem.quantity + data.resultQuantity }).eq('id', resultItem.id));
        }
        
        for (const comp of data.components) {
          const compItem = inventory.find(i => i.id === comp.inventoryItemId);
          if (compItem) {
             updates.push(supabase.from('inventory').update({ quantity: compItem.quantity - comp.quantity }).eq('id', compItem.id));
          }
        }
        
        await Promise.all(updates);
        console.debug("Production sync complete.");
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    },
    addWIPRecipe: async (recipe) => {
      const payload = { ...recipe, id: `wip-${Date.now()}` };
      setWipRecipes(prev => [...prev, payload as WIPRecipe]); await supabase.from('wip_recipes').insert(payload);
    },
    updateWIPRecipe: async (recipe) => { setWipRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r)); await supabase.from('wip_recipes').update(recipe).eq('id', recipe.id); },
    deleteWIPRecipe: async (id) => { setWipRecipes(prev => prev.filter(r => r.id !== id)); await supabase.from('wip_recipes').delete().eq('id', id); },
    transferStock: async (fromId, toId, itemName, qty) => {
      const payload: StockTransfer = {
        id: `trf-${Date.now()}`, fromOutletId: fromId, fromOutletName: outlets.find(o => o.id === fromId)?.name || 'Unknown',
        toOutletId: toId, toOutletName: outlets.find(o => o.id === toId)?.name || 'Unknown',
        itemName, quantity: qty, unit: inventory.find(i => i.name === itemName && i.outletId === fromId)?.unit || 'unit',
        status: 'PENDING', timestamp: new Date(), staffId: currentUser?.id || '', staffName: currentUser?.name || ''
      };
      setStockTransfers(prev => [payload, ...prev]); await supabase.from('stock_transfers').insert(payload);
    },
    respondToTransfer: async (id, status) => {
      const trf = stockTransfers.find(t => t.id === id); if (!trf) return;
      setStockTransfers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      if (status === 'ACCEPTED') {
         const fromItem = inventory.find(i => i.name === trf.itemName && i.outletId === trf.fromOutletId);
         const toItem = inventory.find(i => i.name === trf.itemName && i.outletId === trf.toOutletId);
         if (fromItem && toItem) {
           setInventory(prev => prev.map(inv => {
              if (inv.id === fromItem.id) return { ...inv, quantity: inv.quantity - trf.quantity };
              if (inv.id === toItem.id) return { ...inv, quantity: inv.quantity + trf.quantity };
              return inv;
           })); 
           // Fix: Use any[] to avoid builder type mismatch in Promise.all
           await Promise.all([
             supabase.from('inventory').update({ quantity: fromItem.quantity - trf.quantity }).eq('id', fromItem.id), 
             supabase.from('inventory').update({ quantity: toItem.quantity + trf.quantity }).eq('id', toItem.id)
           ] as any[]);
         }
      }
      await supabase.from('stock_transfers').update({ status }).eq('id', id);
    },
    saveSimulation: async (sim) => {
      setSimulations(prev => {
        if (prev.find(s => s.id === sim.id)) return prev.map(s => s.id === sim.id ? sim : s);
        return [...prev, sim];
      });
      await supabase.from('simulations').upsert(sim);
    },
    deleteSimulation: async (id) => { setSimulations(prev => prev.filter(s => s.id !== id)); await supabase.from('simulations').delete().eq('id', id); },
    updateLoyaltyConfig: async (c) => { setLoyaltyConfig(c); await supabase.from('loyalty_config').upsert({ ...c, id: 'global' }); },
    updateBrandConfig: async (c) => { 
      const finalConfig = { ...c };
      setBrandConfig(finalConfig); 
      updateManifestCache({ brandConfig: finalConfig });
      await supabase.from('brand_config').upsert({ ...finalConfig, id: 'global' }); 
    },
    addExpense: async (expense) => {
      const payload = { ...expense, id: `exp-${Date.now()}`, timestamp: new Date().toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId };
      setExpenses(prev => [hydrateDates(payload), ...prev]); await supabase.from('expenses').insert(payload);
    },
    updateExpense: async (id, expense) => { setExpenses(expenses.map(e => e.id === id ? { ...e, ...expense } : e)); await supabase.from('expenses').update(expense).eq('id', id); },
    deleteExpense: async (id) => { setExpenses(expenses.filter(e => e.id !== id)); await supabase.from('expenses').delete().eq('id', id); },
    addExpenseType: async (name) => {
      const payload = { id: `et-${Date.now()}`, name };
      setExpenseTypes(prev => [...prev, payload]); await supabase.from('expense_types').insert(payload);
    },
    updateExpenseType: async (id, name) => { setExpenseTypes(prev => prev.map(t => t.id === id ? { ...t, name } : t)); await supabase.from('expense_types').update({ name }).eq('id', id); },
    deleteExpenseType: async (id) => { setExpenseTypes(prev => prev.filter(t => t.id !== id)); await supabase.from('expense_types').delete().eq('id', id); },
    addCategory: async (name) => {
      const payload = { id: `cat-${Date.now()}`, name, sortOrder: categories.length };
      setCategories(prev => [...prev, payload]); await supabase.from('categories').insert(payload);
    },
    updateCategory: async (id, name) => {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
      await supabase.from('categories').update({ name }).eq('id', id);
    },
    deleteCategory: async (id) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      await supabase.from('categories').delete().eq('id', id);
    },
    reorderCategories: async (newCats) => {
      setCategories([...newCats]); 
      await Promise.all(newCats.map((c, idx) => supabase.from('categories').update({ sortOrder: idx }).eq('id', c.id)));
    },
    submitLeave: async (leave) => {
      const payload = { ...leave, id: `lv-${Date.now()}`, staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId, status: 'PENDING', requestedAt: new Date().toISOString() };
      setLeaveRequests(prev => [hydrateDates(payload), ...prev]); await supabase.from('leave_requests').insert(payload);
    },
    updateLeaveStatus: async (id, status) => { setLeaveRequests(leaveRequests.map(l => l.id === id ? { ...l, status } : l)); await supabase.from('leave_requests').update({ status }).eq('id', id); },
    resetOutletData: async (oid) => { 
        // 1. STATE CLEAR SEGERA (Hanya Log Operasional, Amankan Kategori & Master)
        setTransactions(prev => prev.filter(t => t.outletId !== oid)); 
        setAttendance(prev => prev.filter(a => a.outletId !== oid));
        setExpenses(prev => prev.filter(e => e.outletId !== oid));
        setPurchases(prev => prev.filter(p => p.outletId !== oid));
        setDailyClosings(prev => prev.filter(c => c.outletId !== oid));
        
        // 2. BERSIHKAN LOKAL GUARD AGAR TOMBOL ABSEN MASUK MUNCUL
        const savedGuard = localStorage.getItem('mozzaboy_last_clockin');
        if (savedGuard) {
            try {
                const guard = JSON.parse(savedGuard);
                if (guard.outletId === oid) localStorage.removeItem('mozzaboy_last_clockin');
            } catch(e) {}
        }

        // 3. EXECUTE CLOUD DELETE DENGAN FILTER EKSPLISIT (Note: Menghapus dari 'expenses' bukan 'expense_types')
        try {
            // Fix: Cast to any[] to avoid excessively deep type instantiation errors with Supabase builders
            await Promise.all([
                supabase.from('transactions').delete().eq('outletId', oid),
                supabase.from('attendance').delete().eq('outletId', oid),
                supabase.from('expenses').delete().eq('outletId', oid),
                supabase.from('purchases').delete().eq('outletId', oid),
                supabase.from('daily_closings').delete().eq('outletId', oid)
            ] as any[]);
            console.debug(`Cloud operational data wiped for outlet ${oid}. Categories and Master records are safe.`);
        } catch (err) {
            console.error("Cloud Wipe Error:", err);
        }
    },
    voidTransaction: async (txId) => { setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: OrderStatus.VOIDED } : t)); await supabase.from('transactions').update({ status: OrderStatus.VOIDED }).eq('id', txId); },
    resetGlobalData: async () => { 
        // Hanya menghapus log operasional global, mengamankan expense_types & categories
        setTransactions([]); setExpenses([]); setAttendance([]); setPurchases([]); setDailyClosings([]);
        localStorage.removeItem('mozzaboy_last_clockin');
        try {
            // Fix: Cast to any[] to avoid excessively deep type instantiation errors with Supabase builders
            await Promise.all([
                supabase.from('transactions').delete().neq('id', 'force_delete_safe'), 
                supabase.from('expenses').delete().neq('id', 'force_delete_safe'),
                supabase.from('attendance').delete().neq('id', 'force_delete_safe'),
                supabase.from('purchases').delete().neq('id', 'force_delete_safe'),
                supabase.from('daily_closings').delete().neq('id', 'force_delete_safe')
            ] as any[]);
        } catch (err) { console.error("Global Wipe Error:", err); }
    },
    resetAttendanceLogs: async () => { 
      setAttendance([]); 
      localStorage.removeItem('mozzaboy_last_clockin');
      await supabase.from('attendance').delete().neq('id', 'void_safe'); 
    },
    syncToCloud: () => actions.fetchFromCloud(), selectCustomer: setSelectedCustomerId, setConnectedPrinter, exportTableToCSV: (tableName) => {
        let data: any[] = [];
        let headers: string[] = [];
        if (tableName === 'products') {
            headers = ['ID', 'Nama', 'Kategori', 'Harga Default', 'Status'];
            data = products.map(p => [p.id, p.name, categories.find(c => c.id === p.categoryId)?.name || '', p.price, p.isAvailable ? 'AKTIF' : 'OFF']);
        } else if (tableName === 'inventory') {
            headers = ['ID', 'Outlet', 'Nama Bahan', 'Satuan', 'Stok', 'Min Stok', 'HPP'];
            data = inventory.map(i => [i.id, outlets.find(o => o.id === i.outletId)?.name || i.outletId, i.name, i.unit, i.quantity, i.minStock, i.costPerUnit]);
        } else if (tableName === 'staff') {
            headers = ['ID', 'Nama', 'Username', 'Role', 'Status', 'Gaji Target', 'Hari Kerja'];
            data = staff.map(s => [
                s.id, 
                s.name, 
                s.username, 
                s.role, 
                s.status, 
                s.dailySalesTarget, 
                (s.workingDays || []).join('|')
            ]);
        } else if (tableName === 'categories') {
            headers = ['ID', 'Nama Kategori'];
            data = categories.map(c => [c.id, c.name]);
        } else if (tableName === 'outlets') {
            headers = ['ID', 'Nama Cabang', 'Alamat', 'Jam Buka', 'Jam Tutup'];
            data = outlets.map(o => [o.id, o.name, o.address, o.openTime, o.closeTime]);
        } else if (tableName === 'recipes') {
            headers = ['ID Produk', 'Nama Menu', 'ID Bahan/Sub-Menu', 'Nama Bahan/Sub-Menu', 'Takaran', 'Unit'];
            products.forEach(p => {
                if (p.isCombo) {
                    (p.comboItems || []).forEach(ci => {
                        const subP = products.find(sp => sp.id === ci.productId);
                        data.push([p.id, p.name, ci.productId, subP?.name || 'Unknown', ci.quantity, 'Unit']);
                    });
                } else {
                    (p.bom || []).forEach(b => {
                        const inv = inventory.find(i => i.id === b.inventoryItemId);
                        data.push([p.id, p.name, b.inventoryItemId, inv?.name || 'Unknown', b.quantity, inv?.unit || '']);
                    });
                }
            });
        }
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + data.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Master_${tableName}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, exportSystemBackup: async () => {
        const payload = {
          products, categories, outlets, staff, wipRecipes, loyaltyConfig, brandConfig, expenseTypes,
          timestamp: new Date().toISOString(), version: '2.5.0'
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
        const link = document.createElement('a');
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `MozzaBoy_Backup_${new Date().toISOString()}.json`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }, importSystemBackup: async (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          // Fix: Cast to any[] to avoid excessively deep type instantiation errors with Supabase builders
          await Promise.all([
             supabase.from('products').upsert(data.products),
             supabase.from('categories').upsert(data.categories),
             supabase.from('outlets').upsert(data.outlets),
             supabase.from('staff').upsert(data.staff),
             supabase.from('wip_recipes').upsert(data.wipRecipes),
             supabase.from('expense_types').upsert(data.expenseTypes || []),
             supabase.from('brand_config').upsert({ ...data.brandConfig, id: 'global' }),
             supabase.from('loyalty_config').upsert({ ...data.loyaltyConfig, id: 'global' })
          ] as any[]);
          actions.fetchFromCloud();
          return { success: true, message: 'Restore Data Berhasil! ✨' };
        } catch (e) {
          return { success: false, message: 'File backup tidak valid.' };
        }
    }, addMembershipTier: async () => {}, updateMembershipTier: async () => {}, deleteMembershipTier: async () => {}, addBulkDiscount: async () => {}, updateBulkDiscount: async () => {}, deleteBulkDiscount: async () => {}
  };

  useEffect(() => {
    actions.fetchFromCloud();
  }, []);

  const filteredTransactions = selectedOutletId === 'all' ? transactions : transactions.filter(tx => tx.outletId === selectedOutletId);

  return (
    <AppContext.Provider value={{ ...actions, products, categories, inventory, stockTransfers, stockRequests, productionRecords, wipRecipes, transactions, filteredTransactions, outlets, currentUser, isAuthenticated, loginTime: null, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, brandConfig, isSaving, isInitialLoading, isFetching, assetsOptimized, isDbConnected: true, cloudConfig }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
