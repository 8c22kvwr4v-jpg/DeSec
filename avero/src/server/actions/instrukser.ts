'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { krevBruker } from '@/lib/auth';

export type Handlingstilstand = { feil?: string; melding?: string };

/**
 * Registrerer «Jeg har lest og forstått».
 *
 * Databasen setter selv hvilken versjon som ble bekreftet, slik at en
 * bekreftelse aldri kan knyttes til feil versjon. Kommer det en ny
 * versjon senere, ma instruksen bekreftes pa nytt.
 */
export async function bekreftLest(
  _forrige: Handlingstilstand, data: FormData,
): Promise<Handlingstilstand> {
  const instruksId = z.string().uuid().safeParse(data.get('instruksId'));
  if (!instruksId.success) return { feil: 'Ugyldig instruks.' };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { error } = await klient.from('instruction_acknowledgements').insert({
    company_id: bruker.profil.company_id,
    instruction_id: instruksId.data,
    profile_id: bruker.id,
    version: 1, // overstyres av databasen til gjeldende versjon
  });

  if (error) {
    // Unik indeks hindrer dobbeltregistrering av samme versjon.
    if (error.code === '23505') {
      return { melding: 'Du har allerede bekreftet denne versjonen.' };
    }
    return { feil: 'Bekreftelsen kunne ikke lagres. Kontroller at du har tilgang.' };
  }

  revalidatePath('/instrukser');
  revalidatePath(`/instrukser/${instruksId.data}`);
  return { melding: 'Takk. Lesebekreftelsen er registrert.' };
}
