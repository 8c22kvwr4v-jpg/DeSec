import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentAnsatte, hentKunderOgObjekter, hentVakterIPeriode } from '@/server/data/admin';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { NyVaktSkjema } from './skjema';
import {
  addDays, addWeeks, formatDateShort, formatShiftTime, formatWeekLabel, isSameOsloDay,
  osloTime, startOfWeek, toDateInputValue, weekDays,
} from '@/lib/dates';
import { vaktstatusNavn, vaktstatusTone, vakttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Vakter og turnus' };

function lesUke(verdi: string | undefined): Date {
  if (verdi && /^\d{4}-\d{2}-\d{2}$/.test(verdi)) {
    const [ar, maned, dag] = verdi.split('-').map(Number);
    return startOfWeek(osloTime(ar, maned, dag, 12));
  }
  return startOfWeek(new Date());
}

export default async function AdminVakterSide({
  searchParams,
}: { searchParams: Promise<{ uke?: string }> }) {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const { uke } = await searchParams;

  const ukestart = lesUke(uke);
  const [vakter, ansatte, { objekter }] = await Promise.all([
    hentVakterIPeriode(ukestart, addDays(ukestart, 7)),
    hentAnsatte(),
    hentKunderOgObjekter(),
  ]);

  const dager = weekDays(ukestart);
  const lenke = (dato: Date) => `/admin/vakter?uke=${toDateInputValue(dato)}`;
  const erAdmin = bruker.profil.role === 'administrator';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vakter og turnus</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          {erAdmin
            ? 'Opprett vakter og tildel dem til ansatte.'
            : 'Vakter innenfor ditt ansvarsområde.'}
        </p>
      </header>

      <Kort className="p-3">
        <div className="flex items-center gap-2">
          <Link href={lenke(addWeeks(ukestart, -1))} aria-label="Forrige uke"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marine-800 text-tekst-dempet ring-1 ring-linje hover:text-tekst">
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold text-tekst">
              {formatWeekLabel(ukestart)}
            </p>
            <p className="mt-0.5 text-xs text-tekst-dempet">
              {vakter.length} vakt{vakter.length === 1 ? '' : 'er'}
            </p>
          </div>
          <Link href={lenke(addWeeks(ukestart, 1))} aria-label="Neste uke"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marine-800 text-tekst-dempet ring-1 ring-linje hover:text-tekst">
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </Link>
        </div>
      </Kort>

      {vakter.length === 0 ? (
        <TomTilstand
          ikon={<CalendarDays className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen vakter denne uken"
        />
      ) : (
        <div className="space-y-4">
          {dager.map((dag) => {
            const dagensVakter = vakter.filter(
              (v) => isSameOsloDay(v.vakt.starts_at, dag),
            );
            if (dagensVakter.length === 0) return null;
            return (
              <section key={dag.toISOString()} className="space-y-2">
                <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-tekst-dempet">
                  {formatDateShort(dag)}
                  {isSameOsloDay(dag, new Date()) && <Merkelapp tone="aktiv">I dag</Merkelapp>}
                </h2>
                <ul className="space-y-2">
                  {dagensVakter.map(({ vakt, objekt, tildelinger }) => (
                    <li key={vakt.id}>
                      <Link
                        href={`/admin/vakter/${vakt.id}`}
                        className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-tekst">
                            {formatShiftTime(vakt.starts_at, vakt.ends_at)} ·{' '}
                            {objekt?.name ?? 'Objekt'}
                          </span>
                          <span className="block truncate text-xs text-tekst-dempet">
                            {vakttypeNavn[vakt.shift_type]} ·{' '}
                            {tildelinger.length > 0
                              ? tildelinger.map((t) => t.ansatt?.full_name ?? 'Ukjent').join(', ')
                              : 'Ingen tildelt'}
                          </span>
                        </span>
                        <Merkelapp tone={vaktstatusTone[vakt.status]}>
                          {vaktstatusNavn[vakt.status]}
                        </Merkelapp>
                        <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {erAdmin && (
        <Seksjon tittel="Opprett vakt">
          <NyVaktSkjema
            objekter={objekter}
            ansatte={ansatte.filter((a) => a.is_active)}
            standardStart={addDays(ukestart, 0)}
          />
        </Seksjon>
      )}
    </div>
  );
}
