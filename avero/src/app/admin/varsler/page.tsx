import type { Metadata } from 'next';
import { krevRolle } from '@/lib/auth';
import { hentAnsatte } from '@/server/data/admin';
import { Kort, Seksjon } from '@/components/ui';
import { VarselSkjema } from './skjema';

export const metadata: Metadata = { title: 'Varslinger' };

export default async function AdminVarslerSide() {
  await krevRolle('administrator');
  const ansatte = await hentAnsatte();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Varslinger</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Send beskjed til utvalgte ansatte. Varslingen vises på startsiden deres.
        </p>
      </header>

      <Seksjon tittel="Ny varsling">
        <Kort className="p-4 sm:p-5">
          <VarselSkjema ansatte={ansatte.filter((a) => a.is_active)} />
        </Kort>
      </Seksjon>
    </div>
  );
}
