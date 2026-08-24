import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { slaOpp } from '@/server/data/felles';
import type {
  Customer, Shift, ShiftAssignment, Site, Tildelingsstatus,
} from '@/lib/database.types';

export type VaktVisning = {
  vakt: Shift;
  objekt: Site | null;
  kunde: Customer | null;
  tildeling: ShiftAssignment | null;
};

const AKTIVE_TILDELINGER: Tildelingsstatus[] = ['tildelt', 'godkjent'];

async function byggVisning(
  klient: Awaited<ReturnType<typeof createClient>>,
  vakter: Shift[],
  tildelinger: Map<string, ShiftAssignment>,
): Promise<VaktVisning[]> {
  const objekter = await slaOpp<Site>(klient, 'sites', vakter.map((v) => v.site_id));
  const kunder = await slaOpp<Customer>(
    klient, 'customers', [...objekter.values()].map((o) => o.customer_id),
  );

  return vakter.map((vakt) => {
    const objekt = objekter.get(vakt.site_id) ?? null;
    return {
      vakt,
      objekt,
      kunde: objekt ? kunder.get(objekt.customer_id) ?? null : null,
      tildeling: tildelinger.get(vakt.id) ?? null,
    };
  });
}

/**
 * Vaktene til den innloggede ansatte innenfor et tidsrom.
 *
 * Spørringen tar utgangspunkt i brukerens egne tildelinger. RLS sørger i
 * tillegg for at ingen andres tildelinger kan leses, sa dette gir aldri
 * treff pa andre ansatte - heller ikke ved feil i klientkoden.
 */
export async function hentMineVakter(
  brukerId: string, fra: Date, til: Date,
): Promise<VaktVisning[]> {
  const klient = await createClient();

  const { data: tildelinger } = await klient
    .from('shift_assignments')
    .select('*')
    .eq('employee_id', brukerId)
    .in('status', AKTIVE_TILDELINGER)
    .is('deleted_at', null);

  const kart = new Map((tildelinger ?? []).map((t) => [t.shift_id, t]));
  if (kart.size === 0) return [];

  const { data: vakter } = await klient
    .from('shifts')
    .select('*')
    .in('id', [...kart.keys()])
    .is('deleted_at', null)
    .gte('starts_at', fra.toISOString())
    .lt('starts_at', til.toISOString())
    .order('starts_at', { ascending: true });

  return byggVisning(klient, vakter ?? [], kart);
}

/** Neste og pagaende vakter for startsiden. */
export async function hentKommendeVakter(
  brukerId: string, antall = 5,
): Promise<VaktVisning[]> {
  const klient = await createClient();
  const na = new Date();

  const { data: tildelinger } = await klient
    .from('shift_assignments')
    .select('*')
    .eq('employee_id', brukerId)
    .in('status', AKTIVE_TILDELINGER)
    .is('deleted_at', null);

  const kart = new Map((tildelinger ?? []).map((t) => [t.shift_id, t]));
  if (kart.size === 0) return [];

  const { data: vakter } = await klient
    .from('shifts')
    .select('*')
    .in('id', [...kart.keys()])
    .is('deleted_at', null)
    .neq('status', 'avlyst')
    // Vakter som pagar na har sluttidspunkt frem i tid.
    .gte('ends_at', na.toISOString())
    .order('starts_at', { ascending: true })
    .limit(antall);

  return byggVisning(klient, vakter ?? [], kart);
}

/**
 * En enkelt vakt. Returnerer null nar vakten ikke tilhorer brukeren -
 * databasen leverer da ingen rad, uansett hvilken id som forsokes.
 */
export async function hentVakt(vaktId: string): Promise<VaktVisning | null> {
  const klient = await createClient();

  const { data: vakt } = await klient
    .from('shifts')
    .select('*')
    .eq('id', vaktId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!vakt) return null;

  const { data: tildeling } = await klient
    .from('shift_assignments')
    .select('*')
    .eq('shift_id', vaktId)
    .is('deleted_at', null)
    .maybeSingle();

  const kart = new Map(tildeling ? [[tildeling.shift_id, tildeling]] : []);
  const [visning] = await byggVisning(klient, [vakt], kart);
  return visning ?? null;
}

/** Ledige vakter, dersom funksjonen er aktivert for selskapet. */
export async function hentLedigeVakter(): Promise<VaktVisning[]> {
  const klient = await createClient();

  const { data: vakter } = await klient
    .from('shifts')
    .select('*')
    .eq('status', 'ledig')
    .is('deleted_at', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  return byggVisning(klient, vakter ?? [], new Map());
}

/** Egne soknader pa ledige vakter. */
export async function hentMineSoknader(brukerId: string): Promise<VaktVisning[]> {
  const klient = await createClient();

  const { data: soknader } = await klient
    .from('shift_assignments')
    .select('*')
    .eq('employee_id', brukerId)
    .in('status', ['soknad', 'avslatt'])
    .is('deleted_at', null);

  const kart = new Map((soknader ?? []).map((s) => [s.shift_id, s]));
  if (kart.size === 0) return [];

  const { data: vakter } = await klient
    .from('shifts')
    .select('*')
    .in('id', [...kart.keys()])
    .order('starts_at', { ascending: true });

  return byggVisning(klient, vakter ?? [], kart);
}

/** Kontaktpersoner administrator har gjort synlige for ansatte. */
export async function hentSynligeKontakter(objektId: string) {
  const klient = await createClient();
  const { data } = await klient
    .from('site_contacts')
    .select('*')
    .eq('site_id', objektId)
    .is('deleted_at', null)
    .order('name');
  return data ?? [];
}
