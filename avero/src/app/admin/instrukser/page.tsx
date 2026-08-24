import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, ScrollText } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentInstrukserAdmin, hentKunderOgObjekter } from '@/server/data/admin';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { NyInstruksSkjema } from './skjemaer';

export const metadata: Metadata = { title: 'Instrukser og tilgang' };

export default async function AdminInstrukserSide() {
  await krevRolle('administrator');
  const [instrukser, { objekter }] = await Promise.all([
    hentInstrukserAdmin(),
    hentKunderOgObjekter(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Instrukser og tilgang</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          En instruks blir først synlig når den er tildelt. Ingen instruks deles automatisk
          med alle ansatte.
        </p>
      </header>

      {instrukser.length === 0 ? (
        <TomTilstand
          ikon={<ScrollText className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen instrukser opprettet"
        />
      ) : (
        <ul className="space-y-2">
          {instrukser.map(({ instruks, objekt, tildelinger, bekreftelser }) => {
            const gjeldende = bekreftelser.filter((b) => b.version === instruks.version).length;
            return (
              <li key={instruks.id}>
                <Link
                  href={`/admin/instrukser/${instruks.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
                >
                  <ScrollText className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {instruks.title}
                    </span>
                    <span className="block truncate text-xs text-tekst-dempet">
                      {objekt ? `${objekt.name} · ` : ''}versjon {instruks.version} ·{' '}
                      {tildelinger.length} tildeling{tildelinger.length === 1 ? '' : 'er'}
                    </span>
                  </span>
                  <Merkelapp tone={tildelinger.length === 0 ? 'advarsel' : 'positiv'}>
                    {gjeldende} lest
                  </Merkelapp>
                  <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Seksjon tittel="Ny instruks">
        <Kort className="p-4 sm:p-5">
          <NyInstruksSkjema objekter={objekter} />
        </Kort>
      </Seksjon>
    </div>
  );
}
