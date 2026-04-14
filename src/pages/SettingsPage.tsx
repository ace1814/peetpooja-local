import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import type { RestaurantSettings } from '../types';

export function SettingsPage() {
  const { showToast } = useToast();
  const settings = useLiveQuery(() => db.settings.get(1));
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const update = (key: keyof RestaurantSettings, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) { showToast('Logo must be under 300KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => update('logoBase64', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.settings.update(1, form);
      showToast('Settings saved!');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="space-y-6">

        {/* Restaurant Info */}
        <Section title="Restaurant Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Restaurant Name" value={form.restaurantName ?? ''} onChange={e => update('restaurantName', e.target.value)} />
            <Input label="Phone" value={form.phone ?? ''} onChange={e => update('phone', e.target.value)} />
            <Input label="Email" value={form.email ?? ''} onChange={e => update('email', e.target.value)} />
            <Input label="Address" value={form.address ?? ''} onChange={e => update('address', e.target.value)} />
            <Input label="City" value={form.city ?? ''} onChange={e => update('city', e.target.value)} />
            <Input label="State" value={form.state ?? ''} onChange={e => update('state', e.target.value)} />
            <Input label="Pincode" value={form.pincode ?? ''} onChange={e => update('pincode', e.target.value)} />
          </div>
        </Section>

        {/* Tax */}
        <Section title="GST & Compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="GSTIN" value={form.gstin ?? ''} onChange={e => update('gstin', e.target.value)} placeholder="27AABCU9603R1ZX" />
            <Input label="FSSAI Number" value={form.fssaiNumber ?? ''} onChange={e => update('fssaiNumber', e.target.value)} />
            <Select label="GST Mode" value={form.defaultGstMode ?? 'cgst_sgst'} onChange={e => update('defaultGstMode', e.target.value)}>
              <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
              <option value="igst">IGST (Inter-state)</option>
            </Select>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="roundoff" checked={form.enableRoundOff ?? true} onChange={e => update('enableRoundOff', e.target.checked)} className="accent-brand-red" />
              <label htmlFor="roundoff" className="text-sm text-gray-700">Enable Round-off</label>
            </div>
          </div>
        </Section>

        {/* Invoice */}
        <Section title="Invoice Settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Invoice Prefix" value={form.invoicePrefix ?? 'INV'} onChange={e => update('invoicePrefix', e.target.value)} placeholder="INV" />
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="thermal" checked={form.thermalMode ?? false} onChange={e => update('thermalMode', e.target.checked)} className="accent-brand-red" />
              <label htmlFor="thermal" className="text-sm text-gray-700">Thermal (80mm) Print</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoexport" checked={form.autoExportOnBill ?? false} onChange={e => update('autoExportOnBill', e.target.checked)} className="accent-brand-red" />
              <label htmlFor="autoexport" className="text-sm text-gray-700">Auto-export to Excel on each bill</label>
            </div>
            <Input label="Footer Message" value={form.footerMessage ?? ''} onChange={e => update('footerMessage', e.target.value)} placeholder="Thank you for dining with us!" />
          </div>
        </Section>

        {/* Logo */}
        <Section title="Restaurant Logo">
          <div className="flex items-start gap-4">
            {form.logoBase64 ? (
              <img src={form.logoBase64} alt="Logo" className="w-20 h-20 object-contain border rounded-lg p-1" />
            ) : (
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center">No logo</div>
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
              <p className="text-xs text-gray-400 mt-1">Max 300KB. Appears on printed invoices.</p>
              {form.logoBase64 && (
                <Button variant="ghost" size="sm" className="mt-2 text-red-500" onClick={() => update('logoBase64', '')}>Remove</Button>
              )}
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold font-display text-gray-900 mb-4 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}
