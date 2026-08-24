'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { startsideFor } from '@/lib/auth';

export type Skjematilstand = { feil?: string; melding?: string };

const paloggingSkjema = z.object({
  epost: z.string().trim().min(1, 'Fyll inn e-postadresse').email('Ugyldig e-postadresse'),
  passord: z.string().min(1, 'Fyll inn passord'),
  retur: z.string().optional(),
});

export async function loggInn(
  _forrige: Skjematilstand, data: FormData,
): Promise<Skjematilstand> {
  const resultat = paloggingSkjema.safeParse({
    epost: data.get('epost'),
    passord: data.get('passord'),
    retur: data.get('retur') ?? undefined,
  });
  if (!resultat.success) {
    return { feil: resultat.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error, data: økt } = await supabase.auth.signInWithPassword({
    email: resultat.data.epost,
    password: resultat.data.passord,
  });

  if (error || !økt.user) {
    // Samme melding uansett arsak, slik at det ikke gar an a lese ut
    // hvilke e-postadresser som finnes.
    return { feil: 'Feil e-postadresse eller passord.' };
  }

  // Deaktiverte brukere har ingen lesbar profil, og slipper ikke inn.
  const { data: profil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', økt.user.id)
    .maybeSingle();

  if (!profil) {
    await supabase.auth.signOut();
    return { feil: 'Kontoen er deaktivert. Ta kontakt med operativ leder.' };
  }

  const retur = resultat.data.retur;
  redirect(retur && retur.startsWith('/') ? retur : startsideFor(profil.role));
}

export async function loggUt(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/logg-inn');
}

const epostSkjema = z.string().trim().email('Ugyldig e-postadresse');

export async function glemtPassord(
  _forrige: Skjematilstand, data: FormData,
): Promise<Skjematilstand> {
  const resultat = epostSkjema.safeParse(data.get('epost'));
  if (!resultat.success) {
    return { feil: resultat.error.issues[0].message };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(resultat.data, {
    redirectTo: `${appUrl()}/auth/callback?neste=/nytt-passord`,
  });

  // Alltid samme svar, uavhengig av om adressen finnes.
  return {
    melding: 'Hvis adressen er registrert, er det sendt en lenke for a velge nytt passord.',
  };
}

const passordSkjema = z.object({
  passord: z.string().min(12, 'Passordet ma ha minst 12 tegn'),
  gjenta: z.string(),
}).refine((v) => v.passord === v.gjenta, {
  message: 'Passordene er ikke like', path: ['gjenta'],
});

export async function settNyttPassord(
  _forrige: Skjematilstand, data: FormData,
): Promise<Skjematilstand> {
  const resultat = passordSkjema.safeParse({
    passord: data.get('passord'),
    gjenta: data.get('gjenta'),
  });
  if (!resultat.success) {
    return { feil: resultat.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: resultat.data.passord });
  if (error) {
    return { feil: 'Kunne ikke oppdatere passordet. Be om en ny lenke og prøv igjen.' };
  }
  redirect('/start');
}
