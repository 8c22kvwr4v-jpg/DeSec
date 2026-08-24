import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseServiceKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Klient med service-nokkel. Brukes KUN til oppgaver som ma ga utenom
 * brukersesjonen: opprette og deaktivere paloggingsbrukere.
 *
 * Nokkelen ligger bare i serverens miljø og importeres aldri i klientkode
 * ('server-only' gir byggefeil hvis noen forsoker).
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
