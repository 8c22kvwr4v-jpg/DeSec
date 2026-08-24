import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentKvalifikasjoner } from '@/server/data/varsler';
import { Kort, Merkelapp, TomTilstand } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { kursstatus, kvalifikasjonstypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Kurs og godkjenninger' };

export default async function KursSide() {
  const bruker = await krevBruker();
  const kvalifikasjoner = await hentKvalifikasjoner(bruker.id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kurs og godkjenninger</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          Dine egne kurs, godkjenninger og dokumenter.
        </p>
      </header>

      {kvalifikasjoner.length === 0 ? (
        <TomTilstand
          ikon={<GraduationCap className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen kurs registrert"
          tekst="Ta kontakt med operativ leder om noe mangler."
        />
      ) : (
        <ul className="space-y-2">
          {kvalifikasjoner.map((kval) => {
            const status = kursstatus(kval.expires_on);
            return (
              <li key={kval.id}>
                <Kort className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-tekst">{kval.name}</p>
                      <p className="mt-0.5 text-xs text-tekst-dempet">
                        {kvalifikasjonstypeNavn[kval.kind]}
                        {kval.issuer && ` · ${kval.issuer}`}
                      </p>
                    </div>
                    <Merkelapp tone={status.tone}>{status.tekst}</Merkelapp>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-tekst-dempet">
                    {kval.issued_on && (
                      <div className="flex gap-1">
                        <dt>Utstedt:</dt>
                        <dd className="text-tekst">{formatDate(kval.issued_on)}</dd>
                      </div>
                    )}
                    {kval.expires_on && (
                      <div className="flex gap-1">
                        <dt>Utløper:</dt>
                        <dd className="text-tekst">{formatDate(kval.expires_on)}</dd>
                      </div>
                    )}
                    {kval.certificate_number && (
                      <div className="flex gap-1">
                        <dt>Sertifikat:</dt>
                        <dd className="text-tekst">{kval.certificate_number}</dd>
                      </div>
                    )}
                  </dl>
                </Kort>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
