import { create } from 'zustand';
import type { CartItem, DiningTable, DiscountType, MenuItem, OrderType, PaymentEntry } from '../types';
import { calcItemLine } from '../utils/gst';

export type BillingStep = 'select-table' | 'build-order' | 'payment' | 'complete';

interface BillingState {
  step: BillingStep;
  orderType: OrderType;
  selectedTable: DiningTable | null;
  cartItems: CartItem[];
  billDiscountType: DiscountType;
  billDiscountValue: number;
  notes: string;
  payments: PaymentEntry[];
  customerName: string;
  customerPhone: string;
  customerGstin: string;

  setStep: (step: BillingStep) => void;
  setOrderType: (type: OrderType) => void;
  selectTable: (table: DiningTable | null) => void;
  addItem: (menuItem: MenuItem, gstMode: 'cgst_sgst' | 'igst') => void;
  removeItem: (menuItemId: number) => void;
  updateQty: (menuItemId: number, qty: number, gstMode: 'cgst_sgst' | 'igst') => void;
  setItemDiscount: (menuItemId: number, type: DiscountType, value: number, gstMode: 'cgst_sgst' | 'igst') => void;
  setBillDiscount: (type: DiscountType, value: number) => void;
  setNotes: (notes: string) => void;
  setCustomer: (name: string, phone: string, gstin: string) => void;
  addPayment: (entry: PaymentEntry) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  resetOrder: () => void;
}

function buildCartItem(menuItem: MenuItem, gstMode: 'cgst_sgst' | 'igst'): CartItem {
  const line = calcItemLine(menuItem.price, 1, 'none', 0, menuItem.gstRate, menuItem.gstInclusive, gstMode);
  return {
    menuItemId: menuItem.id!,
    name: menuItem.name,
    hsnCode: menuItem.hsnCode,
    gstRate: menuItem.gstRate,
    gstInclusive: menuItem.gstInclusive,
    unitPrice: menuItem.price,
    quantity: 1,
    discountType: 'none',
    discountValue: 0,
    tempDiscountType: 'none',
    tempDiscountValue: 0,
    ...line,
  };
}

function recomputeItem(item: CartItem, gstMode: 'cgst_sgst' | 'igst'): CartItem {
  const line = calcItemLine(item.unitPrice, item.quantity, item.discountType, item.discountValue, item.gstRate, item.gstInclusive, gstMode);
  return { ...item, ...line };
}

export const useBillingStore = create<BillingState>((set) => ({
  step: 'build-order',
  orderType: 'takeaway',
  selectedTable: null,
  cartItems: [],
  billDiscountType: 'none',
  billDiscountValue: 0,
  notes: '',
  payments: [],
  customerName: '',
  customerPhone: '',
  customerGstin: '',

  setStep: (step) => set({ step }),
  setOrderType: (orderType) => set({ orderType, selectedTable: null }),
  selectTable: (table) => set({ selectedTable: table, step: 'build-order' }),

  addItem: (menuItem, gstMode) => set((state) => {
    const existing = state.cartItems.find(c => c.menuItemId === menuItem.id);
    if (existing) {
      return {
        cartItems: state.cartItems.map(c =>
          c.menuItemId === menuItem.id
            ? recomputeItem({ ...c, quantity: c.quantity + 1 }, gstMode)
            : c
        ),
      };
    }
    return { cartItems: [...state.cartItems, buildCartItem(menuItem, gstMode)] };
  }),

  removeItem: (menuItemId) => set((state) => ({
    cartItems: state.cartItems.filter(c => c.menuItemId !== menuItemId),
  })),

  updateQty: (menuItemId, qty, gstMode) => set((state) => {
    if (qty <= 0) {
      return { cartItems: state.cartItems.filter(c => c.menuItemId !== menuItemId) };
    }
    return {
      cartItems: state.cartItems.map(c =>
        c.menuItemId === menuItemId ? recomputeItem({ ...c, quantity: qty }, gstMode) : c
      ),
    };
  }),

  setItemDiscount: (menuItemId, type, value, gstMode) => set((state) => ({
    cartItems: state.cartItems.map(c =>
      c.menuItemId === menuItemId
        ? recomputeItem({ ...c, discountType: type, discountValue: value, tempDiscountType: type, tempDiscountValue: value }, gstMode)
        : c
    ),
  })),

  setBillDiscount: (type, value) => set({ billDiscountType: type, billDiscountValue: value }),
  setNotes: (notes) => set({ notes }),
  setCustomer: (customerName, customerPhone, customerGstin) => set({ customerName, customerPhone, customerGstin }),

  addPayment: (entry) => set((state) => ({ payments: [...state.payments, entry] })),
  removePayment: (index) => set((state) => ({ payments: state.payments.filter((_, i) => i !== index) })),
  clearPayments: () => set({ payments: [] }),

  resetOrder: () => set({
    step: 'build-order',
    orderType: 'takeaway',
    selectedTable: null,
    cartItems: [],
    billDiscountType: 'none',
    billDiscountValue: 0,
    notes: '',
    payments: [],
    customerName: '',
    customerPhone: '',
    customerGstin: '',
  }),
}));
