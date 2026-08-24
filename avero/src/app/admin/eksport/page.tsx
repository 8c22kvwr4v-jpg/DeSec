import type { Metadata } from 'next';
import { Download, ShieldCheck } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { Kort } from '@/components/ui';

export const metadata: Metadata = { title: 'Eksport' };

const EKSPORTER = [
  { type: 'vakter', navn: 'Vakter', tekst: 'Turnus for de neste fire ukene.' },
  { type: 'ansatte', navn: 'Ansatte', tekst: 'Navn, rolle, kontaktopplysninger og status.' },
  { type: 'rapporter', navn: 'Rapporter', tekst: 'Alle rapporter med status og nøkkelfelter.' },
  { type: 'kurs', navn: 'Kurs og godkjenninger', tekst: 'Med utstedelses- og utløpsdato.' },
  { type: 'revisjonslogg', navn: 'Revisjonslogg', tekst: 'De siste 1000 loggførte endringene.' },
];

export default async function EksportSide() {
  await krevRolle('administrator');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Eksport</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Filene lastes ned som CSV med semikolon, klart for Excel.
        </p>
      </header>

      <ul className="space-y-2">
        {EKSPORTER.map((eksport) => (
          <li key={eksport.type}>
            <a
              href={`/admin/eksport/${eksport.type}`}
              className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
            >
              <Download className="h-5 w-5 shrink-0 text-aksent-lys" strokeWidth={1.9} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-tekst">{eksport.navn}</span>
                <span className="block text-xs text-tekst-dempet">{eksport.tekst}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Kort className="p-4">
        <p className="flex items-start gap-3 text-sm text-tekst-dempet">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-aksent-lys" strokeWidth={1.8} />
          Eksport er forbeholdt administrator. Filene inneholder personopplysninger og skal
          behandles deretter.
        </p>
      </Kort>
    </div>
  );
}
