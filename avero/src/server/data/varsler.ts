import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Notification, Qualification } from '@/lib/database.types';

/** Egne varslinger. */
export async function hentVarsler(brukerId: string, antall = 50): Promise<Notification[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('notifications')
    .select('*')
    .eq('profile_id', brukerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(antall);
  return data ?? [];
}

export async function antallUleste(brukerId: string): Promise<number> {
  const klient = await createClient();
  const { count } = await klient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', brukerId)
    .is('read_at', null)
    .is('deleted_at', null);
  return count ?? 0;
}

/** Tidsbegrenset lenke til et kursdokument i den private bøtten. */
export async function signertKursdokument(
  sti: string, sekunder = 300,
): Promise<string | null> {
  const klient = await createClient();
  const { data } = await klient.storage.from('kvalifikasjoner').createSignedUrl(sti, sekunder);
  return data?.signedUrl ?? null;
}

/** Egne kurs, godkjenninger og dokumenter. */
export async function hentKvalifikasjoner(brukerId: string): Promise<Qualification[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('qualifications')
    .select('*')
    .eq('profile_id', brukerId)
    .is('deleted_at', null)
    .order('expires_on', { ascending: true, nullsFirst: false });
  return data ?? [];
}
