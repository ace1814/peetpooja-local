import { getSupabase } from './supabase';
import type {
  Category, MenuItem, DiningTable, Invoice, RawMaterial,
  Recipe, RecipeIngredient, PurchaseOrder, RestaurantSettings,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────

function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client;
}

// Map DB snake_case row → TS camelCase object
function mapSettings(r: Record<string, unknown>): RestaurantSettings {
  return {
    id:                 r.id as number,
    restaurantName:     (r.restaurant_name as string) ?? '',
    address:            (r.address as string) ?? '',
    city:               (r.city as string) ?? '',
    state:              (r.state as string) ?? '',
    pincode:            (r.pincode as string) ?? '',
    phone:              (r.phone as string) ?? '',
    email:              (r.email as string) ?? '',
    gstin:              (r.gstin as string) ?? '',
    fssaiNumber:        (r.fssai_number as string) ?? '',
    logoBase64:         (r.logo_base64 as string) ?? '',
    invoicePrefix:      (r.invoice_prefix as string) ?? 'INV',
    currentInvoiceSeq:  (r.current_invoice_seq as number) ?? 0,
    defaultGstMode:     (r.default_gst_mode as 'cgst_sgst' | 'igst') ?? 'cgst_sgst',
    enableRoundOff:     (r.enable_round_off as boolean) ?? true,
    printCopies:        (r.print_copies as number) ?? 1,
    thermalMode:        (r.thermal_mode as boolean) ?? false,
    printSize:          (r.print_size as '58mm' | '80mm' | 'a4') ?? '58mm',
    footerMessage:      (r.footer_message as string) ?? '',
    autoExportOnBill:   (r.auto_export_on_bill as boolean) ?? false,
  };
}

function mapCategory(r: Record<string, unknown>): Category {
  return {
    id:        r.id as number,
    name:      r.name as string,
    sortOrder: (r.sort_order as number) ?? 0,
    color:     r.color as string | undefined,
    isActive:  (r.is_active as boolean) ?? true,
  };
}

function mapMenuItem(r: Record<string, unknown>): MenuItem {
  return {
    id:           r.id as number,
    categoryId:   (r.category_id as number) ?? 0,
    name:         r.name as string,
    shortName:    r.short_name as string | undefined,
    price:        r.price as number,
    mrp:          r.mrp as number | undefined,
    hsnCode:      r.hsn_code as string | undefined,
    gstRate:      (r.gst_rate as 0 | 5 | 12 | 18 | 28) ?? 5,
    gstInclusive: (r.gst_inclusive as boolean) ?? false,
    unit:         (r.unit as string) ?? 'Plate',
    isVeg:        (r.is_veg as boolean) ?? true,
    isActive:     (r.is_active as boolean) ?? true,
    sortOrder:    (r.sort_order as number) ?? 0,
    description:  r.description as string | undefined,
  };
}

function mapTable(r: Record<string, unknown>): DiningTable {
  return {
    id:               r.id as number,
    tableNumber:      r.table_number as string,
    section:          (r.section as string) ?? 'Main Hall',
    capacity:         (r.capacity as number) ?? 4,
    status:           (r.status as 'available' | 'occupied' | 'reserved') ?? 'available',
    currentInvoiceId: r.current_invoice_id as number | undefined,
  };
}

