import type { Metadata } from 'next';
import { History } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentRevisjonslogg } from '@/server/data/admin';
import { Kort, Merkelapp, TomTilstand } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Revisjonslogg' };

const handlingNavn: Record<string, string> = {
  insert: 'Opprettet',
  update: 'Endret',
  delete: 'Slettet',
};

const tabellNavn: Record<string, string> = {
  profiles: 'Ansatt',
  shifts: 'Vakt',
  shift_assignments: 'Vakttildeling',
  employee_site_access: 'Objekttilgang',
  instructions: 'Instruks',
  instruction_assignments: 'Instrukstildeling',
  instruction_acknowledgements: 'Lesebekreftelse',
  reports: 'Rapport',
  qualifications: 'Kurs',
  site_contacts: 'Kontaktperson',
  manager_scopes: 'Ansvarsområde',
  report_shares: 'Rapportdeling',
};

export default async function RevisjonsloggSide() {
  await krevRolle('administrator');
  const logg = await hentRevisjonslogg(150);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Revisjonslogg</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Endringer i sensitive opplysninger loggføres automatisk av databasen.
        </p>
      </header>

      {logg.length === 0 ? (
        <TomTilstand
          ikon={<History className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen loggførte endringer"
        />
      ) : (
        <ul className="space-y-2">
          {logg.map(({ logg: rad, aktor }) => (
            <li key={rad.id}>
              <Kort className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <Merkelapp
                  tone={rad.action === 'delete' ? 'kritisk'
                    : rad.action === 'insert' ? 'positiv' : 'nøytral'}
                >
                  {handlingNavn[rad.action] ?? rad.action}
                </Merkelapp>
                <span className="text-sm text-tekst">
                  {tabellNavn[rad.table_name] ?? rad.table_name}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-tekst-dempet">
                  {aktor}
                </span>
                <span className="text-xs text-tekst-svak">
                  {formatDateTime(rad.created_at)}
                </span>
              </Kort>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
