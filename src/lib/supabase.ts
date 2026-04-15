import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function readCredentials(): { url: string; key: string } | null {
  // Waiter: credentials stored in sessionStorage
  const ssUrl = sessionStorage.getItem('sb_url');
  const ssKey = sessionStorage.getItem('sb_anon_key');
  if (ssUrl && ssKey) return { url: ssUrl, key: ssKey };

  // Owner: credentials stored in localStorage
  const lsUrl = localStorage.getItem('sb_url');
  const lsKey = localStorage.getItem('sb_anon_key');
  if (lsUrl && lsKey) return { url: lsUrl, key: lsKey };

  return null;
}

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const creds = readCredentials();
  if (!creds) return null;
  _client = createClient(creds.url, creds.key);
  return _client;
}

export function initSupabase(url: string, key: string): SupabaseClient {
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_anon_key', key);
  _client = createClient(url, key);
  return _client;
}

export function clearSupabase(): void {
  localStorage.removeItem('sb_url');
  localStorage.removeItem('sb_anon_key');
  _client = null;
}

export function resetClient(): void {
  _client = null;
}

export function isConfigured(): boolean {
  return !!(
    (localStorage.getItem('sb_url') && localStorage.getItem('sb_anon_key')) ||
    (sessionStorage.getItem('sb_url') && sessionStorage.getItem('sb_anon_key'))
  );
}

export function isWaiterMode(): boolean {
  return sessionStorage.getItem('sb_mode') === 'waiter';
}
