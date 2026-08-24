import type { Metadata } from 'next';
import { CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentInstruks } from '@/server/data/instrukser';
import { createClient } from '@/lib/supabase/server';
import { Etikettverdi, Kort, Lenkeknapp, Merkelapp, Seksjon } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { BekreftLestSkjema } from './bekreft';
import { formatDate, formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Instruks' };

export default async function InstruksSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevBruker();
  const visning = await hentInstruks(id, bruker.id);

  // Uten gyldig tildeling gir databasen ingen rad - heller ikke om
  // adressen skrives inn direkte.
  if (!visning) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-kritisk" strokeWidth={1.6} />
        <h1 className="text-xl font-semibold">Ingen tilgang</h1>
        <p className="mt-2 text-sm text-tekst-dempet">
          Denne instruksen er ikke tildelt deg.
        </p>
        <Lenkeknapp href="/instrukser" className="mt-6" størrelse="stor">
          Til mine instrukser
        </Lenkeknapp>
      </div>
    );
  }

  const { instruks, objekt, tildeling, bekreftelse, mangler } = visning;

  // Dokumentet ligger i en privat bøtte. Lenken er signert og kortvarig.
  let dokumentlenke: string | null = null;
  if (instruks.document_path) {
    const klient = await createClient();
    const { data } = await klient.storage
      .from('instruks-dokumenter')
      .createSignedUrl(instruks.document_path, 300);
    dokumentlenke = data?.signedUrl ?? null;
  }

  const gjelderFor = tildeling?.profile_id
    ? 'Deg personlig'
    : tildeling?.shift_id
      ? 'En bestemt vakt'
      : tildeling?.site_id
        ? `Alle med tilgang til ${objekt?.name ?? 'objektet'}${
          tildeling.site_role ? ' i din rolle' : ''}`
        : tildeling?.department_id
          ? 'Din avdeling'
          : 'Deg';

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/instrukser', tekst: 'Mine instrukser' }}
        tittel={instruks.title}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp>Versjon {instruks.version}</Merkelapp>
            {mangler
              ? <Merkelapp tone="advarsel">Må bekreftes</Merkelapp>
              : <Merkelapp tone="positiv">Bekreftet</Merkelapp>}
          </span>
        }
      />

      {instruks.summary && (
        <Kort className="p-5">
          <p className="text-sm leading-relaxed text-tekst-dempet">{instruks.summary}</p>
        </Kort>
      )}

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="Objekt">{objekt?.name ?? 'Gjelder alle objekter'}</Etikettverdi>
          <Etikettverdi etikett="Gjelder for">{gjelderFor}</Etikettverdi>
          <Etikettverdi etikett="Gyldig fra">{formatDate(instruks.valid_from)}</Etikettverdi>
          <Etikettverdi etikett="Gyldig til">
            {instruks.valid_to ? formatDate(instruks.valid_to) : 'Inntil videre'}
          </Etikettverdi>
        </dl>
      </Kort>

      {instruks.body && (
        <Seksjon tittel="Innhold">
          <Kort className="p-5">
            <div className="whitespace-pre-line text-sm leading-relaxed text-tekst">
              {instruks.body}
            </div>
          </Kort>
        </Seksjon>
      )}

      {dokumentlenke && (
        <a
          href={dokumentlenke}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-marine-700 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-600"
        >
          <FileText className="h-5 w-5" strokeWidth={2} />
          Åpne vedlagt dokument
        </a>
      )}

      <Seksjon tittel="Lesebekreftelse">
        {bekreftelse && (
          <Kort className="p-4">
            <p className="flex items-center gap-3 text-sm text-tekst-dempet">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-positiv" strokeWidth={1.9} />
              Du bekreftet versjon {bekreftelse.version}{' '}
              {formatDateTime(bekreftelse.acknowledged_at)}.
            </p>
          </Kort>
        )}

        {mangler ? (
          <>
            {bekreftelse && (
              <p className="text-sm text-advarsel">
                Instruksen er oppdatert til versjon {instruks.version}. Du må bekrefte på nytt.
              </p>
            )}
            <BekreftLestSkjema instruksId={instruks.id} />
          </>
        ) : (
          !bekreftelse && (
            <Kort className="p-4">
              <p className="text-sm text-tekst-dempet">
                Denne instruksen krever ikke lesebekreftelse.
              </p>
            </Kort>
          )
        )}
      </Seksjon>
    </div>
  );
}
