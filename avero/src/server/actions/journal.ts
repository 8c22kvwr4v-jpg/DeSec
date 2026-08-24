'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { krevBruker } from '@/lib/auth';
import type { Journalposttype } from '@/lib/database.types';

export type Handlingstilstand = { feil?: string; melding?: string };

const POSTTYPER = [
  'kontrollrunde', 'apning', 'lasing', 'observasjon', 'hendelse', 'avvik', 'notat',
] as const satisfies readonly Journalposttype[];

const postSkjema = z.object({
  vaktId: z.string().uuid(),
  type: z.enum(POSTTYPER),
  tekst: z.string().trim().min(3, 'Skriv minst noen ord i journalnotatet').max(4000),
  sted: z.string().trim().max(200).optional(),
  vedlegg: z.array(z.string()).max(6).optional(),
});

/**
 * Starter vakten og oppretter journalen.
 *
 * Databasen slipper bare gjennom en journal for en vakt som er tildelt
 * brukeren, som ligger innenfor tidsvinduet administrator har satt, og
 * der brukeren har tilgang til objektet.
 */
export async function startVakt(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const vaktId = z.string().uuid().safeParse(data.get('vaktId'));
  if (!vaktId.success) return { feil: 'Ugyldig vakt.' };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { data: journal, error } = await klient
    .from('journals')
    .insert({
      company_id: bruker.profil.company_id,
      shift_id: vaktId.data,
      employee_id: bruker.id,
      status: 'apen',
    })
    .select('id')
    .single();

  if (error || !journal) {
    return {
      feil: 'Journalen kunne ikke apnes. Vakten ma vaere tildelt deg og innenfor '
        + 'tidsrommet operativ leder har satt.',
    };
  }

  await klient.from('journal_entries').insert({
    company_id: bruker.profil.company_id,
    journal_id: journal.id,
    author_id: bruker.id,
    entry_type: 'vakt_start',
    body: 'Vakt startet.',
  });

  revalidatePath(`/vakter/${vaktId.data}/journal`);
  return { melding: 'Vakten er startet.' };
}

export async function nyJournalpost(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const resultat = postSkjema.safeParse({
    vaktId: data.get('vaktId'),
    type: data.get('type'),
    tekst: data.get('tekst'),
    sted: data.get('sted') || undefined,
    vedlegg: data.getAll('vedlegg').filter((v): v is string => typeof v === 'string' && v.length > 0),
  });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { data: journal } = await klient
    .from('journals')
    .select('id')
    .eq('shift_id', resultat.data.vaktId)
    .maybeSingle();

  if (!journal) return { feil: 'Journalen er ikke apnet for denne vakten.' };

  const { error } = await klient.from('journal_entries').insert({
    company_id: bruker.profil.company_id,
    journal_id: journal.id,
    author_id: bruker.id,
    entry_type: resultat.data.type,
    body: resultat.data.tekst,
    location: resultat.data.sted ?? null,
    attachment_paths: resultat.data.vedlegg ?? [],
  });

  if (error) {
    return { feil: 'Notatet kunne ikke lagres. Journalen kan vaere avsluttet.' };
  }

  revalidatePath(`/vakter/${resultat.data.vaktId}/journal`);
  return { melding: 'Journalnotat lagret.' };
}

const rettelseSkjema = z.object({
  vaktId: z.string().uuid(),
  postId: z.string().uuid(),
  tekst: z.string().trim().min(3, 'Beskriv rettelsen').max(4000),
});

/**
 * Registrerer en rettelse.
 *
 * Journalposter kan ikke endres eller slettes. En rettelse lagres som en
 * ny post som peker pa den opprinnelige, slik at historikken bevares.
 */
export async function rettJournalpost(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const resultat = rettelseSkjema.safeParse({
    vaktId: data.get('vaktId'),
    postId: data.get('postId'),
    tekst: data.get('tekst'),
  });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { data: opprinnelig } = await klient
    .from('journal_entries')
    .select('id, journal_id')
    .eq('id', resultat.data.postId)
    .maybeSingle();

  if (!opprinnelig) return { feil: 'Fant ikke journalposten.' };

  const { error } = await klient.from('journal_entries').insert({
    company_id: bruker.profil.company_id,
    journal_id: opprinnelig.journal_id,
    author_id: bruker.id,
    entry_type: 'rettelse',
    body: resultat.data.tekst,
    corrects_entry_id: opprinnelig.id,
  });

  if (error) return { feil: 'Rettelsen kunne ikke lagres.' };

  revalidatePath(`/vakter/${resultat.data.vaktId}/journal`);
  return { melding: 'Rettelsen er registrert.' };
}

export async function avsluttVakt(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const vaktId = z.string().uuid().safeParse(data.get('vaktId'));
  const oppsummering = z.string().trim().max(4000).optional()
    .safeParse(data.get('oppsummering') || undefined);
  if (!vaktId.success) return { feil: 'Ugyldig vakt.' };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { data: journal } = await klient
    .from('journals')
    .select('id, status')
    .eq('shift_id', vaktId.data)
    .maybeSingle();

  if (!journal) return { feil: 'Journalen er ikke apnet.' };
  if (journal.status === 'avsluttet') return { feil: 'Journalen er allerede avsluttet.' };

  await klient.from('journal_entries').insert({
    company_id: bruker.profil.company_id,
    journal_id: journal.id,
    author_id: bruker.id,
    entry_type: 'vakt_slutt',
    body: (oppsummering.success && oppsummering.data) || 'Vakt avsluttet.',
  });

  const { error } = await klient
    .from('journals')
    .update({ status: 'avsluttet' })
    .eq('id', journal.id);

  if (error) return { feil: 'Journalen kunne ikke avsluttes.' };

  revalidatePath(`/vakter/${vaktId.data}/journal`);
  return { melding: 'Vakten er avsluttet.' };
}
