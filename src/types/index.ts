// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id?: number;
  name: string;
  sortOrder: number;
  color?: string;
  isActive: boolean;
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
export interface MenuItem {
  id?: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  shortName?: string;
  price: number;
  mrp?: number;
  hsnCode?: string;
  gstRate: 0 | 5 | 12 | 18 | 28;
  gstInclusive: boolean;
  unit: string;
  isVeg: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

// ─── Dining Table ─────────────────────────────────────────────────────────────
export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface DiningTable {
  id?: number;
  tableNumber: string;
  section: string;
  capacity: number;
  status: TableStatus;
  currentInvoiceId?: number;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type OrderType = 'dine-in' | 'takeaway';
export type InvoiceStatus = 'draft' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';
export type DiscountType = 'percentage' | 'flat' | 'none';
export type GstMode = 'cgst_sgst' | 'igst';

export interface InvoiceItem {
  menuItemId: number;
  name: string;
  hsnCode?: string;
  gstRate: number;
  gstInclusive: boolean;
  unitPrice: number;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  orderType: OrderType;
  tableId?: number;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  items: InvoiceItem[];
  billDiscountType: DiscountType;
  billDiscountValue: number;
  subtotal: number;
  itemDiscountTotal: number;
  billDiscountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  payments: PaymentEntry[];
  amountReceived: number;
  changeReturned: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  printedAt?: Date;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export type StockUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'dozen' | 'plate';

export interface RawMaterial {
  id?: number;
  name: string;
  unit: StockUnit;
  currentStock: number;
  lowStockThreshold: number;
  costPerUnit: number;
  supplier?: string;
  isActive: boolean;
}

export interface RecipeIngredient {
  rawMaterialId: number;
  rawMaterialName?: string;
  quantity: number;
  unit: StockUnit;
}

export interface Recipe {
  id?: number;
  menuItemId: number;
  menuItemName?: string;
  ingredients: RecipeIngredient[];
}

export type PurchaseOrderStatus = 'pending' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  rawMaterialId: number;
  name: string;
  unit: StockUnit;
  quantityOrdered: number;
  quantityReceived: number;
  costPerUnit: number;
}

export interface PurchaseOrder {
  id?: number;
  supplier: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
  receivedAt?: Date;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface RestaurantSettings {
  id?: number;
  restaurantName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  gstin: string;
  fssaiNumber?: string;
  logoBase64?: string;
  invoicePrefix: string;
  currentInvoiceSeq: number;
  defaultGstMode: GstMode;
  enableRoundOff: boolean;
  printCopies: number;
  thermalMode: boolean;
  printSize: '58mm' | '80mm' | 'a4';
  footerMessage: string;
  autoExportOnBill: boolean;
}

// ─── Cart (billing UI state) ──────────────────────────────────────────────────
export interface CartItem extends InvoiceItem {
  // Extra UI-only state for the cart
  tempDiscountType: DiscountType;
  tempDiscountValue: number;
}

// ─── Bill Totals (computed) ───────────────────────────────────────────────────
export interface BillTotals {
  subtotal: number;
  itemDiscountTotal: number;
  billDiscountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
}
