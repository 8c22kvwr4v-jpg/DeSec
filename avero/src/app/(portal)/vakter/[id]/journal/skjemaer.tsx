'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, PenLine, Play, Square } from 'lucide-react';
import {
  avsluttVakt, nyJournalpost, rettJournalpost, startVakt, type Handlingstilstand,
} from '@/server/actions/journal';
import { Beskjed, Knapp, Kort } from '@/components/ui';
import { Felt, Nedtrekk, Tekstfelt, Tekstområde } from '@/components/skjemafelt';
import { Bildeopplasting } from '@/components/bildeopplasting';
import { journalposttypeNavn } from '@/lib/etiketter';

const VALGBARE_TYPER = [
  'kontrollrunde', 'apning', 'lasing', 'observasjon', 'hendelse', 'avvik', 'notat',
] as const;

function SendKnapp({
  tekst, venter, variant = 'primær', ikon,
}: { tekst: string; venter: string; variant?: 'primær' | 'sekundær' | 'fare'; ikon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" variant={variant} størrelse="stor" bred disabled={pending}>
      {ikon}
      {pending ? venter : tekst}
    </Knapp>
  );
}

export function StartVaktSkjema({ vaktId }: { vaktId: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(startVakt, {});
  return (
    <form action={send} className="space-y-3">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      <input type="hidden" name="vaktId" value={vaktId} />
      <SendKnapp
        tekst="Start vakt"
        venter="Starter …"
        ikon={<Play className="h-5 w-5" strokeWidth={2} />}
      />
    </form>
  );
}

export function NyPostSkjema({
  vaktId, mappe,
}: { vaktId: string; mappe: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(nyJournalpost, {});
  const [nøkkel, setNøkkel] = useState(0);

  return (
    <Kort className="p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-tekst">Nytt journalnotat</h3>
      <form
        key={nøkkel}
        action={async (data) => {
          await send(data);
          setNøkkel((n) => n + 1);
        }}
        className="space-y-4"
      >
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}

        <input type="hidden" name="vaktId" value={vaktId} />

        <Felt etikett="Hendelsestype" påkrevd>
          <Nedtrekk name="type" defaultValue="notat" required>
            {VALGBARE_TYPER.map((type) => (
              <option key={type} value={type}>{journalposttypeNavn[type]}</option>
            ))}
          </Nedtrekk>
        </Felt>

        <Felt etikett="Beskrivelse" påkrevd hjelp="Dato og klokkeslett settes automatisk.">
          <Tekstområde name="tekst" required minLength={3} placeholder="Hva skjedde?" />
        </Felt>

        <Felt etikett="Sted">
          <Tekstfelt name="sted" placeholder="For eksempel «Port 3» eller «Etasje 2»" />
        </Felt>

        <Bildeopplasting bøtte="journal-vedlegg" mappe={mappe} />

        <SendKnapp
          tekst="Lagre notat"
          venter="Lagrer …"
          ikon={<PenLine className="h-5 w-5" strokeWidth={2} />}
        />
      </form>
    </Kort>
  );
}

export function RettelseSkjema({
  vaktId, postId,
}: { vaktId: string; postId: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(rettJournalpost, {});
  return (
    <details className="mt-3">
      <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-medium text-aksent-lys">
        <PenLine className="h-3.5 w-3.5" strokeWidth={2} />
        Registrer rettelse
      </summary>
      <form action={send} className="mt-2 space-y-2">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
        <input type="hidden" name="vaktId" value={vaktId} />
        <input type="hidden" name="postId" value={postId} />
        <Tekstområde
          name="tekst"
          required
          minLength={3}
          placeholder="Beskriv hva som er feil og hva som er riktig."
          className="min-h-20"
        />
        <p className="text-[0.7rem] text-tekst-svak">
          Den opprinnelige posten blir stående. Rettelsen lagres som en ny post.
        </p>
        <SendKnapp tekst="Lagre rettelse" venter="Lagrer …" variant="sekundær" />
      </form>
    </details>
  );
}

export function AvsluttVaktSkjema({ vaktId }: { vaktId: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(avsluttVakt, {});
  return (
    <Kort className="p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-tekst">Avslutt vakt</h3>
      <form action={send} className="space-y-3">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        {tilstand.melding && (
          <Beskjed tone="positiv">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              {tilstand.melding}
            </span>
          </Beskjed>
        )}
        <input type="hidden" name="vaktId" value={vaktId} />
        <Tekstområde
          name="oppsummering"
          placeholder="Kort oppsummering av vakten (valgfritt)"
          className="min-h-20"
        />
        <SendKnapp
          tekst="Avslutt vakt"
          venter="Avslutter …"
          variant="sekundær"
          ikon={<Square className="h-5 w-5" strokeWidth={2} />}
        />
      </form>
    </Kort>
  );
}
