import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { NyttPassordSkjema } from './skjema';

export const metadata: Metadata = { title: 'Nytt passord' };

export default function NyttPassordSide() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex justify-center"><Logo størrelse="stor" /></div>
      <h1 className="mb-2 text-center text-xl font-semibold">Velg nytt passord</h1>
      <p className="mb-6 text-center text-sm text-tekst-dempet">
        Passordet ma ha minst 12 tegn.
      </p>
      <NyttPassordSkjema />
    </main>
  );
}
