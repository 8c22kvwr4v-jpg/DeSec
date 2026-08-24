import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, UserPlus, Users } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentAnsatte } from '@/server/data/admin';
import { Lenkeknapp, Merkelapp, TomTilstand } from '@/components/ui';
import { rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Ansatte' };

export default async function AnsatteSide() {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const ansatte = await hentAnsatte();
  const erAdmin = bruker.profil.role === 'administrator';

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ansatte</h1>
          <p className="mt-1 text-sm text-tekst-dempet">
            {erAdmin
              ? `${ansatte.length} brukere i selskapet`
              : 'Ansatte innenfor ditt ansvarsområde'}
          </p>
        </div>
        {erAdmin && (
          <Lenkeknapp href="/admin/ansatte/ny" størrelse="stor">
            <UserPlus className="h-5 w-5" strokeWidth={2} />
            Ny bruker
          </Lenkeknapp>
        )}
      </header>

      {ansatte.length === 0 ? (
        <TomTilstand
          ikon={<Users className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen ansatte å vise"
        />
      ) : (
        <ul className="space-y-2">
          {ansatte.map((ansatt) => (
            <li key={ansatt.id}>
              <Link
                href={`/admin/ansatte/${ansatt.id}`}
                className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aksent/15 text-xs font-semibold text-aksent-lys">
                  {ansatt.first_name[0]}{ansatt.last_name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-tekst">
                    {ansatt.full_name}
                  </span>
                  <span className="block truncate text-xs text-tekst-dempet">
                    {ansatt.job_title ?? rolleNavn[ansatt.role]}
                    {ansatt.employee_number && ` · ${ansatt.employee_number}`}
                  </span>
                </span>
                {!ansatt.is_active && <Merkelapp tone="kritisk">Deaktivert</Merkelapp>}
                <Merkelapp tone={ansatt.role === 'ansatt' ? 'nøytral' : 'aksent'}>
                  {rolleNavn[ansatt.role]}
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
