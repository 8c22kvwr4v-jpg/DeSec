import type { Metadata } from 'next';
import { FileText, ImageIcon, Lock, ShieldAlert } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentRapport, hentValgbareObjekter, signertVedleggslenke } from '@/server/data/rapporter';
import { Etikettverdi, Kort, Lenkeknapp, Merkelapp, Seksjon } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { Rapportskjema, SendInnSkjema } from '@/components/rapportskjema';
import { formatDateTime } from '@/lib/dates';
import { rapportstatusNavn, rapportstatusTone, rapporttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Rapport' };

export default async function RapportSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevBruker();
  const visning = await hentRapport(id);

  if (!visning) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-kritisk" strokeWidth={1.6} />
        <h1 className="text-xl font-semibold">Ingen tilgang</h1>
        <p className="mt-2 text-sm text-tekst-dempet">
          Du har ikke tilgang til denne rapporten.
        </p>
        <Lenkeknapp href="/rapporter" className="mt-6" størrelse="stor">Til rapporter</Lenkeknapp>
      </div>
    );
  }

  const { rapport, objekt, rapportor, vedlegg } = visning;
  const eget = rapport.reporter_id === bruker.id;
  const kanRedigere = eget && rapport.status === 'utkast';

  const objekter = kanRedigere ? await hentValgbareObjekter() : [];
  const vedleggMedLenke = await Promise.all(
    vedlegg.map(async (v) => ({ ...v, lenke: await signertVedleggslenke(v.storage_path) })),
  );

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/rapporter', tekst: 'Rapporter' }}
        tittel={rapport.title}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp tone={rapportstatusTone[rapport.status]}>
              {rapportstatusNavn[rapport.status]}
            </Merkelapp>
            <Merkelapp>{rapporttypeNavn[rapport.report_type]}</Merkelapp>
            <span className="text-xs text-tekst-svak">{rapport.report_number}</span>
          </span>
        }
      />

      {kanRedigere ? (
        <>
          <Rapportskjema
            objekter={objekter}
            rapport={rapport}
            mappe={`${rapport.company_id}/${rapport.id}`}
            selskapId={rapport.company_id}
          />
          <Seksjon tittel="Send inn">
            <Kort className="p-4 sm:p-5">
              <SendInnSkjema rapportId={rapport.id} />
            </Kort>
          </Seksjon>
        </>
      ) : (
        <>
          <Kort className="p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Etikettverdi etikett="Rapportnummer">{rapport.report_number}</Etikettverdi>
              <Etikettverdi etikett="Dato og klokkeslett">
                {formatDateTime(rapport.occurred_at)}
              </Etikettverdi>
              <Etikettverdi etikett="Objekt">{objekt?.name ?? 'Ikke oppgitt'}</Etikettverdi>
              <Etikettverdi etikett="Rapportør">{rapportor ?? 'Ukjent'}</Etikettverdi>
              {rapport.submitted_at && (
                <Etikettverdi etikett="Sendt inn">
                  {formatDateTime(rapport.submitted_at)}
                </Etikettverdi>
              )}
              {rapport.closed_at && (
                <Etikettverdi etikett="Ferdigbehandlet">
                  {formatDateTime(rapport.closed_at)}
                </Etikettverdi>
              )}
            </dl>
          </Kort>

          <Seksjon tittel="Innhold">
            <Kort className="space-y-5 p-5">
              {[
                ['Beskrivelse', rapport.description],
                ['Hendelsesforløp', rapport.sequence_of_events],
                ['Utførte tiltak', rapport.actions_taken],
                ['Varslede', rapport.notified],
                ['Vitner', rapport.witnesses],
              ].map(([etikett, verdi]) => verdi ? (
                <Etikettverdi key={etikett as string} etikett={etikett as string}>
                  <span className="whitespace-pre-line">{verdi}</span>
                </Etikettverdi>
              ) : null)}
            </Kort>
          </Seksjon>

          <Seksjon tittel="Skade og maktbruk">
            <Kort className="space-y-4 p-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Etikettverdi etikett="Personskade">
                  {rapport.personal_injury ? 'Ja' : 'Nei'}
                </Etikettverdi>
                <Etikettverdi etikett="Materiell skade">
                  {rapport.material_damage ? 'Ja' : 'Nei'}
                </Etikettverdi>
                <Etikettverdi etikett="Fysisk makt">
                  {rapport.physical_force ? 'Ja' : 'Nei'}
                </Etikettverdi>
              </dl>
              {rapport.personal_injury_details && (
                <Etikettverdi etikett="Om personskaden">
                  <span className="whitespace-pre-line">{rapport.personal_injury_details}</span>
                </Etikettverdi>
              )}
              {rapport.material_damage_details && (
                <Etikettverdi etikett="Om den materielle skaden">
                  <span className="whitespace-pre-line">{rapport.material_damage_details}</span>
                </Etikettverdi>
              )}
              {rapport.physical_force_details && (
                <Etikettverdi etikett="Om maktbruken">
                  <span className="whitespace-pre-line">{rapport.physical_force_details}</span>
                </Etikettverdi>
              )}
              <Etikettverdi etikett="Politiet varslet">
                {rapport.police_notified ? 'Ja' : 'Nei'}
              </Etikettverdi>
            </Kort>
          </Seksjon>

          {vedleggMedLenke.length > 0 && (
            <Seksjon tittel="Bildevedlegg">
              <ul className="space-y-2">
                {vedleggMedLenke.map((v) => (
                  <li key={v.id}>
                    {v.lenke ? (
                      <a
                        href={v.lenke}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex min-h-14 items-center gap-3 rounded-xl bg-marine-900/80 px-4 ring-1 ring-linje/70 hover:bg-marine-800"
                      >
                        <ImageIcon className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                        <span className="min-w-0 flex-1 truncate text-sm text-tekst">
                          {v.file_name}
                        </span>
                      </a>
                    ) : (
                      <span className="block px-4 py-3 text-sm text-tekst-svak">
                        {v.file_name} (kunne ikke hentes)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Seksjon>
          )}

          {rapport.handling_note && (
            <Seksjon tittel="Saksbehandling">
              <Kort className="p-5">
                <p className="whitespace-pre-line text-sm text-tekst">{rapport.handling_note}</p>
              </Kort>
            </Seksjon>
          )}

          {eget && rapport.status !== 'utkast' && (
            <Kort className="p-4">
              <p className="flex items-center gap-3 text-sm text-tekst-dempet">
                <Lock className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                Rapporten er sendt inn og er låst for endring.
              </p>
            </Kort>
          )}
        </>
      )}

      {!eget && (
        <Kort className="p-4">
          <p className="flex items-center gap-3 text-sm text-tekst-dempet">
            <FileText className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
            Du har fått tilgang til denne rapporten uten a vaere rapportør.
          </p>
        </Kort>
      )}
    </div>
  );
}
