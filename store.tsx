
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
const STORAGE_EXTERNAL_DB_CONFIG = 'mozzaboy_external_db_config';

export const getCloudConfig = () => {
  const saved = localStorage.getItem(STORAGE_CLOUD_CONFIG);
  return saved ? JSON.parse(saved) : { url: 'https://qpawptimafvxhppeuqel.supabase.co', key: 'sb_publishable_Kaye1xn88d9J_S9A32t4AA_e2ZIz2Az' };
};

export const getExternalDbConfig = () => {
  const saved = localStorage.getItem(STORAGE_EXTERNAL_DB_CONFIG);
  return saved ? JSON.parse(saved) : { host: '', port: '5432', user: '', password: '', gatewayUrl: '', status: 'DISCONNECTED' };
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

const DEFAULT_BRAND: BrandConfig = { 
  name: 'Mozza Boy', 
  tagline: 'Premium Korean Street Food', 
  logoUrl: '', 
  primaryColor: '#f97316' 
};

export const getPermissionsByRole = (role: UserRole): Permissions => {
  const isAdmin = role === UserRole.OWNER || role === UserRole.MANAGER;
  return {
    canAccessReports: isAdmin, canManageStaff: isAdmin, canManageMenu: isAdmin,
    canManageInventory: true, canProcessSales: true, canVoidTransactions: isAdmin, canManageSettings: isAdmin,
  };
};

interface AppState {
  products: Product[]; categories: Category[]; inventory: InventoryItem[]; stockTransfers: StockTransfer[]; stockRequests: StockRequest[]; productionRecords: ProductionRecord[]; wipRecipes: WIPRecipe[]; transactions: Transaction[]; filteredTransactions: Transaction[]; outlets: Outlet[]; currentUser: StaffMember | null; isAuthenticated: boolean; loginTime: Date | null; cart: CartItem[]; staff: StaffMember[]; attendance: Attendance[]; leaveRequests: LeaveRequest[]; selectedOutletId: string; customers: Customer[]; selectedCustomerId: string | null; expenses: Expense[]; expenseTypes: ExpenseType[]; dailyClosings: DailyClosing[]; purchases: Purchase[]; connectedPrinter: any | null; membershipTiers: MembershipTier[]; bulkDiscounts: BulkDiscountRule[]; simulations: MenuSimulation[]; loyaltyConfig: LoyaltyConfig; brandConfig: BrandConfig; isSaving: boolean; isInitialLoading: boolean; isFetching: boolean; assetsOptimized: boolean; isDbConnected: boolean; cloudConfig: {url: string, key: string}; externalDbConfig: any;
}

interface AppActions {
  updateCloudConfig: (url: string, key: string) => void; updateExternalDbConfig: (config: any) => void; login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>; logout: () => void; clearSession: () => void; switchOutlet: (id: string) => void; addToCart: (product: Product) => void; removeFromCart: (productId: string) => void; updateCartQuantity: (productId: string, delta: number) => void; clearCart: () => void; checkout: (paymentMethod: PaymentMethod, redeemPoints?: number, membershipDiscount?: number, bulkDiscount?: number) => Promise<void>; addStaff: (member: StaffMember) => Promise<void>; updateStaff: (member: StaffMember) => Promise<void>; deleteStaff: (id: string) => Promise<void>; clockIn: (lat?: number, lng?: number, notes?: string) => Promise<{ success: boolean; message?: string }>; clockOut: () => Promise<void>; submitLeave: (leave: any) => Promise<void>; updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>; addProduct: (product: Product) => Promise<void>; updateProduct: (product: Product) => Promise<void>; deleteProduct: (id: string) => Promise<void>; addInventoryItem: (item: any, outletIds?: string[]) => Promise<void>; updateInventoryItem: (item: InventoryItem) => Promise<void>; deleteInventoryItem: (id: string) => Promise<void>; performClosing: (actualCash: number, notes: string, openingBalance: number, shiftName: string, cashSales: number, qrisSales: number, totalExpenses: number, discrepancy: number) => Promise<void>; addPurchase: (purchase: { inventoryItemId: string; quantity: number; unitPrice: number; requestId?: string }) => Promise<void>; selectCustomer: (id: string | null) => void; addCustomer: (customer: any) => Promise<void>; updateCustomer: (customer: Customer) => Promise<void>; deleteCustomer: (id: string) => Promise<void>; addOutlet: (outlet: Outlet) => Promise<void>; updateOutlet: (outlet: Outlet) => Promise<void>; deleteOutlet: (id: string) => Promise<void>; setConnectedPrinter: (device: any) => void; processProduction: (data: { resultItemId: string; resultQuantity: number; components: { inventoryItemId: string; quantity: number }[] }) => Promise<void>; addWIPRecipe: (recipe: Omit<WIPRecipe, 'id'>) => Promise<void>; updateWIPRecipe: (recipe: WIPRecipe) => Promise<void>; deleteWIPRecipe: (id: string) => Promise<void>; transferStock: (from: string, to: string, item: string, qty: number) => Promise<void>; respondToTransfer: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>; addMembershipTier: (tier: any) => Promise<void>; updateMembershipTier: (tier: any) => Promise<void>; deleteMembershipTier: (id: string) => Promise<void>; addBulkDiscount: (rule: any) => Promise<void>; updateBulkDiscount: (rule: any) => Promise<void>; deleteBulkDiscount: (id: string) => Promise<void>; saveSimulation: (sim: MenuSimulation) => Promise<void>; deleteSimulation: (id: string) => Promise<void>; updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>; updateBrandConfig: (config: BrandConfig) => Promise<void>; resetOutletData: (outletId: string) => Promise<void>; voidTransaction: (txId: string) => Promise<void>; fetchFromCloud: () => Promise<void>; resetGlobalData: () => Promise<void>; resetAttendanceLogs: () => Promise<void>; syncToCloud: () => void; exportTableToCSV: (tableName: string) => void; exportSystemBackup: () => Promise<void>; importSystemBackup: (jsonString: string) => Promise<{ success: boolean; message: string }>; addExpense: (expense: any) => Promise<void>; updateExpense: (id: string, expense: any) => Promise<void>; deleteExpense: (id: string) => Promise<void>; addExpenseType: (name: string) => Promise<void>; updateExpenseType: (id: string, name: string) => Promise<void>; deleteExpenseType: (id: string) => Promise<void>; addCategory: (name: string) => Promise<void>; updateCategory: (id: string, name: string) => Promise<void>; deleteCategory: (id: string) => Promise<void>; reorderCategories: (categories: Category[]) => Promise<void>; exportDatabaseSQL: () => void;
}

const AppContext = createContext<(AppState & AppActions) | undefined>(undefined);

// Helper untuk mengubah key lowercase (Postgres) menjadi camelCase (JS)
const mapKeysToCamelCase = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(mapKeysToCamelCase);
  if (typeof data !== 'object') return data;

  const newObj: any = {};
  const mapping: Record<string, string> = {
    'assignedoutletids': 'assignedOutletIds',
    'workingdays': 'workingDays',
    'weeklyoffday': 'weeklyOffDay',
    'shiftstarttime': 'shiftStartTime',
    'shiftendtime': 'shiftEndTime',
    'dailysalestarget': 'dailySalesTarget',
    'targetbonusamount': 'targetBonusAmount',
    'emergencycontactname': 'emergencyContactName',
    'emergencycontactphone': 'emergencyContactPhone',
    'joinedat': 'joinedAt',
    'categoryid': 'categoryId',
    'isavailable': 'isAvailable',
    'iscombo': 'isCombo',
    'comboitems': 'comboItems',
    'outletsettings': 'outletSettings',
    'resultitemid': 'resultItemId',
    'resultquantity': 'resultQuantity',
    'iscashieroperated': 'isCashierOperated',
    'cancashierpurchase': 'canCashierPurchase',
    'minstock': 'minStock',
    'costperunit': 'costPerUnit',
    'outletid': 'outletId',
    'customerid': 'customerId',
    'paymentmethod': 'paymentMethod',
    'totalcost': 'totalCost',
    'cashierid': 'cashierId',
    'cashiername': 'cashierName',
    'pointsperpoint': 'pointsPerPoint',
    'pointdiscountvalue': 'pointDiscountValue',
    'membershipdiscount': 'membershipDiscount',
    'bulkdiscount': 'bulkDiscount',
    'typeid': 'typeId',
    'staffid': 'staffId',
    'staffname': 'staffName',
    'inventoryitemid': 'inventoryItemId',
    'itemname': 'itemName',
    'unitprice': 'unitPrice',
    'totalprice': 'totalPrice',
    'requestid': 'requestId',
    'clockin': 'clockIn',
    'clockout': 'clockOut',
    'startdate': 'startDate',
    'enddate': 'endDate',
    'requestedat': 'requestedAt',
    'openingbalance': 'openingBalance',
    'totalsalescash': 'totalSalesCash',
    'totalsalesqris': 'totalSalesQRIS',
    'totalexpenses': 'totalExpenses',
    'actualcash': 'actualCash',
    'shiftname': 'shiftName',
    'fromoutletid': 'fromOutletId',
    'fromoutletname': 'fromOutletName',
    'tooutletid': 'toOutletId',
    'tooutletname': 'toOutletName',
    'tierid': 'tierId',
    'registeredat': 'registeredAt',
    'registeredatoutletid': 'registeredAtOutletId',
    'logourl': 'logoUrl',
    'primarycolor': 'primaryColor',
    'isenabled': 'isEnabled',
    'earningamountperpoint': 'earningAmountPerPoint',
    'redemptionvalueperpoint': 'redemptionValuePerPoint',
    'minredeempoints': 'minRedeemPoints',
    'sortorder': 'sortOrder',
    'minpoints': 'minPoints',
    'discountpercent': 'discountPercent',
    'minqty': 'minQty',
    'isactive': 'isActive',
    'applicableproductids': 'applicableProductIds',
    'updatedat': 'updatedAt'
  };

  for (const key in data) {
    const camelKey = mapping[key.toLowerCase()] || key;
    let val = data[key];
    
    // Hydrate Dates
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      val = isNaN(d.getTime()) ? val : d;
    }
    
    newObj[camelKey] = val;
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
  const [externalDbConfig, setExternalDbConfig] = useState(getExternalDbConfig());

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>(OUTLETS);
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
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({ isEnabled: true, earningAmountPerPoint: 1000, redemptionValuePerPoint: 100, minRedeemPoints: 50 });
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(DEFAULT_BRAND);

  const [selectedOutletId, setSelectedOutletId] = useState<string>(localStorage.getItem(STORAGE_OUTLET_KEY) || 'all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<any | null>(null);

  useEffect(() => {
    if (brandConfig && brandConfig.name) {
      document.title = `${brandConfig.name} Cloud POS`;
    }
  }, [brandConfig?.name]);

  const updateManifestCache = (updates: any) => {
    try {
      const current = getSyncCache();
      const next = { ...current, ...updates };
      localStorage.setItem(STORAGE_MANIFEST_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  const actions: AppActions = {
    updateExternalDbConfig: (config) => {
      localStorage.setItem(STORAGE_EXTERNAL_DB_CONFIG, JSON.stringify(config));
      setExternalDbConfig(config);
    },
    exportDatabaseSQL: () => {
      const formatVal = (v: any) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'number') return v;
        if (typeof v === 'object') {
          if (v instanceof Date) return `'${v.toISOString()}'`;
          return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        }
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      const generateTableSQL = (tableName: string, data: any[]) => {
        if (!data || data.length === 0) return `-- No data for ${tableName}\n`;
        let sql = `-- DATA FOR: ${tableName}\n`;
        
        const rawKeys = Object.keys(data[0]);
        const uniqueCols: string[] = [];
        const seenLower = new Set<string>();

        for (const col of rawKeys) {
          const lower = col.toLowerCase();
          if (!seenLower.has(lower)) {
            seenLower.add(lower);
            uniqueCols.push(col);
          }
        }
        
        data.forEach(row => {
          if (!row) return;
          const vals = uniqueCols.map(c => formatVal(row[c])).join(', ');
          const lowerCols = uniqueCols.map(c => c.toLowerCase()).join(', ');
          sql += `INSERT INTO ${tableName} (${lowerCols}) VALUES (${vals});\n`;
        });
        return sql + '\n';
      };

      const schemaSQL = `
-- ==========================================
-- MOZZA BOY ENTERPRISE DATABASE SCHEMA
-- Standardized Lowercase Migration Script
-- ==========================================

DROP TABLE IF EXISTS stock_transfers CASCADE;
DROP TABLE IF EXISTS daily_closings CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS production_records CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS bulk_discounts CASCADE;
DROP TABLE IF EXISTS wip_recipes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS expense_types CASCADE;
DROP TABLE IF EXISTS membership_tiers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS outlets CASCADE;
DROP TABLE IF EXISTS loyalty_config CASCADE;
DROP TABLE IF EXISTS brand_config CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE brand_config (id TEXT PRIMARY KEY DEFAULT 'global', name TEXT NOT NULL, tagline TEXT, logourl TEXT, primarycolor TEXT DEFAULT '#f97316');
CREATE TABLE loyalty_config (id TEXT PRIMARY KEY DEFAULT 'global', isenabled BOOLEAN DEFAULT true, earningamountperpoint INTEGER DEFAULT 1000, redemptionvalueperpoint INTEGER DEFAULT 100, minredeempoints INTEGER DEFAULT 50);
CREATE TABLE outlets (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, opentime TEXT, closetime TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION);
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, sortorder INTEGER DEFAULT 0);
CREATE TABLE membership_tiers (id TEXT PRIMARY KEY, name TEXT NOT NULL, minpoints INTEGER DEFAULT 0, discountpercent INTEGER DEFAULT 0);
CREATE TABLE expense_types (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', assignedoutletids JSONB, permissions JSONB, workingdays JSONB, weeklyoffday INTEGER DEFAULT 0, shiftstarttime TEXT, shiftendtime TEXT, dailysalestarget BIGINT, targetbonusamount BIGINT, phone TEXT, email TEXT, address TEXT, photo TEXT, instagram TEXT, telegram TEXT, tiktok TEXT, emergencycontactname TEXT, emergencycontactphone TEXT, joinedat TIMESTAMPTZ DEFAULT now());
CREATE TABLE inventory (id TEXT PRIMARY KEY, outletid TEXT REFERENCES outlets(id) ON DELETE CASCADE, name TEXT NOT NULL, unit TEXT NOT NULL, quantity DOUBLE PRECISION DEFAULT 0, minstock DOUBLE PRECISION DEFAULT 0, costperunit BIGINT DEFAULT 0, type TEXT NOT NULL, iscashieroperated BOOLEAN DEFAULT false, cancashierpurchase BOOLEAN DEFAULT false);
CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT NOT NULL, categoryid TEXT REFERENCES categories(id) ON DELETE SET NULL, price BIGINT NOT NULL, image TEXT, isavailable BOOLEAN DEFAULT true, iscombo BOOLEAN DEFAULT false, bom JSONB, comboitems JSONB, outletsettings JSONB);
CREATE TABLE wip_recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL, resultitemid TEXT, resultquantity DOUBLE PRECISION NOT NULL, components JSONB NOT NULL, assignedoutletids JSONB, iscashieroperated BOOLEAN DEFAULT false);
CREATE TABLE bulk_discounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, minqty INTEGER DEFAULT 0, discountpercent INTEGER DEFAULT 0, isactive BOOLEAN DEFAULT true, applicableproductids JSONB);
CREATE TABLE simulations (id TEXT PRIMARY KEY, name TEXT NOT NULL, price BIGINT DEFAULT 0, shareprofitpercent INTEGER DEFAULT 0, items JSONB, updatedat TIMESTAMPTZ DEFAULT now());
CREATE TABLE transactions (id TEXT PRIMARY KEY, outletid TEXT NOT NULL, customerid TEXT, items JSONB NOT NULL, subtotal BIGINT DEFAULT 0, tax BIGINT DEFAULT 0, total BIGINT DEFAULT 0, totalcost BIGINT DEFAULT 0, paymentmethod TEXT NOT NULL, status TEXT NOT NULL, cashierid TEXT, cashiername TEXT, earnpoints INTEGER DEFAULT 0, pointsredeemed INTEGER DEFAULT 0, pointdiscountvalue BIGINT DEFAULT 0, membershipdiscount BIGINT DEFAULT 0, bulkdiscount BIGINT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT now());
CREATE TABLE expenses (id TEXT PRIMARY KEY, outletid TEXT REFERENCES outlets(id), typeid TEXT, amount BIGINT DEFAULT 0, notes TEXT, staffid TEXT, staffname TEXT, timestamp TIMESTAMPTZ DEFAULT now());
CREATE TABLE purchases (id TEXT PRIMARY KEY, outletid TEXT REFERENCES outlets(id), inventoryitemid TEXT, itemname TEXT, quantity DOUBLE PRECISION, unitprice BIGINT, totalprice BIGINT, staffid TEXT, staffname TEXT, requestid TEXT, timestamp TIMESTAMPTZ DEFAULT now());
CREATE TABLE production_records (id TEXT PRIMARY KEY, outletid TEXT REFERENCES outlets(id), resultitemid TEXT, resultquantity DOUBLE PRECISION, components JSONB, staffid TEXT, staffname TEXT, timestamp TIMESTAMPTZ DEFAULT now());
CREATE TABLE attendance (id TEXT PRIMARY KEY, staffid TEXT REFERENCES staff(id) ON DELETE CASCADE, staffname TEXT, outletid TEXT, date TEXT, clockin TIMESTAMPTZ, clockout TIMESTAMPTZ, status TEXT DEFAULT 'PRESENT', latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, notes TEXT);
CREATE TABLE leave_requests (id TEXT PRIMARY KEY, staffid TEXT REFERENCES staff(id), staffname TEXT, outletid TEXT, startdate DATE, enddate DATE, reason TEXT, status TEXT DEFAULT 'PENDING', requestedat TIMESTAMPTZ DEFAULT now());
CREATE TABLE daily_closings (id TEXT PRIMARY KEY, outletid TEXT REFERENCES outlets(id), staffid TEXT REFERENCES staff(id), staffname TEXT, timestamp TIMESTAMPTZ DEFAULT now(), shiftname TEXT, openingbalance BIGINT DEFAULT 0, totalsalescash BIGINT DEFAULT 0, totalsalesqris BIGINT DEFAULT 0, totalexpenses BIGINT DEFAULT 0, actualcash BIGINT DEFAULT 0, discrepancy BIGINT DEFAULT 0, notes TEXT, status TEXT DEFAULT 'APPROVED');
CREATE TABLE stock_transfers (id TEXT PRIMARY KEY, fromoutletid TEXT, fromoutletname TEXT, tooutletid TEXT, tooutletname TEXT, itemname TEXT, quantity DOUBLE PRECISION, unit TEXT, status TEXT DEFAULT 'PENDING', staffid TEXT, staffname TEXT, timestamp TIMESTAMPTZ DEFAULT now());
CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, points INTEGER DEFAULT 0, tierid TEXT REFERENCES membership_tiers(id), registeredat TIMESTAMPTZ DEFAULT now(), registeredatoutletid TEXT);

`;

      let fullSQL = "-- MOZZA BOY ENTERPRISE POS - FULL STANDALONE DATABASE DUMP\n";
      fullSQL += `-- Generated: ${new Date().toLocaleString()}\n`;
      fullSQL += schemaSQL;
      fullSQL += "\nSET session_replication_role = 'replica';\n\n";

      fullSQL += generateTableSQL('brand_config', [brandConfig]);
      fullSQL += generateTableSQL('loyalty_config', [loyaltyConfig]);
      fullSQL += generateTableSQL('outlets', outlets);
      fullSQL += generateTableSQL('staff', staff);
      fullSQL += generateTableSQL('categories', categories);
      fullSQL += generateTableSQL('products', products);
      fullSQL += generateTableSQL('inventory', inventory);
      fullSQL += generateTableSQL('wip_recipes', wipRecipes);
      fullSQL += generateTableSQL('membership_tiers', membershipTiers);
      fullSQL += generateTableSQL('bulk_discounts', bulkDiscounts);
      fullSQL += generateTableSQL('simulations', simulations);
      fullSQL += generateTableSQL('transactions', transactions);
      fullSQL += generateTableSQL('expenses', expenses);
      fullSQL += generateTableSQL('attendance', attendance);
      fullSQL += generateTableSQL('daily_closings', dailyClosings);
      fullSQL += generateTableSQL('production_records', productionRecords);
      fullSQL += generateTableSQL('purchases', purchases);
      fullSQL += generateTableSQL('stock_transfers', stockTransfers);
      fullSQL += generateTableSQL('customers', customers);

      fullSQL += "\nSET session_replication_role = 'origin';\n";

      const blob = new Blob([fullSQL], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MozzaBoy_DATABASE_MIGRATION_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    fetchFromCloud: async () => {
      if (isSaving || isFetching) return;
      setIsFetching(true);
      try {
        const [brand, loyalty, staffData, outletsData, cats, prods, inv, wip, mt, bd, sim, etypes] = await Promise.all([
          supabase.from('brand_config').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('loyalty_config').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('staff').select('*'),
          supabase.from('outlets').select('*'),
          supabase.from('categories').select('*').order('sortorder'),
          supabase.from('products').select('*'),
          supabase.from('inventory').select('*'),
          supabase.from('wip_recipes').select('*'),
          supabase.from('membership_tiers').select('*'),
          supabase.from('bulk_discounts').select('*'),
          supabase.from('simulations').select('*'),
          supabase.from('expense_types').select('*'),
        ]);
        
        if (isSaving) return;

        if (brand.data) setBrandConfig(mapKeysToCamelCase(brand.data));
        if (loyalty.data) setLoyaltyConfig(mapKeysToCamelCase(loyalty.data));
        if (staffData.data) setStaff(mapKeysToCamelCase(staffData.data));
        if (outletsData.data) setOutlets(mapKeysToCamelCase(outletsData.data));
        if (cats.data) setCategories(mapKeysToCamelCase(cats.data));
        if (prods.data) setProducts(mapKeysToCamelCase(prods.data));
        if (inv.data) setInventory(mapKeysToCamelCase(inv.data));
        if (wip.data) setWipRecipes(mapKeysToCamelCase(wip.data));
        if (mt.data) setMembershipTiers(mapKeysToCamelCase(mt.data));
        if (bd.data) setBulkDiscounts(mapKeysToCamelCase(bd.data));
        if (sim.data) setSimulations(mapKeysToCamelCase(sim.data));
        if (etypes.data) setExpenseTypes(mapKeysToCamelCase(etypes.data));
        
        const { data: trx } = await supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(100);
        if (trx) setTransactions(mapKeysToCamelCase(trx));
        const { data: exp } = await supabase.from('expenses').select('*').order('timestamp', { ascending: false }).limit(50);
        if (exp) setExpenses(mapKeysToCamelCase(exp));
        const { data: att } = await supabase.from('attendance').select('*').order('clockin', { ascending: false }).limit(100);
        if (att) setAttendance(mapKeysToCamelCase(att));
        const { data: cls } = await supabase.from('daily_closings').select('*').order('timestamp', { ascending: false }).limit(30);
        if (cls) setDailyClosings(mapKeysToCamelCase(cls));
        
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
          const mapped = mapKeysToCamelCase(data) as StaffMember;
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
        const sub = cart.reduce((sum, i) => sum + ((i.product.outletSettings?.[selectedOutletId]?.price || i.product.price) * i.quantity), 0);
        const txPayload = { 
          id: `TX-${Date.now()}`, outletid: selectedOutletId, customerid: selectedCustomerId, items: cart, 
          subtotal: sub, total: sub - redeem - memberDisc - bulkDisc, paymentmethod: method, 
          status: OrderStatus.CLOSED, timestamp: new Date().toISOString(), cashierid: currentUser?.id, 
          cashiername: currentUser?.name 
        };
        setTransactions(prev => [mapKeysToCamelCase(txPayload), ...prev]);
        setCart([]); 
        await supabase.from('transactions').insert(txPayload);
      } finally { setIsSaving(false); }
    },
    clockIn: async () => {
      const today = getTodayDateString();
      const payload = { 
        id: `att-${Date.now()}`, 
        staffid: currentUser?.id, 
        staffname: currentUser?.name, 
        date: today, 
        clockin: new Date().toISOString(), 
        status: 'PRESENT', 
        outletid: selectedOutletId 
      };
      
      localStorage.setItem('mozzaboy_last_clockin', JSON.stringify({
        date: today,
        staffId: currentUser?.id,
        outletId: selectedOutletId,
        timestamp: Date.now()
      }));

      setAttendance(prev => [mapKeysToCamelCase(payload), ...prev]);
      await supabase.from('attendance').insert(payload);
      return { success: true };
    },
    clockOut: async () => {
      const active = attendance.find(a => a.staffId === currentUser?.id && !a.clockOut);
      if (active) {
        setAttendance(prev => prev.map(a => a.id === active.id ? { ...a, clockOut: new Date() } : a));
        await supabase.from('attendance').update({ clockout: new Date().toISOString() }).eq('id', active.id);
        localStorage.removeItem('mozzaboy_last_clockin');
      }
    },
    addStaff: async (s) => { 
        const payload = Object.fromEntries(Object.entries(s).map(([k,v]) => [k.toLowerCase(), v]));
        setStaff(prev => [...prev, s]); 
        await supabase.from('staff').insert(payload); 
    },
    updateStaff: async (s) => { 
        const payload = Object.fromEntries(Object.entries(s).map(([k,v]) => [k.toLowerCase(), v]));
        setStaff(prev => prev.map(m => m.id === s.id ? s : m)); 
        if (currentUser?.id === s.id) {
            setCurrentUser(s);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(s));
        }
        await supabase.from('staff').update(payload).eq('id', s.id); 
    },
    deleteStaff: async (id) => { setStaff(prev => prev.filter(m => m.id !== id)); await supabase.from('staff').delete().eq('id', id); },
    addProduct: async (p) => { 
        const payload = Object.fromEntries(Object.entries(p).map(([k,v]) => [k.toLowerCase(), v]));
        setProducts(prev => [...prev, p]); await supabase.from('products').insert(payload); 
    },
    updateProduct: async (p) => { 
        const payload = Object.fromEntries(Object.entries(p).map(([k,v]) => [k.toLowerCase(), v]));
        setProducts(prev => prev.map(m => m.id === p.id ? p : m)); await supabase.from('products').update(payload).eq('id', p.id); 
    },
    deleteProduct: async (id) => { setProducts(prev => prev.filter(m => m.id !== id)); await supabase.from('products').delete().eq('id', id); },
    addInventoryItem: async (i, oids = []) => { 
      const payloads = oids.map(oid => Object.fromEntries(Object.entries({ ...i, id: `inv-${oid}-${Date.now()}`, outletId: oid }).map(([k,v]) => [k.toLowerCase(), v]))); 
      setInventory(prev => [...prev, ...mapKeysToCamelCase(payloads)]); await supabase.from('inventory').insert(payloads); 
    },
    updateInventoryItem: async (i) => { 
        const payload = Object.fromEntries(Object.entries(i).map(([k,v]) => [k.toLowerCase(), v]));
        setInventory(prev => prev.map(m => m.id === i.id ? i : m)); await supabase.from('inventory').update(payload).eq('id', i.id); 
    },
    deleteInventoryItem: async (id) => { setInventory(prev => prev.filter(m => m.id !== id)); await supabase.from('inventory').delete().eq('id', id); },
    performClosing: async (cash, notes, opening, shift, cashSales, qrisSales, expenses, discrepancy) => {
      const payload = { 
        id: `CLS-${Date.now()}`, outletid: selectedOutletId, staffid: currentUser?.id, staffname: currentUser?.name, timestamp: new Date().toISOString(), 
        actualcash: cash, notes, openingbalance: opening, shiftname: shift, status: 'APPROVED', 
        totalsalescash: cashSales, totalsalesqris: qrisSales, totalexpenses: expenses, discrepancy: discrepancy
      };
      setDailyClosings(prev => [mapKeysToCamelCase(payload), ...prev]);
      await supabase.from('daily_closings').insert(payload);
    },
    addPurchase: async (p) => { 
      const item = inventory.find(inv => inv.id === p.inventoryItemId); if (!item) return;
      const now = new Date().toISOString();
      const purchasePayload = { 
        id: `pur-${Date.now()}`, 
        timestamp: now, 
        outletid: selectedOutletId, 
        staffid: currentUser?.id, 
        staffname: currentUser?.name, 
        totalprice: p.unitPrice, 
        itemname: item.name,
        inventoryitemid: p.inventoryItemId,
        quantity: p.quantity,
        unitprice: p.unitPrice,
        requestid: p.requestId
      };

      const autoExpense = {
        id: `exp-auto-${Date.now()}`,
        outletid: selectedOutletId,
        typeid: 'purchase-auto',
        amount: p.unitPrice,
        notes: `Belanja ${item.name} (${p.quantity} ${item.unit})`,
        staffid: currentUser?.id,
        staffname: currentUser?.name,
        timestamp: now
      };

      setPurchases(prev => [mapKeysToCamelCase(purchasePayload), ...prev]);
      setExpenses(prev => [mapKeysToCamelCase(autoExpense), ...prev]);
      setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, quantity: inv.quantity + p.quantity } : inv)); 
      
      await Promise.all([
        supabase.from('purchases').insert(purchasePayload),
        supabase.from('expenses').insert(autoExpense),
        supabase.from('inventory').update({ quantity: item.quantity + p.quantity }).eq('id', item.id)
      ]);
    },
    addCustomer: async (c) => {
      const payload = { 
          id: `cust-${Date.now()}`, points: 0, registeredat: new Date().toISOString(), 
          name: c.name, phone: c.phone, tierid: c.tierId, 
          registeredatoutletid: selectedOutletId 
      };
      setCustomers(prev => [...prev, mapKeysToCamelCase(payload)]); await supabase.from('customers').insert(payload);
    },
    updateCustomer: async (c) => { 
        const payload = Object.fromEntries(Object.entries(c).map(([k,v]) => [k.toLowerCase(), v]));
        setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust)); await supabase.from('customers').update(payload).eq('id', c.id); 
    },
    deleteCustomer: async (id) => { setCustomers(prev => prev.filter(cust => cust.id !== id)); await supabase.from('customers').delete().eq('id', id); },
    addOutlet: async (o) => { 
        const payload = Object.fromEntries(Object.entries(o).map(([k,v]) => [k.toLowerCase(), v]));
        setOutlets(prev => [...prev, o]); await supabase.from('outlets').insert(payload); 
    },
    updateOutlet: async (o) => { 
        const payload = Object.fromEntries(Object.entries(o).map(([k,v]) => [k.toLowerCase(), v]));
        setOutlets(prev => prev.map(out => out.id === o.id ? o : out)); await supabase.from('outlets').update(payload).eq('id', o.id); 
    },
    deleteOutlet: async (id) => { setOutlets(prev => prev.filter(out => out.id !== id)); await supabase.from('outlets').delete().eq('id', id); },
    processProduction: async (data) => {
      setIsSaving(true);
      try {
        const payload = { 
            id: `prod-${Date.now()}`, timestamp: new Date().toISOString(), 
            staffid: currentUser?.id, staffname: currentUser?.name, outletid: selectedOutletId,
            resultitemid: data.resultItemId, resultquantity: data.resultQuantity, components: data.components
        };
        
        setInventory(prevInventory => {
          return prevInventory.map(inv => {
            if (inv.id === data.resultItemId) { return { ...inv, quantity: inv.quantity + data.resultQuantity }; }
            const comp = data.components.find(c => c.inventoryItemId === inv.id);
            if (comp) { return { ...inv, quantity: inv.quantity - comp.quantity }; }
            return inv;
          });
        });

        setProductionRecords(prev => [mapKeysToCamelCase(payload), ...prev]);
        
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
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    },
    addWIPRecipe: async (recipe) => {
      const payload = Object.fromEntries(Object.entries({ ...recipe, id: `wip-${Date.now()}` }).map(([k,v]) => [k.toLowerCase(), v]));
      setWipRecipes(prev => [...prev, mapKeysToCamelCase(payload)]); await supabase.from('wip_recipes').insert(payload);
    },
    updateWIPRecipe: async (recipe) => { 
        const payload = Object.fromEntries(Object.entries(recipe).map(([k,v]) => [k.toLowerCase(), v]));
        setWipRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r)); await supabase.from('wip_recipes').update(payload).eq('id', recipe.id); 
    },
    deleteWIPRecipe: async (id) => { setWipRecipes(prev => prev.filter(r => r.id !== id)); await supabase.from('wip_recipes').delete().eq('id', id); },
    transferStock: async (fromId, toId, itemName, qty) => {
      const payload = {
        id: `trf-${Date.now()}`, fromoutletid: fromId, fromoutletname: outlets.find(o => o.id === fromId)?.name || 'Unknown',
        tooutletid: toId, tooutletname: outlets.find(o => o.id === toId)?.name || 'Unknown',
        itemname: itemName, quantity: qty, unit: inventory.find(i => i.name === itemName && i.outletId === fromId)?.unit || 'unit',
        status: 'PENDING', timestamp: new Date().toISOString(), staffid: currentUser?.id || '', staffname: currentUser?.name || ''
      };
      setStockTransfers(prev => [mapKeysToCamelCase(payload), ...prev]); await supabase.from('stock_transfers').insert(payload);
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
           await Promise.all([
             supabase.from('inventory').update({ quantity: fromItem.quantity - trf.quantity }).eq('id', fromItem.id), 
             supabase.from('inventory').update({ quantity: toItem.quantity + trf.quantity }).eq('id', toItem.id)
           ]);
         }
      }
      await supabase.from('stock_transfers').update({ status }).eq('id', id);
    },
    saveSimulation: async (sim) => {
      const payload = Object.fromEntries(Object.entries(sim).map(([k,v]) => [k.toLowerCase(), v]));
      setSimulations(prev => {
        if (prev.find(s => s.id === sim.id)) return prev.map(s => s.id === sim.id ? sim : s);
        return [...prev, sim];
      });
      await supabase.from('simulations').upsert(payload);
    },
    deleteSimulation: async (id) => { setSimulations(prev => prev.filter(s => s.id !== id)); await supabase.from('simulations').delete().eq('id', id); },
    updateLoyaltyConfig: async (c) => { 
        const payload = Object.fromEntries(Object.entries({ ...c, id: 'global' }).map(([k,v]) => [k.toLowerCase(), v]));
        setLoyaltyConfig(c); await supabase.from('loyalty_config').upsert(payload); 
    },
    updateBrandConfig: async (c) => { 
      setIsSaving(true);
      try {
        const payload = { 
          id: 'global',
          name: c.name || DEFAULT_BRAND.name,
          tagline: c.tagline || DEFAULT_BRAND.tagline,
          logourl: c.logoUrl || c.logoUrl || DEFAULT_BRAND.logoUrl,
          primarycolor: c.primaryColor || c.primaryColor || DEFAULT_BRAND.primaryColor 
        };
        setBrandConfig(c); 
        updateManifestCache({ brandConfig: payload });
        await supabase.from('brand_config').upsert(payload);
      } catch (err) {
        console.error("Branding Error:", err);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    },
    addExpense: async (expense) => {
      const payload = { 
          ...expense, id: `exp-${Date.now()}`, timestamp: new Date().toISOString(), 
          staffid: currentUser?.id, staffname: currentUser?.name, outletid: selectedOutletId,
          amount: expense.amount, notes: expense.notes, typeid: expense.typeId
      };
      setExpenses(prev => [mapKeysToCamelCase(payload), ...prev]); await supabase.from('expenses').insert(payload);
    },
    updateExpense: async (id, expense) => { 
        const payload = Object.fromEntries(Object.entries(expense).map(([k,v]) => [k.toLowerCase(), v]));
        setExpenses(expenses.map(e => e.id === id ? { ...e, ...expense } : e)); await supabase.from('expenses').update(payload).eq('id', id); 
    },
    deleteExpense: async (id) => { setExpenses(expenses.filter(e => e.id !== id)); await supabase.from('expenses').delete().eq('id', id); },
    addExpenseType: async (name) => {
      const payload = { id: `et-${Date.now()}`, name };
      setExpenseTypes(prev => [...prev, payload]); await supabase.from('expense_types').insert(payload);
    },
    updateExpenseType: async (id, name) => { setExpenseTypes(prev => prev.map(t => t.id === id ? { ...t, name } : t)); await supabase.from('expense_types').update({ name }).eq('id', id); },
    deleteExpenseType: async (id) => { setExpenseTypes(prev => prev.filter(t => t.id !== id)); await supabase.from('expense_types').delete().eq('id', id); },
    addCategory: async (name) => {
      const payload = { id: `cat-${Date.now()}`, name, sortorder: categories.length };
      setCategories(prev => [...prev, mapKeysToCamelCase(payload)]); await supabase.from('categories').insert(payload);
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
      await Promise.all(newCats.map((c, idx) => supabase.from('categories').update({ sortorder: idx }).eq('id', c.id)));
    },
    submitLeave: async (leave) => {
      const payload = { 
          ...leave, id: `lv-${Date.now()}`, staffid: currentUser?.id, staffname: currentUser?.name, 
          outletid: selectedOutletId, status: 'PENDING', requestedat: new Date().toISOString(),
          startdate: leave.startDate, enddate: leave.endDate
      };
      setLeaveRequests(prev => [mapKeysToCamelCase(payload), ...prev]); await supabase.from('leave_requests').insert(payload);
    },
    updateLeaveStatus: async (id, status) => { setLeaveRequests(leaveRequests.map(l => l.id === id ? { ...l, status } : l)); await supabase.from('leave_requests').update({ status }).eq('id', id); },
    resetOutletData: async (oid) => { 
        setTransactions(prev => prev.filter(t => t.outletId !== oid)); 
        setAttendance(prev => prev.filter(a => a.outletId !== oid));
        setExpenses(prev => prev.filter(e => e.outletId !== oid));
        setPurchases(prev => prev.filter(p => p.outletId !== oid));
        setDailyClosings(prev => prev.filter(c => c.outletId !== oid));
        localStorage.removeItem('mozzaboy_last_clockin');
        try {
            await Promise.all([
                supabase.from('transactions').delete().eq('outletid', oid),
                supabase.from('attendance').delete().eq('outletid', oid),
                supabase.from('expenses').delete().eq('outletid', oid),
                supabase.from('purchases').delete().eq('outletid', oid),
                supabase.from('daily_closings').delete().eq('outletid', oid)
            ]);
        } catch (err) {}
    },
    voidTransaction: async (txId) => { setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: OrderStatus.VOIDED } : t)); await supabase.from('transactions').update({ status: OrderStatus.VOIDED }).eq('id', txId); },
    resetGlobalData: async () => { 
        setTransactions([]); setExpenses([]); setAttendance([]); setPurchases([]); setDailyClosings([]);
        localStorage.removeItem('mozzaboy_last_clockin');
        try {
            await Promise.all([
                supabase.from('transactions').delete().neq('id', 'void'), 
                supabase.from('expenses').delete().neq('id', 'void'),
                supabase.from('attendance').delete().neq('id', 'void'),
                supabase.from('purchases').delete().neq('id', 'void'),
                supabase.from('daily_closings').delete().neq('id', 'void')
            ]);
        } catch (err) {}
    },
    resetAttendanceLogs: async () => { 
      setAttendance([]); 
      localStorage.removeItem('mozzaboy_last_clockin');
      await supabase.from('attendance').delete().neq('id', 'void'); 
    },
    syncToCloud: () => actions.fetchFromCloud(), selectCustomer: setSelectedCustomerId, setConnectedPrinter, 
    exportTableToCSV: (tableName) => {
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
            data = staff.map(s => [s.id, s.name, s.username, s.role, s.status, s.dailySalesTarget, (s.workingDays || []).join('|')]);
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
          await Promise.all([
             supabase.from('products').upsert(data.products.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('categories').upsert(data.categories.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('outlets').upsert(data.outlets.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('staff').upsert(data.staff.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('wip_recipes').upsert(data.wipRecipes.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('expense_types').upsert(data.expenseTypes.map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k.toLowerCase(),v])))),
             supabase.from('brand_config').upsert(Object.fromEntries(Object.entries({...data.brandConfig, id: 'global'}).map(([k,v])=>[k.toLowerCase(),v]))),
             supabase.from('loyalty_config').upsert(Object.fromEntries(Object.entries({...data.loyaltyConfig, id: 'global'}).map(([k,v])=>[k.toLowerCase(),v])))
          ]);
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
    <AppContext.Provider value={{ ...actions, products, categories, inventory, stockTransfers, stockRequests, productionRecords, wipRecipes, transactions, filteredTransactions, outlets, currentUser, isAuthenticated, loginTime: null, cart, staff, attendance, leaveRequests, selectedOutletId, customers, selectedCustomerId, expenses, expenseTypes, dailyClosings, purchases, connectedPrinter, membershipTiers, bulkDiscounts, simulations, loyaltyConfig, brandConfig, isSaving, isInitialLoading, isFetching, assetsOptimized, isDbConnected: true, cloudConfig, externalDbConfig }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
