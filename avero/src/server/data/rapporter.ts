import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { slaOpp } from '@/server/data/felles';
import type {
  Profile, Rapportstatus, Report, ReportAttachment, Site,
} from '@/lib/database.types';

export type RapportVisning = {
  rapport: Report;
  objekt: Site | null;
  rapportor: string | null;
  vedlegg: ReportAttachment[];
};

/**
 * Rapporter brukeren har tilgang til.
 *
 * For en ansatt gir databasen bare egne rapporter, samt rapporter
 * administrator uttrykkelig har delt. Filteret her er derfor en
 * bekvemmelighet, ikke sikkerhetsmekanismen.
 */
export async function hentRapporter(valg: {
  rapportorId?: string;
  status?: Rapportstatus[];
  antall?: number;
} = {}): Promise<RapportVisning[]> {
  const klient = await createClient();

  let spørring = klient
    .from('reports')
    .select('*')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (valg.rapportorId) spørring = spørring.eq('reporter_id', valg.rapportorId);
  if (valg.status?.length) spørring = spørring.in('status', valg.status);
  if (valg.antall) spørring = spørring.limit(valg.antall);

  const { data: rapporter } = await spørring;
  const liste = rapporter ?? [];
  if (liste.length === 0) return [];

  const [objekter, rapportorer] = await Promise.all([
    slaOpp<Site>(klient, 'sites', liste.map((r) => r.site_id)),
    slaOpp<Profile>(klient, 'profiles', liste.map((r) => r.reporter_id), 'id, full_name'),
  ]);

  return liste.map((rapport) => ({
    rapport,
    objekt: rapport.site_id ? objekter.get(rapport.site_id) ?? null : null,
    rapportor: rapportorer.get(rapport.reporter_id)?.full_name ?? null,
    vedlegg: [],
  }));
}

/** En enkelt rapport. Null nar brukeren ikke har tilgang. */
export async function hentRapport(rapportId: string): Promise<RapportVisning | null> {
  const klient = await createClient();

  const { data: rapport } = await klient
    .from('reports')
    .select('*')
    .eq('id', rapportId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!rapport) return null;

  const [objekter, rapportorer, { data: vedlegg }] = await Promise.all([
    slaOpp<Site>(klient, 'sites', [rapport.site_id]),
    slaOpp<Profile>(klient, 'profiles', [rapport.reporter_id], 'id, full_name'),
    klient.from('report_attachments').select('*')
      .eq('report_id', rapportId).is('deleted_at', null),
  ]);

  return {
    rapport,
    objekt: rapport.site_id ? objekter.get(rapport.site_id) ?? null : null,
    rapportor: rapportorer.get(rapport.reporter_id)?.full_name ?? null,
    vedlegg: vedlegg ?? [],
  };
}

/** Objekter brukeren kan velge nar en rapport opprettes. */
export async function hentValgbareObjekter(): Promise<Site[]> {
  const klient = await createClient();
  const { data } = await klient
    .from('sites')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  return data ?? [];
}

/**
 * Tidsbegrenset lenke til et vedlegg.
 *
 * Filene ligger i private lagringsbøtter. Lenken lages pa serveren og
 * varer i fa minutter, slik at den ikke kan deles videre.
 */
export async function signertVedleggslenke(
  sti: string, sekunder = 300,
): Promise<string | null> {
  const klient = await createClient();
  const { data } = await klient.storage.from('rapport-vedlegg').createSignedUrl(sti, sekunder);
  return data?.signedUrl ?? null;
}
