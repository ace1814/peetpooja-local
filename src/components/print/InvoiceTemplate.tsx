import { forwardRef } from 'react';
import { format } from 'date-fns';
import type { Invoice, RestaurantSettings } from '../../types';

interface Props {
  invoice: Invoice | null;
  settings: RestaurantSettings | null;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, Props>(({ invoice, settings }, ref) => {
  if (!invoice || !settings) return <div ref={ref} />;

  const isThermal = settings.thermalMode;

  return (
    <div
      ref={ref}
      className="print-only"
      style={{
        fontFamily: 'monospace',
        fontSize: isThermal ? '11px' : '12px',
        width: isThermal ? '80mm' : '210mm',
        padding: isThermal ? '2mm' : '10mm',
        color: '#000',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
        {settings.logoBase64 && (
          <img src={settings.logoBase64} alt="Logo" style={{ height: '40px', objectFit: 'contain', marginBottom: '4px' }} />
        )}
        <div style={{ fontWeight: 'bold', fontSize: isThermal ? '14px' : '16px', fontFamily: 'sans-serif' }}>
          {settings.restaurantName}
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>{settings.address}, {settings.city} - {settings.pincode}</div>
        <div style={{ fontSize: '10px' }}>Ph: {settings.phone}</div>
        {settings.gstin && <div style={{ fontSize: '10px' }}>GSTIN: {settings.gstin}</div>}
        {settings.fssaiNumber && <div style={{ fontSize: '10px' }}>FSSAI: {settings.fssaiNumber}</div>}
      </div>

      {/* Invoice meta */}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
        <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '13px' }}>TAX INVOICE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '4px' }}>
          <span>Bill #: {invoice.invoiceNumber}</span>
          <span>{format(new Date(invoice.createdAt), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div style={{ fontSize: '10px' }}>
          Type: {invoice.orderType === 'dine-in' ? `Dine-in — Table ${invoice.tableNumber}` : 'Takeaway'}
        </div>
        {invoice.customerName && <div style={{ fontSize: '10px' }}>Customer: {invoice.customerName} {invoice.customerPhone ? `(${invoice.customerPhone})` : ''}</div>}
        {invoice.customerGstin && <div style={{ fontSize: '10px' }}>GSTIN: {invoice.customerGstin}</div>}
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
            <th style={{ textAlign: 'center', width: '30px' }}>Qty</th>
            <th style={{ textAlign: 'right', width: '50px' }}>Rate</th>
            <th style={{ textAlign: 'right', width: '55px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
              <td style={{ padding: '3px 0' }}>
                <div>{item.name}</div>
                {item.hsnCode && <div style={{ fontSize: '9px', color: '#555' }}>SAC: {item.hsnCode}</div>}
                {item.discountAmount > 0 && (
                  <div style={{ fontSize: '9px', color: '#555' }}>Disc: −₹{item.discountAmount.toFixed(2)}</div>
                )}
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '3px' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '3px' }}>₹{item.unitPrice}</td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '3px' }}>₹{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #000', marginTop: '6px', paddingTop: '6px' }}>
        <TotalRow label="Subtotal" value={invoice.subtotal} />
        {invoice.itemDiscountTotal > 0 && <TotalRow label="Item Discounts" value={-invoice.itemDiscountTotal} />}
        {invoice.billDiscountAmount > 0 && <TotalRow label="Bill Discount" value={-invoice.billDiscountAmount} />}
        {invoice.cgst > 0 && <TotalRow label={`CGST`} value={invoice.cgst} />}
        {invoice.sgst > 0 && <TotalRow label={`SGST`} value={invoice.sgst} />}
        {invoice.igst > 0 && <TotalRow label={`IGST`} value={invoice.igst} />}
        {invoice.roundOff !== 0 && <TotalRow label="Round Off" value={invoice.roundOff} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px', fontSize: '13px' }}>
          <span>GRAND TOTAL</span><span>₹{invoice.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* GST breakup */}
      {(invoice.cgst > 0 || invoice.sgst > 0 || invoice.igst > 0) && (
        <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '4px', fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>GST Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                {invoice.cgst > 0 && <><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></>}
                {invoice.igst > 0 && <th style={{ textAlign: 'right' }}>IGST</th>}
              </tr>
            </thead>
            <tbody>
              {groupByGst(invoice.items).map(row => (
                <tr key={row.rate}>
                  <td>{row.rate}%</td>
                  <td style={{ textAlign: 'right' }}>₹{row.taxable.toFixed(2)}</td>
                  {invoice.cgst > 0 && <><td style={{ textAlign: 'right' }}>₹{row.cgst.toFixed(2)}</td><td style={{ textAlign: 'right' }}>₹{row.sgst.toFixed(2)}</td></>}
                  {invoice.igst > 0 && <td style={{ textAlign: 'right' }}>₹{row.igst.toFixed(2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment */}
      <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '4px', fontSize: '10px' }}>
        <div style={{ fontWeight: 'bold' }}>Payment</div>
        {invoice.payments.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'capitalize' }}>{p.method}{p.reference ? ` (${p.reference})` : ''}</span>
            <span>₹{p.amount.toFixed(2)}</span>
          </div>
        ))}
        {invoice.changeReturned > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Change Returned</span><span>₹{invoice.changeReturned.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '4px', fontSize: '10px' }}>
          Note: {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '6px', textAlign: 'center', fontSize: '11px' }}>
        {settings.footerMessage || 'Thank you for your visit!'}
      </div>
    </div>
  );
});

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
      <span>{label}</span>
      <span>{value >= 0 ? `₹${value.toFixed(2)}` : `−₹${Math.abs(value).toFixed(2)}`}</span>
    </div>
  );
}

function groupByGst(items: Invoice['items']) {
  const map = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const item of items) {
    const existing = map.get(item.gstRate) ?? { rate: item.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    existing.taxable += item.taxableAmount;
    existing.cgst += item.cgst;
    existing.sgst += item.sgst;
    existing.igst += item.igst;
    map.set(item.gstRate, existing);
  }
  return Array.from(map.values());
}
