
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Product, Category, InventoryItem, Transaction, Outlet, 
  CartItem, PaymentMethod, OrderStatus, UserRole, StaffMember, Permissions,
  Customer, Expense, ExpenseType, DailyClosing, Purchase, StockTransfer, StockRequest, RequestStatus,
  MembershipTier, BulkDiscountRule, InventoryItemType, ProductionRecord, Attendance, LeaveRequest,
  MenuSimulation, LoyaltyConfig, WIPRecipe, BrandConfig
} from './types';
import { PRODUCTS, INVENTORY_ITEMS, OUTLETS, INITIAL_STAFF } from './constants';

const STORAGE_USER_KEY = 'foodos_session_user';
const STORAGE_OUTLET_KEY = 'foodos_active_outlet';
const STORAGE_MANIFEST_KEY = 'mozzaboy_system_cache';

const SUPABASE_URL = 'https://qpawptimafvxhppeuqel.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_Kaye1xn88d9J_S9A32t4AA_e2ZIz2Az'; 

const getSyncCache = () => {
  try {
    const cached = localStorage.getItem(STORAGE_MANIFEST_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) { return {}; }
};

const initialCache = getSyncCache();

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

export const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

interface AppState {
  products: Product[]; categories: Category[]; inventory: InventoryItem[]; stockTransfers: StockTransfer[]; stockRequests: StockRequest[]; productionRecords: ProductionRecord[]; wipRecipes: WIPRecipe[]; transactions: Transaction[]; filteredTransactions: Transaction[]; outlets: Outlet[]; currentUser: StaffMember | null; isAuthenticated: boolean; loginTime: Date | null; cart: CartItem[]; staff: StaffMember[]; attendance: Attendance[]; leaveRequests: LeaveRequest[]; selectedOutletId: string; customers: Customer[]; selectedCustomerId: string | null; expenses: Expense[]; expenseTypes: ExpenseType[]; dailyClosings: DailyClosing[]; purchases: Purchase[]; connectedPrinter: any | null; membershipTiers: MembershipTier[]; bulkDiscounts: BulkDiscountRule[]; simulations: MenuSimulation[]; loyaltyConfig: LoyaltyConfig; brandConfig: BrandConfig; isSaving: boolean; isInitialLoading: boolean; isDbConnected: boolean;
}

interface AppActions {
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>; logout: () => void; clearSession: () => void; switchOutlet: (id: string) => void; addToCart: (product: Product) => void; removeFromCart: (productId: string) => void; updateCartQuantity: (productId: string, delta: number) => void; clearCart: () => void; checkout: (paymentMethod: PaymentMethod, redeemPoints?: number, membershipDiscount?: number, bulkDiscount?: number) => Promise<void>; addStaff: (member: StaffMember) => Promise<void>; updateStaff: (member: StaffMember) => Promise<void>; deleteStaff: (id: string) => Promise<void>; clockIn: (lat?: number, lng?: number, notes?: string) => Promise<{ success: boolean; message?: string }>; clockOut: () => Promise<void>; submitLeave: (leave: any) => Promise<void>; updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>; addProduct: (product: Product) => Promise<void>; updateProduct: (product: Product) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addInventoryItem: (item: any, outletIds?: string[]) => Promise<void>; updateInventoryItem: (item: InventoryItem) => Promise<void>; deleteInventoryItem: (id: string) => Promise<void>; performClosing: (actualCash: number, notes: string, openingBalance: number, shiftName: string) => Promise<void>; addPurchase: (purchase: { inventoryItemId: string; quantity: number; unitPrice: number; requestId?: string }) => Promise<void>; selectCustomer: (id: string | null) => void; addCustomer: (customer: any) => Promise<void>; updateCustomer: (customer: Customer) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; addOutlet: (outlet: Outlet) => Promise<void>; updateOutlet: (outlet: Outlet) => Promise<void>; deleteOutlet: (id: string) => Promise<void>; setConnectedPrinter: (device: any) => void; processProduction: (data: { resultItemId: string; resultQuantity: number; components: { inventoryItemId: string; quantity: number }[] }) => Promise<void>; addWIPRecipe: (recipe: Omit<WIPRecipe, 'id'>) => Promise<void>; updateWIPRecipe: (recipe: WIPRecipe) => Promise<void>; deleteWIPRecipe: (id: string) => Promise<void>; transferStock: (from: string, to: string, item: string, qty: number) => Promise<void>; respondToTransfer: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>; addMembershipTier: (tier: any) => Promise<void>; updateMembershipTier: (tier: any) => Promise<void>; deleteMembershipTier: (id: string) => Promise<void>; addBulkDiscount: (rule: any) => Promise<void>; updateBulkDiscount: (rule: any) => Promise<void>; deleteBulkDiscount: (id: string) => Promise<void>; saveSimulation: (sim: MenuSimulation) => Promise<void>; deleteSimulation: (id: string) => Promise<void>; updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>; updateBrandConfig: (config: BrandConfig) => Promise<void>; resetOutletData: (outletId: string) => Promise<void>; voidTransaction: (txId: string) => Promise<void>; fetchFromCloud: () => Promise<void>; resetGlobalData: () => Promise<void>; resetAttendanceLogs: () => Promise<void>; syncToCloud: () => void; exportTableToCSV: (table: string) => void; importCSVToTable: (table: string, csv: string) => Promise<boolean>; addExpense: (expense: any) => Promise<void>; updateExpense: (id: string, d: Partial<Expense>) => Promise<void>; deleteExpense: (id: string) => Promise<void>; addExpenseType: (name: string) => Promise<void>; updateExpenseType: (id: string, name: string) => Promise<void>; deleteExpenseType: (id: string) => Promise<void>; addCategory: (name: string) => Promise<void>; updateCategory: (id: string, name: string) => Promise<void>; deleteCategory: (id: string) => Promise<void>; reorderCategories: (newList: Category[]) => Promise<void>;
  exportSystemBackup: () => Promise<void>;
  importSystemBackup: (jsonString: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

const hydrateDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(hydrateDates);
  const newObj: any = {};
  for (const key in obj) {
    const val = obj[key];
    if (key === 'date') { newObj[key] = val; continue; }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      newObj[key] = isNaN(d.getTime()) ? val : d;
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      newObj[key] = hydrateDates(val);
    } else {
      newObj[key] = val;
    }
  }
  return newObj;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialLoading, setIsInitialLoading] = useState(() => !localStorage.getItem(STORAGE_MANIFEST_KEY));
  const [isSaving, setIsSaving] = useState(false);
  const isFirstLoadRef = useRef(true);

  const [products, setProducts] = useState<Product[]>(initialCache.products || PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(initialCache.categories || []);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialCache.inventory || INVENTORY_ITEMS);
  const [outlets, setOutlets] = useState<Outlet[]>(initialCache.outlets || OUTLETS);
  const [staff, setStaff] = useState<StaffMember[]>(initialCache.staff || INITIAL_STAFF);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(initialCache.expenseTypes || []);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [wipRecipes, setWipRecipes] = useState<WIPRecipe[]>(initialCache.wipRecipes || []);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>(initialCache.membershipTiers || []);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscountRule[]>(initialCache.bulkDiscounts || []);
  const [simulations, setSimulations] = useState<MenuSimulation[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(initialCache.loyaltyConfig || { isEnabled: true, earningAmountPerPoint: 1000, redemptionValuePerPoint: 100, minRedeemPoints: 50 });
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(initialCache.brandConfig || { name: 'Mozza Boy', tagline: 'Premium Korean Street Food', logoUrl: '', primaryColor: '#f97316' });

  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_USER_KEY);
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return (initialCache.staff || INITIAL_STAFF).find((s: any) => s.id === parsed.id || s.username === parsed.username) || parsed;
    } catch (e) { return null; }
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem(STORAGE_USER_KEY) !== null);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => localStorage.getItem(STORAGE_OUTLET_KEY) || 'out1');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setOrderCart] = useState<CartItem[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<any>(null);
  const [loginTime, setLoginTime] = useState<Date | null>(null);

  const safeFetch = async (table: string, setter: (data: any) => void) => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      if (data && data.length > 0) setter(hydrateDates(data));
      return data;
    } catch (e: any) {
      return null;
    }
  };

  const fetchFromCloud = async () => {
    const fallbackTimer = setTimeout(() => { setIsInitialLoading(false); }, 1000);
    try {
      const [brand, loyalty, staffData, outletsData, cats, prods, inv, expT, tiers, bulk, recipes] = await Promise.all([
        supabase.from('brand_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('staff').select('*'),
        supabase.from('outlets').select('*'),
        supabase.from('categories').select('*').order('sortOrder'),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('expense_types').select('*'),
        supabase.from('membership_tiers').select('*'),
        supabase.from('bulk_discounts').select('*'),
        supabase.from('wip_recipes').select('*'),
      ]);
      const manifest = {
        brandConfig: brand.data ? hydrateDates(brand.data) : brandConfig,
        loyaltyConfig: loyalty.data ? hydrateDates(loyalty.data) : loyaltyConfig,
        staff: staffData.data || staff,
        outlets: outletsData.data || outlets,
        categories: cats.data || categories,
        products: prods.data || products,
        inventory: inv.data || inventory,
        expenseTypes: expT.data || expenseTypes,
        membershipTiers: tiers.data || membershipTiers,
        bulkDiscounts: bulk.data || bulkDiscounts,
        wipRecipes: recipes.data || wipRecipes
      };
      setBrandConfig(manifest.brandConfig);
      setLoyaltyConfig(manifest.loyaltyConfig);
      setStaff(manifest.staff);
      setOutlets(manifest.outlets);
      setCategories(manifest.categories);
      setProducts(manifest.products);
      setInventory(manifest.inventory);
      setExpenseTypes(manifest.expenseTypes);
      setMembershipTiers(manifest.membershipTiers);
      setBulkDiscounts(manifest.bulkDiscounts);
      setWipRecipes(manifest.wipRecipes);
      localStorage.setItem(STORAGE_MANIFEST_KEY, JSON.stringify(manifest));
      clearTimeout(fallbackTimer);
      setIsInitialLoading(false);
      Promise.all([
        safeFetch('attendance', setAttendance),
        safeFetch('transactions', setTransactions),
        safeFetch('expenses', setExpenses),
        safeFetch('daily_closings', setDailyClosings),
        safeFetch('leave_requests', setLeaveRequests),
        safeFetch('customers', setCustomers),
        safeFetch('stock_transfers', setStockTransfers),
        safeFetch('production_records', setProductionRecords),
        safeFetch('purchases', setPurchases),
        safeFetch('simulations', setSimulations),
      ]).catch(() => {});
    } catch (e: any) {
      clearTimeout(fallbackTimer);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => { fetchFromCloud(); }, []);

  const actions: AppActions = {
    fetchFromCloud,
    login: async (username, password) => {
      try {
        const { data, error } = await supabase.from('staff').select('*').eq('username', username).eq('password', password).maybeSingle();
        if (error) throw error;
        if (data) {
            const mapped = hydrateDates(data);
            if (mapped.status === 'INACTIVE') return { success: false, message: "Account disabled." };
            setCurrentUser(mapped); 
            setIsAuthenticated(true);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mapped));
            const oid = (mapped.assignedOutletIds && mapped.assignedOutletIds.length > 0) ? mapped.assignedOutletIds[0] : 'out1';
            setSelectedOutletId(oid); 
            localStorage.setItem(STORAGE_OUTLET_KEY, oid);
            return { success: true };
        }
      } catch (e) {}
      const localUser = INITIAL_STAFF.find(s => s.username === username && s.password === password);
      if (localUser) {
         setCurrentUser(localUser); 
         setIsAuthenticated(true);
         localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(localUser));
         setSelectedOutletId(localUser.assignedOutletIds[0] || 'out1');
         return { success: true };
      }
      return { success: false, message: "Invalid credentials." };
    },
    logout: () => { setIsAuthenticated(false); setCurrentUser(null); localStorage.removeItem(STORAGE_USER_KEY); },
    clearSession: () => { localStorage.clear(); window.location.reload(); },
    switchOutlet: (id) => { setSelectedOutletId(id); localStorage.setItem(STORAGE_OUTLET_KEY, id); },
    addToCart: (p) => setOrderCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    }),
    updateCartQuantity: (pid, delta) => setOrderCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)),
    removeFromCart: (pid) => setOrderCart(prev => prev.filter(i => i.product.id !== pid)),
    clearCart: () => setOrderCart([]),
    checkout: async (method, redeem = 0, memberDisc = 0, bulkDisc = 0) => {
      if (selectedOutletId === 'all' || isSaving) return;
      setIsSaving(true);
      try {
        let subtotal = 0; let totalCost = 0;
        cart.forEach(i => {
           const price = i.product.outletSettings?.[selectedOutletId]?.price || i.product.price;
           subtotal += price * i.quantity;
           const itemCost = (i.product.bom || []).reduce((acc, b) => {
              const inv = inventory.find(inv => inv.id === b.inventoryItemId);
              return acc + (b.quantity * (inv?.costPerUnit || 0));
           }, 0);
           totalCost += itemCost * i.quantity;
        });
        const total = Math.max(0, subtotal - memberDisc - bulkDisc - (redeem * loyaltyConfig.redemptionValuePerPoint));
        const txPayload = { id: `TX-${Date.now()}`, outletId: selectedOutletId, customerId: selectedCustomerId || null, items: cart, subtotal, total, totalCost, paymentMethod: method, status: OrderStatus.CLOSED, timestamp: new Date().toISOString(), cashierId: currentUser?.id, cashierName: currentUser?.name, pointsEarned: Math.floor(total/1000), pointsRedeemed: redeem };
        const updates: { id: string, newQty: number }[] = [];
        const processDeduction = (p: Product, mult: number) => {
           if (p.isCombo && p.comboItems) {
              p.comboItems.forEach(ci => { const inner = products.find(ip => ip.id === ci.productId); if (inner) processDeduction(inner, mult * ci.quantity); });
           } else {
              (p.bom || []).forEach(b => {
                 const template = inventory.find(inv => inv.id === b.inventoryItemId);
                 if (template) {
                    const itemInBranch = inventory.find(inv => inv.outletId === selectedOutletId && inv.name === template.name);
                    if (itemInBranch) updates.push({ id: itemInBranch.id, newQty: (itemInBranch.quantity || 0) - (b.quantity * mult) });
                 }
              });
           }
        };
        cart.forEach(i => processDeduction(i.product, i.quantity));
        setInventory(prev => prev.map(inv => {
           const up = updates.find(u => u.id === inv.id);
           return up ? { ...inv, quantity: up.newQty } : inv;
        }));
        await Promise.all([ 
           supabase.from('transactions').insert(txPayload), 
           ...updates.map(u => supabase.from('inventory').update({ quantity: u.newQty }).eq('id', u.id)) 
        ]);
        setTransactions(prev => [hydrateDates(txPayload), ...(prev || [])]);
        setOrderCart([]); setSelectedCustomerId(null);
      } finally { setIsSaving(false); }
    },
    clockIn: async (lat, lng, notes) => {
      if (!currentUser) return { success: false, message: "Session expired." };
      const now = new Date();
      const today = getTodayDateString();
      const payload = { id: `att-${Date.now()}`, staffId: currentUser.id, staffName: currentUser.name, outletId: selectedOutletId, date: today, clockIn: now.toISOString(), status: 'PRESENT' as const, latitude: lat, longitude: lng, notes };
      setAttendance(prev => [...(prev || []), hydrateDates(payload)]);
      await supabase.from('attendance').insert(payload);
      return { success: true };
    },
    clockOut: async () => {
      if (!currentUser) return;
      const now = new Date();
      const activeShift = (attendance || []).find(a => a.staffId === currentUser.id && !a.clockOut);
      if (activeShift) {
         setAttendance(prev => prev.map(a => a.id === activeShift.id ? { ...a, clockOut: now } : a));
         await supabase.from('attendance').update({ clockOut: now.toISOString() }).eq('id', activeShift.id);
      }
    },
    submitLeave: async (l) => { 
      const payload = { ...l, id: `lv-${Date.now()}`, status: 'PENDING', requestedAt: new Date().toISOString(), startDate: new Date(l.startDate).toISOString(), endDate: new Date(l.endDate).toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId }; 
      setLeaveRequests(prev => [...(prev || []), hydrateDates(payload)]); 
      await supabase.from('leave_requests').insert(payload); 
    },
    updateLeaveStatus: async (id, s) => { await supabase.from('leave_requests').update({ status: s }).eq('id', id); setLeaveRequests(prev => (prev || []).map(l => l.id === id ? { ...l, status: s } : l)); },
    performClosing: async (actualCash, notes, openingBalance, shiftName) => {
       if(!currentUser) return;
       setIsSaving(true);
       try {
          const now = new Date();
          const start = new Date(); start.setHours(0,0,0,0);
          const txs = (transactions || []).filter(t => t.outletId === selectedOutletId && t.cashierId === currentUser?.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start);
          const cash = txs.filter(t => t.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+(b.total ?? 0), 0);
          const qris = txs.filter(t => t.paymentMethod === PaymentMethod.QRIS).reduce((a,b)=>a+(b.total ?? 0), 0);
          const exp = (expenses || []).filter(e => e.outletId === selectedOutletId && e.staffId === currentUser?.id && new Date(e.timestamp) >= start).reduce((a,b)=>a+b.amount, 0);
          const closingPayload = { id: `CLS-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser.id, staffName: currentUser.name, timestamp: now.toISOString(), shiftName, openingBalance, totalSalesCash: cash, totalSalesQRIS: qris, totalExpenses: exp, actualCash, discrepancy: actualCash - (openingBalance + cash - exp), notes, status: 'APPROVED' };
          setDailyClosings(prev => [hydrateDates(closingPayload), ...(prev || [])]);
          await supabase.from('daily_closings').insert(closingPayload);
          await actions.clockOut();
       } finally { setIsSaving(false); }
    },
    resetAttendanceLogs: async () => { await supabase.from('attendance').delete().neq('id', 'VOID'); setAttendance([]); },
    resetOutletData: async (oid) => { 
       setIsSaving(true); 
       try {
          await Promise.all([ 
            supabase.from('transactions').delete().match({ outletId: oid }), 
            supabase.from('expenses').delete().match({ outletId: oid }),
            supabase.from('attendance').delete().match({ outletId: oid }),
            supabase.from('daily_closings').delete().match({ outletId: oid }),
            supabase.from('production_records').delete().match({ outletId: oid }),
            supabase.from('purchases').delete().match({ outletId: oid }),
            supabase.from('stock_transfers').delete().match({ fromOutletId: oid }),
            supabase.from('stock_transfers').delete().match({ toOutletId: oid })
          ]); 
          await fetchFromCloud(); 
       } finally { setIsSaving(false); }
    },
    resetGlobalData: async () => { 
      setIsSaving(true); 
      await Promise.all(['transactions','expenses','attendance','leave_requests','daily_closings','production_records','purchases','stock_transfers'].map(t => supabase.from(t).delete().neq('id', 'VOID'))); 
      await fetchFromCloud(); 
      setIsSaving(false); 
    },
    exportTableToCSV: (table) => {
      let data: any[] = [];
      let headers: string[] = [];
      let fileName = `MOZZABOY_${table.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;

      switch (table) {
        case 'outlets':
          data = outlets.map(o => ({
            "ID Outlet": o.id,
            "Nama Cabang": o.name,
            "Alamat": o.address,
            "Jam Buka": o.openTime,
            "Jam Tutup": o.closeTime,
            "Lat": o.latitude,
            "Lng": o.longitude
          }));
          break;
        case 'staff':
          data = staff.map(s => ({
            "ID Karyawan": s.id,
            "Nama": s.name,
            "Username": s.username,
            "Jabatan": s.role,
            "Status": s.status,
            "Tgl Gabung": new Date(s.joinedAt).toLocaleDateString(),
            "WhatsApp": s.phone || '',
            "Email": s.email || ''
          }));
          break;
        case 'categories':
          data = categories.map(c => ({
            "ID Kategori": c.id,
            "Nama Kategori": c.name,
            "Urutan Tampil": c.sortOrder
          }));
          break;
        case 'products':
          data = products.map(p => ({
            "ID Produk": p.id,
            "Nama Menu": p.name,
            "ID Kategori": p.categoryId,
            "Kategori": categories.find(c => c.id === p.categoryId)?.name || 'N/A',
            "Harga Jual Default": p.price,
            "Tipe": p.isCombo ? "PAKET" : "SATUAN",
            "Status Aktif": p.isAvailable ? "AKTIF" : "OFF"
          }));
          break;
        case 'customers':
          data = customers.map(c => ({
            "ID Pelanggan": c.id,
            "Nama": c.name,
            "WhatsApp": c.phone,
            "Poin Terkumpul": c.points,
            "Tier ID": c.tierId,
            "Tgl Terdaftar": new Date(c.registeredAt).toLocaleDateString()
          }));
          break;
        case 'inventory':
          data = inventory.map(i => ({
            "ID Item": i.id,
            "Nama Bahan": i.name,
            "Satuan": i.unit,
            "Saldo Stok": i.quantity,
            "Stok Minimal": i.minStock,
            "Tipe": i.type,
            "HPP Satuan": i.costPerUnit,
            "ID Outlet": i.outletId
          }));
          break;
        case 'production_records':
          data = productionRecords.map(pr => ({
            "ID Log": pr.id,
            "Tgl Produksi": new Date(pr.timestamp).toLocaleString(),
            "ID Item Hasil": pr.resultItemId,
            "Nama Item": inventory.find(inv => inv.id === pr.resultItemId)?.name || 'N/A',
            "Jumlah Hasil": pr.resultQuantity,
            "PIC": pr.staffName,
            "ID Outlet": pr.outletId
          }));
          break;
        case 'wip_recipes':
          data = wipRecipes.map(r => ({
            "ID Resep": r.id,
            "Nama Resep": r.name,
            "ID Item Hasil": r.resultItemId,
            "Hasil Per Batch": r.resultQuantity,
            "Izin Kasir": r.isCashierOperated ? "YA" : "TIDAK"
          }));
          break;
        case 'membership_tiers':
          data = membershipTiers.map(t => ({
            "ID Tier": t.id,
            "Nama Tier": t.name,
            "Min Poin": t.minPoints,
            "Diskon (%)": t.discountPercent
          }));
          break;
        case 'bulk_discounts':
          data = bulkDiscounts.map(d => ({
            "ID Promo": d.id,
            "Nama Promo": d.name,
            "Min Qty": d.minQty,
            "Diskon (%)": d.discountPercent,
            "Status": d.isActive ? "AKTIF" : "OFF"
          }));
          break;
        case 'simulations':
          data = simulations.map(s => ({
            "ID Projek": s.id,
            "Nama Projek": s.name,
            "Target Harga Jual": s.price,
            "Komisi (%)": s.shareProfitPercent,
            "Tgl Update": new Date(s.updatedAt).toLocaleDateString()
          }));
          break;
        default:
          alert("Tabel tidak dikenal.");
          return;
      }

      if (data.length === 0) {
        alert("Tidak ada data dalam kategori " + table.toUpperCase());
        return;
      }

      headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const cell = row[h] === null || row[h] === undefined ? '' : row[h].toString();
          return `"${cell.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    importCSVToTable: async (table, csv) => { return true; },
    addStaff: async (s) => { await supabase.from('staff').insert(s); setStaff(prev => [...(prev || []), hydrateDates(s)]); },
    updateStaff: async (s) => { 
      await supabase.from('staff').update(s).eq('id', s.id);
      setStaff(prev => (prev || []).map(m => m.id === s.id ? hydrateDates(s) : m)); 
      if(currentUser?.id === s.id) {
         const updatedUser = hydrateDates(s);
         setCurrentUser(updatedUser);
         localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      }
    },
    deleteStaff: async (id) => { await supabase.from('staff').delete().eq('id', id); setStaff(prev => (prev || []).filter(m => m.id !== id)); },
    addProduct: async (p) => { await supabase.from('products').insert(p); setProducts(prev => [...(prev || []), p]); },
    updateProduct: async (p) => { await supabase.from('products').update(p).eq('id', p.id); setProducts(prev => (prev || []).map(m => m.id === p.id ? p : m)); },
    deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); setProducts(prev => (prev || []).filter(m => m.id !== id)); },
    addInventoryItem: async (i, oids = []) => { const payloads = (oids.length > 0 ? oids : [selectedOutletId]).map(oid => ({ ...i, id: `inv-${oid}-${Date.now()}`, outletId: oid })); await supabase.from('inventory').insert(payloads); await fetchFromCloud(); },
    updateInventoryItem: async (i) => { await supabase.from('inventory').update(i).eq('id', i.id); setInventory(prev => (prev || []).map(m => m.id === i.id ? i : m)); },
    deleteInventoryItem: async (id) => { await supabase.from('inventory').delete().eq('id', id); setInventory(prev => (prev || []).filter(m => m.id !== id)); },
    addExpense: async (e) => { 
      const payload = { ...e, id: `exp-${Date.now()}`, timestamp: new Date().toISOString(), staffId: currentUser?.id, staffName: currentUser?.name, outletId: selectedOutletId }; 
      await supabase.from('expenses').insert(payload); 
      setExpenses(prev => [hydrateDates(payload), ...(prev || [])]); 
    },
    updateExpense: async (id, d) => { await supabase.from('expenses').update(d).eq('id', id); setExpenses(prev => (prev || []).map(e => e.id === id ? { ...e, ...hydrateDates(d) } : e)); },
    deleteExpense: async (id) => { await supabase.from('expenses').delete().eq('id', id); setExpenses(prev => (prev || []).filter(e => e.id !== id)); },
    addExpenseType: async (n) => { const payload = { id: `et-${Date.now()}`, name: n }; await supabase.from('expense_types').insert(payload); setExpenseTypes(prev => [...(prev || []), payload]); },
    updateExpenseType: async (id, n) => { await supabase.from('expense_types').update({ name: n }).eq('id', id); setExpenseTypes(prev => (prev || []).map(t => t.id === id ? { ...t, name: n } : t)); },
    deleteExpenseType: async (id) => { await supabase.from('expense_types').delete().eq('id', id); setExpenseTypes(prev => (prev || []).filter(t => t.id !== id)); },
    addCategory: async (n) => { setIsSaving(true); const payload = { id: `cat-${Date.now()}`, name: n, sortOrder: categories.length }; await supabase.from('categories').insert(payload); setCategories(prev => [...(prev || []), payload]); setIsSaving(false); },
    updateCategory: async (id, n) => { setCategories(prev => (prev || []).map(c => c.id === id ? { ...c, name: n } : c)); await supabase.from('categories').update({ name: n }).eq('id', id); },
    deleteCategory: async (id) => { setCategories(prev => (prev || []).filter(c => c.id !== id)); await supabase.from('categories').delete().eq('id', id); },
    reorderCategories: async (newList) => { setCategories(newList); setIsSaving(true); try { const updates = newList.map((c, idx) => ({ id: c.id, name: c.name, sortOrder: idx })); await supabase.from('categories').upsert(updates); } finally { setIsSaving(false); } },
    addPurchase: async (p) => { 
      if(!currentUser) return; 
      const item = inventory.find(inv => inv.id === p.inventoryItemId); 
      if (!item) return; 
      const newQty = (item.quantity || 0) + p.quantity; 
      const now = new Date();
      const purchaseRecord: Purchase = { ...p, id: `pur-${Date.now()}`, outletId: selectedOutletId, staffId: currentUser.id, staffName: currentUser.name, timestamp: now, itemName: item.name, totalPrice: p.unitPrice, unitPrice: p.unitPrice / p.quantity };
      const expenseRecord: Expense = { id: `exp-auto-${Date.now()}`, outletId: selectedOutletId, typeId: 'purchase-auto', amount: p.unitPrice, notes: `Purchase ${item.name} (${p.quantity} ${item.unit})`, staffId: currentUser.id, staffName: currentUser.name, timestamp: now };
      setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, quantity: newQty } : inv));
      setPurchases(prev => [purchaseRecord, ...(prev || [])]);
      setExpenses(prev => [expenseRecord, ...(prev || [])]);
      Promise.all([ 
         supabase.from('purchases').insert({ ...purchaseRecord, timestamp: now.toISOString() }), 
         supabase.from('expenses').insert({ ...expenseRecord, timestamp: now.toISOString() }), 
         supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id) 
      ]).catch(err => console.error("Sync failed:", err));
    },
    processProduction: async (d) => { 
      if(!currentUser || isSaving) return; 
      setIsSaving(true); 
      try { 
        const now = new Date();
        const recordPayload = { ...d, id: `PROD-${Date.now()}`, timestamp: now.toISOString(), staffId: currentUser.id, staffName: currentUser.name, outletId: selectedOutletId }; 
        const resultTemplate = inventory.find(i => i.id === d.resultItemId);
        const localResult = inventory.find(i => i.name === resultTemplate?.name && i.outletId === selectedOutletId);
        if (!localResult) throw new Error("WIP item not found in branch.");
        const componentUpdates = d.components.map(c => {
           const compTemplate = inventory.find(i => i.id === c.inventoryItemId);
           const target = inventory.find(i => i.name === compTemplate?.name && i.outletId === selectedOutletId);
           return { targetId: target?.id, subtract: c.quantity };
        }).filter(upd => upd.targetId);
        setInventory(prev => prev.map(item => { 
            if (item.id === localResult.id) return { ...item, quantity: (item.quantity || 0) + d.resultQuantity }; 
            const up = componentUpdates.find(upd => upd.targetId === item.id);
            if (up) return { ...item, quantity: (item.quantity || 0) - up.subtract }; 
            return item; 
        }));
        setProductionRecords(prev => [hydrateDates(recordPayload), ...(prev || [])]);
        await Promise.all([ 
          supabase.from('production_records').insert(recordPayload), 
          ...componentUpdates.map(upd => {
             const currentItem = inventory.find(i => i.id === upd.targetId);
             return supabase.from('inventory').update({ quantity: (currentItem?.quantity || 0) - upd.subtract }).eq('id', upd.targetId); 
          }), 
          supabase.from('inventory').update({ quantity: (localResult.quantity || 0) + d.resultQuantity }).eq('id', localResult.id) 
        ]);
      } finally { setIsSaving(false); }
    },
    transferStock: async (from, to, itemName, qty) => { 
      if(!currentUser) return;
      const fromItem = inventory.find(i => i.outletId === from && i.name === itemName);
      if(!fromItem) return alert("Item not found in sender branch!");
      if(fromItem.quantity < qty) return alert("Insufficient stock!");
      const transferId = `trf-${Date.now()}`;
      const payload: StockTransfer = { id: transferId, fromOutletId: from, fromOutletName: outlets.find(o=>o.id===from)?.name || '', toOutletId: to, toOutletName: outlets.find(o=>o.id===to)?.name || '', itemName, quantity: qty, unit: fromItem.unit, status: 'PENDING', timestamp: new Date(), staffId: currentUser.id, staffName: currentUser.name };
      setInventory(prev => prev.map(i => i.id === fromItem.id ? {...i, quantity: i.quantity - qty} : i));
      setStockTransfers(prev => [payload, ...(prev || [])]);
      await Promise.all([ 
        supabase.from('stock_transfers').insert({...payload, timestamp: payload.timestamp.toISOString()}), 
        supabase.from('inventory').update({quantity: fromItem.quantity - qty}).eq('id', fromItem.id) 
      ]);
    },
    respondToTransfer: async (transferId, status) => {
      if(!currentUser) return;
      const trf = stockTransfers.find(t => t.id === transferId);
      if(!trf || trf.status !== 'PENDING') return;
      const senderOutletItem = inventory.find(i => i.outletId === trf.fromOutletId && i.name === trf.itemName);
      const receiverOutletItem = inventory.find(i => i.outletId === trf.toOutletId && i.name === trf.itemName);
      if(status === 'ACCEPTED') {
         if(!receiverOutletItem) return alert("Item not found in your branch. Contact Owner.");
         setInventory(prev => prev.map(i => i.id === receiverOutletItem.id ? {...i, quantity: i.quantity + trf.quantity} : i));
         await Promise.all([
            supabase.from('stock_transfers').update({ status: 'ACCEPTED' }).eq('id', transferId),
            supabase.from('inventory').update({ quantity: (receiverOutletItem.quantity || 0) + trf.quantity }).eq('id', receiverOutletItem.id)
         ]);
      } else {
         if(senderOutletItem) {
            setInventory(prev => prev.map(i => i.id === senderOutletItem.id ? {...i, quantity: i.quantity + trf.quantity} : i));
            await Promise.all([
               supabase.from('stock_transfers').update({ status: 'REJECTED' }).eq('id', transferId),
               supabase.from('inventory').update({ quantity: (senderOutletItem.quantity || 0) + trf.quantity }).eq('id', senderOutletItem.id)
            ]);
         }
      }
      setStockTransfers(prev => prev.map(t => t.id === transferId ? {...t, status} : t));
    },
    addWIPRecipe: async (recipe) => { const payload = { ...recipe, id: `wip-${Date.now()}` }; await supabase.from('wip_recipes').insert(payload); setWipRecipes(prev => [...(prev || []), hydrateDates(payload)]); },
    updateWIPRecipe: async (recipe) => { await supabase.from('wip_recipes').update(recipe).eq('id', recipe.id); setWipRecipes(prev => (prev || []).map(r => r.id === recipe.id ? hydrateDates(recipe) : r)); },
    deleteWIPRecipe: async (id) => { await supabase.from('wip_recipes').delete().eq('id', id); setWipRecipes(prev => (prev || []).filter(r => r.id !== id)); },
    addCustomer: async (c) => { const payload = { ...c, id: `c-${Date.now()}`, points: 0, registeredAt: new Date().toISOString(), registeredByStaffId: currentUser?.id, registeredByStaffName: currentUser?.name, registeredAtOutletId: selectedOutletId }; await supabase.from('customers').insert(payload); setCustomers(prev => [...(prev || []), hydrateDates(payload)]); },
    updateCustomer: async (c) => { await supabase.from('customers').update(c).eq('id', c.id); setCustomers(prev => (prev || []).map(cust => cust.id === c.id ? hydrateDates(c) : cust)); },
    deleteCustomer: async (id) => { await supabase.from('customers').delete().eq('id', id); setCustomers(prev => (prev || []).filter(c => c.id !== id)); },
    addOutlet: async (o) => { await supabase.from('outlets').insert(o); setOutlets(prev => [...(prev || []), hydrateDates(o)]); },
    updateOutlet: async (o) => { await supabase.from('outlets').update(o).eq('id', o.id); setOutlets(prev => (prev || []).map(out => out.id === o.id ? hydrateDates(o) : out)); },
    deleteOutlet: async (id) => { await supabase.from('outlets').delete().eq('id', id); setOutlets(prev => (prev || []).filter(o => o.id !== id)); },
    addMembershipTier: async (t) => { const payload = { ...t, id: `t-${Date.now()}` }; await supabase.from('membership_tiers').insert(payload); setMembershipTiers(prev => [...(prev || []), payload]); },
    updateMembershipTier: async (t) => { await supabase.from('membership_tiers').update(t).eq('id', t.id); setMembershipTiers(prev => (prev || []).map(tier => tier.id === t.id ? t : tier)); },
    deleteMembershipTier: async (id) => { await supabase.from('membership_tiers').delete().eq('id', id); setMembershipTiers(prev => (prev || []).filter(t => t.id !== id)); },
    addBulkDiscount: async (r) => { const payload = { ...r, id: `r-${Date.now()}` }; await supabase.from('bulk_discounts').insert(payload); setBulkDiscounts(prev => [...(prev || []), payload]); },
    updateBulkDiscount: async (r) => { await supabase.from('bulk_discounts').update(r).eq('id', r.id); setBulkDiscounts(prev => (prev || []).map(rule => rule.id === r.id ? r : rule)); },
    deleteBulkDiscount: async (id) => { await supabase.from('bulk_discounts').delete().eq('id', id); setBulkDiscounts(prev => (prev || []).filter(r => r.id !== id)); },
    saveSimulation: async (s) => { await supabase.from('simulations').upsert(s); setSimulations(prev => { const others = (prev || []).filter(item => item.id !== s.id); return [...others, hydrateDates(s)]; }); },
    deleteSimulation: async (id) => { await supabase.from('simulations').delete().eq('id', id); setSimulations(prev => (prev || []).filter(s => s.id !== id)); },
    updateLoyaltyConfig: async (c) => { await supabase.from('loyalty_config').upsert({ ...c, id: 'global' }); setLoyaltyConfig(c); },
    updateBrandConfig: async (c) => { await supabase.from('brand_config').upsert({ ...c, id: 'global' }); setBrandConfig(c); },
    voidTransaction: async (txId) => { await supabase.from('transactions').update({ status: OrderStatus.VOIDED }).eq('id', txId); setTransactions(prev => (prev || []).map(tx => tx.id === txId ? { ...tx, status: OrderStatus.VOIDED } : tx)); },
    syncToCloud: () => { fetchFromCloud(); },
    selectCustomer: setSelectedCustomerId,
    setConnectedPrinter,
    exportSystemBackup: async () => {
      const tables = [
        'staff', 'outlets', 'categories', 'products', 'inventory', 'expense_types', 
        'membership_tiers', 'bulk_discounts', 'wip_recipes', 'loyalty_config', 'brand_config',
        'transactions', 'expenses', 'attendance', 'leave_requests', 'daily_closings',
        'production_records', 'purchases', 'stock_transfers', 'customers'
      ];
      
      const backupData: any = {
        timestamp: new Date().toISOString(),
        version: '2.5.0',
        content: {}
      };

      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        backupData.content[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MOZZABOY_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    importSystemBackup: async (jsonString: string) => {
      try {
        const backup = JSON.parse(jsonString);
        if (!backup.content || typeof backup.content !== 'object') throw new Error("Invalid backup format.");
        
        setIsSaving(true);
        for (const [table, data] of Object.entries(backup.content)) {
          if (Array.isArray(data) && data.length > 0) {
            // Kita bersihkan dulu data yang ada untuk menghindari konflik ID jika perlu
            // Namun untuk keamanan, kita gunakan UPSERT
            const { error } = await supabase.from(table).upsert(data);
            if (error) console.error(`Error importing table ${table}:`, error);
          }
        }
        await actions.fetchFromCloud();
        setIsSaving(false);
        return { success: true, message: "System Restore Completed Successfully!" };
      } catch (e: any) {
        setIsSaving(false);
        return { success: false, message: e.message || "Failed to restore backup." };
      }
    }
  };

  const filteredTransactions = selectedOutletId === 'all' ? (transactions || []) : (transactions || []).filter(tx => tx.outletId === selectedOutletId);

  return (
    <AppContext.Provider value={{ ...actions, products, categories, inventory, stockTransfers, stockRequests, productionRecords, wipRecipes, transactions, filteredTransactions, outlets, currentUser, isAuthenticated, loginTime, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, brandConfig, isSaving, isInitialLoading, isDbConnected: true }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
