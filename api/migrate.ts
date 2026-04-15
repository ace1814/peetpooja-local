/**
 * Vercel Edge Function — POST /api/migrate
 *
 * Accepts { supabaseUrl, accessToken } and:
 *  1. Extracts the project ref from the URL
 *  2. Runs the migration SQL via the Supabase Management API
 *  3. Fetches + returns the anon key so the user doesn't have to copy it manually
 *
 * The access token is a Supabase Personal Access Token (PAT).
 * It is NEVER stored — used once and discarded.
 */

export const config = { runtime: 'edge' };

// Inline migration SQL — kept in sync with supabase/migration.sql
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id               integer PRIMARY KEY DEFAULT 1,
  restaurant_name  text    DEFAULT 'My Restaurant',
  address          text    DEFAULT '',
  city             text    DEFAULT '',
  state            text    DEFAULT '',
  pincode          text    DEFAULT '',
  phone            text    DEFAULT '',
  email            text    DEFAULT '',
  gstin            text    DEFAULT '',
  fssai_number     text    DEFAULT '',
  logo_base64      text    DEFAULT '',
  invoice_prefix   text    DEFAULT 'INV',
  current_invoice_seq integer DEFAULT 0,
  default_gst_mode text    DEFAULT 'cgst_sgst',
  enable_round_off boolean DEFAULT true,
  print_copies     integer DEFAULT 1,
  thermal_mode     boolean DEFAULT false,
  print_size       text    DEFAULT '58mm',
  footer_message   text    DEFAULT 'Thank you for your visit!',
  auto_export_on_bill boolean DEFAULT false,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS categories (
  id         bigserial PRIMARY KEY,
  name       text    NOT NULL,
  sort_order integer DEFAULT 0,
  color      text,
  is_active  boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
  id          bigserial PRIMARY KEY,
  category_id bigint  REFERENCES categories(id) ON DELETE SET NULL,
  name        text    NOT NULL,
  short_name  text,
  price       numeric NOT NULL DEFAULT 0,
  mrp         numeric,
  hsn_code    text    DEFAULT '996331',
  gst_rate    numeric DEFAULT 5,
  gst_inclusive boolean DEFAULT false,
  unit        text    DEFAULT 'Plate',
  is_veg      boolean DEFAULT true,
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  description text
);

CREATE TABLE IF NOT EXISTS dining_tables (
  id                 bigserial PRIMARY KEY,
  table_number       text    NOT NULL,
  section            text    DEFAULT 'Main Hall',
  capacity           integer DEFAULT 4,
  status             text    DEFAULT 'available',
  current_invoice_id bigint
);

CREATE TABLE IF NOT EXISTS invoices (
  id                   bigserial PRIMARY KEY,
  invoice_number       text    NOT NULL UNIQUE,
  order_type           text    NOT NULL DEFAULT 'takeaway',
  table_id             bigint,
  table_number         text,
  customer_name        text,
  customer_phone       text,
  customer_gstin       text,
  items                jsonb   NOT NULL DEFAULT '[]',
  bill_discount_type   text    DEFAULT 'none',
  bill_discount_value  numeric DEFAULT 0,
  subtotal             numeric DEFAULT 0,
  item_discount_total  numeric DEFAULT 0,
  bill_discount_amount numeric DEFAULT 0,
  taxable_amount       numeric DEFAULT 0,
  cgst                 numeric DEFAULT 0,
  sgst                 numeric DEFAULT 0,
  igst                 numeric DEFAULT 0,
  total_tax            numeric DEFAULT 0,
  round_off            numeric DEFAULT 0,
  grand_total          numeric DEFAULT 0,
  payments             jsonb   NOT NULL DEFAULT '[]',
  amount_received      numeric DEFAULT 0,
  change_returned      numeric DEFAULT 0,
  status               text    DEFAULT 'draft',
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  printed_at           timestamptz
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id                  bigserial PRIMARY KEY,
  name                text    NOT NULL,
  unit                text    DEFAULT 'kg',
  current_stock       numeric DEFAULT 0,
  low_stock_threshold numeric DEFAULT 0,
  cost_per_unit       numeric DEFAULT 0,
  supplier            text,
  is_active           boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS recipes (
  id           bigserial PRIMARY KEY,
  menu_item_id bigint REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredients  jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          bigserial PRIMARY KEY,
  supplier    text,
  status      text    DEFAULT 'pending',
  items       jsonb   NOT NULL DEFAULT '[]',
  total_cost  numeric DEFAULT 0,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  received_at timestamptz
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_settings' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON restaurant_settings FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON menu_items FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dining_tables' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON dining_tables FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON invoices FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raw_materials' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON raw_materials FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON recipes FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON purchase_orders FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq integer;
  prefix   text;
  yr       text;
BEGIN
  UPDATE restaurant_settings
    SET current_invoice_seq = current_invoice_seq + 1
    WHERE id = 1
    RETURNING current_invoice_seq, invoice_prefix INTO next_seq, prefix;
  yr := extract(year FROM now())::text;
  RETURN prefix || '-' || yr || '-' || lpad(next_seq::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_invoice_number() TO anon;

INSERT INTO restaurant_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let supabaseUrl: string;
  let accessToken: string;

  try {
    const body = await req.json() as { supabaseUrl?: string; accessToken?: string };
    supabaseUrl  = (body.supabaseUrl  ?? '').trim();
    accessToken  = (body.accessToken  ?? '').trim();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!supabaseUrl || !accessToken) {
    return new Response(JSON.stringify({ error: 'supabaseUrl and accessToken are required' }), { status: 400 });
  }

  // Extract project ref: https://xyzxyz.supabase.co → "xyzxyz"
  let projectRef: string;
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    if (!projectRef) throw new Error('bad ref');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid Supabase URL' }), { status: 400 });
  }

  const mgmtBase = 'https://api.supabase.com/v1';
  const headers  = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // ── 1. Run migration SQL ──────────────────────────────────────
  const sqlRes = await fetch(`${mgmtBase}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: MIGRATION_SQL }),
  });

  if (!sqlRes.ok) {
    const body = await sqlRes.text();
    return new Response(
      JSON.stringify({ error: `Migration failed (${sqlRes.status}): ${body}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── 2. Fetch the anon key so the user doesn't have to copy it ─
  let anonKey: string | null = null;
  try {
    const keysRes = await fetch(`${mgmtBase}/projects/${projectRef}/api-keys`, { headers });
    if (keysRes.ok) {
      const keys = await keysRes.json() as Array<{ name: string; api_key: string }>;
      anonKey = keys.find(k => k.name === 'anon')?.api_key ?? null;
    }
  } catch { /* non-fatal — user can paste it manually */ }

  return new Response(
    JSON.stringify({ success: true, anonKey }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
