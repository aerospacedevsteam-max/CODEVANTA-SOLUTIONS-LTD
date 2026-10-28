import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase now issues "publishable" keys (sb_publishable_…); legacy anon keys still work.
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** True when the public Supabase URL and anon key are present. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT-REF'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null;

export class ConfigError extends Error {
  constructor() {
    super('The store is not connected to its database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    this.name = 'ConfigError';
  }
}

export function db(): SupabaseClient {
  if (!supabase) throw new ConfigError();
  return supabase;
}

export const siteUrl = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin).replace(/\/$/, '');
export const functionsUrl = url ? `${url.replace(/\/$/, '')}/functions/v1` : '';
