import type { Metadata } from 'next';
import { FileText, GraduationCap } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentKvalifikasjoner, signertKursdokument } from '@/server/data/varsler';
import { Kort, Merkelapp, TomTilstand } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { kursstatus, kvalifikasjonstypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Kurs og godkjenninger' };

export default async function KursSide() {
  const bruker = await krevBruker();
  const kvalifikasjoner = await Promise.all(
    (await hentKvalifikasjoner(bruker.id)).map(async (kval) => ({
      ...kval,
      lenke: kval.document_path ? await signertKursdokument(kval.document_path) : null,
    })),
  );

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
                  {kval.lenke && (
                    <a
                      href={kval.lenke}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marine-700 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-600"
                    >
                      <FileText className="h-4 w-4" strokeWidth={2} />
                      Åpne dokument
                    </a>
                  )}
                </Kort>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
