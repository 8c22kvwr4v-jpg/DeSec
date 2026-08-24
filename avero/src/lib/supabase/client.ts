'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/** Supabase-klient for nettleseren. Bruker kun den offentlige nokkelen. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
