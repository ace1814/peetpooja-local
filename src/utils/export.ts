import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Invoice, RawMaterial, MenuItem, PurchaseOrder } from '../types';

function formatDate(d: Date | string | undefined): string {
  if (!d) return '';
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return String(d); }
}

function formatDateOnly(d: Date | string | undefined): string {
  if (!d) return '';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return String(d); }
}

export function exportInvoicesToXlsx(invoices: Invoice[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Invoices summary
  const invoiceRows = invoices.map(inv => ({
    'Bill #': inv.invoiceNumber,
    'Date': formatDateOnly(inv.createdAt),
    'Time': inv.createdAt ? format(new Date(inv.createdAt), 'HH:mm') : '',
    'Order Type': inv.orderType,
    'Table': inv.tableNumber ?? '',
    'Customer': inv.customerName ?? '',
    'Phone': inv.customerPhone ?? '',
    'Customer GSTIN': inv.customerGstin ?? '',
    'Subtotal': inv.subtotal,
    'Item Discounts': inv.itemDiscountTotal,
    'Bill Discount': inv.billDiscountAmount,
    'Taxable Amount': inv.taxableAmount,
    'CGST': inv.cgst,
    'SGST': inv.sgst,
    'IGST': inv.igst,
    'Total Tax': inv.totalTax,
    'Round Off': inv.roundOff,
    'Grand Total': inv.grandTotal,
    'Amount Received': inv.amountReceived,
    'Change Returned': inv.changeReturned,
    'Payment Method': inv.payments.map(p => `${p.method}(₹${p.amount})`).join(', '),
    'Status': inv.status,
    'Notes': inv.notes ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Invoices');

  // Sheet 2: Invoice line items
  const itemRows: object[] = [];
  for (const inv of invoices) {
    for (const item of inv.items) {
      itemRows.push({
        'Bill #': inv.invoiceNumber,
        'Date': formatDateOnly(inv.createdAt),
        'Item Name': item.name,
        'HSN/SAC': item.hsnCode ?? '',
        'Qty': item.quantity,
        'Unit Price': item.unitPrice,
        'Discount': item.discountAmount,
        'Taxable Amount': item.taxableAmount,
        'GST Rate %': item.gstRate,
        'CGST': item.cgst,
        'SGST': item.sgst,
        'IGST': item.igst,
        'Line Total': item.lineTotal,
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Invoice Items');

  const filename = `invoices-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportFullDataToXlsx(
  invoices: Invoice[],
  menuItems: MenuItem[],
  rawMaterials: RawMaterial[],
  purchaseOrders: PurchaseOrder[]
) {
  const wb = XLSX.utils.book_new();

  // Invoices
  const invoiceRows = invoices.map(inv => ({
    'Bill #': inv.invoiceNumber,
    'Date': formatDate(inv.createdAt),
    'Order Type': inv.orderType,
    'Table': inv.tableNumber ?? '',
    'Customer': inv.customerName ?? '',
    'Subtotal': inv.subtotal,
    'Discounts': inv.itemDiscountTotal + inv.billDiscountAmount,
    'CGST': inv.cgst,
    'SGST': inv.sgst,
    'IGST': inv.igst,
    'Grand Total': inv.grandTotal,
    'Payment': inv.payments.map(p => `${p.method}(₹${p.amount})`).join(', '),
    'Status': inv.status,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Invoices');

  // Invoice items detail
  const itemRows: object[] = [];
  for (const inv of invoices) {
    for (const item of inv.items) {
      itemRows.push({
        'Bill #': inv.invoiceNumber,
        'Date': formatDateOnly(inv.createdAt),
        'Item': item.name,
        'HSN': item.hsnCode ?? '',
        'Qty': item.quantity,
        'Rate': item.unitPrice,
        'Discount': item.discountAmount,
        'Taxable': item.taxableAmount,
        'GST%': item.gstRate,
        'CGST': item.cgst,
        'SGST': item.sgst,
        'IGST': item.igst,
        'Total': item.lineTotal,
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Invoice Items');

  // Daily summary
  const dailyMap = new Map<string, { revenue: number; orders: number; cash: number; card: number; upi: number }>();
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const day = formatDateOnly(inv.createdAt);
    const existing = dailyMap.get(day) ?? { revenue: 0, orders: 0, cash: 0, card: 0, upi: 0 };
    existing.revenue += inv.grandTotal;
    existing.orders += 1;
    for (const p of inv.payments) {
      if (p.method === 'cash') existing.cash += p.amount;
      else if (p.method === 'card') existing.card += p.amount;
      else if (p.method === 'upi') existing.upi += p.amount;
    }
    dailyMap.set(day, existing);
  }
  const summaryRows = Array.from(dailyMap.entries()).map(([date, d]) => ({
    'Date': date,
    'Total Revenue': d.revenue,
    'Total Orders': d.orders,
    'Avg Bill': d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
    'Cash': d.cash,
    'Card': d.card,
    'UPI': d.upi,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Daily Summary');

  // Menu items
  const menuRows = menuItems.map(m => ({
    'Name': m.name,
    'Category ID': m.categoryId,
    'Price (₹)': m.price,
    'GST Rate %': m.gstRate,
    'GST Inclusive': m.gstInclusive ? 'Yes' : 'No',
    'HSN/SAC': m.hsnCode ?? '',
    'Unit': m.unit,
    'Veg': m.isVeg ? 'Veg' : 'Non-Veg',
    'Active': m.isActive ? 'Yes' : 'No',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuRows), 'Menu Items');

  // Inventory
  const inventoryRows = rawMaterials.map(r => ({
    'Material': r.name,
    'Unit': r.unit,
    'Current Stock': r.currentStock,
    'Low Stock Threshold': r.lowStockThreshold,
    'Cost Per Unit (₹)': r.costPerUnit,
    'Supplier': r.supplier ?? '',
    'Status': r.currentStock <= r.lowStockThreshold ? 'LOW STOCK' : 'OK',
    'Active': r.isActive ? 'Yes' : 'No',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), 'Inventory');

  // Purchase Orders
  const poRows: object[] = [];
  for (const po of purchaseOrders) {
    for (const item of po.items) {
      poRows.push({
        'PO Date': formatDateOnly(po.createdAt),
        'Supplier': po.supplier,
        'Status': po.status,
        'Material': item.name,
        'Unit': item.unit,
        'Qty Ordered': item.quantityOrdered,
        'Qty Received': item.quantityReceived,
        'Cost/Unit': item.costPerUnit,
        'Line Total': item.quantityOrdered * item.costPerUnit,
        'Received At': formatDateOnly(po.receivedAt),
        'Notes': po.notes ?? '',
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poRows), 'Purchase Orders');

  const filename = `restaurant-data-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportInventoryToXlsx(rawMaterials: RawMaterial[]) {
  const wb = XLSX.utils.book_new();
  const rows = rawMaterials.map(r => ({
    'Material': r.name,
    'Unit': r.unit,
    'Current Stock': r.currentStock,
    'Low Stock Threshold': r.lowStockThreshold,
    'Stock Value (₹)': Math.round(r.currentStock * r.costPerUnit),
    'Cost Per Unit (₹)': r.costPerUnit,
    'Supplier': r.supplier ?? '',
    'Status': r.currentStock <= r.lowStockThreshold ? 'LOW STOCK' : 'OK',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Inventory');
  XLSX.writeFile(wb, `inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
