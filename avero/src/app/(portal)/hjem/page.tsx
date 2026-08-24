import Link from 'next/link';
import type { Metadata } from 'next';
import {
  AlertTriangle, Bell, BookOpenCheck, CalendarDays, ChevronRight, FilePlus2, NotebookPen,
} from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentKommendeVakter } from '@/server/data/vakter';
import { hentMineInstrukser } from '@/server/data/instrukser';
import { hentVarsler } from '@/server/data/varsler';
import { Kort, Lenkeknapp, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Vaktkort } from '@/components/vaktkort';
import { formatDateLong, formatTime, isOngoing, isSameOsloDay, relativeTime } from '@/lib/dates';
import { rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Hjem' };

export default async function HjemSide() {
  const bruker = await krevBruker();
  const [kommende, instrukser, varsler] = await Promise.all([
    hentKommendeVakter(bruker.id, 8),
    hentMineInstrukser(bruker.id),
    hentVarsler(bruker.id, 5),
  ]);

  const na = new Date();
  const pagaende = kommende.find((v) => isOngoing(v.vakt.starts_at, v.vakt.ends_at));
  const dagens = kommende.find((v) => isSameOsloDay(v.vakt.starts_at, na));
  const neste = kommende.find((v) => new Date(v.vakt.starts_at).getTime() > na.getTime());
  const aktivVakt = pagaende ?? dagens ?? null;

  const maLeses = instrukser.filter((i) => i.mangler);
  const uleste = varsler.filter((v) => !v.read_at);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-tekst-dempet">
          {formatDateLong(na)} · {formatTime(na)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Hei, {bruker.profil.first_name}
        </h1>
        <p className="mt-0.5 text-sm text-tekst-dempet">
          {bruker.profil.job_title ?? rolleNavn[bruker.profil.role]}
          {bruker.profil.employee_number && ` · ${bruker.profil.employee_number}`}
        </p>
      </header>

      {/* Dagens eller pagaende vakt */}
      <Seksjon tittel={pagaende ? 'Vakten din nå' : 'Dagens vakt'}>
        {aktivVakt ? (
          <div className="space-y-3">
            <Vaktkort visning={aktivVakt} href={`/vakter/${aktivVakt.vakt.id}`} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Lenkeknapp
                href={`/vakter/${aktivVakt.vakt.id}/journal`}
                størrelse="stor"
                bred
              >
                <NotebookPen className="h-5 w-5" strokeWidth={2} />
                Åpne vaktjournal
              </Lenkeknapp>
              <Lenkeknapp
                href={`/rapporter/ny?vakt=${aktivVakt.vakt.id}`}
                variant="sekundær"
                størrelse="stor"
                bred
              >
                <FilePlus2 className="h-5 w-5" strokeWidth={2} />
                Ny rapport
              </Lenkeknapp>
            </div>
          </div>
        ) : (
          <TomTilstand
            ikon={<CalendarDays className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen vakt i dag"
            tekst="Du har ingen vakt registrert for i dag."
            handling={
              <Lenkeknapp href="/rapporter/ny" variant="sekundær">
                <FilePlus2 className="h-5 w-5" strokeWidth={2} />
                Opprett rapport
              </Lenkeknapp>
            }
          />
        )}
      </Seksjon>

      {/* Neste vakt */}
      {neste && neste !== aktivVakt && (
        <Seksjon
          tittel="Neste vakt"
          beskrivelse={`Starter ${relativeTime(neste.vakt.starts_at, na)}`}
        >
          <Vaktkort visning={neste} href={`/vakter/${neste.vakt.id}`} />
        </Seksjon>
      )}

      {/* Instrukser som ma leses */}
      {maLeses.length > 0 && (
        <Seksjon
          tittel="Instrukser du må lese"
          beskrivelse="Bekreft at du har lest og forstått innholdet."
        >
          <ul className="space-y-2">
            {maLeses.slice(0, 4).map(({ instruks }) => (
              <li key={instruks.id}>
                <Link
                  href={`/instrukser/${instruks.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-advarsel/25 hover:bg-marine-800"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-advarsel" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {instruks.title}
                    </span>
                    <span className="block text-xs text-tekst-dempet">
                      Versjon {instruks.version} · ikke bekreftet
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
        </Seksjon>
      )}

      {/* Varslinger */}
      <Seksjon
        tittel="Varslinger"
        handling={
          <Link href="/varsler" className="text-sm font-medium text-aksent-lys hover:underline">
            Se alle
          </Link>
        }
      >
        {varsler.length === 0 ? (
          <TomTilstand
            ikon={<Bell className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen varslinger"
          />
        ) : (
          <ul className="space-y-2">
            {varsler.slice(0, 4).map((varsel) => (
              <li key={varsel.id}>
                <Link
                  href={varsel.link ?? '/varsler'}
                  className="block rounded-xl bg-marine-900/70 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-tekst">{varsel.title}</p>
                    {!varsel.read_at && <Merkelapp tone="aksent">Ny</Merkelapp>}
                  </div>
                  {varsel.body && (
                    <p className="mt-1 line-clamp-2 text-xs text-tekst-dempet">{varsel.body}</p>
                  )}
                  <p className="mt-1.5 text-[0.7rem] text-tekst-svak">
                    {relativeTime(varsel.created_at, na)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {uleste.length > 0 && (
          <p className="text-xs text-tekst-svak">
            {uleste.length} ulest{uleste.length === 1 ? '' : 'e'} varsling
            {uleste.length === 1 ? '' : 'er'}
          </p>
        )}
      </Seksjon>

      {/* Kommende vakter */}
      <Seksjon
        tittel="Mine kommende vakter"
        handling={
          <Link href="/vakter" className="text-sm font-medium text-aksent-lys hover:underline">
            Se vaktplan
          </Link>
        }
      >
        {kommende.length === 0 ? (
          <TomTilstand
            ikon={<CalendarDays className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen kommende vakter"
            tekst="Nye vakter dukker opp her sa snart de er tildelt deg."
          />
        ) : (
          <div className="space-y-2">
            {kommende.slice(0, 4).map((visning) => (
              <Vaktkort
                key={visning.vakt.id}
                visning={visning}
                href={`/vakter/${visning.vakt.id}`}
              />
            ))}
          </div>
        )}
      </Seksjon>

      <Kort className="p-4">
        <div className="flex items-center gap-3">
          <BookOpenCheck className="h-5 w-5 shrink-0 text-aksent-lys" strokeWidth={1.8} />
          <p className="text-sm text-tekst-dempet">
            Du ser kun dine egne vakter, instrukser og rapporter. Trenger du tilgang til noe
            mer, ta kontakt med operativ leder.
          </p>
        </div>
      </Kort>
    </div>
  );
}
