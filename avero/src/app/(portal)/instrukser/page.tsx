import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, ClipboardList, FileCheck2 } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentMineInstrukser } from '@/server/data/instrukser';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { formatDate } from '@/lib/dates';

export const metadata: Metadata = { title: 'Mine instrukser' };

export default async function InstrukserSide() {
  const bruker = await krevBruker();
  const instrukser = await hentMineInstrukser(bruker.id);

  const maLeses = instrukser.filter((i) => i.mangler);
  const bekreftet = instrukser.filter((i) => !i.mangler);

  function rad({ instruks, objekt, mangler, bekreftelse }: (typeof instrukser)[number]) {
    return (
      <li key={instruks.id}>
        <Link
          href={`/instrukser/${instruks.id}`}
          className={`flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 hover:bg-marine-800 ${
            mangler ? 'ring-advarsel/30' : 'ring-linje/70'
          }`}
        >
          <ClipboardList className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-tekst">
              {instruks.title}
            </span>
            <span className="block truncate text-xs text-tekst-dempet">
              {objekt ? `${objekt.name} · ` : ''}Versjon {instruks.version}
              {bekreftelse && ` · bekreftet ${formatDate(bekreftelse.acknowledged_at)}`}
            </span>
          </span>
          {mangler
            ? <Merkelapp tone="advarsel">Må leses</Merkelapp>
            : <Merkelapp tone="positiv">Bekreftet</Merkelapp>}
          <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
        </Link>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mine instrukser</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Her ser du kun instrukser du har fått tildelt.
        </p>
      </header>

      {instrukser.length === 0 && (
        <TomTilstand
          ikon={<ClipboardList className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen instrukser tildelt"
          tekst="Når administrator tildeler deg en instruks, dukker den opp her."
        />
      )}

      {maLeses.length > 0 && (
        <Seksjon
          tittel="Må leses"
          beskrivelse="Bekreft at du har lest og forstått innholdet."
        >
          <ul className="space-y-2">{maLeses.map(rad)}</ul>
        </Seksjon>
      )}

      {bekreftet.length > 0 && (
        <Seksjon tittel="Bekreftet">
          <ul className="space-y-2">{bekreftet.map(rad)}</ul>
        </Seksjon>
      )}

      {instrukser.length > 0 && (
        <Kort className="p-4">
          <p className="flex items-start gap-3 text-sm text-tekst-dempet">
            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-aksent-lys" strokeWidth={1.8} />
            Kommer det en ny versjon av en instruks, må den bekreftes på nytt. Da flyttes
            den tilbake til «Må leses».
          </p>
        </Kort>
      )}
    </div>
  );
}
