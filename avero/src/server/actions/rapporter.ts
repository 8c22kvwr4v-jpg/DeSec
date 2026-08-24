'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { krevBruker } from '@/lib/auth';
import { fromLocalInputValue } from '@/lib/dates';
import type { Rapporttype } from '@/lib/database.types';

export type Rapporttilstand = { feil?: string; melding?: string };

const RAPPORTTYPER = [
  'avvik', 'hendelse', 'utrykning', 'maktbruk', 'skade', 'vaktrapport',
] as const satisfies readonly Rapporttype[];

const avkryssing = (verdi: FormDataEntryValue | null) => verdi === 'on' || verdi === 'true';

const innholdSkjema = z.object({
  type: z.enum(RAPPORTTYPER),
  tittel: z.string().trim().min(3, 'Gi rapporten en kort tittel').max(200),
  tidspunkt: z.string().min(1, 'Velg dato og klokkeslett'),
  objektId: z.string().uuid().nullable(),
  vaktId: z.string().uuid().nullable(),
  beskrivelse: z.string().trim().max(8000).nullable(),
  hendelsesforlop: z.string().trim().max(8000).nullable(),
  tiltak: z.string().trim().max(8000).nullable(),
  varslede: z.string().trim().max(1000).nullable(),
  vitner: z.string().trim().max(1000).nullable(),
  personskade: z.boolean(),
  personskadeDetaljer: z.string().trim().max(4000).nullable(),
  materiellSkade: z.boolean(),
  materiellSkadeDetaljer: z.string().trim().max(4000).nullable(),
  fysiskMakt: z.boolean(),
  fysiskMaktDetaljer: z.string().trim().max(4000).nullable(),
  politiVarslet: z.boolean(),
});

function lesSkjema(data: FormData) {
  const tekst = (navn: string) => {
    const verdi = data.get(navn);
    const streng = typeof verdi === 'string' ? verdi.trim() : '';
    return streng.length > 0 ? streng : null;
  };
  const uuid = (navn: string) => {
    const verdi = tekst(navn);
    return verdi && z.string().uuid().safeParse(verdi).success ? verdi : null;
  };

  return innholdSkjema.safeParse({
    type: data.get('type'),
    tittel: data.get('tittel'),
    tidspunkt: data.get('tidspunkt'),
    objektId: uuid('objektId'),
    vaktId: uuid('vaktId'),
    beskrivelse: tekst('beskrivelse'),
    hendelsesforlop: tekst('hendelsesforlop'),
    tiltak: tekst('tiltak'),
    varslede: tekst('varslede'),
    vitner: tekst('vitner'),
    personskade: avkryssing(data.get('personskade')),
    personskadeDetaljer: tekst('personskadeDetaljer'),
    materiellSkade: avkryssing(data.get('materiellSkade')),
    materiellSkadeDetaljer: tekst('materiellSkadeDetaljer'),
    fysiskMakt: avkryssing(data.get('fysiskMakt')),
    fysiskMaktDetaljer: tekst('fysiskMaktDetaljer'),
    politiVarslet: avkryssing(data.get('politiVarslet')),
  });
}

function tilKolonner(verdier: z.infer<typeof innholdSkjema>) {
  return {
    report_type: verdier.type,
    title: verdier.tittel,
    occurred_at: fromLocalInputValue(verdier.tidspunkt).toISOString(),
    site_id: verdier.objektId,
    shift_id: verdier.vaktId,
    description: verdier.beskrivelse,
    sequence_of_events: verdier.hendelsesforlop,
    actions_taken: verdier.tiltak,
    notified: verdier.varslede,
    witnesses: verdier.vitner,
    personal_injury: verdier.personskade,
    personal_injury_details: verdier.personskadeDetaljer,
    material_damage: verdier.materiellSkade,
    material_damage_details: verdier.materiellSkadeDetaljer,
    physical_force: verdier.fysiskMakt,
    physical_force_details: verdier.fysiskMaktDetaljer,
    police_notified: verdier.politiVarslet,
  };
}

