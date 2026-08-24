import type { Metadata } from 'next';
import {
  ImageIcon, Lock, NotebookPen, ShieldAlert, Clock3, MapPin,
} from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentVakt } from '@/server/data/vakter';
import { hentJournalForVakt } from '@/server/data/journal';
import { Kort, Lenkeknapp, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import {
  AvsluttVaktSkjema, NyPostSkjema, RettelseSkjema, StartVaktSkjema,
} from './skjemaer';
import { formatDateLong, formatDateTime, formatShiftTime, formatTime } from '@/lib/dates';
import { journalposttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Vaktjournal' };

const typeTone: Record<string, 'nøytral' | 'aktiv' | 'advarsel' | 'kritisk' | 'positiv'> = {
  vakt_start: 'aktiv',
  vakt_slutt: 'positiv',
  hendelse: 'advarsel',
  avvik: 'kritisk',
  rettelse: 'advarsel',
};

export default async function JournalSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevBruker();
  const visning = await hentVakt(id);

  if (!visning) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-kritisk" strokeWidth={1.6} />
        <h1 className="text-xl font-semibold">Ingen tilgang</h1>
        <p className="mt-2 text-sm text-tekst-dempet">
          Journalen er bare tilgjengelig for vakter som er tildelt deg.
        </p>
        <Lenkeknapp href="/vakter" className="mt-6" størrelse="stor">Til mine vakter</Lenkeknapp>
      </div>
    );
  }

  const { vakt, objekt } = visning;
  const { journal, poster, kanSkrive } = await hentJournalForVakt(vakt.id, vakt, {
    for: bruker.selskap.journal_open_before_minutes,
    etter: bruker.selskap.journal_open_after_minutes,
  });

  const mappe = journal ? `${bruker.profil.company_id}/${journal.id}` : '';
  const rettedePoster = new Set(
    poster.map((p) => p.corrects_entry_id).filter((v): v is string => Boolean(v)),
  );

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: `/vakter/${vakt.id}`, tekst: 'Vaktdetaljer' }}
        tittel="Vaktjournal"
        undertittel={
          <>
            {objekt?.name} · {formatDateLong(vakt.starts_at)} ·{' '}
            {formatShiftTime(vakt.starts_at, vakt.ends_at)}
          </>
        }
      />

      {/* Status pa journalen */}
      <Kort className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-tekst">
              {journal
                ? journal.status === 'apen' ? 'Journalen er åpen' : 'Journalen er avsluttet'
                : 'Journalen er ikke startet'}
            </p>
            {journal && (
              <p className="mt-0.5 text-xs text-tekst-dempet">
                Startet {formatDateTime(journal.started_at)}
                {journal.ended_at && ` · avsluttet ${formatDateTime(journal.ended_at)}`}
              </p>
            )}
          </div>
          <Merkelapp tone={journal?.status === 'apen' ? 'aktiv' : 'nøytral'}>
            {poster.length} post{poster.length === 1 ? '' : 'er'}
          </Merkelapp>
        </div>
      </Kort>

      {!journal && (
        kanSkrive ? (
          <Kort className="p-5">
            <p className="mb-4 text-sm text-tekst-dempet">
              Start vakten for å åpne journalen. Dato og klokkeslett registreres automatisk.
            </p>
            <StartVaktSkjema vaktId={vakt.id} />
          </Kort>
        ) : (
          <Kort className="p-5">
            <p className="flex items-start gap-3 text-sm text-tekst-dempet">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
              Journalen åpnes {bruker.selskap.journal_open_before_minutes} minutter før
              vaktstart, og er tilgjengelig inntil{' '}
              {Math.round(bruker.selskap.journal_open_after_minutes / 60)} timer etter
              vaktslutt.
            </p>
          </Kort>
        )
      )}

      {/* Journalposter */}
      <Seksjon tittel="Journalposter" beskrivelse="Poster kan ikke slettes eller endres.">
        {poster.length === 0 ? (
          <TomTilstand
            ikon={<NotebookPen className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen journalposter ennå"
          />
        ) : (
          <ol className="space-y-3">
            {poster.map((post) => (
              <li key={post.id}>
                <Kort
                  className={`p-4 ${post.entry_type === 'rettelse' ? 'ring-advarsel/30' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Merkelapp tone={typeTone[post.entry_type] ?? 'nøytral'}>
                        {journalposttypeNavn[post.entry_type]}
                      </Merkelapp>
                      {rettedePoster.has(post.id) && (
                        <Merkelapp tone="advarsel">Rettet senere</Merkelapp>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-tekst-dempet">
                      <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {formatTime(post.occurred_at)}
                    </span>
                  </div>

                  <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-tekst">
                    {post.body}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tekst-svak">
                    <span>{post.forfatter}</span>
                    {post.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {post.location}
                      </span>
                    )}
                    {post.attachment_paths.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {post.attachment_paths.length} bilde
                        {post.attachment_paths.length === 1 ? '' : 'r'}
                      </span>
                    )}
                  </div>

                  {journal?.status === 'apen' && kanSkrive
                    && post.entry_type !== 'rettelse' && (
                    <RettelseSkjema vaktId={vakt.id} postId={post.id} />
                  )}
                </Kort>
              </li>
            ))}
          </ol>
        )}
      </Seksjon>

      {journal?.status === 'apen' && kanSkrive && (
        <>
          <NyPostSkjema vaktId={vakt.id} mappe={mappe} />
          <AvsluttVaktSkjema vaktId={vakt.id} />
        </>
      )}

      {journal?.status === 'avsluttet' && (
        <Kort className="p-4">
          <p className="flex items-center gap-3 text-sm text-tekst-dempet">
            <Lock className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
            Journalen er avsluttet og kan ikke endres.
          </p>
        </Kort>
      )}
    </div>
  );
}
