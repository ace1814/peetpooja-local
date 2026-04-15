import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase credentials are stored per Firebase user so that multiple
 * restaurant owners on the same browser (or device) each have their
 * own database. Keys: `sb_url_<firebaseUID>` / `sb_anon_key_<firebaseUID>`.
 *
 * Waiters use sessionStorage (no Firebase auth, no per-user key needed).
 */

let _client:    SupabaseClient | null = null;
let _activeUid: string | null         = null;

// ─── Called by AuthContext when Firebase auth state changes ───────────────────

/** Switch to this user's stored credentials (if any). */
export function activateUser(uid: string): void {
  if (_activeUid !== uid) {
    _activeUid = uid;
    _client    = null; // force re-initialise with the new user's creds
  }
}

/** Clear the active user (called on sign-out). Does NOT delete credentials. */
export function deactivateUser(): void {
  _activeUid = null;
  _client    = null;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function readCredentials(): { url: string; key: string } | null {
  // Waiter: credentials come from sessionStorage (no Firebase auth)
  const ssUrl = sessionStorage.getItem('sb_url');
  const ssKey = sessionStorage.getItem('sb_anon_key');
  if (ssUrl && ssKey) return { url: ssUrl, key: ssKey };

  // Owner: per-user credentials in localStorage
  if (!_activeUid) return null;
  const url = localStorage.getItem(`sb_url_${_activeUid}`);
  const key = localStorage.getItem(`sb_anon_key_${_activeUid}`);
  if (url && key) return { url, key };

  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const creds = readCredentials();
  if (!creds) return null;
  _client = createClient(creds.url, creds.key);
  return _client;
}

/** Persist credentials for the active user and initialise the client. */
export function initSupabase(url: string, key: string): SupabaseClient {
  if (_activeUid) {
    // Owner: store under their UID so other users aren't affected
    localStorage.setItem(`sb_url_${_activeUid}`, url);
    localStorage.setItem(`sb_anon_key_${_activeUid}`, key);
  }
  _client = createClient(url, key);
  return _client;
}

/** True when the active user (or waiter) has Supabase credentials stored. */
export function isConfigured(): boolean {
  if (sessionStorage.getItem('sb_url') && sessionStorage.getItem('sb_anon_key')) return true;
  if (!_activeUid) return false;
  return !!(
    localStorage.getItem(`sb_url_${_activeUid}`) &&
    localStorage.getItem(`sb_anon_key_${_activeUid}`)
  );
}

export function isWaiterMode(): boolean {
  return sessionStorage.getItem('sb_mode') === 'waiter';
}

/** Force-reset the cached client (e.g. after waiter token is set). */
export function resetClient(): void {
  _client = null;
}
