import Dexie, { type Table } from 'dexie';
import type {
  Category,
  MenuItem,
  DiningTable,
  Invoice,
  RawMaterial,
  Recipe,
  PurchaseOrder,
  RestaurantSettings,
} from '../types';

export class BillingDB extends Dexie {
  categories!: Table<Category>;
  menuItems!: Table<MenuItem>;
  diningTables!: Table<DiningTable>;
  invoices!: Table<Invoice>;
  rawMaterials!: Table<RawMaterial>;
  recipes!: Table<Recipe>;
  purchaseOrders!: Table<PurchaseOrder>;
  settings!: Table<RestaurantSettings>;

  constructor() {
    super('PeetPoojaBilling');
    this.version(1).stores({
      categories:    '++id, name, sortOrder, isActive',
      menuItems:     '++id, categoryId, name, isActive, hsnCode',
      diningTables:  '++id, tableNumber, section, status',
      invoices:      '++id, invoiceNumber, createdAt, status, orderType, tableId',
      rawMaterials:  '++id, name, isActive',
      recipes:       '++id, menuItemId',
      purchaseOrders:'++id, supplier, status, createdAt',
      settings:      '++id',
    });
  }
}

export const db = new BillingDB();
