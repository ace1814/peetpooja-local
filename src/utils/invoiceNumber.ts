import { db } from '../db/schema';

export async function getNextInvoiceNumber(): Promise<string> {
  return db.transaction('rw', db.settings, async () => {
    const settings = await db.settings.get(1);
    if (!settings) throw new Error('Settings not initialized');
    const nextSeq = (settings.currentInvoiceSeq ?? 0) + 1;
    await db.settings.update(1, { currentInvoiceSeq: nextSeq });
    const year = new Date().getFullYear();
    const padded = String(nextSeq).padStart(4, '0');
    return `${settings.invoicePrefix}-${year}-${padded}`;
  });
}
