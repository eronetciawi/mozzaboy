
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

const STORAGE_USER_KEY = 'mozzaboy_session_user';
const STORAGE_OUTLET_KEY = 'mozzaboy_active_outlet';

export const getPermissionsByRole = (role: UserRole): Permissions => {
  switch (role) {
    case UserRole.OWNER:
      return { canAccessReports: true, canManageStaff: true, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.MANAGER:
      return { canAccessReports: true, canManageStaff: false, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.CASHIER:
      return { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: true, canProcessSales: true, canVoidTransactions: false, canManageSettings: false };
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
  performClosing: (actualCash: number, notes: string, openingBalance: number, shiftName: string) => Promise<void>;
  addPurchase: (purchase: { inventoryItemId: string; quantity: number; unitPrice: number; requestId?: string }) => Promise<void>;
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
  resetGlobalData: () => Promise<void>;
  resetAttendanceLogs: () => Promise<void>;
  updateSupabaseConfig: (config: SupabaseConfig) => void;
  syncToCloud: () => void;
  exportTableToCSV: (table: string) => void;
  importCSVToTable: (table: string, csv: string) => Promise<boolean>;
  addExpense: (expense: any) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseType: (name: string) => Promise<void>;
  updateExpenseType: (id: string, name: string) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
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

  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_USER_KEY) !== null;
  });
  
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_OUTLET_KEY) || 'out1';
  });

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
      const results = await Promise.allSettled([
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
        supabase.from('daily_closings').select('*').order('timestamp', { ascending: false }),
        supabase.from('stock_transfers').select('*'),
        supabase.from('stock_requests').select('*'),
        supabase.from('production_records').select('*').order('timestamp', { ascending: false }),
        supabase.from('purchases').select('*'),
        supabase.from('membership_tiers').select('*'),
        supabase.from('bulk_discounts').select('*'),
        supabase.from('simulations').select('*'),
        supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('wip_recipes').select('*')
      ]);

      const data = results.map(r => r.status === 'fulfilled' ? r.value.data : null);

      if (data[0]) setProducts(hydrateDates(data[0]));
      if (data[1]) setCategories(hydrateDates(data[1]));
      if (data[2]) setInventory(hydrateDates(data[2]));
      if (data[3]) setOutlets(data[3].length > 0 ? hydrateDates(data[3]) : OUTLETS);
      if (data[4]) setStaff(data[4].length > 0 ? hydrateDates(data[4]) : INITIAL_STAFF);
      if (data[5]) setAttendance(hydrateDates(data[5]));
      if (data[6]) setLeaveRequests(hydrateDates(data[6]));
      if (data[7]) setCustomers(hydrateDates(data[7]));
      if (data[8]) setTransactions(hydrateDates(data[8]));
      if (data[9]) setExpenses(hydrateDates(data[9]));
      if (data[10]) setExpenseTypes(hydrateDates(data[10]));
      if (data[11]) setDailyClosings(hydrateDates(data[11]));
      if (data[12]) setStockTransfers(hydrateDates(data[12]));
      if (data[13]) setStockRequests(hydrateDates(data[13]));
      if (data[14]) setProductionRecords(hydrateDates(data[14]));
      if (data[15]) setPurchases(hydrateDates(data[15]));
      if (data[16]) setMembershipTiers(hydrateDates(data[16]));
      if (data[17]) setBulkDiscounts(hydrateDates(data[17]));
      if (data[18]) setSimulations(hydrateDates(data[18]));
      if (data[19]) setLoyaltyConfig(hydrateDates(data[19]));
      if (data[20]) setWipRecipes(hydrateDates(data[20]));
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

  const actions: AppActions = {
    fetchFromCloud,
    login: async (u, p) => {
      if (!supabase) return { success: false, message: "Cloud Offline." };
      const { data } = await supabase.from('staff').select('*').eq('username', u).eq('password', p).maybeSingle();
      if (data) {
         const mapped = hydrateDates(data);
         if (mapped.status === 'INACTIVE') return { success: false, message: "Akses dinonaktifkan." };
         
         const now = new Date();
         const [sh, sm] = (mapped.shiftStartTime || '10:00').split(':').map(Number);
         const shiftLimit = new Date(); shiftLimit.setHours(sh, sm, 0, 0);
         const prepTime = new Date(shiftLimit.getTime() - (30 * 60 * 1000));
         
         if (mapped.role === UserRole.CASHIER && now < prepTime) {
            return { success: false, message: `Akses ditolak. Persiapan shift mulai pukul ${prepTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` };
         }

         setCurrentUser(mapped);
         setIsAuthenticated(true);
         localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mapped));
         const oid = mapped.assignedOutletIds[0] || 'out1';
         setSelectedOutletId(oid);
         localStorage.setItem(STORAGE_OUTLET_KEY, oid);
         return { success: true };
      }
      return { success: false, message: "Kredensial salah." };
    },
    logout: () => { setIsAuthenticated(false); setCurrentUser(null); localStorage.removeItem(STORAGE_USER_KEY); },
    switchOutlet: (id) => { setSelectedOutletId(id); localStorage.setItem(STORAGE_OUTLET_KEY, id); },
    addToCart: (p) => setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    }),
    updateCartQuantity: (pid, delta) => setCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)),
    removeFromCart: (pid) => setCart(prev => prev.filter(i => i.product.id !== pid)),
    clearCart: () => setCart([]),
    checkout: async (method, redeem = 0, memberDisc = 0, bulkDisc = 0) => {
      if (!supabase || selectedOutletId === 'all') return;
      setIsSaving(true);
      
      try {
        let subtotal = 0; 
        let totalCost = 0;
        
        cart.forEach(i => {
           const price = i.product.outletSettings?.[selectedOutletId]?.price || i.product.price;
           subtotal += price * i.quantity;
           const itemCost = (i.product.bom || []).reduce((acc, b) => {
              const inv = inventory.find(inv => inv.id === b.inventoryItemId);
              return acc + (b.quantity * (inv?.costPerUnit || 0));
           }, 0);
           totalCost += itemCost * i.quantity;
        });

        const ptVal = redeem * loyaltyConfig.redemptionValuePerPoint;
        const total = Math.max(0, subtotal - memberDisc - bulkDisc - ptVal);
        
        const txPayload = {
          id: `TX-${Date.now()}`, 
          outletId: selectedOutletId, 
          customerId: selectedCustomerId || null, 
          items: cart, 
          subtotal, total, totalCost,
          paymentMethod: method, status: OrderStatus.CLOSED, 
          timestamp: new Date().toISOString(), 
          cashierId: currentUser?.id, cashierName: currentUser?.name,
          pointsEarned: Math.floor(total/1000), pointsRedeemed: redeem, 
          pointDiscountValue: ptVal, membershipDiscount: memberDisc, bulkDiscount: bulkDisc
        };
        
        // 1. HITUNG PENGURANGAN STOK (AGGREGATED)
        const deductionsMap = new Map<string, number>();
        
        const processDeduction = (p: Product, mult: number) => {
           if (p.isCombo && p.comboItems) {
              p.comboItems.forEach(ci => { 
                const inner = products.find(ip => ip.id === ci.productId); 
                if (inner) processDeduction(inner, mult * ci.quantity); 
              });
           } else {
              (p.bom || []).forEach(b => {
                 const item = inventory.find(inv => inv.outletId === selectedOutletId && inv.id === b.inventoryItemId);
                 if (item) {
                   const currentDeduction = deductionsMap.get(item.id) || 0;
                   deductionsMap.set(item.id, currentDeduction + (b.quantity * mult));
                 }
              });
           }
        };

        cart.forEach(i => processDeduction(i.product, i.quantity));

        // 2. OPTIMISTIC UPDATE: Langsung update state lokal agar UI berubah seketika
        const localTx = hydrateDates(txPayload);
        setTransactions(prev => [localTx, ...prev]);
        
        if (deductionsMap.size > 0) {
           setInventory(prev => prev.map(inv => {
              const toDeduct = deductionsMap.get(inv.id);
              return toDeduct ? { ...inv, quantity: inv.quantity - toDeduct } : inv;
           }));
        }

        setCart([]); 
        setSelectedCustomerId(null);

        // 3. SINKRONISASI KE CLOUD (BACKGROUND)
        // Jalankan insert transaksi
        await supabase.from('transactions').insert(txPayload);

        // Jalankan update inventory di database
        if (deductionsMap.size > 0) {
           const updates = Array.from(deductionsMap.entries()).map(([id, amount]) => {
              const currentInv = inventory.find(i => i.id === id);
              return { id, quantity: (currentInv?.quantity || 0) - amount };
           });
           await supabase.from('inventory').upsert(updates);
        }

      } catch (err) {
        console.error("Checkout Error:", err);
        // Jika gagal total, opsional: panggil fetchFromCloud untuk reset state ke data asli server
        await fetchFromCloud();
      } finally { 
        setIsSaving(false); 
      }
    },
    clockIn: async (lat, lng, notes) => {
      if (!supabase || !currentUser) return { success: false, message: "Sesi expired." };
      
      const now = new Date();
      const localDay = now.toLocaleDateString('en-CA');
      
      const { data: existing } = await supabase.from('attendance')
        .select('*')
        .eq('staffId', currentUser.id)
        .eq('date', localDay)
        .maybeSingle();

      if (existing) return { success: false, message: "Anda sudah absen hari ini." };
      
      const payload = { 
        id: `att-${Date.now()}`, 
        staffId: currentUser.id, staff_id: currentUser.id,
        staffName: currentUser.name, staff_name: currentUser.name,
        outletId: selectedOutletId, outlet_id: selectedOutletId,
        date: localDay, 
        clockIn: now.toISOString(), clock_in: now.toISOString(),
        status: 'PRESENT', latitude: lat, longitude: lng, notes 
      };

      // INSTANT LOCAL UPDATE
      const localRecord = hydrateDates(payload);
      setAttendance(prev => [...prev, localRecord]);

      // Fire and forget to cloud
      supabase.from('attendance').insert(payload).then(({error}) => {
        if(error) console.error("Cloud ClockIn Error:", error);
      });
      
      return { success: true };
    },
    clockOut: async () => {
      if (!supabase || !currentUser) return;
      const now = new Date();
      
      const { data: activeShift } = await supabase.from('attendance')
        .select('*')
        .eq('staffId', currentUser.id)
        .is('clockOut', null)
        .order('clockIn', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeShift) {
         // INSTANT LOCAL UPDATE
         setAttendance(prev => prev.map(a => a.id === activeShift.id ? { ...a, clockOut: now } : a));
         
         await supabase.from('attendance').update({ 
           clockOut: now.toISOString(), clock_out: now.toISOString() 
         }).eq('id', activeShift.id);
      }
    },
    performClosing: async (actualCash, notes, openingBalance, shiftName) => {
       if(!supabase || !currentUser) return;
       setIsSaving(true);
       try {
          const now = new Date();
          const nowIso = now.toISOString();
          const start = new Date(); start.setHours(0,0,0,0);
          const txs = transactions.filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start);
          const cash = txs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total, 0);
          const qris = txs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+b.total, 0);
          const exp = expenses.filter(e => e.outletId === selectedOutletId && e.staffId === currentUser.id && new Date(e.timestamp) >= start).reduce((a,b)=>a+b.amount, 0);
          const expected = openingBalance + cash - exp;
          
          const closingPayload = { 
             id: `CLS-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser.id, staffName: currentUser.name, 
             timestamp: nowIso, shiftName, openingBalance, 
             totalSalesCash: cash, totalSalesQRIS: qris, totalExpenses: exp, 
             actualCash, discrepancy: actualCash - expected, notes, status: 'APPROVED' 
          };

          // INSTANT LOCAL UPDATE
          setDailyClosings(prev => [hydrateDates(closingPayload), ...prev]);
          setAttendance(prev => prev.map(a => (a.staffId === currentUser.id && !a.clockOut) ? { ...a, clockOut: now } : a));

          await supabase.from('daily_closings').insert(closingPayload);
          await supabase.from('attendance').update({ 
            clockOut: nowIso, clock_out: nowIso 
          }).eq('staffId', currentUser.id).is('clockOut', null);
          
       } finally { setIsSaving(false); }
    },
    resetAttendanceLogs: async () => { if(supabase) { await supabase.from('attendance').delete().neq('id', 'VOID'); setAttendance([]); } },
    resetOutletData: async (oid) => {
       if(!supabase) return;
       setIsSaving(true);
       await Promise.all([
          supabase.from('transactions').delete().match({ outletId: oid }),
          supabase.from('expenses').delete().match({ outletId: oid }),
          supabase.from('attendance').delete().match({ outletId: oid }),
          supabase.from('daily_closings').delete().match({ outletId: oid }),
          supabase.from('purchases').delete().match({ outletId: oid }),
          supabase.from('production_records').delete().match({ outletId: oid }),
          supabase.from('stock_transfers').delete().or(`fromOutletId.eq.${oid},toOutletId.eq.${oid}`)
       ]);
       await fetchFromCloud(); setIsSaving(false);
    },
    resetGlobalData: async () => {
       if(!supabase) return;
       setIsSaving(true);
       const tables = ['transactions', 'expenses', 'attendance', 'leave_requests', 'purchases', 'daily_closings', 'products', 'inventory', 'categories', 'staff', 'outlets', 'customers'];
       await Promise.all(tables.map(t => supabase.from(t).delete().neq('id', 'VOID')));
       await fetchFromCloud(); setIsSaving(false);
    },
    exportTableToCSV: (table) => {
       let data: any[] = [];
       switch(table) {
          case 'products': data = products; break;
          case 'inventory': data = inventory; break;
          case 'transactions': data = transactions; break;
          case 'staff': data = staff; break;
          case 'outlets': data = outlets; break;
          case 'categories': data = categories; break;
          case 'customers': data = customers; break;
          case 'expenses': data = expenses; break;
          case 'expense_types': data = expenseTypes; break;
          case 'daily_closings': data = dailyClosings; break;
          case 'purchases': data = purchases; break;
          case 'attendance': data = attendance; break;
          case 'leave_requests': data = leaveRequests; break;
          case 'stock_transfers': data = stockTransfers; break;
          case 'production_records': data = productionRecords; break;
          case 'membership_tiers': data = membershipTiers; break;
          case 'bulk_discounts': data = bulkDiscounts; break;
          case 'wip_recipes': data = wipRecipes; break;
       }

       if(data.length === 0) return alert(`Data tabel ${table} masih kosong.`);
       
       const headers = Object.keys(data[0]).join(',');
       const rows = data.map(r => 
          Object.values(r).map(v => {
             if (v === null || v === undefined) return '""';
             const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
             return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
       ).join('\n');

       const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `backup_${table}_${new Date().toISOString().split('T')[0]}.csv`;
       a.click();
    },
    importCSVToTable: async (table, csv) => { 
       if (!supabase) return false;
       try {
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          const headers = lines[0].split(',');
          const dataRows = lines.slice(1);
          
          const payload = dataRows.map(row => {
             const values: string[] = [];
             let current = '';
             let inQuotes = false;
             for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"' && row[i + 1] === '"') { current += '"'; i++; }
                else if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { values.push(current); current = ''; }
                else current += char;
             }
             values.push(current);

             const obj: any = {};
             headers.forEach((h, idx) => {
                let val = values[idx]?.trim();
                if (val?.startsWith('"') && val?.endsWith('"')) val = val.substring(1, val.length - 1);
                
                // Smart parsing for Objects/Arrays
                if (val?.startsWith('{') || val?.startsWith('[')) {
                   try { obj[h] = JSON.parse(val); } catch(e) { obj[h] = val; }
                } else {
                   obj[h] = val;
                }
             });
             return obj;
          });

          const { error } = await supabase.from(table).upsert(payload);
          if (error) throw error;
          await fetchFromCloud();
          return true;
       } catch (err) {
          console.error(`Import Error (${table}):`, err);
          return false;
       }
    },
    addStaff: async (s) => { await supabase!.from('staff').insert(s); setStaff(prev => [...prev, hydrateDates(s)]); },
    updateStaff: async (s) => { await supabase!.from('staff').update(s).eq('id', s.id); setStaff(prev => prev.map(m => m.id === s.id ? hydrateDates(s) : m)); if(currentUser?.id === s.id) setCurrentUser(s); },
    deleteStaff: async (id) => { await supabase!.from('staff').delete().eq('id', id); setStaff(prev => prev.filter(m => m.id !== id)); },
    submitLeave: async (l) => { const payload = { ...l, id: `lv-${Date.now()}`, status: 'PENDING', requestedAt: new Date().toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId }; await supabase!.from('leave_requests').insert(payload); setLeaveRequests(prev => [...prev, hydrateDates(payload)]); },
    updateLeaveStatus: async (id, s) => { await supabase!.from('leave_requests').update({ status: s }).eq('id', id); setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status: s } : l)); },
    addProduct: async (p) => { await supabase!.from('products').insert(p); setProducts(prev => [...prev, p]); },
    updateProduct: async (p) => { await supabase!.from('products').update(p).eq('id', p.id); setProducts(prev => prev.map(m => m.id === p.id ? p : m)); },
    deleteProduct: async (id) => { await supabase!.from('products').delete().eq('id', id); setProducts(prev => prev.filter(m => m.id !== id)); },
    addInventoryItem: async (i, oids = []) => { const payloads = (oids.length > 0 ? oids : [selectedOutletId]).map(oid => ({ ...i, id: `inv-${oid}-${Date.now()}`, outletId: oid })); await supabase!.from('inventory').insert(payloads); await fetchFromCloud(); },
    updateInventoryItem: async (i) => { await supabase!.from('inventory').update(i).eq('id', i.id); setInventory(prev => prev.map(m => m.id === i.id ? i : m)); },
    deleteInventoryItem: async (id) => { await supabase!.from('inventory').delete().eq('id', id); setInventory(prev => prev.filter(m => m.id !== id)); },
    addExpense: async (e) => { const payload = { ...e, id: `exp-${Date.now()}`, timestamp: new Date().toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId }; await supabase!.from('expenses').insert(payload); setExpenses(prev => [...prev, hydrateDates(payload)]); },
    updateExpense: async (id, d) => { await supabase!.from('expenses').update(d).eq('id', id); setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...hydrateDates(d) } : e)); },
    deleteExpense: async (id) => { await supabase!.from('expenses').delete().eq('id', id); setExpenses(prev => prev.filter(e => e.id !== id)); },
    addExpenseType: async (n) => { const payload = { id: `et-${Date.now()}`, name: n }; await supabase!.from('expense_types').insert(payload); setExpenseTypes(prev => [...prev, payload]); },
    updateExpenseType: async (id, n) => { await supabase!.from('expense_types').update({ name: n }).eq('id', id); setExpenseTypes(prev => prev.map(t => t.id === id ? { ...t, name: n } : t)); },
    deleteExpenseType: async (id) => { await supabase!.from('expense_types').delete().eq('id', id); setExpenseTypes(prev => prev.filter(t => t.id !== id)); },
    addCategory: async (n) => { const payload = { id: `cat-${Date.now()}`, name: n }; await supabase!.from('categories').insert(payload); setCategories(prev => [...prev, payload]); },
    updateCategory: async (id, n) => { await supabase!.from('categories').update({ name: n }).eq('id', id); setCategories(prev => prev.map(c => c.id === id ? { ...c, name: n } : c)); },
    deleteCategory: async (id) => { await supabase!.from('categories').delete().eq('id', id); setCategories(prev => prev.filter(c => c.id !== id)); },
    addPurchase: async (p) => { 
       const payload = { ...p, id: `pur-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser?.id, staffName: currentUser?.name, timestamp: new Date().toISOString(), itemName: inventory.find(i=>i.id===p.inventoryItemId)?.name, totalPrice: p.quantity * p.unitPrice }; 
       await supabase!.from('purchases').insert(payload); 
       const item = inventory.find(inv => inv.id === p.inventoryItemId); 
       if (item) {
          const newQty = item.quantity + p.quantity;
          await supabase!.from('inventory').update({ quantity: newQty }).eq('id', item.id);
          setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, quantity: newQty } : inv));
       }
       setPurchases(prev => [hydrateDates(payload), ...prev]);
    },
    processProduction: async (d) => {
       if(!supabase || !currentUser) return;
       setIsSaving(true);
       try {
          const payload = { 
             ...d, id: `PROD-${Date.now()}`, timestamp: new Date().toISOString(), 
             staffId: currentUser.id, staffName: currentUser.name, outletId: selectedOutletId 
          };
          await supabase.from('production_records').insert(payload);
          const updates = d.components.map(c => {
             const item = inventory.find(i => i.id === c.inventoryItemId);
             return { id: c.inventoryItemId, quantity: (item?.quantity || 0) - c.quantity };
          });
          const resItem = inventory.find(i => i.id === d.resultItemId);
          if (resItem) updates.push({ id: resItem.id, quantity: (resItem.quantity || 0) + d.resultQuantity });
          await supabase.from('inventory').upsert(updates);
          
          setProductionRecords(prev => [hydrateDates(payload), ...prev]);
          setInventory(prev => prev.map(inv => {
             const up = updates.find(u => u.id === inv.id);
             return up ? { ...inv, quantity: up.quantity } : inv;
          }));
       } finally { setIsSaving(false); }
    },
    addWIPRecipe: async (recipe) => { const payload = { ...recipe, id: `wip-${Date.now()}` }; await supabase!.from('wip_recipes').insert(payload); setWipRecipes(prev => [...prev, hydrateDates(payload)]); },
    updateWIPRecipe: async (recipe) => { await supabase!.from('wip_recipes').update(recipe).eq('id', recipe.id); setWipRecipes(prev => prev.map(r => r.id === recipe.id ? hydrateDates(recipe) : r)); },
    deleteWIPRecipe: async (id) => { await supabase!.from('wip_recipes').delete().eq('id', id); setWipRecipes(prev => prev.filter(r => r.id !== id)); },
    addCustomer: async (c) => { const payload = { ...c, id: `c-${Date.now()}`, points: 0, registeredAt: new Date().toISOString(), registeredByStaffId: currentUser?.id, registeredByStaffName: currentUser?.name, registeredAtOutletId: selectedOutletId }; await supabase!.from('customers').insert(payload); setCustomers(prev => [...prev, hydrateDates(payload)]); },
    updateCustomer: async (c) => { await supabase!.from('customers').update(c).eq('id', c.id); setCustomers(prev => prev.map(cust => cust.id === c.id ? hydrateDates(c) : cust)); },
    deleteCustomer: async (id) => { await supabase!.from('customers').delete().eq('id', id); setCustomers(prev => prev.filter(c => c.id !== id)); },
    addOutlet: async (o) => { await supabase!.from('outlets').insert(o); setOutlets(prev => [...prev, hydrateDates(o)]); },
    updateOutlet: async (o) => { await supabase!.from('outlets').update(o).eq('id', o.id); setOutlets(prev => prev.map(out => out.id === o.id ? hydrateDates(o) : out)); },
    deleteOutlet: async (id) => { await supabase!.from('outlets').delete().eq('id', id); setOutlets(prev => prev.filter(o => o.id !== id)); },
    transferStock: async (f, t, i, q) => { 
       if(!supabase || !currentUser) return;
       setIsSaving(true);
       try {
          const fromItem = inventory.find(inv => inv.outletId === f && inv.name === i);
          const toItem = inventory.find(inv => inv.outletId === t && inv.name === i);
          if (fromItem && toItem) {
             const fromOutletName = outlets.find(o => o.id === f)?.name || f;
             const toOutletName = outlets.find(o => o.id === t)?.name || t;
             const payload = {
                id: `TRF-${Date.now()}`, fromOutletId: f, fromOutletName, toOutletId: t, toOutletName,
                itemName: i, quantity: q, unit: fromItem.unit, timestamp: new Date().toISOString(),
                staffId: currentUser.id, staffName: currentUser.name
             };
             await supabase.from('stock_transfers').insert(payload);
             await supabase.from('inventory').upsert([
                { id: fromItem.id, quantity: fromItem.quantity - q },
                { id: toItem.id, quantity: toItem.quantity + q }
             ]);
             setStockTransfers(prev => [hydrateDates(payload), ...prev]);
             setInventory(prev => prev.map(inv => {
                if (inv.id === fromItem.id) return { ...inv, quantity: inv.quantity - q };
                if (inv.id === toItem.id) return { ...inv, quantity: inv.quantity + q };
                return inv;
             }));
          }
       } finally { setIsSaving(false); }
    },
    addMembershipTier: async (t) => { const payload = { ...t, id: `t-${Date.now()}` }; await supabase!.from('membership_tiers').insert(payload); setMembershipTiers(prev => [...prev, payload]); },
    updateMembershipTier: async (t) => { await supabase!.from('membership_tiers').update(t).eq('id', t.id); setMembershipTiers(prev => prev.map(tier => tier.id === t.id ? t : tier)); },
    deleteMembershipTier: async (id) => { await supabase!.from('membership_tiers').delete().eq('id', id); setMembershipTiers(prev => prev.filter(t => t.id !== id)); },
    addBulkDiscount: async (r) => { const payload = { ...r, id: `r-${Date.now()}` }; await supabase!.from('bulk_discounts').insert(payload); setBulkDiscounts(prev => [...prev, payload]); },
    updateBulkDiscount: async (r) => { await supabase!.from('bulk_discounts').update(r).eq('id', r.id); setBulkDiscounts(prev => prev.map(rule => rule.id === r.id ? r : rule)); },
    deleteBulkDiscount: async (id) => { await supabase!.from('bulk_discounts').delete().eq('id', id); setBulkDiscounts(prev => prev.filter(r => r.id !== id)); },
    saveSimulation: async (s) => { await supabase!.from('simulations').upsert(s); setSimulations(prev => { const others = prev.filter(item => item.id !== s.id); return [...others, hydrateDates(s)]; }); },
    deleteSimulation: async (id) => { await supabase!.from('simulations').delete().eq('id', id); setSimulations(prev => prev.filter(s => s.id !== id)); },
    updateLoyaltyConfig: async (c) => { await supabase!.from('loyalty_config').upsert({ ...c, id: 'global' }); setLoyaltyConfig(c); },
    voidTransaction: async (txId) => { await supabase!.from('transactions').update({ status: OrderStatus.VOIDED }).eq('id', txId); setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: OrderStatus.VOIDED } : tx)); },
    cloneOutletSetup: async (fid, tid) => {
       if(!supabase) return;
       setIsSaving(true);
       try {
          const items = inventory.filter(i => i.outletId === fid);
          const payloads = items.map(i => ({ ...i, id: `inv-${tid}-${Date.now()}-${Math.random()}`, outletId: tid, quantity: 0 }));
          await supabase.from('inventory').insert(payloads);
          await fetchFromCloud();
       } finally { setIsSaving(false); }
    },
    updateSupabaseConfig: (c) => { },
    syncToCloud: () => { fetchFromCloud(); },
    selectCustomer: setSelectedCustomerId,
    setConnectedPrinter
  };

  return (
    <AppContext.Provider value={{ ...actions, products, categories, inventory, stockTransfers, stockRequests, productionRecords, wipRecipes, transactions, filteredTransactions: selectedOutletId === 'all' ? transactions : transactions.filter(tx => tx.outletId === selectedOutletId), outlets, currentUser, isAuthenticated, loginTime, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, isSaving, isCloudConnected, isInitialLoading, supabaseConfig }}>
      {isInitialLoading ? (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
           <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Enterprise Cloud Engine...</p>
        </div>
      ) : children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
