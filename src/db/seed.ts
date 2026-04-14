import { db } from './schema';

export async function seedDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount > 0) return; // Already seeded

  // Default settings
  await db.settings.add({
    restaurantName: 'My Restaurant',
    address: '123, Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '9800000000',
    email: '',
    gstin: '27AABCU9603R1ZX',
    fssaiNumber: '',
    logoBase64: '',
    invoicePrefix: 'INV',
    currentInvoiceSeq: 0,
    defaultGstMode: 'cgst_sgst',
    enableRoundOff: true,
    printCopies: 1,
    thermalMode: false,
    footerMessage: 'Thank you for dining with us!',
    autoExportOnBill: false,
  });

  // Categories
  const catIds = await db.categories.bulkAdd([
    { name: 'Starters',    sortOrder: 1, color: '#f97316', isActive: true },
    { name: 'Main Course', sortOrder: 2, color: '#C52031', isActive: true },
    { name: 'Breads',      sortOrder: 3, color: '#a855f7', isActive: true },
    { name: 'Rice & Biryani', sortOrder: 4, color: '#eab308', isActive: true },
    { name: 'Beverages',   sortOrder: 5, color: '#06b6d4', isActive: true },
    { name: 'Desserts',    sortOrder: 6, color: '#ec4899', isActive: true },
  ], { allKeys: true }) as number[];

  // Menu items
  await db.menuItems.bulkAdd([
    // Starters
    { categoryId: catIds[0], name: 'Paneer Tikka',       price: 220, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[0], name: 'Veg Spring Rolls',   price: 160, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 2, hsnCode: '996331' },
    { categoryId: catIds[0], name: 'Chicken Tikka',      price: 280, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: false, isActive: true, sortOrder: 3, hsnCode: '996331' },
    { categoryId: catIds[0], name: 'Hara Bhara Kabab',   price: 180, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 4, hsnCode: '996331' },
    // Main Course
    { categoryId: catIds[1], name: 'Dal Makhani',        price: 180, gstRate: 5,  gstInclusive: false, unit: 'Bowl',  isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[1], name: 'Paneer Butter Masala', price: 220, gstRate: 5, gstInclusive: false, unit: 'Bowl', isVeg: true,  isActive: true, sortOrder: 2, hsnCode: '996331' },
    { categoryId: catIds[1], name: 'Butter Chicken',     price: 300, gstRate: 5,  gstInclusive: false, unit: 'Bowl',  isVeg: false, isActive: true, sortOrder: 3, hsnCode: '996331' },
    { categoryId: catIds[1], name: 'Palak Paneer',       price: 200, gstRate: 5,  gstInclusive: false, unit: 'Bowl',  isVeg: true,  isActive: true, sortOrder: 4, hsnCode: '996331' },
    // Breads
    { categoryId: catIds[2], name: 'Butter Naan',        price: 40,  gstRate: 5,  gstInclusive: false, unit: 'Piece', isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[2], name: 'Garlic Naan',        price: 50,  gstRate: 5,  gstInclusive: false, unit: 'Piece', isVeg: true,  isActive: true, sortOrder: 2, hsnCode: '996331' },
    { categoryId: catIds[2], name: 'Tandoori Roti',      price: 30,  gstRate: 5,  gstInclusive: false, unit: 'Piece', isVeg: true,  isActive: true, sortOrder: 3, hsnCode: '996331' },
    // Rice & Biryani
    { categoryId: catIds[3], name: 'Veg Biryani',        price: 200, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[3], name: 'Chicken Biryani',    price: 280, gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: false, isActive: true, sortOrder: 2, hsnCode: '996331' },
    { categoryId: catIds[3], name: 'Steamed Rice',       price: 80,  gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 3, hsnCode: '996331' },
    // Beverages
    { categoryId: catIds[4], name: 'Mango Lassi',        price: 80,  gstRate: 5,  gstInclusive: false, unit: 'Glass', isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[4], name: 'Masala Chaas',       price: 60,  gstRate: 5,  gstInclusive: false, unit: 'Glass', isVeg: true,  isActive: true, sortOrder: 2, hsnCode: '996331' },
    { categoryId: catIds[4], name: 'Soft Drink',         price: 50,  gstRate: 12, gstInclusive: false, unit: 'Can',   isVeg: true,  isActive: true, sortOrder: 3, hsnCode: '220210' },
    { categoryId: catIds[4], name: 'Fresh Lime Soda',    price: 70,  gstRate: 5,  gstInclusive: false, unit: 'Glass', isVeg: true,  isActive: true, sortOrder: 4, hsnCode: '996331' },
    // Desserts
    { categoryId: catIds[5], name: 'Gulab Jamun',        price: 80,  gstRate: 5,  gstInclusive: false, unit: 'Plate', isVeg: true,  isActive: true, sortOrder: 1, hsnCode: '996331' },
    { categoryId: catIds[5], name: 'Kulfi',              price: 100, gstRate: 5,  gstInclusive: false, unit: 'Piece', isVeg: true,  isActive: true, sortOrder: 2, hsnCode: '996331' },
  ]);

  // Dining tables
  await db.diningTables.bulkAdd([
    { tableNumber: 'T1', section: 'Ground Floor', capacity: 2, status: 'available' },
    { tableNumber: 'T2', section: 'Ground Floor', capacity: 4, status: 'available' },
    { tableNumber: 'T3', section: 'Ground Floor', capacity: 4, status: 'available' },
    { tableNumber: 'T4', section: 'Ground Floor', capacity: 6, status: 'available' },
    { tableNumber: 'T5', section: 'Ground Floor', capacity: 2, status: 'available' },
    { tableNumber: 'T6', section: 'Ground Floor', capacity: 4, status: 'available' },
    { tableNumber: 'F1', section: 'First Floor',  capacity: 4, status: 'available' },
    { tableNumber: 'F2', section: 'First Floor',  capacity: 4, status: 'available' },
    { tableNumber: 'F3', section: 'First Floor',  capacity: 6, status: 'available' },
    { tableNumber: 'F4', section: 'First Floor',  capacity: 8, status: 'available' },
  ]);

  // Raw materials
  await db.rawMaterials.bulkAdd([
    { name: 'Paneer',          unit: 'kg',  currentStock: 5,   lowStockThreshold: 1,   costPerUnit: 300, supplier: 'Local Dairy',    isActive: true },
    { name: 'Chicken',         unit: 'kg',  currentStock: 10,  lowStockThreshold: 2,   costPerUnit: 220, supplier: 'City Meats',     isActive: true },
    { name: 'Basmati Rice',    unit: 'kg',  currentStock: 20,  lowStockThreshold: 5,   costPerUnit: 80,  supplier: 'Agro Suppliers', isActive: true },
    { name: 'Tomatoes',        unit: 'kg',  currentStock: 8,   lowStockThreshold: 2,   costPerUnit: 30,  supplier: 'Fresh Veggies',  isActive: true },
    { name: 'Onions',          unit: 'kg',  currentStock: 10,  lowStockThreshold: 3,   costPerUnit: 25,  supplier: 'Fresh Veggies',  isActive: true },
    { name: 'Butter',          unit: 'kg',  currentStock: 3,   lowStockThreshold: 0.5, costPerUnit: 450, supplier: 'Local Dairy',    isActive: true },
    { name: 'Maida (Flour)',   unit: 'kg',  currentStock: 15,  lowStockThreshold: 3,   costPerUnit: 40,  supplier: 'Agro Suppliers', isActive: true },
    { name: 'Milk',            unit: 'L',   currentStock: 10,  lowStockThreshold: 2,   costPerUnit: 60,  supplier: 'Local Dairy',    isActive: true },
    { name: 'Cooking Oil',     unit: 'L',   currentStock: 8,   lowStockThreshold: 2,   costPerUnit: 120, supplier: 'Agro Suppliers', isActive: true },
    { name: 'Soft Drinks (Can)',unit: 'pcs', currentStock: 48,  lowStockThreshold: 12,  costPerUnit: 30,  supplier: 'Beverage Co',    isActive: true },
  ]);
}
