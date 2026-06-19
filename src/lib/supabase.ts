// =====================================================================
//  Supabase client bootstrap.
//  The whole app is single-user and talks to Supabase with the anon key
//  only (see supabase/schema.sql). If the env vars are absent the app
//  transparently falls back to a localStorage backend (see db.ts), so
//  `next build` must succeed with NO env vars set — hence the lazy,
//  cached client creation below.
// =====================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Public Supabase project URL (inlined at build time by Next for NEXT_PUBLIC_*). */
export const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Public Supabase anon key. */
export const SUPABASE_ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True only when BOTH the URL and anon key are present. */
export const isSupabaseConfigured: boolean =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily create (and cache) the Supabase client.
 * Returns null when the project is not configured — callers must handle that.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}
