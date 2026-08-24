import Link from 'next/link';
import type { Metadata } from 'next';
import {
  AlertTriangle, CalendarClock, ChevronRight, FileText, Inbox, UserX,
} from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentOversikt } from '@/server/data/admin';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import {
  formatDateShort, formatDateTime, formatShiftTime, isOngoing,
} from '@/lib/dates';
import {
  rapportstatusNavn, rapportstatusTone, rapporttypeKort, rolleNavn, vaktstatusNavn,
  vaktstatusTone,
} from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Oversikt' };

function Nøkkeltall({
  etikett, verdi, ikon, tone = 'nøytral',
}: {
  etikett: string; verdi: number | string;
  ikon: React.ReactNode; tone?: 'nøytral' | 'advarsel' | 'aksent' | 'kritisk';
}) {
  const farge = {
    nøytral: 'text-tekst',
    advarsel: 'text-advarsel',
    aksent: 'text-aksent-lys',
    kritisk: 'text-kritisk',
  }[tone];

  return (
    <Kort className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-tekst-svak">
          {etikett}
        </p>
        <span className="text-tekst-svak">{ikon}</span>
      </div>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${farge}`}>{verdi}</p>
    </Kort>
  );
}

export default async function AdminOversikt() {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const oversikt = await hentOversikt();

  const pagaende = oversikt.dagensVakter.filter(
    (v) => isOngoing(v.vakt.starts_at, v.vakt.ends_at),
  );

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Oversikt</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          {rolleNavn[bruker.profil.role]}
          {bruker.profil.role === 'operativ_leder'
            && ' · viser kun ditt ansvarsområde'}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Nøkkeltall
          etikett="Vakter i dag"
          verdi={oversikt.dagensVakter.length}
          ikon={<CalendarClock className="h-5 w-5" strokeWidth={1.8} />}
        />
        <Nøkkeltall
          etikett="Pågår nå"
          verdi={pagaende.length}
          tone="aksent"
          ikon={<CalendarClock className="h-5 w-5" strokeWidth={1.8} />}
        />
        <Nøkkeltall
          etikett="Ubemannet"
          verdi={oversikt.ubemannede.length}
          tone={oversikt.ubemannede.length > 0 ? 'advarsel' : 'nøytral'}
          ikon={<UserX className="h-5 w-5" strokeWidth={1.8} />}
        />
        <Nøkkeltall
          etikett="Til behandling"
          verdi={oversikt.tilBehandling}
          tone={oversikt.tilBehandling > 0 ? 'kritisk' : 'nøytral'}
          ikon={<Inbox className="h-5 w-5" strokeWidth={1.8} />}
        />
      </div>

      <Seksjon
        tittel="Dagens vakter"
        handling={
          <Link href="/admin/vakter" className="text-sm font-medium text-aksent-lys hover:underline">
            Se turnus
          </Link>
        }
      >
        {oversikt.dagensVakter.length === 0 ? (
          <TomTilstand
            ikon={<CalendarClock className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen vakter i dag"
          />
        ) : (
          <ul className="space-y-2">
            {oversikt.dagensVakter.slice(0, 10).map(({ vakt, objekt, tildelinger }) => (
              <li key={vakt.id}>
                <Link
                  href={`/admin/vakter/${vakt.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {objekt?.name ?? 'Objekt'} ·{' '}
                      {formatShiftTime(vakt.starts_at, vakt.ends_at)}
                    </span>
                    <span className="block truncate text-xs text-tekst-dempet">
                      {tildelinger.length > 0
                        ? tildelinger.map((t) => t.ansatt?.full_name ?? 'Ukjent').join(', ')
                        : 'Ingen tildelt'}
                    </span>
                  </span>
                  <Merkelapp
                    tone={isOngoing(vakt.starts_at, vakt.ends_at)
                      ? 'aktiv' : vaktstatusTone[vakt.status]}
                  >
                    {isOngoing(vakt.starts_at, vakt.ends_at)
                      ? 'Pågår' : vaktstatusNavn[vakt.status]}
                  </Merkelapp>
                  <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      <Seksjon
        tittel="Ubemannede og ledige vakter"
        beskrivelse="Vakter uten tildelt ansatt."
      >
        {oversikt.ubemannede.length === 0 ? (
          <TomTilstand
            ikon={<UserX className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Alle vakter er bemannet"
          />
        ) : (
          <ul className="space-y-2">
            {oversikt.ubemannede.slice(0, 10).map(({ vakt, objekt }) => (
              <li key={vakt.id}>
                <Link
                  href={`/admin/vakter/${vakt.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-advarsel/25 hover:bg-marine-800"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-advarsel" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {objekt?.name ?? 'Objekt'}
                    </span>
                    <span className="block truncate text-xs text-tekst-dempet">
                      {formatDateShort(vakt.starts_at)} ·{' '}
                      {formatShiftTime(vakt.starts_at, vakt.ends_at)}
                    </span>
                  </span>
                  <Merkelapp tone={vaktstatusTone[vakt.status]}>
                    {vaktstatusNavn[vakt.status]}
                  </Merkelapp>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      <Seksjon
        tittel="Rapporter til behandling"
        handling={
          <Link href="/admin/rapporter" className="text-sm font-medium text-aksent-lys hover:underline">
            Se alle
          </Link>
        }
      >
        {oversikt.rapporter.length === 0 ? (
          <TomTilstand
            ikon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen rapporter venter"
          />
        ) : (
          <ul className="space-y-2">
            {oversikt.rapporter.slice(0, 10).map(({ rapport, objekt, rapportor }) => (
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
                      {rapporttypeKort[rapport.report_type]} · {rapportor ?? 'Ukjent'}
                      {objekt && ` · ${objekt.name}`} ·{' '}
                      {formatDateTime(rapport.occurred_at)}
                    </span>
                  </span>
                  <Merkelapp tone={rapportstatusTone[rapport.status]}>
                    {rapportstatusNavn[rapport.status]}
                  </Merkelapp>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>
    </div>
  );
}
