import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useReactToPrint } from 'react-to-print';
import { db } from '../db/schema';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { InvoiceTemplate } from '../components/print/InvoiceTemplate';
import { exportInvoicesToXlsx } from '../utils/export';
import { useToast } from '../components/ui/Toast';
import { format } from 'date-fns';
import type { Invoice } from '../types';

export function OrdersPage() {
  const { showToast } = useToast();
  const settings = useLiveQuery(() => db.settings.get(1));
  const invoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray(), []) ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'cancelled' | 'draft'>('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const triggerPrint = useReactToPrint({ contentRef: printRef });

  const filtered = invoices.filter(inv => {
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerPhone ?? '').includes(search) ||
      (inv.customerName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleReprint = (inv: Invoice) => {
    setPrintInvoice(inv);
    setTimeout(() => triggerPrint(), 100);
  };

  const handleCancel = async (inv: Invoice) => {
    if (!confirm(`Cancel invoice ${inv.invoiceNumber}?`)) return;
    await db.invoices.update(inv.id!, { status: 'cancelled', updatedAt: new Date() });
    showToast('Invoice cancelled');
  };

  const statusBadgeColor = (status: string) => {
    if (status === 'paid') return 'green';
    if (status === 'cancelled') return 'red';
    return 'yellow';
  };

  return (
    <div className="p-6">
      {/* Hidden print template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <InvoiceTemplate ref={printRef} invoice={printInvoice} settings={settings ?? null} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          placeholder="Search by bill #, phone, name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red w-64"
        />
        <div className="flex gap-1">
          {(['all', 'paid', 'cancelled', 'draft'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >{s}</button>
          ))}
        </div>
        <Button variant="secondary" className="ml-auto" onClick={() => exportInvoicesToXlsx(filtered)}>
          Export .xlsx
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Bill #', 'Date & Time', 'Type', 'Table', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No invoices found</td></tr>
            )}
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-brand-red">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(inv.createdAt), 'dd/MM/yy HH:mm')}</td>
                <td className="px-4 py-3 capitalize">{inv.orderType}</td>
                <td className="px-4 py-3 text-gray-500">{inv.tableNumber ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{inv.items.length}</td>
                <td className="px-4 py-3 font-semibold">₹{inv.grandTotal.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{inv.payments.map(p => p.method).join(', ')}</td>
                <td className="px-4 py-3">
                  <Badge color={statusBadgeColor(inv.status)}>{inv.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)}>View</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReprint(inv)}>🖨</Button>
                    {inv.status === 'paid' && (
                      <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleCancel(inv)}>Cancel</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Invoice Modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber}`} size="xl">
        {viewInvoice && (
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="Date" value={format(new Date(viewInvoice.createdAt), 'dd MMM yyyy HH:mm')} />
              <InfoCard label="Order Type" value={viewInvoice.orderType} />
              <InfoCard label="Table" value={viewInvoice.tableNumber ?? '—'} />
              <InfoCard label="Status" value={viewInvoice.status} />
              {viewInvoice.customerName && <InfoCard label="Customer" value={viewInvoice.customerName} />}
              {viewInvoice.customerPhone && <InfoCard label="Phone" value={viewInvoice.customerPhone} />}
            </div>

            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  {['Item', 'Qty', 'Rate', 'Discount', 'GST%', 'Total'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewInvoice.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">₹{item.unitPrice}</td>
                    <td className="px-3 py-2">{item.discountAmount > 0 ? `−₹${item.discountAmount}` : '—'}</td>
                    <td className="px-3 py-2">{item.gstRate}%</td>
                    <td className="px-3 py-2 font-semibold">₹{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col items-end gap-1 text-sm">
              <Row label="Subtotal" val={`₹${viewInvoice.subtotal.toFixed(2)}`} />
              {viewInvoice.itemDiscountTotal > 0 && <Row label="Item Discounts" val={`−₹${viewInvoice.itemDiscountTotal.toFixed(2)}`} />}
              {viewInvoice.billDiscountAmount > 0 && <Row label="Bill Discount" val={`−₹${viewInvoice.billDiscountAmount.toFixed(2)}`} />}
              {viewInvoice.cgst > 0 && <Row label="CGST" val={`₹${viewInvoice.cgst.toFixed(2)}`} />}
              {viewInvoice.sgst > 0 && <Row label="SGST" val={`₹${viewInvoice.sgst.toFixed(2)}`} />}
              {viewInvoice.igst > 0 && <Row label="IGST" val={`₹${viewInvoice.igst.toFixed(2)}`} />}
              {viewInvoice.roundOff !== 0 && <Row label="Round Off" val={`₹${viewInvoice.roundOff.toFixed(2)}`} />}
              <Row label="Grand Total" val={`₹${viewInvoice.grandTotal.toFixed(2)}`} bold />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => handleReprint(viewInvoice)}>🖨 Print Invoice</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function Row({ label, val, bold }: { label: string; val: string; bold?: boolean }) {
  return (
    <div className={`flex gap-8 ${bold ? 'font-bold text-base' : ''}`}>
      <span className="text-gray-500 w-32 text-right">{label}</span>
      <span className="w-24 text-right">{val}</span>
    </div>
  );
}
