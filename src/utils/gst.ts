import type { BillTotals, CartItem, DiscountType, GstMode, InvoiceItem } from '../types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveDiscount(type: DiscountType, value: number, base: number): number {
  if (type === 'none' || value <= 0) return 0;
  if (type === 'percentage') return round2((base * Math.min(value, 100)) / 100);
  return round2(Math.min(value, base));
}

export function calcItemLine(
  unitPrice: number,
  quantity: number,
  discountType: DiscountType,
  discountValue: number,
  gstRate: number,
  gstInclusive: boolean,
  gstMode: GstMode
): Pick<InvoiceItem, 'discountAmount' | 'taxableAmount' | 'cgst' | 'sgst' | 'igst' | 'lineTotal'> {
  const base = unitPrice * quantity;
  const discountAmount = resolveDiscount(discountType, discountValue, base);
  const priceAfterDiscount = base - discountAmount;

  const taxable = gstInclusive
    ? priceAfterDiscount / (1 + gstRate / 100)
    : priceAfterDiscount;

  const totalTax = taxable * (gstRate / 100);
  const halfTax = totalTax / 2;

  const lineTotal = gstInclusive
    ? round2(priceAfterDiscount)
    : round2(priceAfterDiscount + totalTax);

  return {
    discountAmount: round2(discountAmount),
    taxableAmount: round2(taxable),
    cgst: gstMode === 'cgst_sgst' ? round2(halfTax) : 0,
    sgst: gstMode === 'cgst_sgst' ? round2(halfTax) : 0,
    igst: gstMode === 'igst' ? round2(totalTax) : 0,
    lineTotal,
  };
}

export function calcBillTotals(
  cartItems: CartItem[],
  billDiscountType: DiscountType,
  billDiscountValue: number,
  gstMode: GstMode,
  enableRoundOff: boolean
): BillTotals {
  // 1. Sum item-level totals (after item discounts, before bill discount)
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let itemTaxableSum = 0;
  let itemCgst = 0;
  let itemSgst = 0;
  let itemIgst = 0;

  for (const item of cartItems) {
    const line = calcItemLine(
      item.unitPrice,
      item.quantity,
      item.discountType,
      item.discountValue,
      item.gstRate,
      item.gstInclusive,
      gstMode
    );
    subtotal += item.unitPrice * item.quantity;
    itemDiscountTotal += line.discountAmount;
    itemTaxableSum += line.taxableAmount;
    itemCgst += line.cgst;
    itemSgst += line.sgst;
    itemIgst += line.igst;
  }

  subtotal = round2(subtotal);
  itemDiscountTotal = round2(itemDiscountTotal);

  // 2. Bill-level discount applied on taxable base
  const billDiscountAmount = resolveDiscount(billDiscountType, billDiscountValue, itemTaxableSum);
  const taxableAfterBillDiscount = round2(itemTaxableSum - billDiscountAmount);

  // 3. Recompute tax on reduced taxable base proportionally
  // Scale each tax component by the ratio of remaining taxable
  const taxableRatio = itemTaxableSum > 0 ? taxableAfterBillDiscount / itemTaxableSum : 1;
  const cgst = round2(itemCgst * taxableRatio);
  const sgst = round2(itemSgst * taxableRatio);
  const igst = round2(itemIgst * taxableRatio);
  const totalTax = round2(cgst + sgst + igst);

  // 4. Grand total
  let grandTotal = round2(taxableAfterBillDiscount + totalTax);

  // 5. Round off
  let roundOff = 0;
  if (enableRoundOff) {
    const rounded = Math.round(grandTotal);
    roundOff = round2(rounded - grandTotal);
    grandTotal = rounded;
  }

  return {
    subtotal,
    itemDiscountTotal,
    billDiscountAmount: round2(billDiscountAmount),
    taxableAmount: taxableAfterBillDiscount,
    cgst,
    sgst,
    igst,
    totalTax,
    roundOff,
    grandTotal,
  };
}
