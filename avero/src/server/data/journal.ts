import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { slaOpp } from '@/server/data/felles';
import type { Journal, JournalEntry, Profile } from '@/lib/database.types';

export type JournalVisning = {
  journal: Journal | null;
  poster: (JournalEntry & { forfatter: string })[];
  /** Kan brukeren skrive i journalen na? Avgjores til slutt av databasen. */
  kanSkrive: boolean;
};

/**
 * Journalen for en vakt.
 *
 * Skrivevinduet bestemmes av administrator (minutter for og etter vakten)
 * og handheves av funksjonen can_use_journal i databasen. Her regnes det
 * samme ut pa nytt, kun for a vise riktig knapp - databasen har siste ord.
 */
export async function hentJournalForVakt(
  vaktId: string,
  vakt: { starts_at: string; ends_at: string; status: string },
  vindu: { for: number; etter: number },
): Promise<JournalVisning> {
  const klient = await createClient();

  const { data: journal } = await klient
    .from('journals')
    .select('*')
    .eq('shift_id', vaktId)
    .maybeSingle();

  const na = Date.now();
  const apner = new Date(vakt.starts_at).getTime() - vindu.for * 60_000;
  const stenger = new Date(vakt.ends_at).getTime() + vindu.etter * 60_000;
  const innenforVindu = na >= apner && na <= stenger && vakt.status !== 'avlyst';

  if (!journal) {
    return { journal: null, poster: [], kanSkrive: innenforVindu };
  }

  const { data: poster } = await klient
    .from('journal_entries')
    .select('*')
    .eq('journal_id', journal.id)
    .order('occurred_at', { ascending: true });

  const forfattere = await slaOpp<Profile>(
    klient, 'profiles', (poster ?? []).map((p) => p.author_id), 'id, full_name',
  );

  return {
    journal,
    poster: (poster ?? []).map((post) => ({
      ...post,
      forfatter: forfattere.get(post.author_id)?.full_name ?? 'Ukjent',
    })),
    kanSkrive: innenforVindu && journal.status === 'apen',
  };
}