/** Oppretter et utkast og apner det for videre utfylling. */
export async function opprettRapport(
  _forrige: Rapporttilstand, data: FormData,
): Promise<Rapporttilstand> {
  const resultat = lesSkjema(data);
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { data: rapport, error } = await klient
    .from('reports')
    .insert({
      company_id: bruker.profil.company_id,
      reporter_id: bruker.id,
      status: 'utkast',
      ...tilKolonner(resultat.data),
    })
    .select('id')
    .single();

  if (error || !rapport) {
    return { feil: 'Rapporten kunne ikke opprettes. Prøv igjen.' };
  }

  revalidatePath('/rapporter');
  redirect(`/rapporter/${rapport.id}`);
}

async function lagreVedlegg(
  klient: Awaited<ReturnType<typeof createClient>>,
  data: FormData,
  rapportId: string,
  selskapId: string,
  brukerId: string,
) {
  const stier = data.getAll('vedlegg').filter((v): v is string => typeof v === 'string' && v.length > 0);
  const navn = data.getAll('vedleggNavn').filter((v): v is string => typeof v === 'string');
  if (stier.length === 0) return;

  await klient.from('report_attachments').insert(
    stier.map((sti, i) => ({
      company_id: selskapId,
      report_id: rapportId,
      storage_path: sti,
      file_name: navn[i] ?? sti.split('/').pop() ?? 'vedlegg',
      uploaded_by: brukerId,
    })),
  );
}

/** Lagrer endringer i et eget utkast. */
export async function lagreRapport(
  _forrige: Rapporttilstand, data: FormData,
): Promise<Rapporttilstand> {
  const rapportId = z.string().uuid().safeParse(data.get('rapportId'));
  if (!rapportId.success) return { feil: 'Ugyldig rapport.' };

  const resultat = lesSkjema(data);
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const bruker = await krevBruker();
  const klient = await createClient();

  const { error, data: oppdatert } = await klient
    .from('reports')
    .update(tilKolonner(resultat.data))
    .eq('id', rapportId.data)
    .select('id');

  if (error || !oppdatert?.length) {
    return {
      feil: 'Rapporten kunne ikke lagres. Innsendte rapporter er låst for endring.',
    };
  }

  await lagreVedlegg(klient, data, rapportId.data, bruker.profil.company_id, bruker.id);

  revalidatePath(`/rapporter/${rapportId.data}`);
  return { melding: 'Utkastet er lagret.' };
}

/**
 * Sender inn rapporten. Etter innsending er innholdet last for
 * rapportoren - bade av tilgangsreglene og av en trigger i databasen.
 */
export async function sendInnRapport(
  _forrige: Rapporttilstand, data: FormData,
): Promise<Rapporttilstand> {
  const rapportId = z.string().uuid().safeParse(data.get('rapportId'));
  if (!rapportId.success) return { feil: 'Ugyldig rapport.' };

  const klient = await createClient();
  const { error, data: oppdatert } = await klient
    .from('reports')
    .update({ status: 'innsendt' })
    .eq('id', rapportId.data)
    .select('id');

  if (error || !oppdatert?.length) {
    return { feil: 'Rapporten kunne ikke sendes inn. Prøv igjen.' };
  }

  revalidatePath('/rapporter');
  revalidatePath(`/rapporter/${rapportId.data}`);
  return { melding: 'Rapporten er sendt inn.' };
}

/** Sletter et eget utkast. */
export async function slettUtkast(
  _forrige: Rapporttilstand, data: FormData,
): Promise<Rapporttilstand> {
  const rapportId = z.string().uuid().safeParse(data.get('rapportId'));
  if (!rapportId.success) return { feil: 'Ugyldig rapport.' };

  const klient = await createClient();
  const { error } = await klient.from('reports').delete().eq('id', rapportId.data);
  if (error) return { feil: 'Utkastet kunne ikke slettes.' };

  revalidatePath('/rapporter');
  redirect('/rapporter');
}
