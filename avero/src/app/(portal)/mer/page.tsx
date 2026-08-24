import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Bell, ChevronRight, ClipboardCheck, GraduationCap, LayoutDashboard, LogOut, UserRound,
} from 'lucide-react';
import { hentBruker, erLeder } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loggUt } from '@/server/actions/auth';
import { Kort } from '@/components/ui';
import { rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Mer' };

export default async function MerSide() {
  const bruker = await hentBruker();
  if (!bruker) redirect('/logg-inn');

  const punkter = [
    { navn: 'Min profil', sti: '/profil', ikon: UserRound },
    { navn: 'Kurs og godkjenninger', sti: '/kurs', ikon: GraduationCap },
    { navn: 'Varslinger', sti: '/varsler', ikon: Bell },
    { navn: 'Ledige vakter', sti: '/ledige-vakter', ikon: ClipboardCheck },
    ...(erLeder(bruker)
      ? [{ navn: 'Administrasjonspanel', sti: '/admin', ikon: LayoutDashboard }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mer</h1>

      <Kort className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-aksent/20 text-sm font-semibold text-aksent-lys">
            {bruker.profil.first_name[0]}{bruker.profil.last_name[0]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-tekst">{bruker.profil.full_name}</p>
            <p className="truncate text-xs text-tekst-dempet">
              {bruker.profil.job_title ?? rolleNavn[bruker.profil.role]} ·{' '}
              {rolleNavn[bruker.profil.role]}
            </p>
          </div>
        </div>
      </Kort>

      <ul className="space-y-2">
        {punkter.map(({ navn, sti, ikon: Ikon }) => (
          <li key={sti}>
            <Link
              href={sti}
              className="flex min-h-14 items-center gap-3 rounded-xl bg-marine-900/80 px-4 ring-1 ring-linje/70 hover:bg-marine-800"
            >
              <Ikon className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
              <span className="flex-1 text-sm font-medium text-tekst">{navn}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
            </Link>
          </li>
        ))}
      </ul>

      <form action={loggUt}>
        <button
          type="submit"
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-kritisk/15 text-sm font-semibold text-kritisk ring-1 ring-inset ring-kritisk/30 hover:bg-kritisk/25"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          Logg ut
        </button>
      </form>

      <p className="pt-2 text-center text-xs text-tekst-svak">
        Avero Sikkerhet AS · internt arbeidsverktøy
      </p>
    </div>
  );
}
