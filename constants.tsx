
import { Category, Product, InventoryItem, Outlet, UserRole, StaffMember, InventoryItemType } from './types';

// Kosongkan kategori agar tidak membingungkan user dan tidak menimpa data baru
export const CATEGORIES: Category[] = [];

export const INVENTORY_ITEMS: InventoryItem[] = [
  // Outlet 1 (Central)
  { id: 'inv1', outletId: 'out1', name: 'Bahan Baku Demo A', unit: 'kg', quantity: 15.5, minStock: 2, costPerUnit: 15000, type: InventoryItemType.RAW },
  { id: 'inv2', outletId: 'out1', name: 'Bahan Baku Demo B', unit: 'pcs', quantity: 120, minStock: 20, costPerUnit: 2500, type: InventoryItemType.RAW },
  
  // Outlet 2 (South)
  { id: 'inv1-out2', outletId: 'out2', name: 'Bahan Baku Demo A', unit: 'kg', quantity: 10, minStock: 2, costPerUnit: 15000, type: InventoryItemType.RAW },
  { id: 'inv2-out2', outletId: 'out2', name: 'Bahan Baku Demo B', unit: 'pcs', quantity: 50, minStock: 20, costPerUnit: 2500, type: InventoryItemType.RAW },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Produk Demo Utama',
    categoryId: 'cat1',
    price: 25000,
    image: 'https://picsum.photos/seed/p1/400/400',
    bom: [{ inventoryItemId: 'inv1', quantity: 0.1 }],
    isAvailable: true,
  }
];

export const OUTLETS: Outlet[] = [
  { id: 'out1', name: 'Main Branch', address: 'Central City District', openTime: '09:00', closeTime: '21:00' },
  { id: 'out2', name: 'Sub Branch', address: 'Southern Hub Station', openTime: '09:00', closeTime: '21:00' },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 's1',
    name: 'System Administrator',
    username: 'admin',
    password: '123',
    role: UserRole.OWNER,
    assignedOutletIds: ['out1', 'out2'],
    status: 'ACTIVE',
    permissions: { canAccessReports: true, canManageStaff: true, canManageMenu: true, canManageInventory: true, canProcessSales: true, canVoidTransactions: true, canManageSettings: true },
    joinedAt: new Date('2024-01-01'),
    weeklyOffDay: 0
  }
];
