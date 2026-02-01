
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Product, Category, InventoryItem, Transaction, Outlet, 
  CartItem, PaymentMethod, OrderStatus, UserRole, StaffMember, Permissions,
  Customer, Expense, ExpenseType, DailyClosing, Purchase, StockTransfer, StockRequest, RequestStatus,
  MembershipTier, BulkDiscountRule, InventoryItemType, ProductionRecord, Attendance, LeaveRequest,
  MenuSimulation, LoyaltyConfig, WIPRecipe
} from './types';
import { PRODUCTS, CATEGORIES, INVENTORY_ITEMS, OUTLETS, INITIAL_STAFF } from './constants';

const DEFAULT_SUPABASE_URL = 'https://qpawptimafvxhppeuqel.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwYXdwdGltYWZ2eGhwcGV1cWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTkxMDAsImV4cCI6MjA4NTM3NTEwMH0.DJPEQFZAdDIw8W167w8BmyAX2g8KAkKKnQI9Y06oxtw';

export const getPermissionsByRole = (role: UserRole): Permissions => {
  switch (role) {
    case UserRole.OWNER:
      return { canAccessReports: true, canManageStaff: true, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.MANAGER:
      return { canAccessReports: true, canManageStaff: false, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.CASHIER:
      return { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: true, canProcessSales: true, canVoidTransactions: false, canManageSettings: false };
    case UserRole.KITCHEN:
      return { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: true, canProcessSales: false, canVoidTransactions: false, canManageSettings: false };
    default:
      return { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: false, canProcessSales: false, canVoidTransactions: false, canManageSettings: false };
  }
};

interface SupabaseConfig {
  url: string;
  key: string;
  isEnabled: boolean;
}

interface AppState {
  products: Product[];
  categories: Category[];
  inventory: InventoryItem[];
  stockTransfers: StockTransfer[];
  stockRequests: StockRequest[];
  productionRecords: ProductionRecord[];
  wipRecipes: WIPRecipe[];
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  outlets: Outlet[];
  currentUser: StaffMember | null;
  isAuthenticated: boolean;
  loginTime: Date | null;
  cart: CartItem[];
  staff: StaffMember[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  selectedOutletId: string;
  customers: Customer[];
  selectedCustomerId: string | null;
  expenses: Expense[];
  expenseTypes: ExpenseType[];
  dailyClosings: DailyClosing[];
  purchases: Purchase[];
  connectedPrinter: any | null;
  membershipTiers: MembershipTier[];
  bulkDiscounts: BulkDiscountRule[];
  simulations: MenuSimulation[];
  loyaltyConfig: LoyaltyConfig;
  isSaving: boolean;
  isCloudConnected: boolean;
  isInitialLoading: boolean;
  supabaseConfig: SupabaseConfig;
}

interface AppActions {
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchOutlet: (id: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  checkout: (paymentMethod: PaymentMethod, redeemPoints?: number, membershipDiscount?: number, bulkDiscount?: number) => Promise<void>;
  addStaff: (member: StaffMember) => Promise<void>;
  updateStaff: (member: StaffMember) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  clockIn: (lat?: number, lng?: number, notes?: string) => Promise<{ success: boolean; message?: string }>;
  clockOut: () => Promise<void>;
  submitLeave: (leave: any) => Promise<void>;
  updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addInventoryItem: (item: any, outletIds?: string[]) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  addStockRequest: (itemId: string, qty: number) => Promise<void>;
  deleteStockRequest: (id: string) => Promise<void>;
  addExpense: (expense: any) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseType: (name: string) => Promise<void>;
  updateExpenseType: (id: string, name: string) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  performClosing: (actualCash: number, notes: string) => Promise<void>;
  approveClosing: (id: string) => Promise<void>;
  rejectClosing: (id: string) => Promise<void>;
  addPurchase: (purchase: { inventoryItemId: string; quantity: number; unitPrice: number }, requestId?: string) => Promise<void>;
  selectCustomer: (id: string | null) => void;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addOutlet: (outlet: Outlet) => Promise<void>;
  updateOutlet: (outlet: Outlet) => Promise<void>;
  deleteOutlet: (id: string) => Promise<void>;
  setConnectedPrinter: (device: any) => void;
  processProduction: (data: { resultItemId: string; resultQuantity: number; components: { inventoryItemId: string; quantity: number }[] }) => Promise<void>;
  addWIPRecipe: (recipe: Omit<WIPRecipe, 'id'>) => Promise<void>;
  updateWIPRecipe: (recipe: WIPRecipe) => Promise<void>;
  deleteWIPRecipe: (id: string) => Promise<void>;
  transferStock: (from: string, to: string, item: string, qty: number) => Promise<void>;
  addMembershipTier: (tier: any) => Promise<void>;
  updateMembershipTier: (tier: any) => Promise<void>;
  deleteMembershipTier: (id: string) => Promise<void>;
  addBulkDiscount: (rule: any) => Promise<void>;
  updateBulkDiscount: (rule: any) => Promise<void>;
  deleteBulkDiscount: (id: string) => Promise<void>;
  saveSimulation: (sim: MenuSimulation) => Promise<void>;
  deleteSimulation: (id: string) => Promise<void>;
  updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>;
  resetOutletData: (outletId: string) => Promise<void>;
  voidTransaction: (txId: string) => Promise<void>;
  fetchFromCloud: () => Promise<void>;
  cloneOutletSetup: (fromOutletId: string, toOutletId: string) => Promise<void>;
  exportData: () => void;
  importData: (json: string) => Promise<boolean>;
  resetGlobalData: () => Promise<void>;
  updateSupabaseConfig: (config: SupabaseConfig) => void;
  syncToCloud: () => void;
  exportTableToCSV: (table: 'products' | 'inventory' | 'categories' | 'outlets' | 'staff' | 'wip_recipes' | 'expenses' | 'purchases') => void;
  importCSVToTable: (table: 'products' | 'inventory' | 'categories' | 'outlets' | 'staff' | 'wip_recipes' | 'expenses' | 'purchases', csv: string) => Promise<boolean>;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

const hydrateDates = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(hydrateDates);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/.test(val)) {
        newObj[key] = new Date(val);
      } else if (typeof val === 'object') {
        newObj[key] = hydrateDates(val);
      } else {
        newObj[key] = val;
      }
    }
    return newObj;
  }
  return obj;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [wipRecipes, setWipRecipes] = useState<WIPRecipe[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscountRule[]>([]);
  const [simulations, setSimulations] = useState<MenuSimulation[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({ isEnabled: true, earningAmountPerPoint: 1000, redemptionValuePerPoint: 100, minRedeemPoints: 50 });

  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('out1');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<any>(null);
  const [loginTime, setLoginTime] = useState<Date | null>(null);

  const supabaseConfig: SupabaseConfig = { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY, isEnabled: true };

  useEffect(() => {
    const client = createClient(supabaseConfig.url, supabaseConfig.key);
    setSupabase(client);
    setIsCloudConnected(true);
  }, []);

  const fetchFromCloud = async () => {
    if (!supabase) return;
    if (isFirstLoad) setIsInitialLoading(true);
    
    try {
      const [
        { data: prod }, { data: cat }, { data: inv }, { data: out }, 
        { data: stf }, { data: att }, { data: leave }, { data: cust }, 
        { data: tx }, { data: exp }, { data: ext }, { data: cls }, 
        { data: str }, { data: stq }, { data: prd }, { data: pur },
        { data: tier }, { data: bulk }, { data: sim }, { data: loyal },
        { data: recipes }
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('outlets').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('leave_requests').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(1000),
        supabase.from('expenses').select('*'),
        supabase.from('expense_types').select('*'),
        supabase.from('daily_closings').select('*'),
        supabase.from('stock_transfers').select('*'),
        supabase.from('stock_requests').select('*'),
        supabase.from('production_records').select('*'),
        supabase.from('purchases').select('*'),
        supabase.from('membership_tiers').select('*'),
        supabase.from('bulk_discounts').select('*'),
        supabase.from('simulations').select('*'),
        supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('wip_recipes').select('*')
      ]);

      if (prod) setProducts(prod);
      if (cat) setCategories(cat);
      if (inv) setInventory(inv);
      if (out) setOutlets(out.length > 0 ? out : OUTLETS);
      if (stf) setStaff(stf.length > 0 ? stf : INITIAL_STAFF);
      if (att) setAttendance(hydrateDates(att));
      if (leave) setLeaveRequests(hydrateDates(leave));
      if (cust) setCustomers(hydrateDates(cust));
      if (tx) setTransactions(hydrateDates(tx));
      if (exp) setExpenses(hydrateDates(exp));
      if (ext) setExpenseTypes(ext);
      if (cls) setDailyClosings(hydrateDates(cls));
      if (str) setStockTransfers(hydrateDates(str));
      if (stq) setStockRequests(hydrateDates(stq));
      if (prd) setProductionRecords(hydrateDates(prd));
      if (pur) setPurchases(hydrateDates(pur));
      if (tier) setMembershipTiers(tier);
      if (bulk) setBulkDiscounts(bulk);
      if (sim) setSimulations(hydrateDates(sim));
      if (loyal) setLoyaltyConfig(loyal);
      if (recipes) setWipRecipes(recipes); else setWipRecipes([]);
    } catch (e) {
      console.error("Fetch Cloud Error:", e);
    } finally {
      setIsInitialLoading(false);
      setIsFirstLoad(false);
    }
  };

  useEffect(() => {
    if (supabase) fetchFromCloud();
  }, [supabase]);

  const jsonToCSV = (data: any[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return "";
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${val.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const csvToJSON = (csv: string): any[] => {
    const lines = csv.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) return [];
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        let val: any = values[i];
        if (val === undefined || val === "") {
          obj[h] = null;
        } else if (val.startsWith('{') || val.startsWith('[')) {
          try { obj[h] = JSON.parse(val); } catch(e) { obj[h] = val; }
        } else if (val.toLowerCase() === 'true') {
          obj[h] = true;
        } else if (val.toLowerCase() === 'false') {
          obj[h] = false;
        } else if (!isNaN(val) && val.trim() !== "") {
          obj[h] = Number(val);
        } else {
          obj[h] = val;
        }
      });
      return obj;
    });
  };

  const actions: AppActions = {
    fetchFromCloud,
    login: async (u, p) => {
      if (!supabase) return { success: false, message: "Koneksi cloud bermasalah." };
      const { data: cloudUser } = await supabase.from('staff').select('*').eq('username', u).eq('password', p).maybeSingle();
      if (cloudUser) {
        if (cloudUser.status === 'INACTIVE') return { success: false, message: "Akun dinonaktifkan oleh Owner." };
        setIsAuthenticated(true);
        setCurrentUser(cloudUser);
        setLoginTime(new Date());
        setSelectedOutletId(cloudUser.assignedOutletIds[0] || 'out1');
        return { success: true };
      }
      return { success: false, message: "Username atau Password salah." };
    },
    logout: () => { setIsAuthenticated(false); setCurrentUser(null); },
    switchOutlet: setSelectedOutletId,
    addToCart: (p) => setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    }),
    removeFromCart: (pid) => setCart(prev => prev.filter(i => i.product.id !== pid)),
    updateCartQuantity: (pid, d) => setCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(0, i.quantity + d) } : i).filter(i => i.quantity > 0)),
    clearCart: () => setCart([]),
    checkout: async (method, redeem = 0, memberDisc = 0, bulkDisc = 0) => {
      if (!supabase) return;
      setIsSaving(true);
      let subtotal = 0; let totalCost = 0;
      const calcCost = (p: Product): number => {
        let c = 0;
        if (p.isCombo && p.comboItems) {
          p.comboItems.forEach(ci => { const inner = products.find(ip => ip.id === ci.productId); if (inner) c += calcCost(inner) * ci.quantity; });
        } else {
          p.bom.forEach(b => {
            const item = inventory.find(inv => inv.outletId === selectedOutletId && inv.id === b.inventoryItemId);
            c += (b.quantity * (item?.costPerUnit || 0));
          });
        }
        return c;
      };
      cart.forEach(i => {
        const pr = i.product.outletSettings?.[selectedOutletId]?.price || i.product.price;
        subtotal += pr * i.quantity;
        totalCost += calcCost(i.product) * i.quantity;
      });
      const ptVal = redeem * loyaltyConfig.redemptionValuePerPoint;
      const total = Math.max(0, subtotal - memberDisc - bulkDisc - ptVal);
      const earned = Math.floor(total / loyaltyConfig.earningAmountPerPoint);
      const tx: Transaction = {
        id: `TX-${Date.now()}`, outletId: selectedOutletId, customerId: selectedCustomerId || undefined, 
        items: [...cart], subtotal, tax: 0, total, totalCost, paymentMethod: method, 
        status: OrderStatus.CLOSED, timestamp: new Date(), cashierId: currentUser?.id || 'sys', cashierName: currentUser?.name || 'System',
        pointsEarned: earned, pointsRedeemed: redeem, pointDiscountValue: ptVal, membershipDiscount: memberDisc, bulkDiscount: bulkDisc
      };
      try {
        await supabase.from('transactions').insert(tx);
        const updates: InventoryItem[] = [];
        const deduct = (p: Product, mult: number) => {
           if (p.isCombo && p.comboItems) {
             p.comboItems.forEach(ci => { const inner = products.find(ip => ip.id === ci.productId); if (inner) deduct(inner, mult * ci.quantity); });
           } else {
             p.bom.forEach(b => {
                const item = inventory.find(inv => inv.outletId === selectedOutletId && inv.id === b.inventoryItemId);
                if (item) updates.push({ ...item, quantity: item.quantity - (b.quantity * mult) });
             });
           }
        };
        cart.forEach(i => deduct(i.product, i.quantity));
        if (updates.length > 0) await supabase.from('inventory').upsert(updates);
        if (selectedCustomerId) {
          const cust = customers.find(c => c.id === selectedCustomerId);
          if (cust) await supabase.from('customers').update({ points: cust.points - redeem + earned, lastVisit: new Date() }).eq('id', cust.id);
        }
        setCart([]); setSelectedCustomerId(null);
        await fetchFromCloud();
      } finally { setIsSaving(false); }
    },
    // voidTransaction implementation (moved here to avoid duplication)
    voidTransaction: async (id) => {
      await supabase!.from('transactions').update({ status: OrderStatus.VOIDED }).eq('id', id);
      await fetchFromCloud();
    },
    addProduct: async (p) => { await supabase!.from('products').insert(p); await fetchFromCloud(); },
    updateProduct: async (p) => { await supabase!.from('products').update(p).eq('id', p.id); await fetchFromCloud(); },
    deleteProduct: async (id) => { await supabase!.from('products').delete().eq('id', id); await fetchFromCloud(); },
    addStaff: async (s) => { await supabase!.from('staff').insert(s); await fetchFromCloud(); },
    updateStaff: async (s) => { await supabase!.from('staff').update(s).eq('id', s.id); await fetchFromCloud(); },
    deleteStaff: async (id) => { await supabase!.from('staff').delete().eq('id', id); await fetchFromCloud(); },
    clockIn: async (lat, lng, notes) => {
      const att: Attendance = { id: `att-${Date.now()}`, staffId: currentUser!.id, staffName: currentUser!.name, date: new Date().toISOString().split('T')[0], clockIn: new Date(), status: 'PRESENT', latitude: lat, longitude: lng, notes };
      await supabase!.from('attendance').insert(att);
      await fetchFromCloud();
      return { success: true };
    },
    clockOut: async () => {
      const today = new Date().toISOString().split('T')[0];
      await supabase!.from('attendance').update({ clockOut: new Date() }).eq('staffId', currentUser!.id).eq('date', today);
      await fetchFromCloud();
    },
    submitLeave: async (l) => {
      await supabase!.from('leave_requests').insert({ ...l, id: `lv-${Date.now()}`, staffId: currentUser!.id, staffName: currentUser!.name, status: 'PENDING', requestedAt: new Date() });
      await fetchFromCloud();
    },
    updateLeaveStatus: async (id, s) => { await supabase!.from('leave_requests').update({ status: s }).eq('id', id); await fetchFromCloud(); },
    addInventoryItem: async (i, outletIds = []) => { 
      const targets = outletIds.length > 0 ? outletIds : [selectedOutletId];
      const payloads = targets.map(oid => ({
         ...i,
         id: `inv-${oid}-${Date.now()}`,
         outletId: oid
      }));
      await supabase!.from('inventory').insert(payloads); 
      await fetchFromCloud(); 
    },
    updateInventoryItem: async (i) => { await supabase!.from('inventory').update(i).eq('id', i.id); await fetchFromCloud(); },
    deleteInventoryItem: async (id) => { await supabase!.from('inventory').delete().eq('id', id); await fetchFromCloud(); },
    addStockRequest: async (iid, q) => {
      const item = inventory.find(i => i.id === iid);
      await supabase!.from('stock_requests').insert({ id: `req-${Date.now()}`, outletId: selectedOutletId, inventoryItemId: iid, itemName: item?.name, requestedQuantity: q, unit: item?.unit, status: RequestStatus.PENDING, timestamp: new Date(), staffId: currentUser!.id, staffName: currentUser!.name, isUrgent: true });
      await fetchFromCloud();
    },
    deleteStockRequest: async (id) => { await supabase!.from('stock_requests').delete().eq('id', id); await fetchFromCloud(); },
    addExpense: async (e) => { await supabase!.from('expenses').insert({ ...e, id: `exp-${Date.now()}`, timestamp: new Date(), staffId: currentUser!.id, staffName: currentUser!.name, outletId: selectedOutletId }); await fetchFromCloud(); },
    updateExpense: async (id, d) => { await supabase!.from('expenses').update(d).eq('id', id); await fetchFromCloud(); },
    deleteExpense: async (id) => { await supabase!.from('expenses').delete().eq('id', id); await fetchFromCloud(); },
    addExpenseType: async (n) => { await supabase!.from('expense_types').insert({ id: `et-${Date.now()}`, name: n }); await fetchFromCloud(); },
    updateExpenseType: async (id, n) => { await supabase!.from('expense_types').update({ name: n }).eq('id', id); await fetchFromCloud(); },
    deleteExpenseType: async (id) => { await supabase!.from('expense_types').delete().eq('id', id); await fetchFromCloud(); },
    addCategory: async (n) => { await supabase!.from('categories').insert({ id: `cat-${Date.now()}`, name: n }); await fetchFromCloud(); },
    updateCategory: async (id, n) => { await supabase!.from('categories').update({ name: n }).eq('id', id); await fetchFromCloud(); },
    deleteCategory: async (id) => { await supabase!.from('categories').delete().eq('id', id); await fetchFromCloud(); },
    performClosing: async (actual, notes) => {
      const start = new Date(); start.setHours(0,0,0,0);
      const shiftTxs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser!.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start);
      const cash = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((acc,b)=>acc+b.total, 0);
      const qris = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((acc,b)=>acc+b.total, 0);
      const exp = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === currentUser!.id && new Date(e.timestamp) >= start).reduce((acc,b)=>acc+b.amount, 0);
      const disc = actual - (cash - exp);
      const cls = { id: `CLS-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser!.id, staffName: currentUser!.name, timestamp: new Date(), totalSalesCash: cash, totalSalesQRIS: qris, totalExpenses: exp, actualCash: actual, discrepancy: disc, notes, status: 'APPROVED' };
      await supabase!.from('daily_closings').insert(cls);
      await fetchFromCloud();
    },
    approveClosing: async (id) => { await supabase!.from('daily_closings').update({ status: 'APPROVED' }).eq('id', id); await fetchFromCloud(); },
    rejectClosing: async (id) => { await supabase!.from('daily_closings').delete().eq('id', id); await fetchFromCloud(); },
    addPurchase: async (p, rid) => {
      const item = inventory.find(i => i.id === p.inventoryItemId);
      if (!item) return;
      const purchaseQty = p.quantity;
      const purchasePricePerUnit = p.unitPrice / purchaseQty;
      const currentQty = item.quantity > 0 ? item.quantity : 0;
      const currentCost = item.costPerUnit || purchasePricePerUnit;
      const newTotalQty = currentQty + purchaseQty;
      const newAverageCost = ((currentQty * currentCost) + (purchaseQty * purchasePricePerUnit)) / newTotalQty;
      
      const purchaseId = `pur-${Date.now()}`;
      
      // 1. Catat Transaksi Pembelian Stok
      await supabase!.from('purchases').insert({ 
        id: purchaseId, 
        outletId: selectedOutletId, 
        inventoryItemId: p.inventoryItemId, 
        itemName: item.name, 
        quantity: purchaseQty, 
        unitPrice: purchasePricePerUnit, 
        totalPrice: p.unitPrice, 
        staffId: currentUser!.id, 
        staffName: currentUser!.name, 
        timestamp: new Date(), 
        requestId: rid 
      });

      // 2. OTOMASI: Catat sebagai Pengeluaran Laci (Expense)
      // Mencari ID Kategori 'Belanja Stok', 'Pembelian', atau fallback ke yang pertama
      const belanjaStokType = expenseTypes.find(t => 
        t.name.toLowerCase().includes('belanja') || 
        t.name.toLowerCase().includes('pembelian')
      ) || expenseTypes[0];

      await supabase!.from('expenses').insert({
        id: `exp-auto-${Date.now()}`,
        outletId: selectedOutletId,
        typeId: belanjaStokType?.id || 'et-default',
        amount: p.unitPrice,
        notes: `Auto: Belanja ${item.name} (${purchaseQty} ${item.unit})`,
        staffId: currentUser!.id,
        staffName: currentUser!.name,
        timestamp: new Date()
      });

      // 3. Update Stok Fisik & HPP Average
      await supabase!.from('inventory').update({ quantity: newTotalQty, costPerUnit: Math.round(newAverageCost) }).eq('id', p.inventoryItemId);
      
      if (rid) await supabase!.from('stock_requests').update({ status: RequestStatus.FULFILLED }).eq('id', rid);
      
      await fetchFromCloud();
    },
    processProduction: async (d) => {
      setIsSaving(true);
      try {
        let totalMaterialCost = 0;
        const materialUpdates: InventoryItem[] = [];
        for (const c of d.components) {
          const comp = inventory.find(i => i.id === c.inventoryItemId);
          if (comp) {
            totalMaterialCost += (comp.costPerUnit * c.quantity);
            materialUpdates.push({ ...comp, quantity: comp.quantity - c.quantity });
          }
        }
        const resultItem = inventory.find(i => i.id === d.resultItemId);
        if (!resultItem) return;
        const producedQty = d.resultQuantity;
        const producedCostPerUnit = totalMaterialCost / producedQty;
        const currentWIPQty = resultItem.quantity > 0 ? resultItem.quantity : 0;
        const currentWIPCost = resultItem.costPerUnit || producedCostPerUnit;
        const newTotalWIPQty = currentWIPQty + producedQty;
        const newAverageWIPCost = ((currentWIPQty * currentWIPCost) + (producedQty * producedCostPerUnit)) / newTotalWIPQty;
        await supabase!.from('production_records').insert({ ...d, id: `prod-${Date.now()}`, outletId: selectedOutletId, timestamp: new Date(), staffId: currentUser!.id, staffName: currentUser!.name });
        if (materialUpdates.length > 0) await supabase!.from('inventory').upsert(materialUpdates);
        await supabase!.from('inventory').update({ quantity: newTotalWIPQty, costPerUnit: Math.round(newAverageWIPCost) }).eq('id', d.resultItemId);
        await fetchFromCloud();
      } finally { setIsSaving(false); }
    },
    addWIPRecipe: async (recipe) => {
      setIsSaving(true);
      try { await supabase!.from('wip_recipes').insert({ ...recipe, id: `wipr-${Date.now()}` }); await fetchFromCloud(); } finally { setIsSaving(false); }
    },
    updateWIPRecipe: async (recipe) => {
      setIsSaving(true);
      try { await supabase!.from('wip_recipes').update(recipe).eq('id', recipe.id); await fetchFromCloud(); } finally { setIsSaving(false); }
    },
    deleteWIPRecipe: async (id) => { await supabase!.from('wip_recipes').delete().eq('id', id); await fetchFromCloud(); },
    addCustomer: async (c) => { await supabase!.from('customers').insert({ ...c, id: `c-${Date.now()}`, points: 0, registeredAt: new Date(), registeredByStaffId: currentUser!.id, registeredByStaffName: currentUser!.name, registeredAtOutletId: selectedOutletId, registeredAtOutletName: outlets.find(o=>o.id===selectedOutletId)?.name }); await fetchFromCloud(); },
    updateCustomer: async (c) => { await supabase!.from('customers').update(c).eq('id', c.id); await fetchFromCloud(); },
    deleteCustomer: async (id) => { await supabase!.from('customers').delete().eq('id', id); await fetchFromCloud(); },
    addOutlet: async (o) => { await supabase!.from('outlets').insert(o); await fetchFromCloud(); },
    updateOutlet: async (o) => { await supabase!.from('outlets').update(o).eq('id', o.id); await fetchFromCloud(); },
    deleteOutlet: async (id) => { await supabase!.from('outlets').delete().eq('id', id); await fetchFromCloud(); },
    transferStock: async (f, t, n, q) => {
      const itemF = inventory.find(i => i.outletId === f && i.name === n);
      const itemT = inventory.find(i => i.outletId === t && i.name === n);
      await supabase!.from('inventory').update({ quantity: (itemF?.quantity || 0) - q }).eq('id', itemF!.id);
      if (itemT) await supabase!.from('inventory').update({ quantity: (itemT.quantity || 0) + q }).eq('id', itemT.id);
      else await supabase!.from('inventory').insert({ id: `inv-${Date.now()}`, outletId: t, name: n, unit: itemF!.unit, quantity: q, minStock: itemF!.minStock, costPerUnit: itemF!.costPerUnit, type: itemF!.type });
      await supabase!.from('stock_transfers').insert({ id: `tr-${Date.now()}`, fromOutletId: f, fromOutletName: outlets.find(o=>o.id===f)?.name, toOutletId: t, toOutletName: outlets.find(o=>o.id===t)?.name, itemName: n, quantity: q, unit: itemF!.unit, timestamp: new Date(), staffId: currentUser!.id, staffName: currentUser!.name });
      await fetchFromCloud();
    },
    addMembershipTier: async (t) => { await supabase!.from('membership_tiers').insert({ ...t, id: `t-${Date.now()}` }); await fetchFromCloud(); },
    updateMembershipTier: async (t) => { await supabase!.from('membership_tiers').update(t).eq('id', t.id); await fetchFromCloud(); },
    deleteMembershipTier: async (id) => { await supabase!.from('membership_tiers').delete().eq('id', id); await fetchFromCloud(); },
    addBulkDiscount: async (r) => { await supabase!.from('bulk_discounts').insert({ ...r, id: `r-${Date.now()}` }); await fetchFromCloud(); },
    updateBulkDiscount: async (r) => { await supabase!.from('bulk_discounts').update(r).eq('id', r.id); await fetchFromCloud(); },
    deleteBulkDiscount: async (id) => { await supabase!.from('bulk_discounts').delete().eq('id', id); await fetchFromCloud(); },
    saveSimulation: async (s) => { await supabase!.from('simulations').upsert(s); await fetchFromCloud(); },
    deleteSimulation: async (id) => { await supabase!.from('simulations').delete().eq('id', id); await fetchFromCloud(); },
    updateLoyaltyConfig: async (c) => { await supabase!.from('loyalty_config').upsert({ ...c, id: 'global' }); await fetchFromCloud(); },
    resetOutletData: async (oid) => { 
       if (!supabase) return;
       setIsSaving(true);
       try {
         // HANYA MENGHAPUS LOG OPERASIONAL (TRANSAKSI), BUKAN MASTER DATA
         await Promise.all([
           supabase.from('transactions').delete().eq('outletId', oid),
           supabase.from('expenses').delete().eq('outletId', oid),
           supabase.from('daily_closings').delete().eq('outletId', oid),
           supabase.from('purchases').delete().eq('outletId', oid),
           supabase.from('production_records').delete().eq('outletId', oid),
           supabase.from('stock_requests').delete().eq('outletId', oid)
         ]);
         await fetchFromCloud();
       } catch (e) {
         console.error("Outlet Reset Error:", e);
       } finally { setIsSaving(false); }
    },
    cloneOutletSetup: async (fromId, toId) => {
      if (!supabase) return;
      setIsSaving(true);
      try {
         const { data: sourceInv } = await supabase.from('inventory').select('*').eq('outletId', fromId);
         if (sourceInv) {
            const newInv = sourceInv.map(item => ({ ...item, id: `inv-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, outletId: toId, quantity: 0 }));
            await supabase.from('inventory').insert(newInv);
         }
         const { data: allProds } = await supabase.from('products').select('*');
         if (allProds) {
            const updates = allProds.map(p => {
               const settings = p.outletSettings || {};
               const sourceSetting = settings[fromId] || { price: p.price, isAvailable: true };
               return { ...p, outletSettings: { ...settings, [toId]: sourceSetting } };
            });
            await supabase.from('products').upsert(updates);
         }
         await fetchFromCloud();
      } finally { setIsSaving(false); }
    },
    selectCustomer: setSelectedCustomerId,
    setConnectedPrinter,
    exportData: () => {
      const data = { products, categories, inventory, staff, outlets, transactions, expenses, dailyClosings, wipRecipes, loyaltyConfig, membershipTiers, bulkDiscounts };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mozzaboy_master_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    },
    importData: async (json) => { 
      if (!supabase) return false;
      setIsSaving(true);
      try {
        const data = JSON.parse(json);
        const tables = ['categories', 'products', 'inventory', 'staff', 'outlets', 'membership_tiers', 'bulk_discounts', 'wip_recipes', 'loyalty_config'];
        
        for (const table of tables) {
          if (data[table] && Array.isArray(data[table])) {
            if (table === 'staff') {
              await supabase.from(table).delete().neq('id', currentUser?.id || '0');
            } else {
              await supabase.from(table).delete().neq('id', 'keep_all'); 
            }
            await supabase.from(table).insert(data[table]);
          } else if (data[table] && typeof data[table] === 'object' && table === 'loyalty_config') {
            await supabase.from(table).upsert({ ...data[table], id: 'global' });
          }
        }
        await fetchFromCloud();
        return true;
      } catch (e) {
        console.error("Import Error:", e);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    exportTableToCSV: (table) => {
      let data: any[] = [];
      if (table === 'products') data = products;
      else if (table === 'inventory') data = inventory;
      else if (table === 'categories') data = categories;
      else if (table === 'outlets') data = outlets;
      else if (table === 'staff') data = staff;
      else if (table === 'wip_recipes') data = wipRecipes;
      else if (table === 'expenses') data = expenses;
      else if (table === 'purchases') data = purchases;
      const csv = jsonToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mozzaboy_${table}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    },
    importCSVToTable: async (table, csv) => {
      if (!supabase) return false;
      setIsSaving(true);
      try {
        const json = csvToJSON(csv);
        if (!json || json.length === 0) return false;
        
        // Broad wipe strategy (be careful with these)
        if (table === 'staff') {
           const { error: delErr } = await supabase.from(table).delete().neq('id', currentUser?.id || '0');
           if (delErr) throw delErr;
        } else if (table === 'expenses' || table === 'purchases') {
           // Allow additive import or selective clear for logs
           await supabase.from(table).delete().neq('id', 'safe');
        } else {
           const { error: delErr } = await supabase.from(table).delete().neq('id', 'wipe_placeholder_safe');
           if (delErr) throw delErr;
        }

        // Strict mapping for numbers and dates
        const sanitized = json.map(row => {
          const r = { ...row };
          if (r.price !== undefined) r.price = Number(r.price) || 0;
          if (r.quantity !== undefined) r.quantity = Number(r.quantity) || 0;
          if (r.amount !== undefined) r.amount = Number(r.amount) || 0;
          if (r.totalPrice !== undefined) r.totalPrice = Number(r.totalPrice) || 0;
          if (r.unitPrice !== undefined) r.unitPrice = Number(r.unitPrice) || 0;
          if (r.costPerUnit !== undefined) r.costPerUnit = Number(r.costPerUnit) || 0;
          if (r.minStock !== undefined) r.minStock = Number(r.minStock) || 0;
          if (r.resultQuantity !== undefined) r.resultQuantity = Number(r.resultQuantity) || 0;
          
          // Re-hydrate dates if necessary
          if (r.timestamp && typeof r.timestamp === 'string') r.timestamp = new Date(r.timestamp);
          return r;
        });

        const { error: insErr } = await supabase.from(table).insert(sanitized);
        if (insErr) throw insErr;
        await fetchFromCloud();
        return true;
      } catch (e) {
        console.error(`CSV Import Error [${table}]:`, e);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    resetGlobalData: async () => { 
       if (!supabase) return;
       setIsSaving(true);
       try {
         const tables = [
           'transactions', 'expenses', 'daily_closings', 'purchases', 
           'stock_transfers', 'stock_requests', 'production_records', 
           'attendance', 'leave_requests', 'customers', 'simulations',
           'products', 'inventory', 'categories', 'wip_recipes', 
           'membership_tiers', 'bulk_discounts'
         ];
         for (const table of tables) { await supabase.from(table).delete().neq('id', '0'); }
         await supabase.from('staff').delete().neq('role', UserRole.OWNER);
         await fetchFromCloud();
       } catch (e) {
         console.error("Global Reset Error:", e);
       } finally { setIsSaving(false); }
    },
    updateSupabaseConfig: (c) => { console.log("Config updated", c); },
    syncToCloud: () => { fetchFromCloud(); }
  };

  return (
    <AppContext.Provider value={{ 
      products, categories, inventory, stockTransfers, stockRequests, productionRecords, wipRecipes,
      transactions, filteredTransactions: transactions.filter(tx => tx.outletId === selectedOutletId), 
      outlets, currentUser, isAuthenticated, loginTime, cart, staff, attendance, 
      leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, 
      expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, 
      bulkDiscounts, simulations, loyaltyConfig, isSaving, isCloudConnected, 
      isInitialLoading, supabaseConfig, ...actions 
    }}>
      {isInitialLoading ? (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
           <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Menghubungkan ke Cloud Database...</p>
        </div>
      ) : children}
      {isSaving && !isInitialLoading && (
        <div className="fixed bottom-4 right-4 z-[999] bg-slate-900/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
           <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
           <span className="text-[8px] font-black uppercase tracking-widest">Sinkronisasi Cloud...</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
