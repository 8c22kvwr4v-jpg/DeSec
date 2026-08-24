import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, FilePlus2, FileText } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentRapporter } from '@/server/data/rapporter';
import { Lenkeknapp, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { rapportstatusNavn, rapportstatusTone, rapporttypeKort } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Rapporter' };

export default async function RapporterSide() {
  const bruker = await krevBruker();
  const rapporter = await hentRapporter({ rapportorId: bruker.id });

  const utkast = rapporter.filter((r) => r.rapport.status === 'utkast');
  const innsendte = rapporter.filter((r) => r.rapport.status !== 'utkast');

  function rad({ rapport, objekt }: (typeof rapporter)[number]) {
    return (
      <li key={rapport.id}>
        <Link
          href={`/rapporter/${rapport.id}`}
          className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
        >
          <FileText className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-tekst">
              {rapport.title}
            </span>
            <span className="block truncate text-xs text-tekst-dempet">
              {rapporttypeKort[rapport.report_type]} · {formatDateTime(rapport.occurred_at)}
              {objekt && ` · ${objekt.name}`}
            </span>
          </span>
          <Merkelapp tone={rapportstatusTone[rapport.status]}>
            {rapportstatusNavn[rapport.status]}
          </Merkelapp>
          <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
        </Link>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapporter</h1>
          <p className="mt-1 text-sm text-tekst-dempet">
            Du ser kun rapporter du selv har opprettet.
          </p>
        </div>
        <Lenkeknapp href="/rapporter/ny" størrelse="stor">
          <FilePlus2 className="h-5 w-5" strokeWidth={2} />
          Ny rapport
        </Lenkeknapp>
      </header>

      {rapporter.length === 0 && (
        <TomTilstand
          ikon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen rapporter ennå"
          tekst="Opprett en rapport ved avvik, hendelser, utrykning, skade eller maktbruk."
          handling={
            <Lenkeknapp href="/rapporter/ny" størrelse="stor">
              <FilePlus2 className="h-5 w-5" strokeWidth={2} />
              Ny rapport
            </Lenkeknapp>
          }
        />
      )}

      {utkast.length > 0 && (
        <Seksjon tittel="Utkast" beskrivelse="Utkast kan redigeres frem til innsending.">
          <ul className="space-y-2">{utkast.map(rad)}</ul>
        </Seksjon>
      )}

      {innsendte.length > 0 && (
        <Seksjon tittel="Innsendte rapporter">
          <ul className="space-y-2">{innsendte.map(rad)}</ul>
        </Seksjon>
      )}
    </div>
  );
}
