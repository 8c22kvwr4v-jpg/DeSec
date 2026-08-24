import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { slaOpp } from '@/server/data/felles';
import type {
  AuditLog, Customer, Instruction, InstructionAcknowledgement, InstructionAssignment,
  Profile, Qualification, Report, Shift, ShiftAssignment, Site,
} from '@/lib/database.types';

/**
 * Datauttrekk for administrasjonspanelet.
 *
 * Operativ leder og administrator bruker de samme spørringene. Hvor mye
 * hver av dem faktisk far se, avgjores av RLS: lederen ser bare sitt
 * tildelte ansvarsomrade, administrator hele selskapet.
 */

export type VaktMedTildeling = {
  vakt: Shift;
  objekt: Site | null;
  tildelinger: { tildeling: ShiftAssignment; ansatt: Profile | null }[];
};

async function byggVakter(
  klient: Awaited<ReturnType<typeof createClient>>,
  vakter: Shift[],
): Promise<VaktMedTildeling[]> {
  if (vakter.length === 0) return [];

  const { data: tildelinger } = await klient
    .from('shift_assignments')
    .select('*')
    .in('shift_id', vakter.map((v) => v.id))
    .is('deleted_at', null);

  const [objekter, ansatte] = await Promise.all([
    slaOpp<Site>(klient, 'sites', vakter.map((v) => v.site_id)),
    slaOpp<Profile>(
      klient, 'profiles', (tildelinger ?? []).map((t) => t.employee_id),
      'id, full_name, first_name, last_name, job_title, employee_number, role, company_id, email, is_active',
    ),
  ]);

  return vakter.map((vakt) => ({
    vakt,
    objekt: objekter.get(vakt.site_id) ?? null,
    tildelinger: (tildelinger ?? [])
      .filter((t) => t.shift_id === vakt.id)
      .map((tildeling) => ({
        tildeling,
        ansatt: ansatte.get(tildeling.employee_id) ?? null,
      })),
  }));
}

export async function hentVakterIPeriode(
  fra: Date, til: Date,
): Promise<VaktMedTildeling[]> {
  const klient = await createClient();
  const { data: vakter } = await klient
    .from('shifts')
    .select('*')
    .is('deleted_at', null)
    .gte('starts_at', fra.toISOString())
    .lt('starts_at', til.toISOString())
    .order('starts_at', { ascending: true });

  return byggVakter(klient, vakter ?? []);
}

export async function hentVaktAdmin(vaktId: string): Promise<VaktMedTildeling | null> {
  const klient = await createClient();
  const { data: vakt } = await klient
    .from('shifts').select('*').eq('id', vaktId).maybeSingle();
  if (!vakt) return null;
  const [visning] = await byggVakter(klient, [vakt]);
  return visning ?? null;
}

/** Tall og lister til oversiktssiden. */
export async function hentOversikt() {
  const klient = await createClient();
  const na = new Date();
  const startIDag = new Date(na.getTime() - 12 * 3600_000);
  const sluttIDag = new Date(na.getTime() + 24 * 3600_000);

  const [dagens, { data: ubemannede }, { data: rapporter }] = await Promise.all([
    hentVakterIPeriode(startIDag, sluttIDag),
    klient.from('shifts').select('*')
      .in('status', ['planlagt', 'ledig'])
      .is('deleted_at', null)
      .gte('starts_at', na.toISOString())
      .order('starts_at', { ascending: true })
      .limit(25),
    klient.from('reports').select('*')
      .is('deleted_at', null)
      .in('status', ['innsendt', 'under_behandling'])
      .order('submitted_at', { ascending: false })
      .limit(25),
  ]);

  const ubemannedeMedObjekt = await byggVakter(klient, ubemannede ?? []);
  const liste = rapporter ?? [];
  const objekter = await slaOpp<Site>(klient, 'sites', liste.map((r) => r.site_id));
  const rapportorer = await slaOpp<Profile>(
    klient, 'profiles', liste.map((r) => r.reporter_id), 'id, full_name',
  );

  return {
    dagensVakter: dagens.filter((v) =>
      new Date(v.vakt.ends_at).getTime() >= na.getTime()
      && new Date(v.vakt.starts_at).getTime() <= sluttIDag.getTime()),
    ubemannede: ubemannedeMedObjekt,
    rapporter: liste.map((rapport) => ({
      rapport,
      objekt: rapport.site_id ? objekter.get(rapport.site_id) ?? null : null,
      rapportor: rapportorer.get(rapport.reporter_id)?.full_name ?? null,
    })),
    nyeAvvik: liste.filter((r) => r.report_type === 'avvik' && r.status === 'innsendt').length,
    tilBehandling: liste.filter((r) => r.status === 'innsendt').length,
  };
}

export async function hentAnsatte(): Promise<Profile[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('profiles').select('*').is('deleted_at', null).order('last_name');
  return data ?? [];
}

export async function hentAnsatt(profilId: string) {
  const klient = await createClient();
  const { data: profil } = await klient
    .from('profiles').select('*').eq('id', profilId).maybeSingle();
  if (!profil) return null;

  const [{ data: tilganger }, { data: kurs }, { data: objekter }, { data: avdelinger }] =
    await Promise.all([
      klient.from('employee_site_access').select('*')
        .eq('profile_id', profilId).is('deleted_at', null),
      klient.from('qualifications').select('*')
        .eq('profile_id', profilId).is('deleted_at', null)
        .order('expires_on', { ascending: true, nullsFirst: false }),
      klient.from('sites').select('*').is('deleted_at', null).order('name'),
      klient.from('departments').select('*').is('deleted_at', null).order('name'),
    ]);

  return {
    profil,
    tilganger: tilganger ?? [],
    kurs: (kurs ?? []) as Qualification[],
    objekter: (objekter ?? []) as Site[],
    avdelinger: avdelinger ?? [],
  };
}

