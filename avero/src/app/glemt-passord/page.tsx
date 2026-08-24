import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { GlemtPassordSkjema } from './skjema';

export const metadata: Metadata = { title: 'Glemt passord' };

export default function GlemtPassordSide() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex justify-center"><Logo størrelse="stor" /></div>
      <h1 className="mb-2 text-center text-xl font-semibold">Glemt passord</h1>
      <p className="mb-6 text-center text-sm text-tekst-dempet">
        Skriv inn e-postadressen din, sa sender vi en lenke for a velge nytt passord.
      </p>
      <GlemtPassordSkjema />
      <Link
        href="/logg-inn"
        className="mt-6 block min-h-11 py-2 text-center text-sm font-medium text-aksent-lys hover:underline"
      >
        Tilbake til pålogging
      </Link>
    </main>
  );
}
