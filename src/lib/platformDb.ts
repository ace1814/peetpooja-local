/**
 * Platform database — a single Supabase project owned by the developer.
 * Tracks every user who signs up (name, email, Firebase UID, signup date).
 * Completely separate from the restaurant's own BYOD Supabase project.
 *
 * Required env vars (add to Vercel):
 *   VITE_PLATFORM_SUPABASE_URL       – your platform project URL
 *   VITE_PLATFORM_SUPABASE_ANON_KEY  – your platform project anon key
 *
 * If either env var is missing the feature is silently disabled
 * (sign-up/sign-in still works, just without the central user registry).
 *
 * SQL to run once in your platform Supabase (see supabase/platform-migration.sql):
 *
 *   CREATE TABLE platform_users (
 *     id            bigserial PRIMARY KEY,
 *     firebase_uid  text UNIQUE NOT NULL,
 *     email         text,
 *     display_name  text,
 *     created_at    timestamptz DEFAULT now(),
 *     last_seen_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "anon_all" ON platform_users FOR ALL TO anon USING (true) WITH CHECK (true);
 */

import { createClient } from '@supabase/supabase-js';

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_SUPABASE_URL  as string | undefined;
const PLATFORM_KEY = import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY as string | undefined;

let _client: ReturnType<typeof createClient> | null = null;

function getPlatformDb() {
  if (!PLATFORM_URL || !PLATFORM_KEY) return null;
  if (!_client) _client = createClient(PLATFORM_URL, PLATFORM_KEY);
  return _client;
}

/** Register / update a user in the central platform users table. */
export async function registerPlatformUser(
  firebaseUid: string,
  email: string | null,
  displayName: string | null,
): Promise<void> {
  const db = getPlatformDb();
  if (!db) return; // platform DB not configured — silently skip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('platform_users') as any)
    .upsert(
      { firebase_uid: firebaseUid, email, display_name: displayName, last_seen_at: new Date().toISOString() },
      { onConflict: 'firebase_uid' },
    );
}

/** Returns the platform user record if the UID exists, otherwise null. */
export async function getPlatformUser(firebaseUid: string): Promise<{ firebase_uid: string } | null> {
  const db = getPlatformDb();
  if (!db) return null; // platform DB not configured — treat as "found" so login still works
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('platform_users') as any)
    .select('firebase_uid')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();
  return data;
}

/** Returns true when the platform DB is wired up (env vars present). */
export const isPlatformDbConfigured = () => !!(PLATFORM_URL && PLATFORM_KEY);
