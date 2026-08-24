import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, FileText } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentRapporterAdmin } from '@/server/data/admin';
import { Merkelapp, TomTilstand } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { rapportstatusNavn, rapportstatusTone, rapporttypeKort } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Rapporter' };

const FILTRE = [
  { verdi: 'alle', navn: 'Alle' },
  { verdi: 'innsendt', navn: 'Nye' },
  { verdi: 'under_behandling', navn: 'Under behandling' },
  { verdi: 'ferdigbehandlet', navn: 'Ferdigbehandlet' },
];

export default async function AdminRapporterSide({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  await krevRolle('administrator', 'operativ_leder');
  const { status } = await searchParams;
  const valgt = status && FILTRE.some((f) => f.verdi === status) ? status : 'alle';

  const rapporter = await hentRapporterAdmin(
    valgt === 'alle' ? undefined : [valgt],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rapporter</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Avvik, hendelser, utrykning, maktbruk og skade.
        </p>
      </header>

      <div className="skjult-rullefelt -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTRE.map((filter) => (
          <Link
            key={filter.verdi}
            href={filter.verdi === 'alle'
              ? '/admin/rapporter'
              : `/admin/rapporter?status=${filter.verdi}`}
            className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-inset ${
              valgt === filter.verdi
                ? 'bg-aksent/20 text-aksent-lys ring-aksent/40'
                : 'bg-marine-900 text-tekst-dempet ring-linje hover:text-tekst'
            }`}
          >
            {filter.navn}
          </Link>
        ))}
      </div>

      {rapporter.length === 0 ? (
        <TomTilstand
          ikon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen rapporter"
        />
      ) : (
        <ul className="space-y-2">
          {rapporter.map(({ rapport, objekt, rapportor }) => (
            <li key={rapport.id}>
              <Link
                href={`/admin/rapporter/${rapport.id}`}
                className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
              >
                <FileText className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-tekst">
                    {rapport.title}
                  </span>
                  <span className="block truncate text-xs text-tekst-dempet">
                    {rapport.report_number} · {rapporttypeKort[rapport.report_type]} ·{' '}
                    {rapportor ?? 'Ukjent'}{objekt && ` · ${objekt.name}`} ·{' '}
                    {formatDateTime(rapport.occurred_at)}
                  </span>
                </span>
                <Merkelapp tone={rapportstatusTone[rapport.status]}>
                  {rapportstatusNavn[rapport.status]}
                </Merkelapp>
                <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
