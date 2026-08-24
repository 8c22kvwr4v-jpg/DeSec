import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Company, Profile, Rolle } from '@/lib/database.types';

export type AktivBruker = {
  id: string;
  epost: string;
  profil: Profile;
  selskap: Company;
};

/**
 * Henter innlogget bruker med profil og selskap.
 *
 * Profilen hentes gjennom brukerens egen sesjon, sa RLS avgjor hva som
 * returneres. Er brukeren deaktivert, finner spørringen ingen profil, og
 * brukeren behandles som utlogget.
 */
export const hentBruker = cache(async (): Promise<AktivBruker | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (!profil) return null;

  const { data: selskap } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profil.company_id)
    .maybeSingle();
  if (!selskap) return null;

  return { id: user.id, epost: user.email ?? profil.email, profil, selskap };
});

/** Krever innlogging. Sender til paloggingssiden hvis sesjonen mangler. */
export async function krevBruker(returSti?: string): Promise<AktivBruker> {
  const bruker = await hentBruker();
  if (!bruker) {
    redirect(returSti ? `/logg-inn?retur=${encodeURIComponent(returSti)}` : '/logg-inn');
  }
  return bruker;
}

/** Krever en av de oppgitte rollene. */
export async function krevRolle(...roller: Rolle[]): Promise<AktivBruker> {
  const bruker = await krevBruker();
  if (!roller.includes(bruker.profil.role)) {
    redirect('/ingen-tilgang');
  }
  return bruker;
}

export function erAdmin(bruker: AktivBruker): boolean {
  return bruker.profil.role === 'administrator';
}

export function erLeder(bruker: AktivBruker): boolean {
  return bruker.profil.role === 'operativ_leder' || bruker.profil.role === 'administrator';
}

/** Startside etter palogging, bestemt av rollen. */
export function startsideFor(rolle: Rolle): string {
  switch (rolle) {
    case 'administrator':
    case 'operativ_leder':
      return '/admin';
    default:
      return '/hjem';
  }
}
