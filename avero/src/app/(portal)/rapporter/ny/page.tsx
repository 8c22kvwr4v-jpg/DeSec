import type { Metadata } from 'next';
import { krevBruker } from '@/lib/auth';
import { hentValgbareObjekter } from '@/server/data/rapporter';
import { Rapportskjema } from '@/components/rapportskjema';
import { Sidehode } from '@/components/skall';

export const metadata: Metadata = { title: 'Ny rapport' };

export default async function NyRapportSide({
  searchParams,
}: { searchParams: Promise<{ vakt?: string; objekt?: string }> }) {
  const bruker = await krevBruker();
  const { vakt, objekt } = await searchParams;
  const objekter = await hentValgbareObjekter();

  return (
    <div className="space-y-5">
      <Sidehode
        tilbake={{ href: '/rapporter', tekst: 'Rapporter' }}
        tittel="Ny rapport"
        undertittel="Rapporten lagres først som utkast. Du kan fylle ut resten før du sender inn."
      />
      <Rapportskjema
        objekter={objekter}
        vaktId={vakt}
        objektId={objekt}
        selskapId={bruker.profil.company_id}
      />
    </div>
  );
}
