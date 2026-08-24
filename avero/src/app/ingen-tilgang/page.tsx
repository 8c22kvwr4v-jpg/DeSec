import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { Lenkeknapp } from '@/components/ui';
import { hentBruker, startsideFor } from '@/lib/auth';

export const metadata: Metadata = { title: 'Ingen tilgang' };

export default async function IngenTilgangSide() {
  const bruker = await hentBruker();
  const startside = bruker ? startsideFor(bruker.profil.role) : '/logg-inn';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-kritisk" strokeWidth={1.6} />
      <h1 className="text-xl font-semibold">Ingen tilgang</h1>
      <p className="mt-2 text-sm text-tekst-dempet">
        Du har ikke tilgang til dette innholdet. Trenger du tilgang, ta kontakt med
        operativ leder eller administrator.
      </p>
      <Lenkeknapp href={startside} className="mt-6" størrelse="stor">
        Til startsiden
      </Lenkeknapp>
    </main>
  );
}
