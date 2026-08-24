import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImageIcon } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentRapport, signertVedleggslenke } from '@/server/data/rapporter';
import { Etikettverdi, Kort, Merkelapp, Seksjon } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { BehandlingSkjema } from '../behandling';
import { formatDateTime } from '@/lib/dates';
import { rapportstatusNavn, rapportstatusTone, rapporttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Rapport' };

export default async function AdminRapportSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await krevRolle('administrator', 'operativ_leder');
  const visning = await hentRapport(id);
  if (!visning) notFound();

  const { rapport, objekt, rapportor, vedlegg } = visning;
  const vedleggMedLenke = await Promise.all(
    vedlegg.map(async (v) => ({ ...v, lenke: await signertVedleggslenke(v.storage_path) })),
  );

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/admin/rapporter', tekst: 'Rapporter' }}
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

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="Rapportør">{rapportor ?? 'Ukjent'}</Etikettverdi>
          <Etikettverdi etikett="Objekt">{objekt?.name ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="Hendelsestidspunkt">
            {formatDateTime(rapport.occurred_at)}
          </Etikettverdi>
          <Etikettverdi etikett="Sendt inn">
            {rapport.submitted_at ? formatDateTime(rapport.submitted_at) : 'Ikke sendt inn'}
          </Etikettverdi>
        </dl>
      </Kort>

      <Seksjon tittel="Innhold">
        <Kort className="space-y-5 p-5">
          {([
            ['Beskrivelse', rapport.description],
            ['Hendelsesforløp', rapport.sequence_of_events],
            ['Utførte tiltak', rapport.actions_taken],
            ['Varslede', rapport.notified],
            ['Vitner', rapport.witnesses],
            ['Om personskaden', rapport.personal_injury_details],
            ['Om den materielle skaden', rapport.material_damage_details],
            ['Om maktbruken', rapport.physical_force_details],
          ] as const).map(([etikett, verdi]) => verdi ? (
            <Etikettverdi key={etikett} etikett={etikett}>
              <span className="whitespace-pre-line">{verdi}</span>
            </Etikettverdi>
          ) : null)}

          <dl className="grid gap-4 sm:grid-cols-4">
            <Etikettverdi etikett="Personskade">
              {rapport.personal_injury ? 'Ja' : 'Nei'}
            </Etikettverdi>
            <Etikettverdi etikett="Materiell skade">
              {rapport.material_damage ? 'Ja' : 'Nei'}
            </Etikettverdi>
            <Etikettverdi etikett="Fysisk makt">
              {rapport.physical_force ? 'Ja' : 'Nei'}
            </Etikettverdi>
            <Etikettverdi etikett="Politi varslet">
              {rapport.police_notified ? 'Ja' : 'Nei'}
            </Etikettverdi>
          </dl>
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
                  <span className="text-sm text-tekst-svak">{v.file_name}</span>
                )}
              </li>
            ))}
          </ul>
        </Seksjon>
      )}

      <Seksjon tittel="Behandling">
        <Kort className="p-4 sm:p-5">
          <BehandlingSkjema
            rapportId={rapport.id}
            status={rapport.status}
            notat={rapport.handling_note}
          />
        </Kort>
      </Seksjon>
    </div>
  );
}
