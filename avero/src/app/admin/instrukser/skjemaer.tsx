'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Ban, Send } from 'lucide-react';
import {
  opprettInstruks, tildelInstruks, trekkTilbakeTildeling, type Adminstilstand,
} from '@/server/actions/admin';
import { Beskjed, Knapp } from '@/components/ui';
import { Avkryssing, Felt, Nedtrekk, Tekstfelt, Tekstområde } from '@/components/skjemafelt';
import { formatDateShort, formatShiftTime, toDateInputValue } from '@/lib/dates';
import { rolleNavn } from '@/lib/etiketter';
import type { Department, Profile, Shift, Site } from '@/lib/database.types';

function SendKnapp({ tekst, variant = 'primær' }: {
  tekst: string; variant?: 'primær' | 'sekundær' | 'fare';
}) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" variant={variant} størrelse="stor" bred disabled={pending}>
      {pending ? 'Lagrer …' : tekst}
    </Knapp>
  );
}

export function NyInstruksSkjema({ objekter }: { objekter: Site[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettInstruks, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      <Felt etikett="Tittel" påkrevd>
        <Tekstfelt name="tittel" required placeholder="Objektinstruks – …" />
      </Felt>
      <Felt etikett="Sammendrag">
        <Tekstfelt name="sammendrag" placeholder="Kort om hva instruksen dekker." />
      </Felt>
      <Felt etikett="Objekt">
        <Nedtrekk name="objektId" defaultValue="">
          <option value="">Ikke knyttet til et objekt</option>
          {objekter.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Nedtrekk>
      </Felt>
      <Felt etikett="Innhold">
        <Tekstområde name="innhold" className="min-h-40" placeholder="Selve instruksteksten." />
      </Felt>
      <Avkryssing name="kreverBekreftelse" etikett="Krever lesebekreftelse" defaultChecked />
      <SendKnapp tekst="Opprett instruks" />
    </form>
  );
}

type Mal = 'ansatt' | 'objekt' | 'avdeling' | 'vakt';

/**
 * Tildeling av en instruks. Uten en tildeling er instruksen usynlig for
 * alle ansatte - det finnes med vilje ingen «alle ansatte»-snarvei.
 */
export function TildelInstruksSkjema({
  instruksId, ansatte, objekter, avdelinger, vakter,
}: {
  instruksId: string;
  ansatte: Profile[];
  objekter: Site[];
  avdelinger: Department[];
  vakter: { vakt: Shift; objekt: Site | null }[];
}) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(tildelInstruks, {});
  const [mal, setMal] = useState<Mal>('ansatt');

  const valg: Record<Mal, { verdi: string; tekst: string }[]> = {
    ansatt: ansatte.map((a) => ({
      verdi: a.id, tekst: `${a.full_name} · ${rolleNavn[a.role]}`,
    })),
    objekt: objekter.map((o) => ({ verdi: o.id, tekst: o.name })),
    avdeling: avdelinger.map((a) => ({ verdi: a.id, tekst: a.name })),
    vakt: vakter.map(({ vakt, objekt }) => ({
      verdi: vakt.id,
      tekst: `${formatDateShort(vakt.starts_at)} ${formatShiftTime(vakt.starts_at, vakt.ends_at)} · ${objekt?.name ?? 'objekt'}`,
    })),
  };

  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="instruksId" value={instruksId} />

      <Felt etikett="Tildel til">
        <Nedtrekk name="mal" value={mal} onChange={(e) => setMal(e.target.value as Mal)}>
          <option value="ansatt">Én eller flere bestemte ansatte</option>
          <option value="objekt">Alle med tilgang til et objekt</option>
          <option value="avdeling">En hel avdeling</option>
          <option value="vakt">En bestemt vakt</option>
        </Nedtrekk>
      </Felt>

      <Felt
        etikett="Mottakere"
        påkrevd
        hjelp="Hold inne Ctrl (Windows) eller Cmd (Mac) for å velge flere."
      >
        <select
          name="maalId"
          multiple
          required
          size={Math.min(8, Math.max(4, valg[mal].length))}
          className="w-full rounded-xl bg-marine-900 px-3 py-2 text-base text-tekst ring-1 ring-inset ring-linje focus:ring-2 focus:ring-aksent focus:outline-none"
        >
          {valg[mal].map((v) => (
            <option key={v.verdi} value={v.verdi} className="py-1">{v.tekst}</option>
          ))}
        </select>
      </Felt>

      {mal === 'objekt' && (
        <Felt
          etikett="Begrens til rolle ved objektet"
          hjelp="La stå tom for å gjelde alle med tilgang til objektet."
        >
          <Nedtrekk name="rolleVedObjekt" defaultValue="">
            <option value="">Alle roller</option>
            <option value="ansatt">Kun ansatte</option>
            <option value="operativ_leder">Kun operative ledere</option>
          </Nedtrekk>
        </Felt>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Gyldig fra">
          <Tekstfelt name="gyldigFra" type="date" defaultValue={toDateInputValue(new Date())} />
        </Felt>
        <Felt etikett="Gyldig til" hjelp="Tom betyr inntil videre.">
          <Tekstfelt name="gyldigTil" type="date" />
        </Felt>
      </div>

      <Avkryssing name="kreverBekreftelse" etikett="Krev lesebekreftelse" defaultChecked />

      <Knapp type="submit" størrelse="stor" bred>
        <Send className="h-5 w-5" strokeWidth={2} />
        Tildel tilgang
      </Knapp>
    </form>
  );
}

export function TrekkTilbakeSkjema({
  tildelingId, instruksId,
}: { tildelingId: string; instruksId: string }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(trekkTilbakeTildeling, {});
  return (
    <form action={send}>
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      <input type="hidden" name="tildelingId" value={tildelingId} />
      <input type="hidden" name="instruksId" value={instruksId} />
      <button
        type="submit"
        className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-kritisk ring-1 ring-inset ring-kritisk/40 hover:bg-kritisk/15"
      >
        <Ban className="h-3.5 w-3.5" strokeWidth={2} />
        Trekk tilbake
      </button>
    </form>
  );
}
