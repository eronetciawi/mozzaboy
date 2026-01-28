
import { Category, Product, InventoryItem, Outlet, UserRole, StaffMember, InventoryItemType } from './types';

export const CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Corndog Gurih' },
  { id: 'cat2', name: 'Corndog Sweet' },
  { id: 'cat3', name: 'Tteokbokki' },
  { id: 'cat4', name: 'Odeng' },
  { id: 'cat5', name: 'Drinks' },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  // Outlet 1 (Central)
  { id: 'inv1', outletId: 'out1', name: 'Mozzarella Cheese', unit: 'kg', quantity: 15.5, minStock: 2, costPerUnit: 85000, type: InventoryItemType.RAW },
  { id: 'inv2', outletId: 'out1', name: 'Sausage Beef', unit: 'pcs', quantity: 120, minStock: 20, costPerUnit: 2500, type: InventoryItemType.RAW },
  { id: 'inv3', outletId: 'out1', name: 'Corndog Batter', unit: 'kg', quantity: 5, minStock: 1, costPerUnit: 12000, type: InventoryItemType.RAW },
  { id: 'inv4', outletId: 'out1', name: 'Rice Cake', unit: 'kg', quantity: 10, minStock: 2, costPerUnit: 35000, type: InventoryItemType.RAW },
  { id: 'inv5', outletId: 'out1', name: 'Gochujang Paste', unit: 'kg', quantity: 3, minStock: 0.5, costPerUnit: 90000, type: InventoryItemType.RAW },
  { id: 'inv6', outletId: 'out1', name: 'Boba Pearls', unit: 'kg', quantity: 8, minStock: 2, costPerUnit: 45000, type: InventoryItemType.RAW },
  
  // Outlet 2 (South)
  { id: 'inv1-out2', outletId: 'out2', name: 'Mozzarella Cheese', unit: 'kg', quantity: 10, minStock: 2, costPerUnit: 85000, type: InventoryItemType.RAW },
  { id: 'inv2-out2', outletId: 'out2', name: 'Sausage Beef', unit: 'pcs', quantity: 50, minStock: 20, costPerUnit: 2500, type: InventoryItemType.RAW },
  { id: 'inv3-out2', outletId: 'out2', name: 'Corndog Batter', unit: 'kg', quantity: 5, minStock: 1, costPerUnit: 12000, type: InventoryItemType.RAW },
  { id: 'inv4-out2', outletId: 'out2', name: 'Rice Cake', unit: 'kg', quantity: 5, minStock: 2, costPerUnit: 35000, type: InventoryItemType.RAW },
  { id: 'inv5-out2', outletId: 'out2', name: 'Gochujang Paste', unit: 'kg', quantity: 2, minStock: 0.5, costPerUnit: 90000, type: InventoryItemType.RAW },
  { id: 'inv6-out2', outletId: 'out2', name: 'Boba Pearls', unit: 'kg', quantity: 3, minStock: 2, costPerUnit: 45000, type: InventoryItemType.RAW },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Full Mozza Corndog',
    categoryId: 'cat1',
    price: 25000,
    image: 'https://picsum.photos/seed/corndog1/400/400',
    bom: [{ inventoryItemId: 'inv1', quantity: 0.1 }, { inventoryItemId: 'inv3', quantity: 0.05 }],
    isAvailable: true,
  },
  {
    id: 'p2',
    name: 'Original Beef Corndog',
    categoryId: 'cat1',
    price: 18000,
    image: 'https://picsum.photos/seed/corndog2/400/400',
    bom: [{ inventoryItemId: 'inv2', quantity: 1 }, { inventoryItemId: 'inv3', quantity: 0.05 }],
    isAvailable: true,
  },
  {
    id: 'p3',
    name: 'Spicy Tteokbokki Large',
    categoryId: 'cat3',
    price: 35000,
    image: 'https://picsum.photos/seed/tteok1/400/400',
    bom: [{ inventoryItemId: 'inv4', quantity: 0.3 }, { inventoryItemId: 'inv5', quantity: 0.05 }],
    isAvailable: true,
  },
  {
    id: 'p4',
    name: 'Classic Boba Milk Tea',
    categoryId: 'cat5',
    price: 22000,
    image: 'https://picsum.photos/seed/boba1/400/400',
    bom: [{ inventoryItemId: 'inv6', quantity: 0.05 }],
    isAvailable: true,
  },
];

export const OUTLETS: Outlet[] = [
  { id: 'out1', name: 'Mozza Boy Central Mall', address: 'Sudirman Central Business District', openTime: '10:00', closeTime: '18:00' },
  { id: 'out2', name: 'Mozza Boy South Station', address: 'South Jakarta Hub', openTime: '09:00', closeTime: '17:00' },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 's1',
    name: 'Alex Principal',
    username: 'alex.owner',
    password: '123',
    role: UserRole.OWNER,
    assignedOutletIds: ['out1', 'out2'],
    status: 'ACTIVE',
    permissions: { canAccessReports: true, canManageStaff: true, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true },
    joinedAt: new Date('2023-01-01'),
    weeklyOffDay: 0
  },
  {
    id: 's2',
    name: 'Andi Kusuma',
    username: 'andi.mgr',
    password: '123',
    role: UserRole.MANAGER,
    assignedOutletIds: ['out1', 'out2'],
    status: 'ACTIVE',
    permissions: { canAccessReports: true, canManageStaff: false, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true },
    joinedAt: new Date('2023-06-15'),
    weeklyOffDay: 0
  },
  {
    id: 's3',
    name: 'Siti Aminah',
    username: 'siti.kasir',
    password: '123',
    role: UserRole.CASHIER,
    assignedOutletIds: ['out1'],
    status: 'ACTIVE',
    permissions: { canAccessReports: false, canManageStaff: false, canManageMenu: false, canManageInventory: false, canProcessSales: true, canVoidTransactions: false, canManageSettings: false },
    joinedAt: new Date('2024-01-10'),
    weeklyOffDay: 1
  }
];
