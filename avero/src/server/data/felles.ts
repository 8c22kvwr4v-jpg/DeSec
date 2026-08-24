import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Klient = Awaited<ReturnType<typeof createClient>>;

/**
 * Henter rader etter id og legger dem i et oppslag.
 *
 * Datalaget kobler tabeller sammen med egne spørringer i stedet for a
 * bruke innebygde relasjonsuttrekk. Det gir forutsigbare spørringer, og
 * hver enkelt spørring gar uansett gjennom Row Level Security - rader
 * brukeren ikke har tilgang til kommer rett og slett ikke med.
 */
export async function slaOpp<T extends { id: string }>(
  klient: Klient,
  tabell: 'sites' | 'customers' | 'profiles' | 'shifts' | 'instructions' | 'departments'
    | 'journals' | 'reports',
  ider: (string | null | undefined)[],
  kolonner = '*',
): Promise<Map<string, T>> {
  const unike = [...new Set(ider.filter((id): id is string => Boolean(id)))];
  if (unike.length === 0) return new Map();

  const { data } = await klient.from(tabell).select(kolonner).in('id', unike);
  const oppslag = new Map<string, T>();
  for (const rad of (data ?? []) as unknown as T[]) {
    oppslag.set(rad.id, rad);
  }
  return oppslag;
}

/** Kort adresselinje: «Kanalveien 12, 5068 Bergen». */
export function adresselinje(objekt: {
  address?: string | null; postal_code?: string | null; city?: string | null;
} | null | undefined): string | null {
  if (!objekt) return null;
  const deler = [objekt.address, [objekt.postal_code, objekt.city].filter(Boolean).join(' ')]
    .filter((d) => d && d.trim().length > 0);
  return deler.length ? deler.join(', ') : null;
}

/** Lenke til kart, uavhengig av plattform. */
export function kartlenke(objekt: {
  map_url?: string | null; address?: string | null;
  postal_code?: string | null; city?: string | null; name?: string;
} | null | undefined): string | null {
  if (!objekt) return null;
  if (objekt.map_url) return objekt.map_url;
  const adresse = adresselinje(objekt);
  if (!adresse) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}
