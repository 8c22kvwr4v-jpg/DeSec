import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, Home, LogOut } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { adminMeny } from '@/components/navigasjon';
import { loggUt } from '@/server/actions/auth';
import { Kort } from '@/components/ui';
import { rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Mer' };

export default async function AdminMerSide() {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const kunAdministrator = [
    '/admin/instrukser', '/admin/varsler', '/admin/revisjonslogg', '/admin/eksport',
  ];
  const punkter = bruker.profil.role === 'administrator'
    ? adminMeny
    : adminMeny.filter((p) => !kunAdministrator.includes(p.sti));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mer</h1>

      <Kort className="p-4">
        <p className="text-sm font-medium text-tekst">{bruker.profil.full_name}</p>
        <p className="text-xs text-tekst-dempet">{rolleNavn[bruker.profil.role]}</p>
      </Kort>

      <ul className="space-y-2">
        {[...punkter, { navn: 'Min egen ansattflate', sti: '/hjem', ikon: Home }]
          .map(({ navn, sti, ikon: Ikon }) => (
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
    </div>
  );
}
