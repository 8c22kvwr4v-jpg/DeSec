import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentLedigeVakter, hentMineSoknader } from '@/server/data/vakter';
import { Kort, TomTilstand } from '@/components/ui';
import { Vaktkort } from '@/components/vaktkort';
import { SoknadSkjema } from './soknad';

export const metadata: Metadata = { title: 'Ledige vakter' };

export default async function LedigeVakterSide() {
  const bruker = await krevBruker();

  if (!bruker.selskap.open_shifts_enabled) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Ledige vakter</h1>
        <TomTilstand
          ikon={<ClipboardCheck className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Funksjonen er ikke aktivert"
          tekst="Administrator har ikke slått på søking pa ledige vakter."
        />
      </div>
    );
  }

  const [ledige, soknader] = await Promise.all([
    hentLedigeVakter(),
    hentMineSoknader(bruker.id),
  ]);
  const alleredeSokt = new Set(soknader.map((s) => s.vakt.id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ledige vakter</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Vakter som er utlyst. Søknaden behandles av operativ leder.
        </p>
      </header>

      {ledige.length === 0 ? (
        <TomTilstand
          ikon={<ClipboardCheck className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen ledige vakter nå"
          tekst="Nye utlysninger dukker opp her."
        />
      ) : (
        <ul className="space-y-3">
          {ledige.map((visning) => (
            <li key={visning.vakt.id}>
              <Kort className="p-4">
                <Vaktkort visning={visning} />
                {alleredeSokt.has(visning.vakt.id) ? (
                  <p className="mt-3 text-sm text-aksent-lys">Du har søkt på denne vakten.</p>
                ) : (
                  <SoknadSkjema vaktId={visning.vakt.id} />
                )}
              </Kort>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
