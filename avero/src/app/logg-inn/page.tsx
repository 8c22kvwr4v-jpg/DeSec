import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { PaloggingSkjema } from './skjema';

export const metadata: Metadata = { title: 'Logg inn' };

export default async function PaloggingSide({
  searchParams,
}: { searchParams: Promise<{ retur?: string; feil?: string }> }) {
  const { retur, feil } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Logo størrelse="stor" />
        <p className="text-sm text-tekst-dempet">
          Internt arbeidsverktøy for ansatte og ledelse
        </p>
      </div>

      <PaloggingSkjema
        retur={retur}
        startfeil={feil === 'lenke' ? 'Lenken er utløpt eller allerede brukt.' : undefined}
      />

      <div className="mt-6 space-y-3 text-center">
        <Link
          href="/glemt-passord"
          className="inline-block min-h-11 px-3 py-2 text-sm font-medium text-aksent-lys hover:underline"
        >
          Glemt passord?
        </Link>
        <p className="flex items-center justify-center gap-2 text-xs text-tekst-svak">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
          Sikret med tilgangsstyring per bruker
        </p>
      </div>
    </main>
  );
}