function mapInvoice(r: Record<string, unknown>): Invoice {
  return {
    id:                 r.id as number,
    invoiceNumber:      r.invoice_number as string,
    orderType:          r.order_type as 'dine-in' | 'takeaway',
    tableId:            r.table_id as number | undefined,
    tableNumber:        r.table_number as string | undefined,
    customerName:       r.customer_name as string | undefined,
    customerPhone:      r.customer_phone as string | undefined,
    customerGstin:      r.customer_gstin as string | undefined,
    items:              (r.items as Invoice['items']) ?? [],
    billDiscountType:   (r.bill_discount_type as Invoice['billDiscountType']) ?? 'none',
    billDiscountValue:  (r.bill_discount_value as number) ?? 0,
    subtotal:           (r.subtotal as number) ?? 0,
    itemDiscountTotal:  (r.item_discount_total as number) ?? 0,
    billDiscountAmount: (r.bill_discount_amount as number) ?? 0,
    taxableAmount:      (r.taxable_amount as number) ?? 0,
    cgst:               (r.cgst as number) ?? 0,
    sgst:               (r.sgst as number) ?? 0,
    igst:               (r.igst as number) ?? 0,
    totalTax:           (r.total_tax as number) ?? 0,
    roundOff:           (r.round_off as number) ?? 0,
    grandTotal:         (r.grand_total as number) ?? 0,
    payments:           (r.payments as Invoice['payments']) ?? [],
    amountReceived:     (r.amount_received as number) ?? 0,
    changeReturned:     (r.change_returned as number) ?? 0,
    status:             (r.status as Invoice['status']) ?? 'draft',
    notes:              r.notes as string | undefined,
    createdAt:          new Date(r.created_at as string),
    updatedAt:          new Date(r.updated_at as string),
    printedAt:          r.printed_at ? new Date(r.printed_at as string) : undefined,
  };
}

function mapMaterial(r: Record<string, unknown>): RawMaterial {
  return {
    id:                 r.id as number,
    name:               r.name as string,
    unit:               r.unit as RawMaterial['unit'],
    currentStock:       (r.current_stock as number) ?? 0,
    lowStockThreshold:  (r.low_stock_threshold as number) ?? 0,
    costPerUnit:        (r.cost_per_unit as number) ?? 0,
    supplier:           r.supplier as string | undefined,
    isActive:           (r.is_active as boolean) ?? true,
  };
}

function mapRecipe(r: Record<string, unknown>): Recipe {
  return {
    id:          r.id as number,
    menuItemId:  r.menu_item_id as number,
    ingredients: (r.ingredients as RecipeIngredient[]) ?? [],
  };
}

function mapPurchaseOrder(r: Record<string, unknown>): PurchaseOrder {
  return {
    id:         r.id as number,
    supplier:   (r.supplier as string) ?? '',
    status:     (r.status as PurchaseOrder['status']) ?? 'pending',
    items:      (r.items as PurchaseOrder['items']) ?? [],
    totalCost:  (r.total_cost as number) ?? 0,
    notes:      r.notes as string | undefined,
    createdAt:  new Date(r.created_at as string),
    receivedAt: r.received_at ? new Date(r.received_at as string) : undefined,
  };
}

// ─── Settings ────────────────────────────────────────────────

export async function getSettings(): Promise<RestaurantSettings | null> {
  const { data, error } = await sb().from('restaurant_settings').select('*').eq('id', 1).single();
  if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message); }
  return mapSettings(data as Record<string, unknown>);
}

export async function updateSettings(changes: Partial<RestaurantSettings>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.restaurantName  !== undefined) row.restaurant_name      = changes.restaurantName;
  if (changes.address         !== undefined) row.address              = changes.address;
  if (changes.city            !== undefined) row.city                 = changes.city;
  if (changes.state           !== undefined) row.state                = changes.state;
  if (changes.pincode         !== undefined) row.pincode              = changes.pincode;
  if (changes.phone           !== undefined) row.phone                = changes.phone;
  if (changes.email           !== undefined) row.email                = changes.email;
  if (changes.gstin           !== undefined) row.gstin                = changes.gstin;
  if (changes.fssaiNumber     !== undefined) row.fssai_number         = changes.fssaiNumber;
  if (changes.logoBase64      !== undefined) row.logo_base64          = changes.logoBase64;
  if (changes.invoicePrefix   !== undefined) row.invoice_prefix       = changes.invoicePrefix;
  if (changes.defaultGstMode  !== undefined) row.default_gst_mode     = changes.defaultGstMode;
  if (changes.enableRoundOff  !== undefined) row.enable_round_off     = changes.enableRoundOff;
  if (changes.printCopies     !== undefined) row.print_copies         = changes.printCopies;
  if (changes.thermalMode     !== undefined) row.thermal_mode         = changes.thermalMode;
  if (changes.printSize       !== undefined) row.print_size           = changes.printSize;
  if (changes.footerMessage   !== undefined) row.footer_message       = changes.footerMessage;
  if (changes.autoExportOnBill!== undefined) row.auto_export_on_bill  = changes.autoExportOnBill;
  const { error } = await sb().from('restaurant_settings').update(row).eq('id', 1);
  if (error) throw new Error(error.message);
}

