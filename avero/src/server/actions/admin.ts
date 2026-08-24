'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { krevRolle } from '@/lib/auth';
import { fromLocalInputValue } from '@/lib/dates';
import type { Rapportstatus, Rolle, Vakttype } from '@/lib/database.types';

export type Adminstilstand = { feil?: string; melding?: string };

const uuid = z.string().uuid();

/* =====================================================================
   Vakter
   ===================================================================== */

const vaktSkjema = z.object({
  objektId: uuid,
  type: z.enum([
    'stasjonaer', 'rundering', 'arrangement', 'utrykning', 'resepsjon', 'verditransport',
  ] as const satisfies readonly Vakttype[]),
  start: z.string().min(1, 'Velg starttidspunkt'),
  slutt: z.string().min(1, 'Velg sluttidspunkt'),
  ansattId: z.string().optional(),
  oppmote: z.string().trim().max(200).optional(),
  merknader: z.string().trim().max(4000).optional(),
  utlys: z.boolean(),
});

/**
 * Oppretter en vakt og tildeler den til en bestemt ansatt.
 *
 * Vakten blir bare synlig for den ansatte som far den tildelt, og for
 * ledere med ansvar for objektet.
 */
export async function opprettVakt(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');

  const resultat = vaktSkjema.safeParse({
    objektId: data.get('objektId'),
    type: data.get('type'),
    start: data.get('start'),
    slutt: data.get('slutt'),
    ansattId: data.get('ansattId') || undefined,
    oppmote: data.get('oppmote') || undefined,
    merknader: data.get('merknader') || undefined,
    utlys: data.get('utlys') === 'on',
  });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const start = fromLocalInputValue(resultat.data.start);
  const slutt = fromLocalInputValue(resultat.data.slutt);
  if (slutt.getTime() <= start.getTime()) {
    return { feil: 'Sluttidspunktet må være etter starttidspunktet.' };
  }

  const harAnsatt = resultat.data.ansattId
    && uuid.safeParse(resultat.data.ansattId).success;

  const klient = await createClient();
  const { data: vakt, error } = await klient
    .from('shifts')
    .insert({
      company_id: bruker.profil.company_id,
      site_id: resultat.data.objektId,
      shift_type: resultat.data.type,
      starts_at: start.toISOString(),
      ends_at: slutt.toISOString(),
      status: harAnsatt ? 'tildelt' : resultat.data.utlys ? 'ledig' : 'planlagt',
      meeting_point: resultat.data.oppmote ?? null,
      notes: resultat.data.merknader ?? null,
      created_by: bruker.id,
    })
    .select('id')
    .single();

  if (error || !vakt) return { feil: 'Vakten kunne ikke opprettes.' };

  if (harAnsatt) {
    const { error: tildelingsfeil } = await klient.from('shift_assignments').insert({
      company_id: bruker.profil.company_id,
      shift_id: vakt.id,
      employee_id: resultat.data.ansattId!,
      status: 'tildelt',
      assigned_by: bruker.id,
    });
    if (tildelingsfeil) {
      return { feil: 'Vakten ble opprettet, men tildelingen feilet.' };
    }
    await klient.from('notifications').insert({
      company_id: bruker.profil.company_id,
      profile_id: resultat.data.ansattId!,
      title: 'Ny vakt tildelt',
      body: 'Du har fått tildelt en ny vakt. Åpne «Mine vakter» for detaljer.',
      kind: 'vakt',
      link: `/vakter/${vakt.id}`,
    });
  }

  revalidatePath('/admin/vakter');
  return { melding: 'Vakten er opprettet.' };
}

