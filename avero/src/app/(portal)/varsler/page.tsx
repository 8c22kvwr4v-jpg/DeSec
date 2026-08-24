import Link from 'next/link';
import type { Metadata } from 'next';
import { Bell, CheckCheck } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentVarsler } from '@/server/data/varsler';
import { markerVarslerLest } from '@/server/actions/diverse';
import { Kort, Merkelapp, TomTilstand } from '@/components/ui';
import { formatDateTime, relativeTime } from '@/lib/dates';
import { varseltypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Varslinger' };

export default async function VarslerSide() {
  const bruker = await krevBruker();
  const varsler = await hentVarsler(bruker.id);
  const uleste = varsler.filter((v) => !v.read_at).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Varslinger</h1>
          <p className="mt-1 text-sm text-tekst-dempet">
            {uleste > 0 ? `${uleste} ulest${uleste === 1 ? '' : 'e'}` : 'Alt er lest'}
          </p>
        </div>
        {uleste > 0 && (
          <form action={markerVarslerLest}>
            <button
              type="submit"
              className="flex min-h-12 items-center gap-2 rounded-xl bg-marine-700 px-4 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-600"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={2} />
              Marker alle som lest
            </button>
          </form>
        )}
      </header>

      {varsler.length === 0 ? (
        <TomTilstand
          ikon={<Bell className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen varslinger"
        />
      ) : (
        <ul className="space-y-2">
          {varsler.map((varsel) => {
            const innhold = (
              <Kort className={`p-4 ${varsel.read_at ? '' : 'ring-aksent/30'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-tekst">{varsel.title}</p>
                  {!varsel.read_at && <Merkelapp tone="aksent">Ny</Merkelapp>}
                </div>
                {varsel.body && (
                  <p className="mt-1 text-sm text-tekst-dempet">{varsel.body}</p>
                )}
                <p className="mt-2 text-xs text-tekst-svak">
                  {varseltypeNavn[varsel.kind]} · {formatDateTime(varsel.created_at)} ·{' '}
                  {relativeTime(varsel.created_at)}
                </p>
              </Kort>
            );
            return (
              <li key={varsel.id}>
                {varsel.link ? <Link href={varsel.link}>{innhold}</Link> : innhold}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
