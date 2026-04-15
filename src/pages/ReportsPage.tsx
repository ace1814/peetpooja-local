import { useState, useEffect, useCallback, useMemo } from 'react';
import { getInvoices, getMenuItems, getRawMaterials, getPurchaseOrders } from '../lib/db';
import { Button } from '../components/ui/Button';
import { exportFullDataToXlsx, exportInvoicesToXlsx } from '../utils/export';
import { startOfDay, endOfDay, subDays, format, isWithinInterval } from 'date-fns';
import type { Invoice, MenuItem, RawMaterial, PurchaseOrder } from '../types';

type Range = 'today' | 'week' | 'month' | 'custom';

export function ReportsPage() {
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [invs, items, mats, pos] = await Promise.all([
        getInvoices(), getMenuItems(), getRawMaterials(), getPurchaseOrders(),
      ]);
      setInvoices(invs);
      setMenuItems(items);
      setRawMaterials(mats);
      setPurchaseOrders(pos);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === 'today') return { from: startOfDay(now), to: endOfDay(now) };
    if (range === 'week') return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    if (range === 'month') return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
  }, [range, customFrom, customTo]);

  const filtered = useMemo<Invoice[]>(() =>
    invoices.filter(inv =>
      inv.status === 'paid' &&
      isWithinInterval(new Date(inv.createdAt), { start: from, end: to })
    ),
    [invoices, from, to]
  );

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, inv) => s + inv.grandTotal, 0);
    const orders = filtered.length;
    const avgBill = orders > 0 ? revenue / orders : 0;
    const cash = filtered.reduce((s, inv) => s + inv.payments.filter(p => p.method === 'cash').reduce((a, p) => a + p.amount, 0), 0);
    const card = filtered.reduce((s, inv) => s + inv.payments.filter(p => p.method === 'card').reduce((a, p) => a + p.amount, 0), 0);
    const upi  = filtered.reduce((s, inv) => s + inv.payments.filter(p => p.method === 'upi').reduce((a, p) => a + p.amount, 0), 0);
    const wallet = filtered.reduce((s, inv) => s + inv.payments.filter(p => p.method === 'wallet').reduce((a, p) => a + p.amount, 0), 0);
    const cgst = filtered.reduce((s, inv) => s + inv.cgst, 0);
    const sgst = filtered.reduce((s, inv) => s + inv.sgst, 0);
    const igst = filtered.reduce((s, inv) => s + inv.igst, 0);
    const taxable = filtered.reduce((s, inv) => s + inv.taxableAmount, 0);
    const dineIn = filtered.filter(inv => inv.orderType === 'dine-in').length;
    const takeaway = filtered.filter(inv => inv.orderType === 'takeaway').length;
    return { revenue, orders, avgBill, cash, card, upi, wallet, cgst, sgst, igst, taxable, dineIn, takeaway };
  }, [filtered]);

  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const inv of filtered) {
      for (const item of inv.items) {
        const existing = map.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.lineTotal;
        map.set(item.name, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  const paymentData = [
    { label: 'Cash', value: stats.cash },
    { label: 'UPI', value: stats.upi },
    { label: 'Card', value: stats.card },
    { label: 'Wallet', value: stats.wallet },
  ].filter(p => p.value > 0);

  const maxPayment = Math.max(...paymentData.map(p => p.value), 1);

  // Suppress unused variable warnings for export
  void menuItems; void rawMaterials; void purchaseOrders;

  return (
    <div className="p-6 space-y-6">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'custom'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                range === r ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >{r === 'week' ? 'Last 7 Days' : r === 'month' ? 'Last 30 Days' : r}</button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            <span className="text-gray-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" onClick={() => exportInvoicesToXlsx(filtered)}>Export Invoices</Button>
          <Button variant="secondary" onClick={() => exportFullDataToXlsx(invoices, menuItems, rawMaterials, purchaseOrders)}>Full Data Export</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={`₹${stats.revenue.toFixed(2)}`} />
        <KpiCard label="Total Orders" value={String(stats.orders)} />
        <KpiCard label="Avg Bill Value" value={`₹${stats.avgBill.toFixed(2)}`} />
        <KpiCard label="Dine-in / Takeaway" value={`${stats.dineIn} / ${stats.takeaway}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold font-display text-gray-800 mb-4">Payment Breakdown</h3>
          {paymentData.length === 0 ? (
            <p className="text-gray-400 text-sm">No data for selected range</p>
          ) : (
            <div className="space-y-3">
              {paymentData.map(p => (
                <div key={p.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{p.label}</span>
                    <span className="text-gray-600">₹{p.value.toFixed(2)} ({stats.revenue > 0 ? ((p.value / stats.revenue) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${(p.value / maxPayment) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GST Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold font-display text-gray-800 mb-4">GST Summary</h3>
          <div className="space-y-2 text-sm">
            <GstRow label="Taxable Amount" value={stats.taxable} />
            {stats.cgst > 0 && <GstRow label="CGST" value={stats.cgst} />}
            {stats.sgst > 0 && <GstRow label="SGST" value={stats.sgst} />}
            {stats.igst > 0 && <GstRow label="IGST" value={stats.igst} />}
            <div className="border-t pt-2 font-semibold">
              <GstRow label="Total Tax" value={stats.cgst + stats.sgst + stats.igst} bold />
            </div>
          </div>
        </div>
      </div>

      {/* Top selling items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold font-display text-gray-800 mb-4">Top Selling Items</h3>
        {itemSales.length === 0 ? (
          <p className="text-gray-400 text-sm">No data for selected range</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Qty Sold</th>
                <th className="text-right pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {itemSales.map((item, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="py-2 font-medium">{item.name}</td>
                  <td className="py-2 text-right text-gray-500">{item.qty}</td>
                  <td className="py-2 text-right font-semibold">₹{item.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold font-display text-gray-900">{value}</p>
    </div>
  );
}

function GstRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>₹{value.toFixed(2)}</span>
    </div>
  );
}
