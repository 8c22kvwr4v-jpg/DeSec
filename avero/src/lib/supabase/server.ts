import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Supabase-klient for serverkomponenter og server actions.
 *
 * Klienten bruker den innloggede brukerens sesjon, slik at ALLE spørringer
 * gar gjennom Row Level Security. Serveren har ingen snarvei utenom.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        } catch {
          // Serverkomponenter kan ikke sette informasjonskapsler. Sesjonen
          // fornyes i stedet av middleware.
        }
      },
    },
  });
}
