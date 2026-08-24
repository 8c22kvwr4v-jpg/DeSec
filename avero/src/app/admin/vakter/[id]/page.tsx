import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { NotebookPen, Users } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentAnsatte, hentVaktAdmin } from '@/server/data/admin';
import { hentJournalForVakt } from '@/server/data/journal';
import { Etikettverdi, Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { StatusSkjema, TildelSkjema } from '../skjema';
import {
  crossesMidnight, formatDateLong, formatDateTime, formatDuration, formatShiftTime, formatTime,
} from '@/lib/dates';
import {
  journalposttypeNavn, tildelingsstatusNavn, vaktstatusNavn, vaktstatusTone, vakttypeNavn,
} from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Vakt' };

export default async function AdminVaktSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const visning = await hentVaktAdmin(id);
  if (!visning) notFound();

  const { vakt, objekt, tildelinger } = visning;
  const erAdmin = bruker.profil.role === 'administrator';
  const ansatte = erAdmin ? await hentAnsatte() : [];

  const { journal, poster } = await hentJournalForVakt(vakt.id, vakt, {
    for: bruker.selskap.journal_open_before_minutes,
    etter: bruker.selskap.journal_open_after_minutes,
  });

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/admin/vakter', tekst: 'Vakter og turnus' }}
        tittel={objekt?.name ?? 'Vakt'}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp tone={vaktstatusTone[vakt.status]}>
              {vaktstatusNavn[vakt.status]}
            </Merkelapp>
            <Merkelapp>{vakttypeNavn[vakt.shift_type]}</Merkelapp>
          </span>
        }
      />

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="Dato">{formatDateLong(vakt.starts_at)}</Etikettverdi>
          <Etikettverdi etikett="Tid">
            {formatShiftTime(vakt.starts_at, vakt.ends_at)} ·{' '}
            {formatDuration(vakt.starts_at, vakt.ends_at)}
            {crossesMidnight(vakt.starts_at, vakt.ends_at) && ' (over midnatt)'}
          </Etikettverdi>
          <Etikettverdi etikett="Oppmøtested">
            {vakt.meeting_point ?? objekt?.meeting_point ?? '–'}
          </Etikettverdi>
          <Etikettverdi etikett="Merknader">{vakt.notes ?? '–'}</Etikettverdi>
        </dl>
      </Kort>

      <Seksjon tittel="Tildeling">
        {tildelinger.length === 0 ? (
          <TomTilstand
            ikon={<Users className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen ansatt tildelt"
          />
        ) : (
          <ul className="space-y-2">
            {tildelinger.map(({ tildeling, ansatt }) => (
              <li key={tildeling.id}>
                <Kort className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    {erAdmin && ansatt ? (
                      <Link
                        href={`/admin/ansatte/${ansatt.id}`}
                        className="block truncate text-sm font-medium text-aksent-lys hover:underline"
                      >
                        {ansatt.full_name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium text-tekst">
                        {ansatt?.full_name ?? 'Ukjent'}
                      </span>
                    )}
                    <span className="block text-xs text-tekst-dempet">
                      Tildelt {formatDateTime(tildeling.assigned_at)}
                    </span>
                  </span>
                  <Merkelapp>{tildelingsstatusNavn[tildeling.status]}</Merkelapp>
                </Kort>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      {erAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Seksjon tittel="Tildel vakten">
            <Kort className="p-4 sm:p-5">
              <TildelSkjema vaktId={vakt.id} ansatte={ansatte.filter((a) => a.is_active)} />
            </Kort>
          </Seksjon>
          <Seksjon tittel="Endre status">
            <Kort className="p-4 sm:p-5">
              <StatusSkjema vaktId={vakt.id} status={vakt.status} />
            </Kort>
          </Seksjon>
        </div>
      )}

      <Seksjon tittel="Vaktjournal" beskrivelse="Journalen skrives av vekteren på vakt.">
        {!journal ? (
          <TomTilstand
            ikon={<NotebookPen className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Journalen er ikke startet"
          />
        ) : (
          <ol className="space-y-2">
            {poster.map((post) => (
              <li key={post.id}>
                <Kort className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Merkelapp>{journalposttypeNavn[post.entry_type]}</Merkelapp>
                    <span className="text-xs text-tekst-dempet">
                      {formatTime(post.occurred_at)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-tekst">{post.body}</p>
                  <p className="mt-2 text-xs text-tekst-svak">
                    {post.forfatter}{post.location && ` · ${post.location}`}
                  </p>
                </Kort>
              </li>
            ))}
          </ol>
        )}
      </Seksjon>
    </div>
  );
}