export async function tildelVakt(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const vaktId = uuid.safeParse(data.get('vaktId'));
  const ansattId = uuid.safeParse(data.get('ansattId'));
  if (!vaktId.success || !ansattId.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();

  // En vakt har én ansvarlig ansatt. Tidligere tildelinger avsluttes.
  await klient
    .from('shift_assignments')
    .update({ status: 'trukket', deleted_at: new Date().toISOString() })
    .eq('shift_id', vaktId.data)
    .is('deleted_at', null);

  const { error } = await klient.from('shift_assignments').insert({
    company_id: bruker.profil.company_id,
    shift_id: vaktId.data,
    employee_id: ansattId.data,
    status: 'tildelt',
    assigned_by: bruker.id,
  });
  if (error) return { feil: 'Tildelingen kunne ikke lagres.' };

  await klient.from('shifts').update({ status: 'tildelt' }).eq('id', vaktId.data);
  await klient.from('notifications').insert({
    company_id: bruker.profil.company_id,
    profile_id: ansattId.data,
    title: 'Ny vakt tildelt',
    body: 'Du har fått tildelt en vakt.',
    kind: 'vakt',
    link: `/vakter/${vaktId.data}`,
  });

  revalidatePath('/admin/vakter');
  revalidatePath(`/admin/vakter/${vaktId.data}`);
  return { melding: 'Vakten er tildelt.' };
}

export async function endreVaktstatus(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  await krevRolle('administrator');
  const vaktId = uuid.safeParse(data.get('vaktId'));
  const status = z.enum(['planlagt', 'ledig', 'tildelt', 'pagaende', 'fullfort', 'avlyst'])
    .safeParse(data.get('status'));
  if (!vaktId.success || !status.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();
  const { error } = await klient
    .from('shifts').update({ status: status.data }).eq('id', vaktId.data);
  if (error) return { feil: 'Statusen kunne ikke endres.' };

  revalidatePath('/admin/vakter');
  revalidatePath(`/admin/vakter/${vaktId.data}`);
  return { melding: 'Statusen er oppdatert.' };
}

/* =====================================================================
   Ansatte og brukere
   ===================================================================== */

const ansattSkjema = z.object({
  fornavn: z.string().trim().min(1, 'Fyll inn fornavn').max(80),
  etternavn: z.string().trim().min(1, 'Fyll inn etternavn').max(80),
  epost: z.string().trim().email('Ugyldig e-postadresse'),
  telefon: z.string().trim().max(30).optional(),
  stilling: z.string().trim().max(80).optional(),
  ansattnummer: z.string().trim().max(30).optional(),
  rolle: z.enum(['ansatt', 'operativ_leder', 'administrator'] as const satisfies readonly Rolle[]),
  avdelingId: z.string().optional(),
  passord: z.string().min(12, 'Midlertidig passord må ha minst 12 tegn'),
});

/**
 * Oppretter en ny bruker.
 *
 * Selve paloggingsbrukeren opprettes med service-nokkelen, som bare
 * finnes pa serveren. Profilen legges inn med administratorens egen
 * sesjon, slik at endringen havner i revisjonsloggen med riktig aktør.
 */
export async function opprettAnsatt(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');

  const resultat = ansattSkjema.safeParse({
    fornavn: data.get('fornavn'),
    etternavn: data.get('etternavn'),
    epost: data.get('epost'),
    telefon: data.get('telefon') || undefined,
    stilling: data.get('stilling') || undefined,
    ansattnummer: data.get('ansattnummer') || undefined,
    rolle: data.get('rolle'),
    avdelingId: data.get('avdelingId') || undefined,
    passord: data.get('passord'),
  });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const admin = createAdminClient();
  const { data: nyBruker, error: authfeil } = await admin.auth.admin.createUser({
    email: resultat.data.epost,
    password: resultat.data.passord,
    email_confirm: true,
  });

  if (authfeil || !nyBruker.user) {
    return { feil: `Brukeren kunne ikke opprettes: ${authfeil?.message ?? 'ukjent feil'}` };
  }

  const klient = await createClient();
  const avdeling = resultat.data.avdelingId
    && uuid.safeParse(resultat.data.avdelingId).success
    ? resultat.data.avdelingId : null;

  const { error } = await klient.from('profiles').insert({
    id: nyBruker.user.id,
    company_id: bruker.profil.company_id,
    department_id: avdeling,
    first_name: resultat.data.fornavn,
    last_name: resultat.data.etternavn,
    email: resultat.data.epost,
    phone: resultat.data.telefon ?? null,
    job_title: resultat.data.stilling ?? null,
    employee_number: resultat.data.ansattnummer ?? null,
    role: resultat.data.rolle,
    is_active: true,
  });

  if (error) {
    // Rydd opp slik at vi ikke etterlater en bruker uten profil.
    await admin.auth.admin.deleteUser(nyBruker.user.id);
    return { feil: 'Profilen kunne ikke lagres. Brukeren ble ikke opprettet.' };
  }

  revalidatePath('/admin/ansatte');
  redirect(`/admin/ansatte/${nyBruker.user.id}`);
}

export async function settRolle(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  await krevRolle('administrator');
  const profilId = uuid.safeParse(data.get('profilId'));
  const rolle = z.enum(['ansatt', 'operativ_leder', 'administrator']).safeParse(data.get('rolle'));
  const avdelingId = data.get('avdelingId');
  if (!profilId.success || !rolle.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();
  const { error } = await klient
    .from('profiles')
    .update({
      role: rolle.data,
      department_id: typeof avdelingId === 'string' && uuid.safeParse(avdelingId).success
        ? avdelingId : null,
    })
    .eq('id', profilId.data);

  if (error) return { feil: 'Rollen kunne ikke endres.' };

  revalidatePath(`/admin/ansatte/${profilId.data}`);
  return { melding: 'Rolle og avdeling er oppdatert.' };
}

/** Deaktiverer en bruker. Palogging sperres samtidig. */
export async function settAktiv(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  await krevRolle('administrator');
  const profilId = uuid.safeParse(data.get('profilId'));
  const aktiv = data.get('aktiv') === 'true';
  if (!profilId.success) return { feil: 'Ugyldig bruker.' };

  const klient = await createClient();
  const { error } = await klient
    .from('profiles')
    .update({
      is_active: aktiv,
      deactivated_at: aktiv ? null : new Date().toISOString(),
    })
    .eq('id', profilId.data);

  if (error) return { feil: 'Statusen kunne ikke endres.' };

  // Sperrer ogsa selve paloggingen.
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profilId.data, {
    ban_duration: aktiv ? 'none' : '876000h',
  });

  revalidatePath('/admin/ansatte');
  revalidatePath(`/admin/ansatte/${profilId.data}`);
  return { melding: aktiv ? 'Brukeren er aktivert.' : 'Brukeren er deaktivert.' };
}

export async function endreObjekttilgang(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const profilId = uuid.safeParse(data.get('profilId'));
  const objektId = uuid.safeParse(data.get('objektId'));
  const gi = data.get('gi') === 'true';
  if (!profilId.success || !objektId.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();

  if (gi) {
    const { error } = await klient.from('employee_site_access').insert({
      company_id: bruker.profil.company_id,
      profile_id: profilId.data,
      site_id: objektId.data,
      granted_by: bruker.id,
    });
    if (error && error.code !== '23505') {
      return { feil: 'Tilgangen kunne ikke gis.' };
    }
  } else {
    const { error } = await klient
      .from('employee_site_access')
      .update({ deleted_at: new Date().toISOString() })
      .eq('profile_id', profilId.data)
      .eq('site_id', objektId.data)
      .is('deleted_at', null);
    if (error) return { feil: 'Tilgangen kunne ikke fjernes.' };
  }

  revalidatePath(`/admin/ansatte/${profilId.data}`);
  return { melding: gi ? 'Objekttilgang gitt.' : 'Objekttilgang fjernet.' };
}

/* =====================================================================
   Kunder og objekter
   ===================================================================== */

export async function opprettKunde(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const navn = z.string().trim().min(2, 'Fyll inn kundenavn').safeParse(data.get('navn'));
  if (!navn.success) return { feil: navn.error.issues[0].message };

  const klient = await createClient();
  const { error } = await klient.from('customers').insert({
    company_id: bruker.profil.company_id,
    name: navn.data,
    org_number: String(data.get('orgnummer') ?? '') || null,
    contact_name: String(data.get('kontakt') ?? '') || null,
    contact_phone: String(data.get('telefon') ?? '') || null,
  });
  if (error) return { feil: 'Kunden kunne ikke opprettes.' };

  revalidatePath('/admin/objekter');
  return { melding: 'Kunden er opprettet.' };
}

const objektSkjema = z.object({
  kundeId: uuid,
  navn: z.string().trim().min(2, 'Fyll inn navn på objektet').max(120),
  kode: z.string().trim().max(20).optional(),
  adresse: z.string().trim().max(200).optional(),
  postnummer: z.string().trim().max(10).optional(),
  poststed: z.string().trim().max(80).optional(),
  oppmote: z.string().trim().max(200).optional(),
});

export async function opprettObjekt(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const resultat = objektSkjema.safeParse({
    kundeId: data.get('kundeId'),
    navn: data.get('navn'),
    kode: data.get('kode') || undefined,
    adresse: data.get('adresse') || undefined,
    postnummer: data.get('postnummer') || undefined,
    poststed: data.get('poststed') || undefined,
    oppmote: data.get('oppmote') || undefined,
  });
  if (!resultat.success) return { feil: resultat.error.issues[0].message };

  const klient = await createClient();
  const { error } = await klient.from('sites').insert({
    company_id: bruker.profil.company_id,
    customer_id: resultat.data.kundeId,
    name: resultat.data.navn,
    code: resultat.data.kode ?? null,
    address: resultat.data.adresse ?? null,
    postal_code: resultat.data.postnummer ?? null,
    city: resultat.data.poststed ?? null,
    meeting_point: resultat.data.oppmote ?? null,
  });
  if (error) return { feil: 'Objektet kunne ikke opprettes.' };

  revalidatePath('/admin/objekter');
  return { melding: 'Objektet er opprettet.' };
}

/* =====================================================================
   Instrukser og tildeling
   ===================================================================== */

export async function opprettInstruks(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const tittel = z.string().trim().min(3, 'Fyll inn tittel').safeParse(data.get('tittel'));
  if (!tittel.success) return { feil: tittel.error.issues[0].message };

  const objektId = String(data.get('objektId') ?? '');
  const klient = await createClient();
  const { data: instruks, error } = await klient
    .from('instructions')
    .insert({
      company_id: bruker.profil.company_id,
      title: tittel.data,
      summary: String(data.get('sammendrag') ?? '') || null,
      body: String(data.get('innhold') ?? '') || null,
      site_id: uuid.safeParse(objektId).success ? objektId : null,
      requires_acknowledgement: data.get('kreverBekreftelse') === 'on',
      created_by: bruker.id,
    })
    .select('id')
    .single();

  if (error || !instruks) return { feil: 'Instruksen kunne ikke opprettes.' };

  revalidatePath('/admin/instrukser');
  redirect(`/admin/instrukser/${instruks.id}`);
}

/**
 * Tildeler en instruks. Uten en tildeling er instruksen usynlig for
 * ansatte - det finnes ingen «alle ansatte»-snarvei.
 */
export async function tildelInstruks(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const instruksId = uuid.safeParse(data.get('instruksId'));
  if (!instruksId.success) return { feil: 'Ugyldig instruks.' };

  const mal = String(data.get('mal') ?? 'ansatt');
  const verdier = data.getAll('maalId')
    .filter((v): v is string => typeof v === 'string' && uuid.safeParse(v).success);

  if (verdier.length === 0) return { feil: 'Velg minst én mottaker.' };

  const fra = String(data.get('gyldigFra') ?? '');
  const til = String(data.get('gyldigTil') ?? '');
  const rolle = String(data.get('rolleVedObjekt') ?? '');

  const rader = verdier.map((verdi) => ({
    company_id: bruker.profil.company_id,
    instruction_id: instruksId.data,
    profile_id: mal === 'ansatt' ? verdi : null,
    site_id: mal === 'objekt' ? verdi : null,
    shift_id: mal === 'vakt' ? verdi : null,
    department_id: mal === 'avdeling' ? verdi : null,
    site_role: mal === 'objekt' && rolle ? (rolle as Rolle) : null,
    valid_from: fra || new Date().toISOString().slice(0, 10),
    valid_to: til || null,
    requires_acknowledgement: data.get('kreverBekreftelse') === 'on',
    assigned_by: bruker.id,
  }));

  const klient = await createClient();
  const { error } = await klient.from('instruction_assignments').insert(rader);
  if (error) return { feil: 'Tildelingen kunne ikke lagres.' };

  if (mal === 'ansatt') {
    await klient.from('notifications').insert(verdier.map((profilId) => ({
      company_id: bruker.profil.company_id,
      profile_id: profilId,
      title: 'Ny instruks tildelt',
      body: 'Du har fått tildelt en instruks som må leses.',
      kind: 'instruks' as const,
      link: `/instrukser/${instruksId.data}`,
    })));
  }

  revalidatePath(`/admin/instrukser/${instruksId.data}`);
  return { melding: `Instruksen er tildelt ${rader.length} mottaker(e).` };
}

export async function trekkTilbakeTildeling(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  await krevRolle('administrator');
  const tildelingId = uuid.safeParse(data.get('tildelingId'));
  const instruksId = uuid.safeParse(data.get('instruksId'));
  if (!tildelingId.success) return { feil: 'Ugyldig tildeling.' };

  const klient = await createClient();
  const { error } = await klient
    .from('instruction_assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tildelingId.data);

  if (error) return { feil: 'Tildelingen kunne ikke trekkes tilbake.' };

  if (instruksId.success) revalidatePath(`/admin/instrukser/${instruksId.data}`);
  return { melding: 'Tilgangen er trukket tilbake.' };
}

/* =====================================================================
   Rapportbehandling
   ===================================================================== */

export async function behandleRapport(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const rapportId = uuid.safeParse(data.get('rapportId'));
  const status = z.enum(['innsendt', 'under_behandling', 'ferdigbehandlet'])
    .safeParse(data.get('status'));
  if (!rapportId.success || !status.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();
  const { error, data: oppdatert } = await klient
    .from('reports')
    .update({
      status: status.data as Rapportstatus,
      handler_id: bruker.id,
      handling_note: String(data.get('notat') ?? '') || null,
    })
    .eq('id', rapportId.data)
    .select('id, reporter_id');

  if (error || !oppdatert?.length) return { feil: 'Rapporten kunne ikke oppdateres.' };

  await klient.from('notifications').insert({
    company_id: bruker.profil.company_id,
    profile_id: oppdatert[0].reporter_id,
    title: 'Rapporten din er oppdatert',
    body: `Ny status: ${status.data.replace('_', ' ')}.`,
    kind: 'rapport',
    link: `/rapporter/${rapportId.data}`,
  });

  revalidatePath('/admin/rapporter');
  revalidatePath(`/admin/rapporter/${rapportId.data}`);
  return { melding: 'Rapporten er oppdatert.' };
}

/* =====================================================================
   Kurs og varslinger
   ===================================================================== */

export async function opprettKurs(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const profilId = uuid.safeParse(data.get('profilId'));
  const navn = z.string().trim().min(2, 'Fyll inn navn på kurset').safeParse(data.get('navn'));
  if (!profilId.success || !navn.success) return { feil: 'Ugyldig valg.' };

  const klient = await createClient();
  const { error } = await klient.from('qualifications').insert({
    company_id: bruker.profil.company_id,
    profile_id: profilId.data,
    name: navn.data,
    kind: (String(data.get('type') ?? 'kurs') as 'kurs' | 'godkjenning' | 'dokument'),
    issuer: String(data.get('utsteder') ?? '') || null,
    certificate_number: String(data.get('sertifikat') ?? '') || null,
    issued_on: String(data.get('utstedt') ?? '') || null,
    expires_on: String(data.get('utloper') ?? '') || null,
  });
  if (error) return { feil: 'Kurset kunne ikke registreres.' };

  revalidatePath('/admin/kurs');
  revalidatePath(`/admin/ansatte/${profilId.data}`);
  return { melding: 'Kurset er registrert.' };
}

export async function sendVarsel(
  _forrige: Adminstilstand, data: FormData,
): Promise<Adminstilstand> {
  const bruker = await krevRolle('administrator');
  const tittel = z.string().trim().min(2, 'Fyll inn tittel').safeParse(data.get('tittel'));
  if (!tittel.success) return { feil: tittel.error.issues[0].message };

  const mottakere = data.getAll('mottakerId')
    .filter((v): v is string => typeof v === 'string' && uuid.safeParse(v).success);
  if (mottakere.length === 0) return { feil: 'Velg minst én mottaker.' };

  const klient = await createClient();
  const { error } = await klient.from('notifications').insert(
    mottakere.map((profilId) => ({
      company_id: bruker.profil.company_id,
      profile_id: profilId,
      title: tittel.data,
      body: String(data.get('tekst') ?? '') || null,
      kind: 'info' as const,
    })),
  );
  if (error) return { feil: 'Varslingen kunne ikke sendes.' };

  revalidatePath('/admin/varsler');
  return { melding: `Varsling sendt til ${mottakere.length} ansatt(e).` };
}
