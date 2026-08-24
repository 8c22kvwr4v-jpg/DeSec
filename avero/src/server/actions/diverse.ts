'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { krevBruker } from '@/lib/auth';

export type Handlingstilstand = { feil?: string; melding?: string };

/** Søk pa en ledig vakt. */
export async function sokLedigVakt(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const vaktId = z.string().uuid().safeParse(data.get('vaktId'));
  if (!vaktId.success) return { feil: 'Ugyldig vakt.' };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { error } = await klient.from('shift_assignments').insert({
    company_id: bruker.profil.company_id,
    shift_id: vaktId.data,
    employee_id: bruker.id,
    status: 'soknad',
  });

  if (error) {
    if (error.code === '23505') return { melding: 'Du har allerede søkt på denne vakten.' };
    return { feil: 'Søknaden kunne ikke registreres. Vakten kan ha blitt tildelt.' };
  }

  revalidatePath('/ledige-vakter');
  revalidatePath('/vakter');
  return { melding: 'Søknaden er sendt. Operativ leder tar stilling til den.' };
}

/** Trekk en egen soknad. */
export async function trekkSoknad(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const vaktId = z.string().uuid().safeParse(data.get('vaktId'));
  if (!vaktId.success) return { feil: 'Ugyldig vakt.' };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { error } = await klient
    .from('shift_assignments')
    .update({ status: 'trukket' })
    .eq('shift_id', vaktId.data)
    .eq('employee_id', bruker.id);

  if (error) return { feil: 'Søknaden kunne ikke trekkes.' };

  revalidatePath('/ledige-vakter');
  revalidatePath('/vakter');
  return { melding: 'Søknaden er trukket.' };
}

/** Marker alle egne varslinger som lest. */
export async function markerVarslerLest(): Promise<void> {
  const bruker = await krevBruker();
  const klient = await createClient();

  await klient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', bruker.id)
    .is('read_at', null);

  revalidatePath('/varsler');
  revalidatePath('/hjem');
}

const profilSkjema = z.object({
  telefon: z.string().trim().max(30).nullable(),
});

/**
 * Oppdaterer egne kontaktopplysninger.
 *
 * Rolle, tilgang, avdeling og selskap kan ikke endres herfra - forsok pa
 * det blir avvist av en trigger i databasen.
 */
export async function oppdaterProfil(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const telefon = typeof data.get('telefon') === 'string'
    ? String(data.get('telefon')).trim() : '';
  const resultat = profilSkjema.safeParse({ telefon: telefon.length ? telefon : null });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { error } = await klient
    .from('profiles')
    .update({ phone: resultat.data.telefon })
    .eq('id', bruker.id);

  if (error) return { feil: 'Opplysningene kunne ikke lagres.' };

  revalidatePath('/profil');
  return { melding: 'Opplysningene er lagret.' };
}
