import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  getSettings, updateInvoice, addInvoice,
  updateDiningTable, getRecipeByMenuItemId, updateRawMaterial, getRawMaterials,
  getNextInvoiceNumber,
} from '../../lib/db';
import { useBillingStore } from '../../store/billingStore';
import { calcItemLine } from '../../utils/gst';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { InvoiceTemplate } from '../print/InvoiceTemplate';
import type { BillTotals, Invoice, InvoiceItem, PaymentMethod, RestaurantSettings } from '../../types';
import clsx from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
  totals: BillTotals;
}

type Tab = 'cash' | 'card' | 'upi' | 'split';

export function PaymentModal({ open, onClose, totals }: Props) {
  const store = useBillingStore();
  const { draftInvoiceId } = store;
  const { showToast } = useToast();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSettings = useCallback(async () => {
    try { setSettings(await getSettings()); } catch {}
  }, []);

  useEffect(() => { if (open) fetchSettings(); }, [open, fetchSettings]);

  const [tab, setTab] = useState<Tab>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('cash');
  const [splitAmount, setSplitAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);

  const gstMode = settings?.defaultGstMode ?? 'cgst_sgst';

  const splitPaid = useMemo(() => store.payments.reduce((s, p) => s + p.amount, 0), [store.payments]);
  const splitRemaining = useMemo(() => Math.max(0, totals.grandTotal - splitPaid), [totals.grandTotal, splitPaid]);

  const triggerPrint = useReactToPrint({ contentRef: printRef });

  const handleConfirm = async () => {
    let paymentEntries = store.payments;
    let amountReceived = splitPaid;
    let changeReturned = 0;

    if (tab !== 'split') {
      if (tab === 'cash') {
        const tendered = Number(cashTendered) || totals.grandTotal;
        if (tendered < totals.grandTotal) { showToast('Cash amount is insufficient', 'error'); return; }
        changeReturned = tendered - totals.grandTotal;
        amountReceived = tendered;
        paymentEntries = [{ method: 'cash', amount: totals.grandTotal, reference: '' }];
      } else if (tab === 'upi') {
        amountReceived = totals.grandTotal;
        paymentEntries = [{ method: 'upi', amount: totals.grandTotal, reference: upiRef }];
      } else if (tab === 'card') {
        amountReceived = totals.grandTotal;
        paymentEntries = [{ method: 'card', amount: totals.grandTotal, reference: cardRef }];
      }
    } else {
      if (splitPaid < totals.grandTotal) { showToast('Total payments must equal grand total', 'error'); return; }
    }

    setSaving(true);
    try {
      const now = new Date();

      const invoiceItems: InvoiceItem[] = store.cartItems.map(c => {
        const line = calcItemLine(c.unitPrice, c.quantity, c.discountType, c.discountValue, c.gstRate, c.gstInclusive, gstMode);
        return {
          menuItemId: c.menuItemId, name: c.name, hsnCode: c.hsnCode,
          gstRate: c.gstRate, gstInclusive: c.gstInclusive,
          unitPrice: c.unitPrice, quantity: c.quantity,
          discountType: c.discountType, discountValue: c.discountValue, ...line,
        };
      });

      let invoice: Invoice;

      // ─── Deduct inventory (sequential, no transaction) ───
      const deductInventory = async () => {
        const allMats = await getRawMaterials();
        for (const item of store.cartItems) {
          const recipe = await getRecipeByMenuItemId(item.menuItemId);
          if (!recipe) continue;
          for (const ing of recipe.ingredients) {
            const material = allMats.find(m => m.id === ing.rawMaterialId);
            if (!material) continue;
            const deduct = ing.quantity * item.quantity;
            const newStock = Math.max(0, material.currentStock - deduct);
            await updateRawMaterial(ing.rawMaterialId, { currentStock: newStock });
          }
        }
      };

      if (draftInvoiceId) {
        // Dine-in: update existing draft → paid
        await updateInvoice(draftInvoiceId, {
          items: invoiceItems,
          billDiscountType: store.billDiscountType,
          billDiscountValue: store.billDiscountValue,
          ...totals,
          payments: paymentEntries,
          amountReceived,
          changeReturned,
          status: 'paid',
          notes: store.notes || undefined,
          updatedAt: now,
          printedAt: now,
        });

        // Free up table
        if (store.selectedTable?.id) {
          await updateDiningTable(store.selectedTable.id, { status: 'available', currentInvoiceId: undefined });
        }

        await deductInventory();

        // Fetch updated invoice for printing
        invoice = {
          id: draftInvoiceId,
          invoiceNumber: store.draftInvoiceNumber!,
          orderType: store.orderType,
          tableId: store.selectedTable?.id,
          tableNumber: store.selectedTable?.tableNumber,
          customerName: store.customerName || undefined,
          customerPhone: store.customerPhone || undefined,
          customerGstin: store.customerGstin || undefined,
          items: invoiceItems,
          billDiscountType: store.billDiscountType,
          billDiscountValue: store.billDiscountValue,
          ...totals,
          payments: paymentEntries,
          amountReceived,
          changeReturned,
          status: 'paid',
          notes: store.notes || undefined,
          createdAt: now,
          updatedAt: now,
          printedAt: now,
        };
      } else {
        // Takeaway / new order: create fresh invoice
        const invoiceNumber = await getNextInvoiceNumber();

        invoice = {
          invoiceNumber,
          orderType: store.orderType,
          tableId: store.selectedTable?.id,
          tableNumber: store.selectedTable?.tableNumber,
          customerName: store.customerName || undefined,
          customerPhone: store.customerPhone || undefined,
          customerGstin: store.customerGstin || undefined,
          items: invoiceItems,
          billDiscountType: store.billDiscountType,
          billDiscountValue: store.billDiscountValue,
          ...totals,
          payments: paymentEntries,
          amountReceived,
          changeReturned,
          status: 'paid',
          notes: store.notes || undefined,
          createdAt: now,
          updatedAt: now,
          printedAt: now,
        };

        const id = await addInvoice(invoice);
        invoice.id = id;

        // Free up table if any
        if (store.selectedTable?.id) {
          await updateDiningTable(store.selectedTable.id, { status: 'available', currentInvoiceId: undefined });
        }

        await deductInventory();
      }

      setSavedInvoice(invoice);
      showToast(`Bill ${invoice.invoiceNumber} saved!`);
      setTimeout(() => triggerPrint(), 100);
      store.resetOrder();
      onClose();
    } catch (err) {
      showToast('Failed to save invoice', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const change = Number(cashTendered) > 0 ? Math.max(0, Number(cashTendered) - totals.grandTotal) : 0;

  return (
    <>
      {/* Hidden print template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <InvoiceTemplate ref={printRef} invoice={savedInvoice} settings={settings} />
      </div>

      <Modal open={open} onClose={onClose} title="Payment" size="md">
        <div className="p-6 space-y-5">
          <div className="bg-brand-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Amount to Collect</p>
            <p className="text-4xl font-bold font-display text-brand-red mt-1">₹{totals.grandTotal.toFixed(2)}</p>
          </div>

          {/* Payment method tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['cash', 'card', 'upi', 'split'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  'flex-1 py-2 text-sm font-medium capitalize transition-colors',
                  tab === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >{t === 'upi' ? 'UPI' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          {/* Cash */}
          {tab === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Amount Tendered (₹)</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  placeholder={totals.grandTotal.toFixed(2)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-red"
                  autoFocus
                />
              </div>
              {Number(cashTendered) > 0 && (
                <div className={clsx('rounded-lg p-3 text-center', change >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                  {change >= 0
                    ? <p className="text-green-700 font-semibold">Return Change: <span className="text-xl">₹{change.toFixed(2)}</span></p>
                    : <p className="text-red-600 font-semibold">Short by ₹{Math.abs(change).toFixed(2)}</p>
                  }
                </div>
              )}
            </div>
          )}

          {/* UPI */}
          {tab === 'upi' && (
            <div>
              <label className="text-sm font-medium text-gray-700">UPI Transaction ID (optional)</label>
              <input value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="e.g. 4241XXXXXXXX" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
          )}

          {/* Card */}
          {tab === 'card' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Card Last 4 Digits (optional)</label>
              <input value={cardRef} onChange={e => setCardRef(e.target.value)} maxLength={4} placeholder="1234" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
          )}

          {/* Split */}
          {tab === 'split' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={splitMethod} onChange={e => setSplitMethod(e.target.value as PaymentMethod)} className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="wallet">Wallet</option>
                </select>
                <input type="number" value={splitAmount} onChange={e => setSplitAmount(e.target.value)} placeholder="₹ amount" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const amt = Number(splitAmount);
                    if (amt <= 0) return;
                    store.addPayment({ method: splitMethod, amount: amt });
                    setSplitAmount('');
                  }}
                >Add</Button>
              </div>
              <div className="space-y-1">
                {store.payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="capitalize font-medium">{p.method}</span>
                    <span>₹{p.amount.toFixed(2)}</span>
                    <button onClick={() => store.removePayment(i)} className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
              </div>
              {store.payments.length > 0 && (
                <div className={clsx('rounded-lg p-3 text-center text-sm font-medium', splitRemaining > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700')}>
                  {splitRemaining > 0 ? `Remaining: ₹${splitRemaining.toFixed(2)}` : 'Payment complete ✓'}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>← Back</Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
              {saving ? 'Saving…' : '✓ Confirm & Print'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
