import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentMineSoknader, hentMineVakter } from '@/server/data/vakter';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Vaktkort, Vaktrad } from '@/components/vaktkort';
import {
  addDays, addWeeks, formatDateShort, formatDuration, formatShiftTime, formatWeekLabel,
  isSameOsloDay, osloParts, osloTime, startOfWeek, toDateInputValue, weekDays,
} from '@/lib/dates';
import { tildelingsstatusNavn, vaktstatusNavn, vaktstatusTone, vakttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Mine vakter' };

function lesUke(verdi: string | undefined): Date {
  if (verdi && /^\d{4}-\d{2}-\d{2}$/.test(verdi)) {
    const [ar, maned, dag] = verdi.split('-').map(Number);
    return startOfWeek(osloTime(ar, maned, dag, 12));
  }
  return startOfWeek(new Date());
}

export default async function MineVakterSide({
  searchParams,
}: { searchParams: Promise<{ uke?: string }> }) {
  const bruker = await krevBruker();
  const { uke } = await searchParams;

  const ukestart = lesUke(uke);
  const ukeslutt = addDays(ukestart, 7);
  const iDagensUke = isSameOsloDay(ukestart, startOfWeek(new Date()));

  const [vakter, soknader] = await Promise.all([
    hentMineVakter(bruker.id, ukestart, ukeslutt),
    hentMineSoknader(bruker.id),
  ]);

  const dager = weekDays(ukestart);
  const perDag = dager.map((dag) => ({
    dag,
    vakter: vakter.filter((v) => isSameOsloDay(v.vakt.starts_at, dag)),
  }));

  const timer = vakter.reduce((sum, v) => {
    const ms = new Date(v.vakt.ends_at).getTime() - new Date(v.vakt.starts_at).getTime();
    return sum + ms / 3_600_000;
  }, 0);

  const lenke = (dato: Date) => `/vakter?uke=${toDateInputValue(dato)}`;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mine vakter</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Vaktplanen viser kun vakter som er tildelt deg.
        </p>
      </header>

      {/* Ukenavigering */}
      <Kort className="p-3">
        <div className="flex items-center gap-2">
          <Link
            href={lenke(addWeeks(ukestart, -1))}
            aria-label="Forrige uke"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marine-800 text-tekst-dempet ring-1 ring-linje hover:text-tekst"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold text-tekst">
              {formatWeekLabel(ukestart)}
            </p>
            <p className="mt-0.5 text-xs text-tekst-dempet">
              {vakter.length} vakt{vakter.length === 1 ? '' : 'er'} ·{' '}
              {String(Math.round(timer * 10) / 10).replace('.', ',')} timer
            </p>
          </div>

          <Link
            href={lenke(addWeeks(ukestart, 1))}
            aria-label="Neste uke"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marine-800 text-tekst-dempet ring-1 ring-linje hover:text-tekst"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </Link>
        </div>

        {!iDagensUke && (
          <Link
            href="/vakter"
            className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-aksent/15 text-sm font-semibold text-aksent-lys ring-1 ring-inset ring-aksent/30 hover:bg-aksent/25"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={2} />
            Gå til inneværende uke
          </Link>
        )}
      </Kort>

      {/* Ukevisning pa PC */}
      <div className="hidden lg:block">
        {vakter.length === 0 ? (
          <TomTilstand
            ikon={<CalendarDays className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen vakter denne uken"
            tekst="Du har ingen vakter tildelt i denne uken."
          />
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {perDag.map(({ dag, vakter: dagensVakter }) => {
              const erIDag = isSameOsloDay(dag, new Date());
              return (
                <div key={dag.toISOString()} className="min-w-0">
                  <div
                    className={`mb-2 rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${
                      erIDag ? 'bg-aksent/20 text-aksent-lys' : 'text-tekst-dempet'
                    }`}
                  >
                    {formatDateShort(dag)}
                  </div>
                  <div className="space-y-2">
                    {dagensVakter.map(({ vakt, objekt }) => (
                      <Link
                        key={vakt.id}
                        href={`/vakter/${vakt.id}`}
                        className="block rounded-xl bg-marine-900/80 p-2.5 ring-1 ring-linje/70 hover:bg-marine-800"
                      >
                        <p className="text-xs font-semibold text-tekst">
                          {formatShiftTime(vakt.starts_at, vakt.ends_at)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[0.7rem] text-tekst-dempet">
                          {objekt?.name}
                        </p>
                        <p className="mt-1 text-[0.65rem] text-tekst-svak">
                          {formatDuration(vakt.starts_at, vakt.ends_at)}
                        </p>
                        <Merkelapp tone={vaktstatusTone[vakt.status]} className="mt-1.5">
                          {vaktstatusNavn[vakt.status]}
                        </Merkelapp>
                      </Link>
                    ))}
                    {dagensVakter.length === 0 && (
                      <div className="rounded-xl border border-dashed border-linje/60 px-2 py-4 text-center text-[0.7rem] text-tekst-svak">
                        Fri
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Listevisning pa mobil */}
      <div className="space-y-4 lg:hidden">
        {vakter.length === 0 ? (
          <TomTilstand
            ikon={<CalendarDays className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen vakter denne uken"
            tekst="Du har ingen vakter tildelt i denne uken."
          />
        ) : (
          perDag
            .filter(({ vakter: dagensVakter }) => dagensVakter.length > 0)
            .map(({ dag, vakter: dagensVakter }) => (
              <section key={dag.toISOString()} className="space-y-2">
                <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-tekst-dempet">
                  {formatDateShort(dag)}
                  {isSameOsloDay(dag, new Date()) && (
                    <Merkelapp tone="aktiv">I dag</Merkelapp>
                  )}
                </h2>
                {dagensVakter.map((visning) => (
                  <Vaktkort
                    key={visning.vakt.id}
                    visning={visning}
                    href={`/vakter/${visning.vakt.id}`}
                    visDato={false}
                  />
                ))}
              </section>
            ))
        )}
      </div>

      {/* Egne soknader pa ledige vakter */}
      {soknader.length > 0 && (
        <Seksjon
          tittel="Mine søknader"
          beskrivelse="Ledige vakter du har søkt på."
        >
          <div className="space-y-2">
            {soknader.map((visning) => (
              <div
                key={visning.vakt.id}
                className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/70 px-3 py-2.5 ring-1 ring-linje/70"
              >
                <Clock3 className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-tekst">
                    {formatDateShort(visning.vakt.starts_at)} ·{' '}
                    {formatShiftTime(visning.vakt.starts_at, visning.vakt.ends_at)}
                  </p>
                  <p className="truncate text-xs text-tekst-dempet">
                    {visning.objekt?.name} · {vakttypeNavn[visning.vakt.shift_type]}
                  </p>
                </div>
                {visning.tildeling && (
                  <Merkelapp
                    tone={visning.tildeling.status === 'avslatt' ? 'kritisk' : 'aksent'}
                  >
                    {tildelingsstatusNavn[visning.tildeling.status]}
                  </Merkelapp>
                )}
              </div>
            ))}
          </div>
        </Seksjon>
      )}

      <p className="px-1 text-xs text-tekst-svak">
        Nattvakter som går over midnatt vises på dagen de starter, og timene beregnes
        over døgnskillet.
      </p>
    </div>
  );
}
