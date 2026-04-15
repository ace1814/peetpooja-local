import { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useReactToPrint } from 'react-to-print';
import { db } from '../db/schema';
import { useBillingStore } from '../store/billingStore';
import { calcBillTotals, calcItemLine } from '../utils/gst';
import { formatINR } from '../utils/currency';
import { getNextInvoiceNumber } from '../utils/invoiceNumber';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PaymentModal } from '../components/payment/PaymentModal';
import { InvoiceTemplate } from '../components/print/InvoiceTemplate';
import { useToast } from '../components/ui/Toast';
import type { MenuItem, DiningTable, InvoiceItem, Invoice } from '../types';
import clsx from 'clsx';

export function BillingPage() {
  const store = useBillingStore();
  const { showToast } = useToast();
  const settings = useLiveQuery(() => db.settings.get(1));
  const categories = useLiveQuery(() => db.categories.filter(c => c.isActive).toArray().then(r => r.sort((a,b) => a.sortOrder - b.sortOrder)), []) ?? [];
  const allItems = useLiveQuery(() => db.menuItems.filter(m => m.isActive).toArray(), []) ?? [];
  const tables = useLiveQuery(() => db.diningTables.toArray(), []) ?? [];

  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const triggerPrint = useReactToPrint({ contentRef: printRef });

  const gstMode = settings?.defaultGstMode ?? 'cgst_sgst';

  const filteredItems = useMemo(() => {
    return allItems.filter(m => {
      const matchCat = activeCat === 'all' || m.categoryId === activeCat;
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allItems, activeCat, search]);

  const totals = useMemo(() =>
    calcBillTotals(store.cartItems, store.billDiscountType, store.billDiscountValue, gstMode, settings?.enableRoundOff ?? true),
    [store.cartItems, store.billDiscountType, store.billDiscountValue, gstMode, settings]
  );

  const tableSections = useMemo(() => {
    const sections = new Map<string, DiningTable[]>();
    for (const t of tables) {
      const arr = sections.get(t.section) ?? [];
      arr.push(t);
      sections.set(t.section, arr);
    }
    return sections;
  }, [tables]);

  const handleAddItem = (item: MenuItem) => store.addItem(item, gstMode);

  const handleTableSelect = async (table: DiningTable) => {
    // Tapping the already-selected table → no-op
    if (store.selectedTable?.id === table.id) return;

    // Occupied with a saved draft → load that order
    if (table.status === 'occupied' && table.currentInvoiceId) {
      const draft = await db.invoices.get(table.currentInvoiceId);
      if (draft && draft.status === 'draft') {
        store.loadDraft(draft, table);
        showToast(`Loaded order for Table ${table.tableNumber}`, 'info');
        return;
      }
    }

    // Available / reserved → switch to it
    if (table.status === 'available' || table.status === 'reserved') {
      if (store.draftInvoiceId && store.selectedTable) {
        // Let user know the previous draft is safely stored in DB
        showToast(`Order ${store.draftInvoiceNumber} saved for Table ${store.selectedTable.tableNumber}`, 'info');
      }
      store.switchToTable(table);
    }
  };

  // Save order as draft, mark table occupied
  const handleSaveOrder = async () => {
    if (store.cartItems.length === 0) { showToast('Add items first', 'error'); return; }
    if (store.orderType === 'dine-in' && !store.selectedTable) { showToast('Select a table first', 'error'); return; }

    setSaving(true);
    try {
      const invoiceItems: InvoiceItem[] = store.cartItems.map(c => {
        const line = calcItemLine(c.unitPrice, c.quantity, c.discountType, c.discountValue, c.gstRate, c.gstInclusive, gstMode);
        return { menuItemId: c.menuItemId, name: c.name, hsnCode: c.hsnCode, gstRate: c.gstRate, gstInclusive: c.gstInclusive, unitPrice: c.unitPrice, quantity: c.quantity, discountType: c.discountType, discountValue: c.discountValue, ...line };
      });

      const now = new Date();

      if (store.draftInvoiceId) {
        // Update existing draft
        await db.transaction('rw', [db.invoices], async () => {
          await db.invoices.update(store.draftInvoiceId!, {
            items: invoiceItems,
            billDiscountType: store.billDiscountType,
            billDiscountValue: store.billDiscountValue,
            ...totals,
            notes: store.notes || undefined,
            updatedAt: now,
          });
        });
        showToast(`Order updated — ${store.draftInvoiceNumber}`);
      } else {
        // New draft
        const invoiceNumber = await getNextInvoiceNumber();
        const invoice: Invoice = {
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
          payments: [],
          amountReceived: 0,
          changeReturned: 0,
          status: 'draft',
          notes: store.notes || undefined,
          createdAt: now,
          updatedAt: now,
        };

        await db.transaction('rw', [db.invoices, db.diningTables], async () => {
          const id = await db.invoices.add(invoice);
          if (store.selectedTable?.id) {
            await db.diningTables.update(store.selectedTable.id, {
              status: 'occupied',
              currentInvoiceId: id as number,
            });
          }
          // Update store with saved draft info
          store.loadDraft({ ...invoice, id: id as number }, store.selectedTable);
        });

        showToast(`Order saved — ${invoiceNumber}`);
      }
    } catch (err) {
      showToast('Failed to save order', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Print bill without collecting payment
  const handlePrintBill = async () => {
    if (!store.draftInvoiceId) { showToast('Save the order first', 'error'); return; }
    const invoice = await db.invoices.get(store.draftInvoiceId);
    if (!invoice) return;
    setPrintInvoice(invoice);
    setTimeout(() => triggerPrint(), 100);
  };

  const isDineIn = store.orderType === 'dine-in';
  const hasDraft = !!store.draftInvoiceId;
  const hasItems = store.cartItems.length > 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Hidden print template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <InvoiceTemplate ref={printRef} invoice={printInvoice} settings={settings ?? null} />
      </div>

      {/* ─── Left: Menu Panel ─── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 bg-white">

        {/* Order type + table selector */}
        <div className="border-b border-gray-100 p-3">
          <div className="flex gap-2 mb-3">
            {(['takeaway', 'dine-in'] as const).map(type => (
              <button
                key={type}
                onClick={() => { store.resetOrder(); store.setOrderType(type); }}
                className={clsx(
                  'flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                  store.orderType === type ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >{type === 'dine-in' ? '🪑 Dine-in' : '🥡 Takeaway'}</button>
            ))}
          </div>

          {isDineIn && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Array.from(tableSections.entries()).map(([section, sectionTables]) => (
                <div key={section}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{section}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sectionTables.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTableSelect(t)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                          store.selectedTable?.id === t.id
                            ? 'bg-brand-red text-white border-brand-red'
                            : t.status === 'occupied'
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 cursor-pointer'
                            : t.status === 'reserved'
                            ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        )}
                        title={
                          t.status === 'occupied'
                            ? `Table ${t.tableNumber} — Tap to load order`
                            : `Table ${t.tableNumber} — ${t.status} (${t.capacity} seats)`
                        }
                      >
                        {t.tableNumber}
                        {t.status === 'occupied' && <span className="ml-1 text-red-500">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <input
            placeholder="🔍  Search menu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-gray-100">
          <button
            onClick={() => setActiveCat('all')}
            className={clsx('shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeCat === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id!)}
              className={clsx('shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                activeCat === cat.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >{cat.name}</button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredItems.map(item => {
              const inCart = store.cartItems.find(c => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className={clsx(
                    'text-left p-3 rounded-xl border transition-all hover:shadow-sm',
                    inCart ? 'border-brand-red bg-brand-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-medium text-sm leading-snug">{item.name}</p>
                    <span className={`w-3 h-3 rounded-sm border-2 shrink-0 mt-0.5 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-0.5 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                  </div>
                  <p className="text-brand-red font-semibold text-sm mt-1">₹{item.price}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{item.gstRate}% GST</span>
                    {inCart && <Badge color="red">{inCart.quantity}×</Badge>}
                  </div>
                </button>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">No items found</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Right: Cart Panel ─── */}
      <div className="w-80 xl:w-96 flex flex-col bg-gray-50 shrink-0">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold font-display text-gray-800">
                {isDineIn && store.selectedTable
                  ? `Table ${store.selectedTable.tableNumber}`
                  : isDineIn ? 'Select a table' : 'Takeaway'}
              </p>
              {hasDraft && (
                <p className="text-xs text-brand-red font-medium mt-0.5">{store.draftInvoiceNumber}</p>
              )}
            </div>
            {hasItems && (
              <button onClick={store.resetOrder} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{store.cartItems.length} item(s)</p>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!hasItems && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="text-3xl mb-2">🛒</p>
              {isDineIn
                ? <p>Select a table, then add items</p>
                : <p>Add items from the menu</p>
              }
            </div>
          )}
          {store.cartItems.map(item => (
            <div key={item.menuItemId} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-snug flex-1">{item.name}</p>
                <button onClick={() => store.removeItem(item.menuItemId)} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0">✕</button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => store.updateQty(item.menuItemId, item.quantity - 1, gstMode)}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => store.updateQty(item.menuItemId, item.quantity + 1, gstMode)}
                    className="w-7 h-7 rounded-lg bg-brand-red hover:bg-brand-red-dark text-white font-bold flex items-center justify-center">+</button>
                </div>
                <p className="font-semibold text-sm">₹{(item.unitPrice * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <select value={item.discountType}
                  onChange={e => store.setItemDiscount(item.menuItemId, e.target.value as 'none' | 'percentage' | 'flat', item.discountValue, gstMode)}
                  className="text-xs border border-gray-200 rounded px-1 py-1 bg-white">
                  <option value="none">No disc.</option>
                  <option value="percentage">% off</option>
                  <option value="flat">₹ off</option>
                </select>
                {item.discountType !== 'none' && (
                  <input type="number" min="0" value={item.discountValue || ''}
                    onChange={e => store.setItemDiscount(item.menuItemId, item.discountType, Number(e.target.value), gstMode)}
                    className="w-16 text-xs border border-gray-200 rounded px-1 py-1 text-center" placeholder="0" />
                )}
                {item.discountAmount > 0 && <span className="text-xs text-green-600 ml-auto">−₹{item.discountAmount.toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Bill summary + actions */}
        {hasItems && (
          <div className="border-t border-gray-200 bg-white p-4 space-y-2">
            {/* Bill discount */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
              <span className="text-xs text-gray-500 shrink-0">Bill disc.</span>
              <select value={store.billDiscountType}
                onChange={e => store.setBillDiscount(e.target.value as 'none' | 'percentage' | 'flat', store.billDiscountValue)}
                className="text-xs border border-gray-200 rounded px-1 py-1 bg-white">
                <option value="none">None</option>
                <option value="percentage">% off</option>
                <option value="flat">₹ off</option>
              </select>
              {store.billDiscountType !== 'none' && (
                <input type="number" min="0" value={store.billDiscountValue || ''}
                  onChange={e => store.setBillDiscount(store.billDiscountType, Number(e.target.value))}
                  className="w-20 text-xs border border-gray-200 rounded px-2 py-1" placeholder="0" />
              )}
            </div>

            <SummaryRow label="Subtotal" value={totals.subtotal} />
            {totals.itemDiscountTotal > 0 && <SummaryRow label="Item Discounts" value={-totals.itemDiscountTotal} color="text-green-600" />}
            {totals.billDiscountAmount > 0 && <SummaryRow label="Bill Discount" value={-totals.billDiscountAmount} color="text-green-600" />}
            {gstMode === 'cgst_sgst' ? (
              <>
                <SummaryRow label="CGST" value={totals.cgst} color="text-gray-500" small />
                <SummaryRow label="SGST" value={totals.sgst} color="text-gray-500" small />
              </>
            ) : (
              <SummaryRow label="IGST" value={totals.igst} color="text-gray-500" small />
            )}
            {totals.roundOff !== 0 && <SummaryRow label="Round Off" value={totals.roundOff} color="text-gray-400" small />}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-bold font-display">Grand Total</span>
              <span className="font-bold font-display text-xl text-brand-red">{formatINR(totals.grandTotal)}</span>
            </div>

            <textarea placeholder="Add note for kitchen…" value={store.notes}
              onChange={e => store.setNotes(e.target.value)} rows={1}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-red" />

            {/* Action buttons — different for dine-in vs takeaway */}
            {isDineIn ? (
              <div className="space-y-2 pt-1">
                {/* Save / Update order */}
                <Button size="lg" variant="secondary" className="w-full" onClick={handleSaveOrder} disabled={saving}>
                  {saving ? 'Saving…' : hasDraft ? '💾 Update Order' : '💾 Save Order'}
                </Button>
                {/* Print bill (only after saved) */}
                {hasDraft && (
                  <Button size="lg" variant="secondary" className="w-full" onClick={handlePrintBill}>
                    🖨 Print Bill
                  </Button>
                )}
                {/* Collect payment (only after saved) */}
                {hasDraft && (
                  <Button size="lg" className="w-full" onClick={() => setPaymentOpen(true)}>
                    💳 Collect Payment
                  </Button>
                )}
              </div>
            ) : (
              <Button size="lg" className="w-full" onClick={() => setPaymentOpen(true)}>
                Proceed to Pay →
              </Button>
            )}
          </div>
        )}
      </div>

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} totals={totals} />
    </div>
  );
}

function SummaryRow({ label, value, color = 'text-gray-700', small }: { label: string; value: number; color?: string; small?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${small ? 'text-xs' : 'text-sm'}`}>
      <span className={small ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
      <span className={color}>{value >= 0 ? `₹${value.toFixed(2)}` : `−₹${Math.abs(value).toFixed(2)}`}</span>
    </div>
  );
}