export async function hentKunderOgObjekter(): Promise<{
  kunder: Customer[]; objekter: Site[];
}> {
  const klient = await createClient();
  const [{ data: kunder }, { data: objekter }] = await Promise.all([
    klient.from('customers').select('*').is('deleted_at', null).order('name'),
    klient.from('sites').select('*').is('deleted_at', null).order('name'),
  ]);
  return { kunder: kunder ?? [], objekter: objekter ?? [] };
}

export type InstruksAdmin = {
  instruks: Instruction;
  objekt: Site | null;
  tildelinger: (InstructionAssignment & { mottaker: string })[];
  bekreftelser: (InstructionAcknowledgement & { navn: string })[];
};

export async function hentInstrukserAdmin(): Promise<InstruksAdmin[]> {
  const klient = await createClient();
  const { data: instrukser } = await klient
    .from('instructions').select('*').is('deleted_at', null).order('title');
  const liste = instrukser ?? [];
  if (liste.length === 0) return [];

  const [{ data: tildelinger }, { data: bekreftelser }, objekter] = await Promise.all([
    klient.from('instruction_assignments').select('*')
      .in('instruction_id', liste.map((i) => i.id)).is('deleted_at', null),
    klient.from('instruction_acknowledgements').select('*')
      .in('instruction_id', liste.map((i) => i.id)),
    slaOpp<Site>(klient, 'sites', liste.map((i) => i.site_id)),
  ]);

  const profilIder = [
    ...(tildelinger ?? []).map((t) => t.profile_id),
    ...(bekreftelser ?? []).map((b) => b.profile_id),
  ];
  const [profiler, avdelinger] = await Promise.all([
    slaOpp<Profile>(klient, 'profiles', profilIder, 'id, full_name'),
    slaOpp<{ id: string; name: string }>(klient, 'departments',
      (tildelinger ?? []).map((t) => t.department_id), 'id, name'),
  ]);
  const alleObjekter = await slaOpp<Site>(
    klient, 'sites', (tildelinger ?? []).map((t) => t.site_id), 'id, name',
  );

  function beskrivMottaker(tildeling: InstructionAssignment): string {
    if (tildeling.profile_id) {
      return profiler.get(tildeling.profile_id)?.full_name ?? 'Ansatt';
    }
    if (tildeling.department_id) {
      return `Avdeling: ${avdelinger.get(tildeling.department_id)?.name ?? 'ukjent'}`;
    }
    if (tildeling.site_id) {
      const navn = alleObjekter.get(tildeling.site_id)?.name ?? 'objekt';
      return tildeling.site_role
        ? `${navn} (rolle: ${tildeling.site_role})`
        : `Alle ved ${navn}`;
    }
    if (tildeling.shift_id) return 'En bestemt vakt';
    return 'Ukjent';
  }

  return liste.map((instruks) => ({
    instruks,
    objekt: instruks.site_id ? objekter.get(instruks.site_id) ?? null : null,
    tildelinger: (tildelinger ?? [])
      .filter((t) => t.instruction_id === instruks.id)
      .map((t) => ({ ...t, mottaker: beskrivMottaker(t) })),
    bekreftelser: (bekreftelser ?? [])
      .filter((b) => b.instruction_id === instruks.id)
      .map((b) => ({ ...b, navn: profiler.get(b.profile_id)?.full_name ?? 'Ukjent' })),
  }));
}

export async function hentRapporterAdmin(status?: string[]): Promise<{
  rapport: Report; objekt: Site | null; rapportor: string | null;
}[]> {
  const klient = await createClient();
  let spørring = klient.from('reports').select('*').is('deleted_at', null)
    .order('occurred_at', { ascending: false }).limit(200);
  if (status?.length) {
    spørring = spørring.in('status', status as Report['status'][]);
  }

  const { data } = await spørring;
  const liste = data ?? [];
  if (liste.length === 0) return [];

  const [objekter, rapportorer] = await Promise.all([
    slaOpp<Site>(klient, 'sites', liste.map((r) => r.site_id)),
    slaOpp<Profile>(klient, 'profiles', liste.map((r) => r.reporter_id), 'id, full_name'),
  ]);

  return liste.map((rapport) => ({
    rapport,
    objekt: rapport.site_id ? objekter.get(rapport.site_id) ?? null : null,
    rapportor: rapportorer.get(rapport.reporter_id)?.full_name ?? null,
  }));
}

export async function hentKursAdmin(): Promise<{
  kurs: Qualification; ansatt: string;
}[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('qualifications').select('*').is('deleted_at', null)
    .order('expires_on', { ascending: true, nullsFirst: false });
  const liste = data ?? [];
  const profiler = await slaOpp<Profile>(
    klient, 'profiles', liste.map((k) => k.profile_id), 'id, full_name',
  );
  return liste.map((kurs) => ({
    kurs, ansatt: profiler.get(kurs.profile_id)?.full_name ?? 'Ukjent',
  }));
}

export async function hentRevisjonslogg(antall = 100): Promise<{
  logg: AuditLog; aktor: string;
}[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('audit_logs').select('*').order('created_at', { ascending: false }).limit(antall);
  const liste = data ?? [];
  const profiler = await slaOpp<Profile>(
    klient, 'profiles', liste.map((l) => l.actor_id), 'id, full_name',
  );
  return liste.map((logg) => ({
    logg,
    aktor: logg.actor_id ? profiler.get(logg.actor_id)?.full_name ?? 'Ukjent' : 'System',
  }));
}
