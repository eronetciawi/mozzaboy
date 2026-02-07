
export enum OrderStatus {
  PENDING = 'PENDING',
  PRODUCTION = 'PRODUCTION',
  SERVED = 'SERVED',
  CLOSED = 'CLOSED',
  VOIDED = 'VOIDED'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FULFILLED = 'FULFILLED'
}

export enum PaymentMethod {
  CASH = 'TUNAI',
  QRIS = 'QRIS',
  DEBIT = 'DEBIT'
}

export enum UserRole {
  OWNER = 'PEMILIK',
  MANAGER = 'MANAJER',
  CASHIER = 'KASIR',
  KITCHEN = 'DAPUR'
}

export enum InventoryItemType {
  RAW = 'MENTAH',
  WIP = 'SETENGAH_JADI'
}

export interface BrandConfig {
  name: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
}

export interface LoyaltyConfig {
  isEnabled: boolean;
  earningAmountPerPoint: number;
  redemptionValuePerPoint: number;
  minRedeemPoints: number;
}

export interface Permissions {
  canAccessReports: boolean;
  canManageStaff: boolean;
  canManageMenu: boolean;
  canManageInventory: boolean;
  canProcessSales: boolean;
  canVoidTransactions: boolean;
  canManageSettings: boolean;
}

export interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  outletId: string; 
  date: string; // Format: YYYY-MM-DD
  clockIn: Date;
  clockOut?: Date;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  outletId: string; 
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  assignedOutletIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  permissions: Permissions;
  joinedAt: Date;
  weeklyOffDay?: number;
  specialHolidays?: string[];
  shiftStartTime?: string; // HH:mm
  shiftEndTime?: string; // HH:mm
  dailySalesTarget?: number;
  targetBonusAmount?: number;
  phone?: string;
  email?: string;
  address?: string;
  photo?: string;
  instagram?: string;
  telegram?: string;
  tiktok?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface InventoryItem {
  id: string;
  outletId: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPerUnit: number;
  type: InventoryItemType;
  isCashierOperated?: boolean; 
  canCashierPurchase?: boolean;
}

export interface ProductionComponent {
  inventoryItemId: string;
  quantity: number;
}

export interface WIPRecipe {
  id: string;
  assignedOutletIds: string[]; 
  name: string;
  resultItemId: string;
  resultQuantity: number;
  components: ProductionComponent[];
  isCashierOperated?: boolean; 
}

export interface ProductionRecord {
  id: string;
  outletId: string;
  resultItemId: string;
  resultQuantity: number;
  components: ProductionComponent[];
  timestamp: Date;
  staffId: string;
  staffName: string;
}

export interface StockRequest {
  id: string;
  outletId: string;
  inventoryItemId: string;
  itemName: string;
  requestedQuantity: number;
  unit: string;
  status: RequestStatus;
  timestamp: Date;
  staffId: string;
  staffName: string;
  isUrgent: boolean;
}

export interface StockTransfer {
  id: string;
  fromOutletId: string;
  fromOutletName: string;
  toOutletId: string;
  toOutletName: string;
  itemName: string;
  quantity: number;
  unit: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: Date;
  staffId: string;
  staffName: string;
}

export interface BOMComponent {
  inventoryItemId: string; 
  quantity: number;
}

export interface ComboItem {
  productId: string;
  quantity: number;
}

export interface OutletSetting {
  price: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  image: string;
  bom: BOMComponent[];
  isAvailable: boolean;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  outletSettings?: Record<string, OutletSetting>;
}

export interface MenuSimBOMRow {
  id: string;
  name: string;
  purchasePrice: number;
  packageSize: number;
  yieldPercent: number;
  recipeQty: number;
  unit: string;
}

export interface MenuSimulation {
  id: string;
  name: string;
  price: number;
  shareProfitPercent: number;
  items: MenuSimBOMRow[];
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface MembershipTier {
  id: string;
  name: string;
  minPoints: number;
  discountPercent: number;
}

export interface BulkDiscountRule {
  id: string;
  name: string;
  minQty: number;
  discountPercent: number;
  isActive: boolean;
  applicableProductIds: string[];
}

export interface ExpenseType {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  outletId: string;
  typeId: string;
  amount: number;
  notes: string;
  staffId: string;
  staffName: string;
  timestamp: Date;
}

export interface Purchase {
  id: string;
  outletId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  staffId: string;
  staffName: string;
  timestamp: Date;
  requestId?: string;
}

export interface DailyClosing {
  id: string;
  outletId: string;
  staffId: string;
  staffName: string;
  timestamp: Date;
  shiftName: string;
  openingBalance: number;
  totalSalesCash: number;
  totalSalesQRIS: number;
  totalExpenses: number;
  actualCash: number;
  discrepancy: number;
  notes: string;
  status: 'PENDING' | 'APPROVED';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  outletId: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  timestamp: Date;
  cashierId: string;
  cashierName: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointDiscountValue?: number;
  membershipDiscount?: number;
  bulkDiscount?: number;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  latitude?: number;
  longitude?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tierId: string;
  lastVisit?: Date;
  registeredAt: Date;
  registeredByStaffId: string;
  registeredByStaffName: string;
  registeredAtOutletId: string;
  registeredAtOutletName: string;
}
