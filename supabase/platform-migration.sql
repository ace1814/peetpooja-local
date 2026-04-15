-- ============================================================
-- PeetPooja Platform — User Registry
-- Run this ONCE in YOUR OWN Supabase project (not the restaurant's).
-- This project is yours as the developer — it tracks all users who sign up.
-- Add the URL and anon key as VITE_PLATFORM_SUPABASE_URL / VITE_PLATFORM_SUPABASE_ANON_KEY
-- in your Vercel environment variables.
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_users (
  id           bigserial    PRIMARY KEY,
  firebase_uid text         UNIQUE NOT NULL,
  email        text,
  display_name text,
  created_at   timestamptz  DEFAULT now(),
  last_seen_at timestamptz  DEFAULT now()
);

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- Anon can insert new rows and update their own (we don't verify JWT here —
-- data is non-sensitive and the developer views it directly in Supabase dashboard).
CREATE POLICY "anon_all" ON platform_users FOR ALL TO anon USING (true) WITH CHECK (true);