// ─── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await sb().from('categories').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapCategory(r as Record<string, unknown>));
}

export async function addCategory(cat: Omit<Category, 'id'>): Promise<number> {
  const { data, error } = await sb().from('categories').insert({
    name: cat.name, sort_order: cat.sortOrder, color: cat.color, is_active: cat.isActive,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updateCategory(id: number, changes: Partial<Category>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.name      !== undefined) row.name       = changes.name;
  if (changes.sortOrder !== undefined) row.sort_order = changes.sortOrder;
  if (changes.color     !== undefined) row.color      = changes.color;
  if (changes.isActive  !== undefined) row.is_active  = changes.isActive;
  const { error } = await sb().from('categories').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await sb().from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getMenuItemCount(categoryId: number): Promise<number> {
  const { count, error } = await sb().from('menu_items').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Menu Items ──────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await sb().from('menu_items').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapMenuItem(r as Record<string, unknown>));
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<number> {
  const { data, error } = await sb().from('menu_items').insert({
    category_id: item.categoryId, name: item.name, short_name: item.shortName,
    price: item.price, mrp: item.mrp, hsn_code: item.hsnCode,
    gst_rate: item.gstRate, gst_inclusive: item.gstInclusive,
    unit: item.unit, is_veg: item.isVeg, is_active: item.isActive,
    sort_order: item.sortOrder, description: item.description,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updateMenuItem(id: number, changes: Partial<MenuItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.categoryId   !== undefined) row.category_id   = changes.categoryId;
  if (changes.name         !== undefined) row.name          = changes.name;
  if (changes.shortName    !== undefined) row.short_name    = changes.shortName;
  if (changes.price        !== undefined) row.price         = changes.price;
  if (changes.mrp          !== undefined) row.mrp           = changes.mrp;
  if (changes.hsnCode      !== undefined) row.hsn_code      = changes.hsnCode;
  if (changes.gstRate      !== undefined) row.gst_rate      = changes.gstRate;
  if (changes.gstInclusive !== undefined) row.gst_inclusive = changes.gstInclusive;
  if (changes.unit         !== undefined) row.unit          = changes.unit;
  if (changes.isVeg        !== undefined) row.is_veg        = changes.isVeg;
  if (changes.isActive     !== undefined) row.is_active     = changes.isActive;
  if (changes.sortOrder    !== undefined) row.sort_order    = changes.sortOrder;
  if (changes.description  !== undefined) row.description   = changes.description;
  const { error } = await sb().from('menu_items').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await sb().from('menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Dining Tables ───────────────────────────────────────────

export async function getDiningTables(): Promise<DiningTable[]> {
  const { data, error } = await sb().from('dining_tables').select('*').order('table_number');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapTable(r as Record<string, unknown>));
}

export async function addDiningTable(t: Omit<DiningTable, 'id'>): Promise<number> {
  const { data, error } = await sb().from('dining_tables').insert({
    table_number: t.tableNumber, section: t.section, capacity: t.capacity, status: t.status,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updateDiningTable(id: number, changes: Partial<DiningTable>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.tableNumber      !== undefined) row.table_number       = changes.tableNumber;
  if (changes.section          !== undefined) row.section            = changes.section;
  if (changes.capacity         !== undefined) row.capacity           = changes.capacity;
  if (changes.status           !== undefined) row.status             = changes.status;
  if ('currentInvoiceId' in changes) row.current_invoice_id = changes.currentInvoiceId ?? null;
  const { error } = await sb().from('dining_tables').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDiningTable(id: number): Promise<void> {
  const { error } = await sb().from('dining_tables').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Invoices ────────────────────────────────────────────────

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await sb().from('invoices').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapInvoice(r as Record<string, unknown>));
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const { data, error } = await sb().from('invoices').select('*').eq('id', id).single();
  if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message); }
  return mapInvoice(data as Record<string, unknown>);
}

export async function addInvoice(inv: Omit<Invoice, 'id'>): Promise<number> {
  const { data, error } = await sb().from('invoices').insert({
    invoice_number: inv.invoiceNumber, order_type: inv.orderType,
    table_id: inv.tableId ?? null, table_number: inv.tableNumber ?? null,
    customer_name: inv.customerName ?? null, customer_phone: inv.customerPhone ?? null,
    customer_gstin: inv.customerGstin ?? null,
    items: inv.items, bill_discount_type: inv.billDiscountType, bill_discount_value: inv.billDiscountValue,
    subtotal: inv.subtotal, item_discount_total: inv.itemDiscountTotal,
    bill_discount_amount: inv.billDiscountAmount, taxable_amount: inv.taxableAmount,
    cgst: inv.cgst, sgst: inv.sgst, igst: inv.igst, total_tax: inv.totalTax,
    round_off: inv.roundOff, grand_total: inv.grandTotal,
    payments: inv.payments, amount_received: inv.amountReceived, change_returned: inv.changeReturned,
    status: inv.status, notes: inv.notes ?? null,
    created_at: inv.createdAt, updated_at: inv.updatedAt,
    printed_at: inv.printedAt ?? null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updateInvoice(id: number, changes: Partial<Invoice>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.invoiceNumber      !== undefined) row.invoice_number       = changes.invoiceNumber;
  if (changes.status             !== undefined) row.status               = changes.status;
  if (changes.items              !== undefined) row.items                = changes.items;
  if (changes.payments           !== undefined) row.payments             = changes.payments;
  if (changes.amountReceived     !== undefined) row.amount_received      = changes.amountReceived;
  if (changes.changeReturned     !== undefined) row.change_returned      = changes.changeReturned;
  if (changes.subtotal           !== undefined) row.subtotal             = changes.subtotal;
  if (changes.itemDiscountTotal  !== undefined) row.item_discount_total  = changes.itemDiscountTotal;
  if (changes.billDiscountAmount !== undefined) row.bill_discount_amount = changes.billDiscountAmount;
  if (changes.billDiscountType   !== undefined) row.bill_discount_type   = changes.billDiscountType;
  if (changes.billDiscountValue  !== undefined) row.bill_discount_value  = changes.billDiscountValue;
  if (changes.taxableAmount      !== undefined) row.taxable_amount       = changes.taxableAmount;
  if (changes.cgst               !== undefined) row.cgst                 = changes.cgst;
  if (changes.sgst               !== undefined) row.sgst                 = changes.sgst;
  if (changes.igst               !== undefined) row.igst                 = changes.igst;
  if (changes.totalTax           !== undefined) row.total_tax            = changes.totalTax;
  if (changes.roundOff           !== undefined) row.round_off            = changes.roundOff;
  if (changes.grandTotal         !== undefined) row.grand_total          = changes.grandTotal;
  if (changes.notes              !== undefined) row.notes                = changes.notes;
  if (changes.updatedAt          !== undefined) row.updated_at           = changes.updatedAt;
  if (changes.printedAt          !== undefined) row.printed_at           = changes.printedAt;
  const { error } = await sb().from('invoices').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Raw Materials ───────────────────────────────────────────

export async function getRawMaterials(): Promise<RawMaterial[]> {
  const { data, error } = await sb().from('raw_materials').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapMaterial(r as Record<string, unknown>));
}

export async function addRawMaterial(m: Omit<RawMaterial, 'id'>): Promise<number> {
  const { data, error } = await sb().from('raw_materials').insert({
    name: m.name, unit: m.unit, current_stock: m.currentStock,
    low_stock_threshold: m.lowStockThreshold, cost_per_unit: m.costPerUnit,
    supplier: m.supplier ?? null, is_active: m.isActive,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updateRawMaterial(id: number, changes: Partial<RawMaterial>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.name               !== undefined) row.name                = changes.name;
  if (changes.unit               !== undefined) row.unit                = changes.unit;
  if (changes.currentStock       !== undefined) row.current_stock       = changes.currentStock;
  if (changes.lowStockThreshold  !== undefined) row.low_stock_threshold = changes.lowStockThreshold;
  if (changes.costPerUnit        !== undefined) row.cost_per_unit       = changes.costPerUnit;
  if (changes.supplier           !== undefined) row.supplier            = changes.supplier;
  if (changes.isActive           !== undefined) row.is_active           = changes.isActive;
  const { error } = await sb().from('raw_materials').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Recipes ─────────────────────────────────────────────────

export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await sb().from('recipes').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapRecipe(r as Record<string, unknown>));
}

export async function getRecipeByMenuItemId(menuItemId: number): Promise<Recipe | null> {
  const { data, error } = await sb().from('recipes').select('*').eq('menu_item_id', menuItemId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRecipe(data as Record<string, unknown>);
}

export async function upsertRecipe(menuItemId: number, ingredients: RecipeIngredient[]): Promise<void> {
  const existing = await getRecipeByMenuItemId(menuItemId);
  if (existing) {
    const { error } = await sb().from('recipes').update({ ingredients }).eq('id', existing.id!);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb().from('recipes').insert({ menu_item_id: menuItemId, ingredients });
    if (error) throw new Error(error.message);
  }
}

// ─── Purchase Orders ─────────────────────────────────────────

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await sb().from('purchase_orders').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapPurchaseOrder(r as Record<string, unknown>));
}

export async function addPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<number> {
  const { data, error } = await sb().from('purchase_orders').insert({
    supplier: po.supplier, status: po.status, items: po.items,
    total_cost: po.totalCost, notes: po.notes ?? null, created_at: po.createdAt,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

export async function updatePurchaseOrder(id: number, changes: Partial<PurchaseOrder>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.status     !== undefined) row.status      = changes.status;
  if (changes.items      !== undefined) row.items       = changes.items;
  if (changes.totalCost  !== undefined) row.total_cost  = changes.totalCost;
  if (changes.notes      !== undefined) row.notes       = changes.notes;
  if (changes.receivedAt !== undefined) row.received_at = changes.receivedAt;
  const { error } = await sb().from('purchase_orders').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Invoice Number ──────────────────────────────────────────

export async function getNextInvoiceNumber(): Promise<string> {
  const { data, error } = await sb().rpc('get_next_invoice_number');
  if (error) throw new Error(error.message);
  return data as string;
}

// ─── Seed Initial Data ───────────────────────────────────────

export async function seedInitialData(): Promise<void> {
  // Only seed if categories table is empty
  const { count } = await sb().from('categories').select('id', { count: 'exact', head: true });
  if ((count ?? 0) > 0) return;

  // Categories
  const { data: cats, error: catErr } = await sb().from('categories').insert([
    { name: 'Starters',      sort_order: 1, color: '#FF6B35', is_active: true },
    { name: 'Main Course',   sort_order: 2, color: '#4ECDC4', is_active: true },
    { name: 'Breads',        sort_order: 3, color: '#45B7D1', is_active: true },
    { name: 'Rice & Biryani',sort_order: 4, color: '#96CEB4', is_active: true },
    { name: 'Beverages',     sort_order: 5, color: '#FFEAA7', is_active: true },
    { name: 'Desserts',      sort_order: 6, color: '#DDA0DD', is_active: true },
  ]).select('id, name');
  if (catErr) throw new Error(catErr.message);

  const catMap: Record<string, number> = {};
  for (const c of (cats ?? [])) catMap[(c as { name: string; id: number }).name] = (c as { name: string; id: number }).id;

  // Menu Items
  await sb().from('menu_items').insert([
    { name: 'Paneer Tikka',          category_id: catMap['Starters'],      price: 299, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Chicken Tikka',         category_id: catMap['Starters'],      price: 349, gst_rate: 5, is_veg: false, is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Veg Manchurian',        category_id: catMap['Starters'],      price: 199, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Dal Makhani',           category_id: catMap['Main Course'],   price: 199, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Bowl'  },
    { name: 'Butter Chicken',        category_id: catMap['Main Course'],   price: 349, gst_rate: 5, is_veg: false, is_active: true, hsn_code: '996331', unit: 'Bowl'  },
    { name: 'Paneer Butter Masala',  category_id: catMap['Main Course'],   price: 279, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Bowl'  },
    { name: 'Butter Naan',           category_id: catMap['Breads'],        price:  49, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Piece' },
    { name: 'Garlic Naan',           category_id: catMap['Breads'],        price:  59, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Piece' },
    { name: 'Veg Biryani',           category_id: catMap['Rice & Biryani'],price: 249, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Chicken Biryani',       category_id: catMap['Rice & Biryani'],price: 319, gst_rate: 5, is_veg: false, is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Lassi',                 category_id: catMap['Beverages'],     price:  99, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Glass' },
    { name: 'Cold Coffee',           category_id: catMap['Beverages'],     price: 129, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Glass' },
    { name: 'Gulab Jamun',           category_id: catMap['Desserts'],      price:  89, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Plate' },
    { name: 'Ice Cream',             category_id: catMap['Desserts'],      price: 119, gst_rate: 5, is_veg: true,  is_active: true, hsn_code: '996331', unit: 'Scoop' },
  ]);

  // Dining Tables
  await sb().from('dining_tables').insert([
    { table_number: 'T1', section: 'Ground Floor', capacity: 4, status: 'available' },
    { table_number: 'T2', section: 'Ground Floor', capacity: 4, status: 'available' },
    { table_number: 'T3', section: 'Ground Floor', capacity: 2, status: 'available' },
    { table_number: 'T4', section: 'Ground Floor', capacity: 6, status: 'available' },
    { table_number: 'T5', section: 'Ground Floor', capacity: 4, status: 'available' },
    { table_number: 'F1', section: 'First Floor',  capacity: 4, status: 'available' },
    { table_number: 'F2', section: 'First Floor',  capacity: 4, status: 'available' },
    { table_number: 'F3', section: 'First Floor',  capacity: 8, status: 'available' },
  ]);

  // Raw Materials
  await sb().from('raw_materials').insert([
    { name: 'Onion',   unit: 'kg', current_stock: 10, low_stock_threshold: 3, cost_per_unit: 30,  supplier: 'Local Market', is_active: true },
    { name: 'Tomato',  unit: 'kg', current_stock:  8, low_stock_threshold: 3, cost_per_unit: 40,  supplier: 'Local Market', is_active: true },
    { name: 'Chicken', unit: 'kg', current_stock:  5, low_stock_threshold: 2, cost_per_unit: 200, supplier: 'Fresh Farms',  is_active: true },
    { name: 'Paneer',  unit: 'kg', current_stock:  3, low_stock_threshold: 1, cost_per_unit: 300, supplier: 'Dairy Farm',   is_active: true },
    { name: 'Rice',    unit: 'kg', current_stock: 15, low_stock_threshold: 5, cost_per_unit: 60,  supplier: 'Grain Store',  is_active: true },
  ]);
}
