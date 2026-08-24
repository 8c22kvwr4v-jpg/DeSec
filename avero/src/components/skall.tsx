import Link from 'next/link';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Bunnmeny, Sidemeny, type Menypunkt } from '@/components/navigasjon';
import { loggUt } from '@/server/actions/auth';
import { rolleNavn } from '@/lib/etiketter';
import type { AktivBruker } from '@/lib/auth';

/**
 * Rammen rundt appen: sidemeny pa PC, fast bunnmeny pa mobil.
 */
export function Skall({
  bruker, meny, merSti, varselSti, uleste = 0, children,
}: {
  bruker: AktivBruker;
  meny: Menypunkt[];
  merSti: string;
  varselSti: string;
  uleste?: number;
  children: React.ReactNode;
}) {
  const { profil } = bruker;

  return (
    <div className="min-h-dvh">
      {/* Sidemeny for PC og nettbrett */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-linje bg-natt-2/80 px-4 py-5 lg:flex">
        <Link href={merSti === '/mer' ? '/hjem' : '/admin'} className="mb-7 px-1">
          <Logo />
        </Link>

        <div className="flex-1 overflow-y-auto">
          <Sidemeny punkter={meny} />
        </div>

        <div className="mt-4 space-y-2 border-t border-linje pt-4">
          <Link
            href={merSti}
            className="flex min-h-14 items-center gap-3 rounded-xl px-3 hover:bg-marine-800"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-aksent/20 text-sm font-semibold text-aksent-lys">
              {profil.first_name[0]}{profil.last_name[0]}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-tekst">
                {profil.full_name}
              </span>
              <span className="block truncate text-xs text-tekst-svak">
                {profil.job_title ?? rolleNavn[profil.role]}
              </span>
            </span>
          </Link>
          <form action={loggUt}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-tekst-dempet hover:bg-marine-800 hover:text-tekst"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
              Logg ut
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* Topplinje pa mobil */}
        <header className="sticky top-0 z-20 border-b border-linje bg-natt/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Logo størrelse="liten" />
            <div className="flex items-center gap-1">
              <Link
                href={varselSti}
                aria-label={uleste > 0 ? `Varslinger, ${uleste} uleste` : 'Varslinger'}
                className="relative grid h-11 w-11 place-items-center rounded-xl text-tekst-dempet hover:bg-marine-800"
              >
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {uleste > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-aksent px-1 text-[0.65rem] font-bold text-white">
                    {uleste > 9 ? '9+' : uleste}
                  </span>
                )}
              </Link>
              <Link
                href={merSti}
                aria-label="Min profil og mer"
                className="grid h-11 w-11 place-items-center rounded-xl text-tekst-dempet hover:bg-marine-800"
              >
                <UserRound className="h-5 w-5" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </header>

        <main className="med-bunnmeny mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>

      <Bunnmeny punkter={meny} merSti={merSti} />
    </div>
  );
}

/** Overskrift øverst pa en side. */
export function Sidehode({
  tittel, undertittel, handling, tilbake,
}: {
  tittel: string; undertittel?: React.ReactNode;
  handling?: React.ReactNode; tilbake?: { href: string; tekst: string };
}) {
  return (
    <div className="mb-5">
      {tilbake && (
        <Link
          href={tilbake.href}
          className="mb-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-tekst-dempet hover:text-tekst"
        >
          <span aria-hidden>←</span> {tilbake.tekst}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-tekst">{tittel}</h1>
          {undertittel && (
            <div className="mt-1 text-sm text-tekst-dempet">{undertittel}</div>
          )}
        </div>
        {handling}
      </div>
    </div>
  );
}
