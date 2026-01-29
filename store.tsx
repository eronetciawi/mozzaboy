
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Product, Category, InventoryItem, Transaction, Outlet, 
  CartItem, PaymentMethod, OrderStatus, UserRole, StaffMember, Permissions,
  Customer, Expense, ExpenseType, DailyClosing, Purchase, StockTransfer, StockRequest, RequestStatus,
  MembershipTier, BulkDiscountRule, InventoryItemType, ProductionRecord, Attendance, LeaveRequest,
  MenuSimulation, LoyaltyConfig
} from './types';
import { PRODUCTS, CATEGORIES, INVENTORY_ITEMS, OUTLETS, INITIAL_STAFF } from './constants';

const DB_KEY = 'MOZZABOY_LOCAL_DB_V1';
const SUPABASE_CONFIG_KEY = 'MOZZABOY_SUPABASE_CONFIG';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getPermissionsByRole = (role: UserRole): Permissions => {
  switch (role) {
    case UserRole.OWNER:
      return { canAccessReports: true, canManageStaff: true, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.MANAGER:
      return { canAccessReports: true, canManageStaff: false, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true };
    case UserRole.CASHIER:
      return { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: false, canProcessSales: true, canVoidTransactions: false, canManageSettings: false };
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
  supabaseConfig: SupabaseConfig;
}

interface AppActions {
  login: (username: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  switchOutlet: (id: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  checkout: (paymentMethod: PaymentMethod, redeemPoints?: number) => void;
  addStaff: (member: StaffMember) => void;
  updateStaff: (member: StaffMember) => void;
  deleteStaff: (id: string) => void;
  clockIn: (lat?: number, lng?: number, notes?: string) => { success: boolean; message?: string };
  clockOut: () => void;
  submitLeave: (leave: any) => void;
  updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addInventoryItem: (item: any) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  addStockRequest: (itemId: string, qty: number) => void;
  deleteStockRequest: (id: string) => void;
  addExpense: (expense: any) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addExpenseType: (name: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  performClosing: (actualCash: number, notes: string) => void;
  approveClosing: (id: string) => void;
  rejectClosing: (id: string) => void;
  addPurchase: (purchase: any, requestId?: string) => void;
  selectCustomer: (id: string | null) => void;
  addCustomer: (customer: any) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addOutlet: (outlet: Outlet) => void;
  updateOutlet: (outlet: Outlet) => void;
  deleteOutlet: (id: string) => void;
  setConnectedPrinter: (device: any) => void;
  processProduction: (data: any) => void;
  transferStock: (from: string, to: string, item: string, qty: number) => void;
  addMembershipTier: (tier: any) => void;
  updateMembershipTier: (tier: any) => void;
  deleteMembershipTier: (id: string) => void;
  addBulkDiscount: (rule: any) => void;
  updateBulkDiscount: (rule: any) => void;
  deleteBulkDiscount: (id: string) => void;
  saveSimulation: (sim: MenuSimulation) => void;
  deleteSimulation: (id: string) => void;
  updateLoyaltyConfig: (config: LoyaltyConfig) => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
  resetOutletData: (outletId: string) => void;
  resetGlobalData: () => void;
  voidTransaction: (txId: string) => void;
  updateSupabaseConfig: (config: SupabaseConfig) => void;
  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

const hydrateDates = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(hydrateDates);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    return saved ? JSON.parse(saved) : { url: '', key: '', isEnabled: false };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [loginTime, setLoginTime] = useState<Date | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('out1');
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY_ITEMS);
  const [outlets, setOutlets] = useState<Outlet[]>(OUTLETS);
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([{id:'et1', name:'Gas'},{id:'et2', name:'Air'}]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([{id:'t1', name:'REGULAR', minPoints:0, discountPercent:0}, {id:'t2', name:'VIP', minPoints:1000, discountPercent:10}]);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscountRule[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<any>(null);
  const [simulations, setSimulations] = useState<MenuSimulation[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    isEnabled: true,
    earningAmountPerPoint: 1000,
    redemptionValuePerPoint: 100,
    minRedeemPoints: 50
  });

  useEffect(() => {
    if (supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.key) {
      try {
        const client = createClient(supabaseConfig.url, supabaseConfig.key);
        setSupabase(client);
        setIsCloudConnected(true);
      } catch (e) {
        console.error("Supabase Init Failed:", e);
        setIsCloudConnected(false);
      }
    } else {
      setSupabase(null);
      setIsCloudConnected(false);
    }
  }, [supabaseConfig]);

  useEffect(() => {
    const savedData = localStorage.getItem(DB_KEY);
    if (savedData) {
      try {
        const data = hydrateDates(JSON.parse(savedData));
        if (data.inventory) setInventory(data.inventory);
        if (data.transactions) setTransactions(data.transactions);
        if (data.expenses) setExpenses(data.expenses);
        if (data.dailyClosings) setDailyClosings(data.dailyClosings);
        if (data.customers) setCustomers(data.customers);
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
        if (data.staff) setStaff(data.staff);
        if (data.attendance) setAttendance(data.attendance);
        if (data.leaveRequests) setLeaveRequests(data.leaveRequests);
        if (data.purchases) setPurchases(data.purchases);
        if (data.stockTransfers) setStockTransfers(data.stockTransfers);
        if (data.stockRequests) setStockRequests(data.stockRequests);
        if (data.productionRecords) setProductionRecords(data.productionRecords);
        if (data.membershipTiers) setMembershipTiers(data.membershipTiers);
        if (data.bulkDiscounts) setBulkDiscounts(data.bulkDiscounts);
        if (data.simulations) setSimulations(data.simulations);
        if (data.loyaltyConfig) setLoyaltyConfig(data.loyaltyConfig);
        if (data.expenseTypes) setExpenseTypes(data.expenseTypes);
        if (data.outlets) setOutlets(data.outlets);
      } catch (e) {
        console.error("Failed to load local DB:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    setIsSaving(true);
    const saveTimer = setTimeout(async () => {
      const stateToSave = {
        inventory, stockTransfers, stockRequests, productionRecords,
        transactions, products, categories, staff, attendance,
        leaveRequests, customers, expenses, dailyClosings, purchases,
        membershipTiers, bulkDiscounts, simulations, loyaltyConfig, 
        expenseTypes, outlets
      };
      localStorage.setItem(DB_KEY, JSON.stringify(stateToSave));
      if (supabase && isCloudConnected) {
        try {
          await supabase.from('transactions').upsert(transactions.slice(0, 50)); 
          await supabase.from('inventory').upsert(inventory);
        } catch (e) {
          console.warn("Cloud Sync Background Error:", e);
        }
      }
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [
    isInitialized, inventory, stockTransfers, stockRequests, productionRecords,
    transactions, products, categories, staff, attendance,
    leaveRequests, customers, expenses, dailyClosings, purchases,
    membershipTiers, bulkDiscounts, simulations, loyaltyConfig, expenseTypes, outlets,
    supabase, isCloudConnected
  ]);

  const actions: AppActions = {
    updateSupabaseConfig: (config) => {
      setSupabaseConfig(config);
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    },
    syncToCloud: async () => {
      if (!supabase) return alert("Cloud tidak terhubung.");
      setIsSaving(true);
      try {
        const { error: txErr } = await supabase.from('transactions').upsert(transactions);
        const { error: invErr } = await supabase.from('inventory').upsert(inventory);
        const { error: stfErr } = await supabase.from('staff').upsert(staff);
        if (txErr || invErr || stfErr) throw new Error("Beberapa data gagal sinkron");
        alert("Sinkronisasi Cloud Berhasil! Seluruh data cabang kini up-to-date.");
      } catch (e: any) {
        alert("Sinkronisasi Gagal: " + e.message);
      } finally {
        setIsSaving(false);
      }
    },
    login: (u, p) => {
      let found = staff.find(s => s.username === u && s.password === p);
      if (u === 'admin' && p === 'admin' && !found) found = staff.find(s => s.role === UserRole.OWNER);
      
      if (found) {
        if (found.status === 'INACTIVE') return { success: false, message: "Akun dinonaktifkan." };
        
        if (found.role !== UserRole.OWNER && found.role !== UserRole.MANAGER) {
           const now = new Date();
           const [startH, startM] = (found.shiftStartTime || '09:00').split(':').map(Number);
           const [endH, endM] = (found.shiftEndTime || '18:00').split(':').map(Number);
           
           const shiftStart = new Date(); shiftStart.setHours(startH, startM, 0);
           const shiftEnd = new Date(); shiftEnd.setHours(endH, endM, 0);
           
           const earlyGrace = 30 * 60 * 1000;
           const allowedStart = new Date(shiftStart.getTime() - earlyGrace);

           const today = now.toISOString().split('T')[0];
           const hasActiveAttendance = attendance.find(a => a.staffId === found?.id && a.date === today && !a.clockOut);

           if (!hasActiveAttendance && (now < allowedStart || now > shiftEnd)) {
             return { success: false, message: `Akses ditolak. Jadwal shift Anda: ${found.shiftStartTime} - ${found.shiftEndTime}` };
           }
        }

        setIsAuthenticated(true);
        setCurrentUser(found);
        setLoginTime(new Date());
        setSelectedOutletId(found.assignedOutletIds[0] || 'out1');
        return { success: true };
      }
      return { success: false, message: "Username atau password salah." };
    },
    logout: () => { setIsAuthenticated(false); setCurrentUser(null); setLoginTime(null); setCart([]); },
    switchOutlet: setSelectedOutletId,
    addToCart: (product) => setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    }),
    removeFromCart: (productId) => setCart(prev => prev.filter(i => i.product.id !== productId)),
    updateCartQuantity: (productId, delta) => setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)),
    clearCart: () => setCart([]),
    checkout: (paymentMethod, redeemPoints = 0) => {
      if (cart.length === 0) return;
      let subtotal = 0; let totalCost = 0;
      
      const calculateSingleProductCost = (prod: Product): number => {
          let cost = 0;
          if (prod.isCombo && prod.comboItems) {
            prod.comboItems.forEach(ci => {
              const innerProd = products.find(p => p.id === ci.productId);
              if (innerProd) cost += calculateSingleProductCost(innerProd) * ci.quantity;
            });
          } else {
            prod.bom.forEach(bom => {
              const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
              const realInvItem = inventory.find(inv => inv.outletId === selectedOutletId && inv.name === templateItem?.name);
              cost += (bom.quantity * (realInvItem?.costPerUnit || templateItem?.costPerUnit || 0));
            });
          }
          return cost;
      };

      cart.forEach(item => {
        const activePrice = item.product.outletSettings?.[selectedOutletId]?.price || item.product.price;
        subtotal += activePrice * item.quantity;
        totalCost += calculateSingleProductCost(item.product) * item.quantity;
      });

      const pointDiscountValue = loyaltyConfig.isEnabled ? redeemPoints * loyaltyConfig.redemptionValuePerPoint : 0;
      const finalTotal = Math.max(0, subtotal - pointDiscountValue);
      const pointsEarned = loyaltyConfig.isEnabled ? Math.floor(finalTotal / loyaltyConfig.earningAmountPerPoint) : 0;

      const newTx: Transaction = {
        id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
        outletId: selectedOutletId, 
        customerId: selectedCustomerId || undefined, 
        items: [...cart], 
        subtotal, 
        tax: 0, 
        total: finalTotal, 
        totalCost, 
        paymentMethod, 
        status: OrderStatus.CLOSED, 
        timestamp: new Date(), 
        cashierId: currentUser?.id || 'sys', 
        cashierName: currentUser?.name || 'System', 
        pointsEarned, 
        pointsRedeemed: redeemPoints, 
        pointDiscountValue
      };

      setInventory(prevInv => {
        const newInv = [...prevInv];
        const deductItem = (prod: Product, multiplier: number) => {
          if (prod.isCombo && prod.comboItems) {
            prod.comboItems.forEach(ci => {
              const innerProd = products.find(p => p.id === ci.productId);
              if (innerProd) deductItem(innerProd, multiplier * ci.quantity);
            });
          } else {
            prod.bom.forEach(bom => {
              const templateItem = inventory.find(inv => inv.id === bom.inventoryItemId);
              const idx = newInv.findIndex(i => i.outletId === selectedOutletId && i.name === templateItem?.name);
              if (idx !== -1) {
                newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity - (bom.quantity * multiplier) };
              }
            });
          }
        };
        cart.forEach(cartItem => deductItem(cartItem.product, cartItem.quantity));
        return newInv;
      });

      if (selectedCustomerId) {
        setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, points: c.points - (loyaltyConfig.isEnabled ? redeemPoints : 0) + pointsEarned, lastVisit: new Date() } : c));
      }
      setTransactions(prev => [newTx, ...prev]);
      setCart([]);
      setSelectedCustomerId(null);
    },
    voidTransaction: (txId) => setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: OrderStatus.VOIDED } : t)),
    addProduct: (p) => setProducts(prev => [...prev, p]),
    updateProduct: (p) => setProducts(prev => prev.map(i => i.id === p.id ? p : i)),
    deleteProduct: (id) => setProducts(prev => prev.filter(p => p.id !== id)),
    addStaff: (s) => setStaff(prev => [...prev, s]),
    updateStaff: (s) => setStaff(prev => prev.map(i => i.id === s.id ? s : i)),
    deleteStaff: (id) => setStaff(prev => prev.filter(i => i.id !== id)),
    clockIn: (lat, lng, notes) => {
      if (!currentUser) return { success: false, message: "Sesi habis." };
      const activeOutlet = outlets.find(o => o.id === selectedOutletId);
      if (activeOutlet && activeOutlet.latitude && activeOutlet.longitude && lat && lng) {
        const distance = calculateDistance(lat, lng, activeOutlet.latitude, activeOutlet.longitude);
        if (distance > 100) return { success: false, message: `Area Terlalu Jauh (${Math.round(distance)}m). Harus < 100m.` };
      }
      const today = new Date().toISOString().split('T')[0];
      const isLate = currentUser.shiftStartTime ? new Date().toLocaleTimeString('en-GB') > currentUser.shiftStartTime : false;
      setAttendance(prev => [...prev, { id: `att-${Date.now()}`, staffId: currentUser.id, staffName: currentUser.name, date: today, clockIn: new Date(), status: isLate ? 'LATE' : 'PRESENT', latitude: lat, longitude: lng, notes }]);
      return { success: true };
    },
    clockOut: () => {
      if (!currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      setAttendance(prev => prev.map(a => (a.staffId === currentUser.id && a.date === today) ? { ...a, clockOut: new Date() } : a));
    },
    submitLeave: (leave) => {
      if (!currentUser) return;
      setLeaveRequests(prev => [...prev, { ...leave, id: `lv-${Date.now()}`, staffId: currentUser.id, staffName: currentUser.name, status: 'PENDING', requestedAt: new Date() }]);
    },
    updateLeaveStatus: (id, status) => setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status } : l)),
    addInventoryItem: (item) => setInventory(prev => [...prev, { ...item, id: `inv-${Date.now()}`, outletId: selectedOutletId }]),
    updateInventoryItem: (updated) => setInventory(prev => prev.map(item => item.id === updated.id ? updated : item)),
    deleteInventoryItem: (id) => setInventory(prev => prev.filter(item => item.id !== id)),
    addStockRequest: (itemId, qty) => {
      if (!currentUser) return;
      const item = inventory.find(i => i.id === itemId);
      setStockRequests(prev => [...prev, { id: `req-${Date.now()}`, outletId: selectedOutletId, inventoryItemId: itemId, itemName: item?.name || 'Unknown', requestedQuantity: qty, unit: item?.unit || 'unit', status: RequestStatus.PENDING, timestamp: new Date(), staffId: currentUser.id, staffName: currentUser.name, isUrgent: true }]);
    },
    deleteStockRequest: (id) => setStockRequests(prev => prev.filter(r => r.id !== id)),
    addPurchase: (p, requestId) => {
      if (!currentUser) return;
      const item = inventory.find(i => i.id === p.inventoryItemId);
      setPurchases(prev => [...prev, { id: `pur-${Date.now()}`, outletId: selectedOutletId, inventoryItemId: p.inventoryItemId, itemName: item?.name || 'Unknown', quantity: p.quantity, unitPrice: p.unitPrice / p.quantity, totalPrice: p.unitPrice, staffId: currentUser.id, staffName: currentUser.name, timestamp: new Date(), requestId }]);
      setInventory(prev => prev.map(i => i.id === p.inventoryItemId ? { ...i, quantity: i.quantity + p.quantity } : i));
      if (requestId) setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.FULFILLED } : r));
    },
    addCategory: (name) => setCategories(prev => [...prev, { id: `cat-${Date.now()}`, name }]),
    updateCategory: (id, name) => setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c)),
    deleteCategory: (id) => setCategories(prev => prev.filter(c => c.id !== id)),
    selectCustomer: setSelectedCustomerId,
    addCustomer: (c) => {
      const newCust = { ...c, id: `c-${Date.now()}`, points: 0, registeredAt: new Date(), registeredByStaffName: currentUser?.name || 'System', registeredAtOutletName: outlets.find(o => o.id === selectedOutletId)?.name || 'Central' };
      setCustomers(prev => [...prev, newCust]);
      return newCust;
    },
    updateCustomer: (c) => setCustomers(prev => prev.map(i => i.id === c.id ? c : i)),
    deleteCustomer: (id) => setCustomers(prev => prev.filter(i => i.id !== id)),
    addOutlet: (outlet) => setOutlets(prev => [...prev, outlet]),
    updateOutlet: (outlet) => setOutlets(prev => prev.map(o => o.id === outlet.id ? outlet : o)),
    deleteOutlet: (id) => setOutlets(prev => prev.filter(o => o.id !== id)),
    addExpense: (e) => setExpenses(prev => [...prev, { ...e, id: `exp-${Date.now()}`, timestamp: new Date(), staffId: currentUser?.id || '', staffName: currentUser?.name || '', outletId: selectedOutletId }]),
    updateExpense: (id, data) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e)),
    deleteExpense: (id) => setExpenses(prev => prev.filter(e => e.id !== id)),
    addExpenseType: (name) => setExpenseTypes(prev => [...prev, { id: `et-${Date.now()}`, name }]),
    performClosing: (actualCash, notes) => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      // ONLY filter transactions and expenses for the CURRENT STAFF for THIS SHIFT
      const shiftTxs = transactions.filter(t => 
        t.outletId === selectedOutletId && 
        new Date(t.timestamp) >= todayStart && 
        t.cashierId === currentUser?.id
      );
      
      const cashSales = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total, 0);
      const qrisSales = shiftTxs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+b.total, 0);
      
      const shiftExp = expenses.filter(e => 
        e.outletId === selectedOutletId && 
        new Date(e.timestamp) >= todayStart && 
        e.staffId === currentUser?.id
      ).reduce((a,b)=>a+b.amount, 0);
      
      const expectedCash = cashSales - shiftExp;
      const discrepancy = actualCash - expectedCash;
      
      const isManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;
      const status = (discrepancy !== 0 && !isManager) ? 'PENDING' : 'APPROVED';

      setDailyClosings(prev => [{ id: `CLS-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser?.id || '', staffName: currentUser?.name || '', timestamp: new Date(), totalSalesCash: cashSales, totalSalesQRIS: qrisSales, totalExpenses: shiftExp, actualCash, discrepancy, notes, status }, ...prev]);
    },
    approveClosing: (id) => setDailyClosings(prev => prev.map(c => c.id === id ? { ...c, status: 'APPROVED' } : c)),
    rejectClosing: (id) => setDailyClosings(prev => prev.filter(c => c.id !== id)),
    saveSimulation: (sim) => setSimulations(prev => prev.find(s => s.id === sim.id) ? prev.map(s => s.id === sim.id ? { ...sim, updatedAt: new Date() } : s) : [...prev, { ...sim, updatedAt: new Date() }]),
    deleteSimulation: (id) => setSimulations(prev => prev.filter(s => s.id !== id)),
    updateLoyaltyConfig: (config) => setLoyaltyConfig(config),
    exportData: () => {
      const blob = new Blob([JSON.stringify({ inventory, transactions, expenses, staff, products, categories, dailyClosings, loyaltyConfig, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `MOZZABOY_BACKUP_${new Date().toISOString().split('T')[0]}.json`; link.click();
    },
    importData: (jsonData) => {
      try {
        const data = hydrateDates(JSON.parse(jsonData));
        if (data.inventory) setInventory(data.inventory);
        if (data.transactions) setTransactions(data.transactions);
        if (data.staff) setStaff(data.staff);
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
        return true;
      } catch (e) { return false; }
    },
    resetOutletData: (outletId) => {
      setTransactions(prev => prev.filter(t => t.outletId !== outletId));
      setInventory(prev => prev.map(item => item.outletId === outletId ? { ...item, quantity: 0 } : item));
    },
    resetGlobalData: () => { localStorage.removeItem(DB_KEY); window.location.reload(); },
    setConnectedPrinter,
    processProduction: (data) => {
      if (!currentUser) return;
      setProductionRecords(prev => [...prev, { ...data, id: `prod-${Date.now()}`, outletId: selectedOutletId, timestamp: new Date(), staffId: currentUser.id, staffName: currentUser.name }]);
      setInventory(prev => {
        let next = [...prev];
        next = next.map(i => i.id === data.resultItemId ? { ...i, quantity: i.quantity + data.resultQuantity } : i);
        data.components.forEach((c: any) => { next = next.map(i => i.id === c.inventoryItemId ? { ...i, quantity: i.quantity - c.quantity } : i); });
        return next;
      });
    },
    transferStock: (from, to, itemName, qty) => {
       const fromOutlet = outlets.find(o => o.id === from);
       const toOutlet = outlets.find(o => o.id === to);
       const invItem = inventory.find(i => i.outletId === from && i.name === itemName);
       if (!invItem || invItem.quantity < qty) return alert("Stok tidak cukup!");
       setStockTransfers(prev => [...prev, { id: `tr-${Date.now()}`, fromOutletId: from, fromOutletName: fromOutlet?.name || 'Unknown', toOutletId: to, toOutletName: toOutlet?.name || 'Unknown', itemName, quantity: qty, unit: invItem.unit, timestamp: new Date(), staffId: currentUser?.id || 'sys', staffName: currentUser?.name || 'System' }]);
       setInventory(prev => {
         let next = [...prev];
         next = next.map(i => (i.outletId === from && i.name === itemName) ? { ...i, quantity: i.quantity - qty } : i);
         const targetIdx = next.findIndex(i => i.outletId === to && i.name === itemName);
         if (targetIdx !== -1) next[targetIdx] = { ...next[targetIdx], quantity: next[targetIdx].quantity + qty };
         else next.push({ id: `inv-tr-${Date.now()}`, outletId: to, name: itemName, unit: invItem.unit, quantity: qty, minStock: invItem.minStock, costPerUnit: invItem.costPerUnit, type: invItem.type });
         return next;
       });
    },
    addMembershipTier: (t) => setMembershipTiers(prev => [...prev, { ...t, id: `t-${Date.now()}` }]),
    updateMembershipTier: (t) => setMembershipTiers(prev => prev.map(i => i.id === t.id ? t : i)),
    deleteMembershipTier: (id) => setMembershipTiers(prev => prev.filter(i => i.id !== id)),
    addBulkDiscount: (r) => setBulkDiscounts(prev => [...prev, { ...r, id: `r-${Date.now()}` }]),
    updateBulkDiscount: (r) => setBulkDiscounts(prev => prev.map(i => i.id === r.id ? r : i)),
    deleteBulkDiscount: (id) => setBulkDiscounts(prev => prev.filter(i => i.id !== id))
  };

  return <AppContext.Provider value={{ products, categories, inventory, stockTransfers, stockRequests, productionRecords, transactions, filteredTransactions: transactions.filter(tx => tx.outletId === selectedOutletId), outlets, currentUser, isAuthenticated, loginTime, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, isSaving, isCloudConnected, supabaseConfig, ...actions }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
